#!/usr/bin/env node
/* =============================================================
   JOURNAL DES ENVOIS — Brevo
   -------------------------------------------------------------
   Dit ce que sont devenus les messages une fois partis.

   POURQUOI IL EXISTE. `scripts/envoyer-mail.mjs` sait seulement
   que Brevo a ACCEPTÉ le message : il rend un `messageId`, et
   s'arrête là. Accepté n'est pas reçu. Entre les deux il y a le
   fournisseur du destinataire, qui peut livrer, classer en
   indésirable, différer, ou refuser — et il ne le dit à personne
   sauf à Brevo.

   Sans ce script, un message qui n'arrive pas ne laisse aucune
   trace exploitable : le workflow est vert, la boîte est vide, et
   il n'y a rien entre les deux.

   ⚠  IL NE LIT QUE — sauf `--debloquer`, seul geste d'écriture,
   et il faut le demander nommément. Il retire UNE adresse de la
   liste de blocage du compte ; il n'envoie jamais rien.

   Variables : BREVO_API_KEY.

   Usage :  node scripts/journal-mail.mjs [--limite=25]
            node scripts/journal-mail.mjs --bloques
            node scripts/journal-mail.mjs --debloquer=adresse@x.fr
   ============================================================= */

const arg = n => (process.argv.find(a => a.startsWith('--' + n + '=')) || '').split('=')[1];
const LIMITE = Number(arg('limite') || 25);

const cle = (process.env.BREVO_API_KEY || '').trim();
if (!cle) { console.error('BREVO_API_KEY absente.'); process.exit(1); }

/* Ce que chaque état veut dire, en français et sans jargon. C'est la
   colonne qu'on lit en premier quand on cherche pourquoi un message
   n'est pas arrivé. */
const SENS = {
  requests:    'accepté par Brevo, pas encore remis',
  delivered:   'REMIS au serveur du destinataire',
  opened:      'ouvert',
  uniqueOpened:'ouvert (première fois)',
  clicks:      'lien cliqué',
  deferred:    'différé — le serveur destinataire fait attendre',
  softBounces: 'rejet TEMPORAIRE (boîte pleine, serveur occupé)',
  hardBounces: 'rejet DÉFINITIF (adresse inexistante)',
  blocked:     'BLOQUÉ par le destinataire ou par une liste',
  spam:        'classé INDÉSIRABLE',
  invalid:     'adresse invalide',
  unsubscribed:'désabonnement'
};

/* -------------------------------------------------------------
   LA LISTE DE BLOCAGE DU COMPTE
   -------------------------------------------------------------
   Brevo tient, par compte, une liste d'adresses vers lesquelles il
   REFUSE d'envoyer. Une adresse y entre après un rejet définitif,
   une plainte, un désabonnement — ou un ajout manuel. Tant qu'elle
   y est, tout envoi ressort en « blocked by Admin » sans jamais
   atteindre le serveur d'en face.

   C'est la seule chose qu'un journal d'événements ne montre pas :
   il dit qu'un message a été bloqué, pas POURQUOI l'adresse l'est.
   ------------------------------------------------------------- */
async function bloques() {
  const r = await fetch('https://api.brevo.com/v3/smtp/blockedContacts?limit=50', {
    headers: { 'api-key': cle, 'accept': 'application/json' },
    signal: AbortSignal.timeout(20000)
  });
  const t = await r.text();
  if (!r.ok) { console.error(`Brevo a refusé (HTTP ${r.status}) : ${t}`); process.exit(1); }
  const { contacts } = JSON.parse(t);
  if (!contacts || !contacts.length) {
    console.log('Aucune adresse bloquée sur ce compte.');
    return;
  }
  console.log(`${contacts.length} adresse(s) bloquée(s) :\n`);
  contacts.forEach(c => {
    console.log(`  ${c.email}`);
    console.log(`     motif : ${c.reason ? (c.reason.code || '') + ' — ' + (c.reason.message || '') : 'non précisé'}`);
    if (c.blockedAt) console.log(`     depuis : ${String(c.blockedAt).replace('T', ' ').slice(0, 19)}`);
  });
  console.log('\nPour en retirer une : --debloquer=adresse@exemple.fr');
}

/* Le SEUL geste d'écriture du script, et il faut le nommer. Il retire une
   adresse de la liste ; il n'envoie rien et ne touche à rien d'autre. */
