#!/usr/bin/env node
/* =============================================================
   NOTE DE MARCHÉ INTERNE
   -------------------------------------------------------------
   Rédige une note de travail à partir des variations relevées
   par scripts/maj-cours.mjs, et l'écrit dans
   js/data/note-marche.js.

   ⚠  DOCUMENT INTERNE. La note décrit ce qui a bougé et ce que
   le conseiller devrait vérifier. Elle ne formule aucune
   recommandation d'achat ou de vente et n'est pas destinée à
   être remise à un client en l'état.

   Nécessite ANTHROPIC_API_KEY. Sans clé, le script s'arrête
   proprement sans rien écrire — l'application affiche alors la
   marche à suivre.

   Usage :  node scripts/note-marche.mjs
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
    }
  },
  required: ['titre', 'synthese', 'mouvements', 'aVerifier', 'indicateursASurveiller'],
  additionalProperties: false
};

const CONSIGNE = `Tu rédiges la note de marché interne d'un cabinet de conseil en gestion de patrimoine français.

Ton lecteur est le conseiller lui-même, un professionnel. Il lit cette note le matin, avant d'ouvrir ses dossiers. Elle l'aide à décider quoi regarder ; elle ne décide pas à sa place.

Règles impératives :
- N'émets AUCUNE recommandation d'achat, de vente ou d'arbitrage. Tu décris ce qui a bougé et ce que cela peut signifier ; le conseiller conclut.
- Ne cite aucun ETF ni aucun émetteur nommément. Raisonne au niveau des classes d'actifs et des poches.
- N'invente aucun chiffre. Tu ne disposes que des variations fournies ; si une explication te manque, dis-le plutôt que de la supposer.
- Ne commente pas d'actualité que les données ne montrent pas : tu vois des variations de cours, pas les nouvelles qui les expliquent. Formule les causes possibles au conditionnel, ou tais-toi.
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

async function principal() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.log('ANTHROPIC_API_KEY absente — note non générée (comportement normal si la clé n\'est pas configurée).');
    process.exit(0);
  }

  const { genere, texte, nbPoches } = contexte();
  console.log(`Variations disponibles : ${nbPoches} poches, arrêtées au ${genere}.`);

  const client = new Anthropic();

  const reponse = await client.messages.create({
    model: 'claude-opus-5',
    max_tokens: 8000,
    output_config: {
      effort: 'medium',
      format: { type: 'json_schema', schema: SCHEMA }
    },
    system: CONSIGNE,
    messages: [{
      role: 'user',
      content: `Performances relevées à la clôture du ${genere}, en euros, dividendes réinvestis ` +
        `(cours de Bourse d'ETF capitalisants) :\n\n${texte}\n\n` +
        `Rédige la note de marché interne correspondant à cette séance.`
    }]
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
  console.log(`Tokens : ${reponse.usage.input_tokens} en entrée, ${reponse.usage.output_tokens} en sortie.`);
}

principal().catch(e => { console.error(e); process.exit(1); });
