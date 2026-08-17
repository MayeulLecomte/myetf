/* =============================================================
   MOTEUR DE RAPPROCHEMENT AU CONTRAT
   -------------------------------------------------------------
   Confronte l'univers de travail à la liste des supports du
   contrat, collée telle qu'elle sort de l'assureur — relevé PDF,
   tableur, extranet. C'est le seul contrôle qu'aucune source
   publique ne peut faire : un ETF peut exister, être excellent,
   et n'être référencé nulle part dans le contrat du client.

   Le rapprochement ne décide de rien : il rend un état des lieux
   en quatre parts, que le conseiller applique ou non.

   • trouvés     — le support est dans la liste, par son ISIN ou
                   par son nom. Seul l'ISIN est certain ; le nom
                   est un indice, rendu comme tel.
   • absents     — le support est dans l'univers mais pas dans la
                   liste : il n'est pas souscriptible.
   • hors univers— la liste porte un ISIN que l'univers ignore :
                   c'est là que se trouvent les supports à verser
                   depuis le catalogue.
   • ambigus     — une ligne sans ISIN qui désigne deux supports
                   également. Jamais tranchée d'office.

   Le rapprochement par nom ne retient qu'une correspondance
   UNIQUE et ne neutralise ni la couverture de change, ni la
   part de capitalisation : deux parts d'un même fonds ne sont
   pas le même support au contrat.
   ============================================================= */

const MoteurContrat = (function () {

  const RE_ISIN = /\b[A-Z]{2}[0-9A-Z]{9}[0-9]\b/g;
  const RE_ISIN_UN = /\b[A-Z]{2}[0-9A-Z]{9}[0-9]\b/;

  /* Mots qui ne distinguent rien : tous les supports de l'univers les
     portent. Ni « hedged », ni « couvert », ni les devises n'y figurent —
     ce sont eux, justement, qui séparent deux parts d'un même fonds. */
  const BRUIT = new Set([
    'ucits', 'etf', 'fcp', 'sicav', 'fund', 'funds', 'plc', 'part', 'parts',
    'de', 'du', 'des', 'le', 'la', 'les', 'l', 'd', 'the'
  ]);

  function normaliser(s) {
    return String(s === undefined || s === null ? '' : s)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  function mots(s) {
    return normaliser(s).split(' ').filter(m => m && m.length > 1 && !BRUIT.has(m));
  }

  function inclusDans(petit, grand) {
    const set = new Set(grand);
    return petit.every(m => set.has(m));
  }

  /**
   * Rapproche l'univers d'une liste de supports collée en texte libre.
   * @param {Array}  univers  supports de travail
   * @param {string} texte    la liste, une ligne par support de préférence
   * @returns {Object} rapport
   */
  function rapprocher(univers, texte) {
    const lignes = String(texte || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean);

    /* Les ISIN sont lus sur le texte entier, et pas seulement ligne à ligne :
       un copier-coller de PDF revient parfois d'un seul bloc. */
    const isinsLus = new Map();          /* isin → première ligne qui le porte */
    lignes.forEach(ligne => {
      const trouves = ligne.match(RE_ISIN);
      if (trouves) trouves.forEach(i => { if (!isinsLus.has(i)) isinsLus.set(i, ligne); });
    });

    const parIsin = new Map();
    univers.forEach(e => parIsin.set(e.isin, e));

    const trouves = [], ambigus = [], sansCorrespondance = [];
    const retenus = new Set();

    /* 1. Par ISIN — la seule correspondance certaine. */
    isinsLus.forEach((ligne, isin) => {
      const e = parIsin.get(isin);
      if (!e) return;
      retenus.add(isin);
      trouves.push({ isin, nom: e.nom, poche: e.poche, par: 'isin', ligne });
    });

    /* 2. Par nom, sur les seules lignes dépourvues d'ISIN. */
    const motsUnivers = univers.map(e => ({ etf: e, mots: mots(e.nom) }));

    lignes.forEach(ligne => {
      if (RE_ISIN_UN.test(ligne)) return;

      const m = mots(ligne);
      if (m.length < 3) { sansCorrespondance.push(ligne); return; }

      const candidats = motsUnivers.filter(u =>
        u.mots.length >= 3 &&
        (inclusDans(u.mots, m) || inclusDans(m, u.mots)));

      if (!candidats.length) { sansCorrespondance.push(ligne); return; }
      const nouveaux = candidats.filter(c => !retenus.has(c.etf.isin));
      if (!nouveaux.length) return;                       /* déjà pris par son ISIN */
      if (nouveaux.length > 1) {
        ambigus.push({ ligne, candidats: nouveaux.map(c => ({ isin: c.etf.isin, nom: c.etf.nom })) });
        return;
      }
      const e = nouveaux[0].etf;
      retenus.add(e.isin);
      trouves.push({ isin: e.isin, nom: e.nom, poche: e.poche, par: 'nom', ligne });
    });

    /* 3. Ce que l'univers porte et que la liste ignore. */
    const absents = univers.filter(e => !retenus.has(e.isin))
      .map(e => ({ isin: e.isin, nom: e.nom, poche: e.poche, verifie: !!e.verifie }));

    /* 4. Ce que la liste porte et que l'univers ignore. */
    const horsUnivers = [];
    isinsLus.forEach((ligne, isin) => { if (!parIsin.has(isin)) horsUnivers.push({ isin, ligne }); });

    /* 5. Poches que le rapprochement laisserait sans aucun support. */
    const pochesTotal = {}, pochesRetenues = {};
    univers.forEach(e => {
      pochesTotal[e.poche] = (pochesTotal[e.poche] || 0) + 1;
      if (retenus.has(e.isin)) pochesRetenues[e.poche] = (pochesRetenues[e.poche] || 0) + 1;
    });
    const pochesVidees = Object.keys(pochesTotal)
      .filter(p => !pochesRetenues[p])
      .map(p => ({ poche: p, total: pochesTotal[p] }));

    return {
      lignesLues: lignes.length,
      isinsLus: isinsLus.size,
      trouves, absents, horsUnivers, ambigus, sansCorrespondance, pochesVidees
    };
  }

  /**
   * Reporte un rapprochement sur l'univers : coche les supports trouvés,
   * les date et les rattache au contrat nommé.
   * @param {Array}  univers
   * @param {Object} rapport   issu de rapprocher()
   * @param {Object} o         {contrat, date, decocherAbsents}
   * @returns {{coches:number, decoches:number}}
   */
  function appliquer(univers, rapport, o) {
    o = o || {};
    const source = String(o.contrat || '').trim() || 'Liste des supports du contrat';
    const trouves = new Set(rapport.trouves.map(t => t.isin));
    let coches = 0, decoches = 0;

    univers.forEach(e => {
      if (trouves.has(e.isin)) {
        if (!e.verifie) coches++;
        e.verifie = true;
        e.verifieLe = o.date;
        e.verifieSource = source;
      } else if (o.decocherAbsents) {
        if (e.verifie) decoches++;
        e.verifie = false;
        delete e.verifieLe;
        delete e.verifieSource;
      }
    });

    return { coches, decoches };
  }

  return { rapprocher, appliquer, normaliser, mots };
})();
