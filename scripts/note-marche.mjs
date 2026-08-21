#!/usr/bin/env node
/* =============================================================
   NOTE DE MARCHÉ INTERNE
   -------------------------------------------------------------
   Rédige une note de travail à partir de DEUX entrées :

     · data/variations.json   — les variations par poche, relevées
                                par scripts/maj-cours.mjs ;
     · data/actualites.json   — les titres du jour, relevés par
                                scripts/actualites.mjs.

   et l'écrit dans js/data/note-marche.js.

   L'actualité est FACULTATIVE. Sans le fichier, la note se rédige
   comme avant, sur les seuls cours, et le dit — la mention de
   provenance suit ce qui a réellement servi. Les cours, eux, sont
   obligatoires : c'est le squelette de la note.

   ⚠  DOCUMENT INTERNE. La note décrit ce qui a bougé et ce que
   le conseiller devrait vérifier. Elle ne formule aucune
   recommandation d'achat ou de vente et n'est pas destinée à
   être remise à un client en l'état.

   Nécessite ANTHROPIC_API_KEY. Sans clé, le script s'arrête
   proprement sans rien écrire — l'application affiche alors la
   marche à suivre.

   Usage :  node scripts/note-marche.mjs
            node scripts/note-marche.mjs --blanc   (voir l'invite,
                                    sans appeler l'API ni rien écrire)
   ============================================================= */

import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const RACINE = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ---------- Schéma de la note ---------- */
const SCHEMA = {
  type: 'object',
  properties: {
    titre: { type: 'string', description: 'Titre court de la séance, 8 mots maximum.' },
    synthese: { type: 'string', description: 'Deux à trois phrases : ce qui caractérise la période écoulée.' },
    mouvements: {
      type: 'array',
      description: 'Les trois à cinq poches dont le mouvement mérite d\'être relevé.',
      items: {
        type: 'object',
        properties: {
          poche: { type: 'string', description: 'Libellé exact de la poche, repris des données fournies.' },
          constat: { type: 'string', description: 'Une phrase factuelle : de combien elle a bougé, sur quel horizon.' },
          lecture: { type: 'string', description: 'Une phrase : ce que ce mouvement peut signifier pour un portefeuille diversifié.' }
        },
        required: ['poche', 'constat', 'lecture'],
        additionalProperties: false
      }
    },
    aVerifier: {
      type: 'array',
      description: 'Deux à quatre points que le conseiller devrait contrôler dans ses dossiers.',
      items: { type: 'string' }
    },
    indicateursASurveiller: {
      type: 'array',
      description: 'Un à trois indicateurs du module macro dont la lecture mériterait d\'être réexaminée.',
      items: { type: 'string' }
    },
    actualite: {
      type: 'array',
      description: 'Deux à cinq faits d\'actualité de la période qui éclairent la séance. Vide si les titres fournis n\'ont rien à voir avec les marchés. Chaque fait porte le journal qui le rapporte : la note doit rester vérifiable.',
      items: {
        type: 'object',
        properties: {
          fait: { type: 'string', description: 'Le fait, en une phrase, tel que les titres le rapportent. Pas d\'interprétation ici.' },
          portee: { type: 'string', description: 'Une phrase : sur quelle classe d\'actifs ce fait porte, et au conditionnel s\'il n\'est pas établi que c\'est lui qui a fait bouger les cours.' },
          source: { type: 'string', description: 'Le nom du ou des journaux qui le rapportent, repris exactement de la liste fournie.' }
        },
        required: ['fait', 'portee', 'source'],
        additionalProperties: false
      }
    }
  },
  required: ['titre', 'synthese', 'mouvements', 'aVerifier', 'indicateursASurveiller', 'actualite'],
  additionalProperties: false
};

const CONSIGNE = `Tu rédiges la note de marché interne d'un cabinet de conseil en gestion de patrimoine français.

Ton lecteur est le conseiller lui-même, un professionnel. Il lit cette note le matin, avant d'ouvrir ses dossiers. Elle l'aide à décider quoi regarder ; elle ne décide pas à sa place.

Règles impératives :
- N'émets AUCUNE recommandation d'achat, de vente ou d'arbitrage. Tu décris ce qui a bougé et ce que cela peut signifier ; le conseiller conclut.
- Ne cite aucun ETF ni aucun émetteur nommément. Raisonne au niveau des classes d'actifs et des poches.
- N'invente aucun chiffre. Tu ne disposes que des variations fournies ; si une explication te manque, dis-le plutôt que de la supposer.
- Tu reçois deux choses de nature différente, et tu ne dois jamais les confondre. Les VARIATIONS sont mesurées : elles sont vraies. Les TITRES DE PRESSE sont rapportés : ils disent ce qu'un journal a écrit, pas ce qui est établi. Écris « selon Les Échos », « Boursorama rapporte que » — jamais un titre de presse à l'indicatif comme s'il s'agissait d'un fait relevé.
- LA CORRÉLATION N'EST PAS LA CAUSE. Tu as sous les yeux des cours qui ont bougé et des nouvelles du même jour ; rien ne prouve que les secondes expliquent les premiers. Un rapprochement se formule au conditionnel — « pourrait tenir à », « coïncide avec » — et jamais « en raison de » ou « à cause de ».
- Les titres fournis couvrent l'économie en général, et beaucoup n'ont aucun rapport avec les marchés. ÉCARTE-LES sans les mentionner. Ne retiens que ce qui touche aux taux, aux banques centrales, à l'inflation, à la croissance, au change, à l'énergie, ou à un secteur assez large pour peser sur une classe d'actifs. Un fait divers, une politique sectorielle étroite, un papier de conseil patrimonial : rien de tout cela n'entre dans la note.
- Ne cite JAMAIS de valeur individuelle, même si un titre en parle. Le résultat semestriel d'une société cotée n'a pas sa place dans une note d'allocation : remonte au secteur, ou tais-toi.
- Écris en français, dans un registre sobre et professionnel. Phrases complètes. Pas de superlatifs, pas de langage d'alerte, pas d'emphase typographique.
- Un mouvement de moins de 1 % sur la semaine n'est pas un événement : ne le relève pas.`;