async function debloquer(adr) {
  const r = await fetch('https://api.brevo.com/v3/smtp/blockedContacts/' + encodeURIComponent(adr), {
    method: 'DELETE',
    headers: { 'api-key': cle, 'accept': 'application/json' },
    signal: AbortSignal.timeout(20000)
  });
  if (r.status === 204) { console.log(`${adr} retirée de la liste de blocage.`); return; }
  const t = await r.text();
  if (r.status === 404) {
    console.log(`${adr} n'était pas sur la liste de blocage — rien à faire.`);
    return;
  }
  console.error(`Brevo a refusé (HTTP ${r.status}) : ${t}`);
  process.exit(1);
}

if (process.argv.includes('--bloques')) { await bloques(); process.exit(0); }
const aDebloquer = arg('debloquer');
if (aDebloquer) { await debloquer(aDebloquer); await bloques(); process.exit(0); }

const rep = await fetch(`https://api.brevo.com/v3/smtp/statistics/events?limit=${LIMITE}&sort=desc`, {
  headers: { 'api-key': cle, 'accept': 'application/json' },
  signal: AbortSignal.timeout(20000)
});

const texte = await rep.text();
if (!rep.ok) {
  console.error(`Brevo a refusé la lecture du journal (HTTP ${rep.status}) : ${texte}`);
  process.exit(1);
}

const { events } = JSON.parse(texte);
if (!events || !events.length) {
  console.log('Aucun événement. Soit rien n\'a été envoyé, soit Brevo n\'a pas encore enregistré.');
  process.exit(0);
}

console.log(`${events.length} événement(s), du plus récent au plus ancien :\n`);
for (const e of events) {
  const quand = (e.date || '').replace('T', ' ').slice(0, 19);
  console.log(`${quand}  ${(e.event || '?').padEnd(13)} ${SENS[e.event] || ''}`);
  if (e.subject) console.log(`               « ${e.subject} »`);
  if (e.reason)  console.log(`               motif : ${e.reason}`);
  console.log('');
}

/* La conclusion, parce que la liste brute se lit mal quand on cherche
   une réponse à une seule question : est-ce arrivé ? */
const parEtat = {};
events.forEach(e => { parEtat[e.event] = (parEtat[e.event] || 0) + 1; });
console.log('Récapitulatif : ' +
  Object.keys(parEtat).map(k => `${k} ${parEtat[k]}`).join(' · '));

if (parEtat.delivered && !parEtat.spam && !parEtat.blocked) {
  console.log('\n→ REMIS. Si la boîte paraît vide, regardez les indésirables et les');
  console.log('  onglets secondaires : le serveur destinataire a accepté le message,');
  console.log('  c\'est lui qui décide ensuite du dossier où il le range.');
} else if (parEtat.blocked || parEtat.spam) {
  console.log('\n→ BLOQUÉ ou CLASSÉ INDÉSIRABLE. C\'est le fournisseur du destinataire');
  console.log('  qui refuse, pas Brevo. Un expéditeur en @gmail.com passant par un');
  console.log('  tiers échoue l\'authentification DMARC : c\'est la cause de loin la');
  console.log('  plus fréquente, et elle se règle avec un domaine à soi.');
} else if (parEtat.softBounces || parEtat.hardBounces) {
  /* « blocked by Admin » N'EST PAS un refus du serveur destinataire, et le
     dire serait envoyer chercher au mauvais endroit. C'est BREVO qui
     refuse, parce que l'adresse figure sur la liste de blocage du compte.
     La distinction change tout : dans un cas on ne peut rien faire, dans
     l'autre il suffit de retirer l'adresse de la liste. */
  const admin = events.some(e => /blocked by admin/i.test(e.reason || ''));
  if (admin) {
    console.log('\n→ BLOQUÉ PAR BREVO, pas par le destinataire. « blocked by Admin »');
    console.log('  veut dire que l\'adresse figure sur la liste de blocage DU COMPTE :');
    console.log('  le message n\'a même pas été présenté au serveur d\'en face.');
    console.log('  `--bloques` la liste, `--debloquer=adresse` en retire une.');
  } else {
    console.log('\n→ REJETÉ par le serveur destinataire. Le motif ci-dessus dit lequel.');
  }
} else if (parEtat.requests && !parEtat.delivered) {
  console.log('\n→ ACCEPTÉ mais pas encore remis. Brevo enregistre la remise avec');
  console.log('  quelques secondes de retard : relancez dans une minute.');
}
