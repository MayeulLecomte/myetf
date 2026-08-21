#!/usr/bin/env node
/* =============================================================
   ENVOI D'UN E-MAIL EN TEXTE SIMPLE — Brevo
   -------------------------------------------------------------
   Le seul endroit du dépôt qui envoie quelque chose. Il ne
   calcule rien : on lui donne un destinataire, un objet et un
   fichier, il poste.

   POURQUOI BREVO ET PAS SMTP. Un envoi SMTP depuis une tâche
   planifiée demande un mot de passe d'application et tombe
   régulièrement sur les protections anti-robot des fournisseurs
   grand public. L'API HTTP n'a pas ce problème : une clé, une
   requête, un code de retour clair.

   POURQUOI EN TEXTE SIMPLE. Le message est une liste d'ordres à
   passer. Une version HTML devrait exister en double du texte,
   et deux versions du même message finissent par diverger — voir
   `texteProposition()`, qui sert déjà au `mailto:` et au
   presse-papier sans se dédoubler.

   ⚠  IL ÉCHOUE FORT. Un e-mail qu'on croit parti et qui n'est
   pas parti est pire que pas d'e-mail du tout : la tâche
   planifiée retiendrait l'envoi et se tairait le lendemain. Toute
   réponse hors 2xx sort en erreur, et le corps de la réponse est
   imprimé — c'est là que Brevo dit « expéditeur non validé ».

   Variables : BREVO_API_KEY, EXPEDITEUR_EMAIL, EXPEDITEUR_NOM.

   Usage :
     node scripts/envoyer-mail.mjs --a=… --objet=… --corps=fichier
     node scripts/envoyer-mail.mjs … --blanc   (n'envoie pas)
   ============================================================= */

import { readFileSync } from 'node:fs';

const arg = n => {
  const t = process.argv.find(a => a.startsWith('--' + n + '='));
  return t ? t.slice(n.length + 3) : '';
};

/* -------------------------------------------------------------
   LES ADRESSES SE NETTOIENT AVANT D'ÊTRE ENVOYÉES
   -------------------------------------------------------------
   Une adresse vient d'un secret de dépôt ou d'un champ saisi à la
   main, et elle arrive régulièrement avec un retour à la ligne ou
   une espace au bout — `gh secret set` depuis un `echo`, un
   copier-coller qui emporte la fin de ligne. Le caractère est
   invisible partout, y compris dans les journaux.

   Brevo, lui, répond « email is not valid in to » : un message
   qui décrit la conséquence et pas la cause, sur une valeur que
   GitHub masque dans le journal. On peut y passer une heure.

   D'où deux gestes ici. On NETTOIE — c'est toujours ce qu'on
   voulait dire. Et si ça ne suffit pas, on décrit la FORME de
   l'adresse sans jamais l'imprimer : sa longueur, son nombre
   d'arrobases, la présence d'espaces. C'est ce qu'il faut pour
   comprendre, et ça ne divulgue rien.
   ------------------------------------------------------------- */
function adresse(brut, quoi) {
  const net = String(brut || '').trim().replace(/[\r\n]/g, '');
  if (net !== String(brut || '')) {
    console.log(`(${quoi} : espaces ou fin de ligne retirés)`);
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(net)) {
    console.error(`${quoi} n'est pas une adresse e-mail exploitable.`);
    console.error(`   forme reçue : ${net.length} caractère(s), ` +
      `${(net.match(/@/g) || []).length} arrobase(s), ` +
      `${/\s/.test(String(brut || '')) ? 'contient une espace' : 'sans espace'}, ` +
      `point après l'arrobase : ${/@[^@]*\./.test(net) ? 'oui' : 'non'}.`);
    console.error('   (la valeur n\'est pas imprimée : elle vient d\'un secret)');
    process.exit(1);
  }
  return net;
}

const a = adresse(arg('a'), 'Le destinataire');
const objet = arg('objet');
const chemin = arg('corps');
const blanc = process.argv.includes('--blanc');

if (!objet || !chemin) {
  console.error('Usage : --a=adresse --objet="…" --corps=chemin');
  process.exit(1);
}

const corps = readFileSync(chemin, 'utf8');
const cle = (process.env.BREVO_API_KEY || '').trim();
const expediteurBrut = process.env.EXPEDITEUR_EMAIL;
const nom = (process.env.EXPEDITEUR_NOM || 'Allocation ETF').trim();

if (blanc) {
  console.log(`À      : ${a}`);
  console.log(`De     : ${nom} <${expediteurBrut || '(EXPEDITEUR_EMAIL manquante)'}>`);
  console.log(`Objet  : ${objet}`);
  console.log(`Corps  : ${corps.length} caractères, ${corps.split('\n').length} lignes`);
  console.log('\n--- rien n\'a été envoyé (--blanc) ---');
  process.exit(0);
}

/* Les deux manquent ensemble ou pas du tout : sans clé il n'y a pas de
   compte, sans expéditeur il n'y a pas d'adresse validée. Le dire
   séparément aide à savoir lequel des deux secrets a été oublié. */
if (!cle)            { console.error('BREVO_API_KEY absente.');    process.exit(1); }
if (!expediteurBrut) { console.error('EXPEDITEUR_EMAIL absente.'); process.exit(1); }
const expediteur = adresse(expediteurBrut, 'L\'expéditeur');

const rep = await fetch('https://api.brevo.com/v3/smtp/email', {
  method: 'POST',
  headers: {
    'api-key': cle,
    'content-type': 'application/json',
    'accept': 'application/json'
  },
  body: JSON.stringify({
    sender: { name: nom, email: expediteur },
    to: [{ email: a }],
    subject: objet,
    textContent: corps
  }),
  signal: AbortSignal.timeout(20000)
});

const texte = await rep.text();
if (!rep.ok) {
  console.error(`Brevo a refusé (HTTP ${rep.status}) : ${texte}`);
  /* Les deux causes de loin les plus fréquentes, dites en clair plutôt que
     laissées à déduire d'un code JSON. */
  if (rep.status === 400 && /sender/i.test(texte)) {
    console.error('→ L\'adresse EXPEDITEUR_EMAIL n\'est pas validée dans Brevo ' +
                  '(Senders & IP → Senders → Add a sender, puis cliquer le lien reçu).');
  }
  if (rep.status === 401) {
    console.error('→ BREVO_API_KEY invalide ou révoquée.');
  }
  process.exit(1);
}

console.log(`Envoyé à ${a} — ${texte}`);