function contexte() {
  const chemin = join(RACINE, 'data', 'variations.json');
  if (!existsSync(chemin)) {
    console.error('data/variations.json absent — lancez d\'abord scripts/maj-cours.mjs.');
    process.exit(1);
  }
  const { genere, variations } = JSON.parse(readFileSync(chemin, 'utf8'));

  /* Libellés lisibles, repris du modèle d'allocation */
  const ctx = vm.createContext({});
  vm.runInContext(readFileSync(join(RACINE, 'js/data/allocations.js'), 'utf8'), ctx);
  const libelles = vm.runInContext('LIBELLES_POCHES', ctx);

  const lignes = Object.entries(variations)
    .filter(([, v]) => v.jour !== null || v.semaine !== null)
    .sort((a, b) => Math.abs(b[1].semaine || 0) - Math.abs(a[1].semaine || 0))
    .map(([poche, v]) => {
      const f = x => x === null ? 'n.d.' : (x > 0 ? '+' : '') + x.toFixed(2) + ' %';
      return `${libelles[poche] || poche} — jour ${f(v.jour)} · semaine ${f(v.semaine)} · ` +
             `mois ${f(v.mois)} · depuis le 1er janvier ${f(v.annee)}`;
    });

  return { genere, texte: lignes.join('\n'), nbPoches: lignes.length };
}

/* -------------------------------------------------------------
   L'ACTUALITÉ, SI ELLE A ÉTÉ RELEVÉE
   -------------------------------------------------------------
   Facultative, et facultative pour de bon : le fichier peut
   manquer, être vieux d'une semaine, ou ne contenir que des
   sources muettes. Aucun de ces cas n'empêche la note d'être
   écrite — ils la ramènent à ce qu'elle était avant, une lecture
   des seuls cours.

   Le seuil de 36 h n'est pas décoratif. Une note du vendredi
   rédigée sur les titres du lundi serait pire qu'une note sans
   actualité : elle aurait l'air informée.
   ------------------------------------------------------------- */
const PEREMPTION_ACTU_H = 36;

function actualite() {
  const chemin = join(RACINE, 'data', 'actualites.json');
  if (!existsSync(chemin)) return { texte: '', nb: 0, sources: [], motif: 'fichier absent' };

  let a;
  try { a = JSON.parse(readFileSync(chemin, 'utf8')); }
  catch (e) { return { texte: '', nb: 0, sources: [], motif: 'fichier illisible' }; }

  const ageH = (Date.now() - Date.parse(a.genere)) / 3600000;
  if (!(ageH < PEREMPTION_ACTU_H)) {
    return { texte: '', nb: 0, sources: [], motif: `relevé vieux de ${Math.round(ageH)} h` };
  }
  if (!a.articles || !a.articles.length) {
    return { texte: '', nb: 0, sources: [], motif: 'aucun titre' };
  }

  /* Groupés par journal plutôt qu'en une liste à plat : le modèle doit
     citer sa source, et un titre collé à son journal se cite mieux
     qu'un titre suivi d'une parenthèse. */
  const parSource = new Map();
  for (const art of a.articles) {
    if (!parSource.has(art.source)) parSource.set(art.source, []);
    parSource.get(art.source).push(art);
  }

  const texte = [...parSource.entries()].map(([nom, arts]) =>
    `## ${nom}\n` + arts.map(x =>
      `- ${x.titre}` + (x.resume ? `\n  ${x.resume}` : '')).join('\n')
  ).join('\n\n');

  const sources = a.sources.filter(x => x.retenus > 0).map(x => x.nom);
  return { texte, nb: a.articles.length, sources, fenetre: a.fenetreHeures, genere: a.genere, motif: '' };
}

/* Assemblage de l'invite, isolé pour être relisible à blanc. La
   composer dans l'appel rendait impossible de vérifier ce qu'on envoie
   sans le payer — et c'est justement ce qu'on veut relire le jour où la
   note dit quelque chose d'inattendu. */
function invite(genere, texte, actu) {
  return `# Ce qui est MESURÉ\n\n` +
    `Performances relevées à la clôture du ${genere}, en euros, dividendes réinvestis ` +
    `(cours de Bourse d'ETF capitalisants) :\n\n${texte}\n\n` +
    (actu.nb
      ? `# Ce qui est RAPPORTÉ\n\n` +
        `${actu.nb} titres parus dans les ${actu.fenetre} dernières heures, tels que ` +
        `${actu.sources.length} fils de presse les publient. Ce sont des titres de journaux, ` +
        `pas des faits établis, et la plupart n'ont rien à voir avec les marchés — écarte ` +
        `ceux-là sans les mentionner.\n\n${actu.texte}\n\n`
      : `# Ce qui est RAPPORTÉ\n\nRien : aucun relevé d'actualité n'est disponible aujourd'hui. ` +
        `Laisse « actualite » vide et ne suppose aucune cause.\n\n`) +
    `# Ta tâche\n\n` +
    `Rédige la note de marché interne correspondant à cette séance.`;
}

async function principal() {
  if (process.argv.includes('--blanc')) {
    const { genere, texte } = contexte();
    const actu = actualite();
    console.log('===== SYSTÈME =====\n' + CONSIGNE);
    console.log('\n===== UTILISATEUR =====\n' + invite(genere, texte, actu));
    console.log(`\n===== ${actu.nb} titre(s), ${actu.sources.length} source(s) — rien n'a été appelé ni écrit. =====`);
    return;
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('ANTHROPIC_API_KEY absente — note non générée (comportement normal si la clé n\'est pas configurée).');
    process.exit(0);
  }

  const { genere, texte, nbPoches } = contexte();
  console.log(`Variations disponibles : ${nbPoches} poches, arrêtées au ${genere}.`);

  const actu = actualite();
  console.log(actu.nb
    ? `Actualité : ${actu.nb} titre(s) sur ${actu.sources.length} source(s), fenêtre de ${actu.fenetre} h.`
    : `Actualité : aucune (${actu.motif}) — la note se rédigera sur les seuls cours.`);

  const client = new Anthropic();

  const reponse = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 8000,
    output_config: {
      effort: 'medium',
      format: { type: 'json_schema', schema: SCHEMA }
    },
    system: CONSIGNE,
    messages: [{ role: 'user', content: invite(genere, texte, actu) }]
  });

  if (reponse.stop_reason === 'refusal') {
    console.error('Requête déclinée par les classificateurs de sécurité :',
      reponse.stop_details ? reponse.stop_details.category : 'motif non précisé');
    process.exit(1);
  }

  const bloc = reponse.content.find(b => b.type === 'text');
  if (!bloc) { console.error('Réponse sans contenu texte.'); process.exit(1); }
  const note = JSON.parse(bloc.text);

  const sortie = [
    '/* ============================================================',
    '   NOTE DE MARCHÉ INTERNE',
    '   Fichier GÉNÉRÉ automatiquement par scripts/note-marche.mjs.',
    '   Ne pas modifier à la main : toute retouche sera écrasée.',
    '',
    '   DOCUMENT DE TRAVAIL DU CONSEILLER. Ne comporte aucune',
    '   recommandation et n\'est pas destiné à être remis en l\'état',
    '   à un client.',
    '   ============================================================ */', '',
    'const NOTE_MARCHE = '
  ].join('\n');

  writeFileSync(join(RACINE, 'js', 'data', 'note-marche.js'),
    sortie + JSON.stringify({
      genere, modele: reponse.model,
      tokens: { entree: reponse.usage.input_tokens, sortie: reponse.usage.output_tokens },
      /* La mention de provenance affichée sous la note se calcule ICI, à
         la rédaction, et pas à l'affichage : le jour où les sources
         tombent, la note déjà publiée doit continuer de dire ce qui a
         VRAIMENT servi à l'écrire. */
      actualite: { nb: actu.nb, sources: actu.sources, fenetre: actu.fenetre || null, releve: actu.genere || null },
      note
    }, null, 2) + ';\n');

  /* Le widget reprend le titre et la synthèse de la note. */
  const cheminWidget = join(RACINE, 'data', 'widget.json');
  if (existsSync(cheminWidget)) {
    const w = JSON.parse(readFileSync(cheminWidget, 'utf8'));
    w.note = { titre: note.titre, synthese: note.synthese };
    writeFileSync(cheminWidget, JSON.stringify(w));
  }

  console.log(`Note rédigée : « ${note.titre} »`);
  console.log(`${note.mouvements.length} mouvement(s) relevé(s), ${note.aVerifier.length} point(s) à vérifier.`);
  console.log(`${(note.actualite || []).length} fait(s) d'actualité retenu(s).`);
  console.log(`Tokens : ${reponse.usage.input_tokens} en entrée, ${reponse.usage.output_tokens} en sortie.`);
}

principal().catch(e => { console.error(e); process.exit(1); });
