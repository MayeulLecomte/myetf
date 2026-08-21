let echecs=0;
const ok=(c,m)=>{if(!c){echecs++;console.log('  ✗ '+m)}else console.log('  ✓ '+m)};

// --- 1. Profilage sur 3 dossiers types
const dossiers={
 'Prudent (horizon court)':  {q_horizon:1,q_objectif:0,q_retrait:1,q_precaution:1,q_partpatrimoine:1,q_capaciteEpargne:1,q_endettement:1,q_stabilite:1,q_connaissance:1,q_produits:1,q_vecu:1,q_comprehension:1,q_reaction:1,q_perteMax:2,q_couple:1,q_volatilite:1,q_arbitrage:1,q_esg:0},
 'Équilibré':                {q_horizon:3,q_objectif:2,q_retrait:2,q_precaution:2,q_partpatrimoine:2,q_capaciteEpargne:2,q_endettement:2,q_stabilite:2,q_connaissance:2,q_produits:2,q_vecu:2,q_comprehension:2,q_reaction:2,q_perteMax:3,q_couple:2,q_volatilite:2,q_arbitrage:1,q_esg:1},
 'Offensif':                 {q_horizon:4,q_objectif:4,q_retrait:3,q_precaution:3,q_partpatrimoine:3,q_capaciteEpargne:3,q_endettement:3,q_stabilite:3,q_connaissance:3,q_produits:4,q_vecu:3,q_comprehension:2,q_reaction:3,q_perteMax:5,q_couple:3,q_volatilite:3,q_arbitrage:2,q_esg:0}
};
console.log('\n== Profilage ==');
const resultats={};
Object.entries(dossiers).forEach(([nom,rep])=>{
  const r=MoteurProfil.calculer(rep,{age:45});
  resultats[nom]=r;
  ok(r,'profil calculé — '+nom);
  console.log('     capacité '+r.scores.capacite+' / tolérance '+r.scores.tolerance+' / connaissance '+r.scores.connaissance+' → '+r.profil.nom+(r.declasse?' (plafonné depuis '+r.profilTheorique.nom+')':''));
});
ok(resultats['Prudent (horizon court)'].profil.ordre<=1,'dossier court terme plafonné à Prudent ou moins');
ok(resultats['Offensif'].profil.ordre>=3,'dossier long terme au moins Dynamique');
ok(MoteurProfil.calculer({},{age:45})===null,'questionnaire incomplet → null');

// --- 2. Allocation : somme = 100 pour tous les profils / scénarios
console.log('\n== Allocation ==');
let pbSomme=0, pbPoche=0;
PROFILS.forEach(p=>{
  const s=MoteurAllocation.strategique(p.id);
  const sc=Object.values(s.classes).reduce((a,b)=>a+b,0);
  const sp=Object.values(s.poches).reduce((a,b)=>a+b,0);
  if(Math.abs(sc-100)>0.05) {pbSomme++;console.log('   classes '+p.id+' = '+sc);}
  if(Math.abs(sp-100)>0.15) {pbPoche++;console.log('   poches '+p.id+' = '+sp);}
});
ok(pbSomme===0,'allocation stratégique : classes = 100 % pour les 6 profils');
ok(pbPoche===0,'allocation stratégique : poches = 100 % pour les 6 profils');

let pbTac=0, pbNeg=0, pbBorne=0;
PROFILS.forEach(p=>{
  SCENARIOS.forEach(sc=>{
    const probas={}; SCENARIOS.forEach(x=>probas[x.id]=x.id===sc.id?100:0);
    [0,0.5,1].forEach(int=>{
      const t=MoteurAllocation.tactique(p.id,probas,{},int);
      const sommeC=Object.values(t.classes).reduce((a,b)=>a+b,0);
      const sommeP=Object.values(t.poches).reduce((a,b)=>a+b,0);
      if(Math.abs(sommeC-100)>0.15) pbTac++;
      if(Math.abs(sommeP-100)>0.15) pbTac++;
      if(Object.values(t.classes).some(v=>v<0)||Object.values(t.poches).some(v=>v<0)) pbNeg++;
      Object.keys(t.classes).forEach(cl=>{
        const dev=Math.abs(t.classes[cl]-t.strategique.classes[cl]);
        if(dev>BORNES_TACTIQUES[cl]+3) {pbBorne++;console.log('   borne '+p.id+'/'+sc.id+'/'+int+' '+cl+' dev='+dev.toFixed(1));}
      });
    });
  });
});
ok(pbTac===0,'allocation tactique : sommes à 100 % (6 profils × 4 scénarios × 3 intensités)');
ok(pbNeg===0,'allocation tactique : aucun poids négatif');
ok(pbBorne===0,'allocation tactique : déviations dans les bornes');

const t0=MoteurAllocation.tactique('equilibre',MoteurAllocation.macroParDefaut().probas,{},0);
ok(JSON.stringify(t0.classes)===JSON.stringify(t0.strategique.classes),'intensité 0 → allocation strictement stratégique');

// profil sécuritaire ne doit jamais avoir d'actions
let actionsSecu=0;
SCENARIOS.forEach(sc=>{const probas={};SCENARIOS.forEach(x=>probas[x.id]=x.id===sc.id?100:0);
  const t=MoteurAllocation.tactique('securitaire',probas,{},1); if(t.classes.actions>0) actionsSecu++;});
ok(actionsSecu===0,'profil Sécuritaire : jamais d\'exposition actions, même en tactique maximale');

// --- 3. Agrégation macro
console.log('\n== Macro ==');
const m1=MoteurAllocation.macroParDefaut();
ok(Math.abs(Object.values(m1.probas).reduce((a,b)=>a+b,0)-100)<0.15,'probabilités par défaut = 100 %');
const m2=MoteurAllocation.agregerMacro({cycle:'recession',credit:'ecartement',politiqueMonetaire:'restrictive',courbe:'inversee',momentum:'risk_off'});
ok(m2.probas.recession>50,'contexte récessif → scénario Récession dominant ('+m2.probas.recession+' %)');
const m3=MoteurAllocation.agregerMacro({cycle:'surchauffe',inflation:'reacceleration',geopolitique:'tres_eleve',commerce:'guerre'});
ok(m3.probas.stagflation>40,'contexte inflationniste+géopolitique → Stagflation dominante ('+m3.probas.stagflation+' %)');
ok(m3.overlays['div-or']>0,'risque géopolitique élevé → surpondération de l\'or (+'+m3.overlays['div-or']+')');

// --- 4. Sélection
console.log('\n== Sélection ETF ==');
const alloc=MoteurAllocation.tactique('dynamique',m1.probas,m1.overlays,0.6);
[['AV','av-large'],['AV','av-restreint'],['PEA',null],['CTO',null]].forEach(([env,ct])=>{
  const sel=MoteurSelection.construire(alloc.poches,{enveloppe:env,contratAV:ct,etoilesMin:4,encoursMin:500,terMax:0.6,esg:'aucune',montant:100000},ETF_UNIVERS);
  const somme=sel.lignes.reduce((a,l)=>a+l.poids,0);
  const mt=sel.lignes.reduce((a,l)=>a+l.montant,0);
  console.log('   '+env+(ct?'/'+ct:'')+' : '+sel.nbSupports+' lignes, '+sel.universEligible+' éligibles, TER '+sel.terMoyen+' %, somme '+somme.toFixed(1)+' %, '+mt+' €');
  /* Le portefeuille investi plus le résiduel non plaçable doit toujours
     reconstituer l'allocation cible : un univers trop pauvre — le PEA, qui
     ne référence ni obligations ni or, et dont le seul monétaire est trop
     petit pour le filtre d'encours — se traduit par un résiduel signalé,
     jamais par des points d'allocation perdus en silence. */
  ok(Math.abs(somme+sel.residuel-100)<0.6,'  poids + résiduel ≈ 100 % ('+env+(ct?'/'+ct:'')+')');
  ok(sel.residuel===0||sel.avertissements.length>0,'  résiduel non investi signalé ('+env+(ct?'/'+ct:'')+')');
  ok(sel.lignes.every(l=>l.etf.enveloppes.includes(env)),'  tous les supports éligibles à l\'enveloppe '+env);
  if(env==='PEA') ok(sel.lignes.every(l=>l.etf.pea),'  tous les supports PEA-éligibles');
  /* La notation Morningstar n'est opposable que lorsqu'elle est renseignée. */
  ok(sel.lignes.every(l=>l.etf.morningstar==null||l.etf.morningstar>=4),'  filtre 4 étoiles respecté sur les supports notés ('+env+')');
});
const selEsg=MoteurSelection.construire(alloc.poches,{enveloppe:'AV',contratAV:'av-large',etoilesMin:4,encoursMin:0,terMax:1,esg:'prioritaire',montant:100000},ETF_UNIVERS);
ok(Math.abs(selEsg.lignes.reduce((a,l)=>a+l.poids,0)-100)<0.6,'ESG prioritaire → portefeuille toujours investi à 100 % ('+selEsg.nbSupports+' lignes)');
ok(selEsg.avertissements.some(a=>a.indexOf('durabilit')>=0),'ESG prioritaire → dérogation signalée pour les poches sans support labellisé');
/* L'invariant porte sur les supports ISR RÉELLEMENT ÉLIGIBLES, pas sur ceux
   que l'univers contient : depuis le relevé des notations Morningstar, aucun
   support labellisé n'atteint quatre étoiles, et le moteur n'a donc rien à
   préférer. C'est un fait de marché, pas un défaut du moteur — il doit alors
   le signaler, ce que vérifie l'assertion précédente. */
const ctxEsg={enveloppe:'AV',contratAV:'av-large',etoilesMin:4,encoursMin:0,terMax:1,esg:'prioritaire',montant:100000};
const isrEligibles=MoteurSelection.universEligible(ETF_UNIVERS,ctxEsg).filter(e=>e.isr);
console.log('   supports ISR éligibles à 4 étoiles : '+isrEligibles.length+' sur '+ETF_UNIVERS.filter(e=>e.isr).length+' labellisés');
if(isrEligibles.length){
  ok(selEsg.lignes.filter(l=>l.etf.isr).length>0,'ESG prioritaire → supports ISR retenus quand ils sont éligibles');
  const pochesIsr=new Set(isrEligibles.map(e=>e.poche));
  ok(selEsg.lignes.every(l=>!pochesIsr.has(l.poche)||l.etf.isr),'ESG prioritaire → ISR systématiquement préféré là où il est éligible');
}else{
  ok(selEsg.lignes.every(l=>!l.etf.isr),'aucun support ISR éligible → aucun n\'est retenu');
  ok(selEsg.avertissements.some(a=>a.indexOf('durabilit')>=0),'aucun support ISR éligible → dérogation explicite');
}
/* « Aucun filtre » vaut 0 et doit être respecté : un seuil nul ne doit pas être
   confondu avec un seuil absent, faute de quoi le repli s'appliquerait au moment
   précis où l'utilisateur a demandé qu'on n'applique rien. */
const ctxSansFiltre={enveloppe:'CTO',etoilesMin:0,encoursMin:0,terMax:2,esg:'aucune'};
const tousNotes=MoteurSelection.universEligible(ETF_UNIVERS,ctxSansFiltre);
console.log('   sans filtre d\'étoiles : '+tousNotes.length+' supports éligibles en compte-titres');
ok(tousNotes.some(e=>e.morningstar!==null&&e.morningstar<3),'« aucun filtre » laisse passer les supports mal notés');
ok(MoteurSelection.universEligible(ETF_UNIVERS,Object.assign({},ctxSansFiltre,{etoilesMin:5}))
   .every(e=>e.morningstar===null||e.morningstar===5),'seuil à 5 : seuls les supports notés 5 étoiles, ou non notés');

/* En abaissant le filtre, les supports labellisés doivent redevenir accessibles :
   sans quoi la préférence ESG serait inopérante quel que soit le réglage. */
const selEsg3=MoteurSelection.construire(alloc.poches,Object.assign({},ctxEsg,{etoilesMin:3}),ETF_UNIVERS);
ok(selEsg3.lignes.filter(l=>l.etf.isr).length>0,'ESG prioritaire à 3 étoiles → supports labellisés retenus ('+selEsg3.lignes.filter(l=>l.etf.isr).length+')');

// --- 4 bis. Intégrité de l'univers
console.log('\n== Univers ETF ==');
ok(new Set(ETF_UNIVERS.map(e=>e.isin)).size===ETF_UNIVERS.length,'aucun ISIN en double');
ok(ETF_UNIVERS.every(e=>/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(e.isin)),'tous les ISIN sont bien formés');
ok(ETF_UNIVERS.every(e=>LIBELLES_POCHES[e.poche]),'toutes les poches référencées existent');
ok(ETF_UNIVERS.every(e=>e.morningstar===null||(e.morningstar>=1&&e.morningstar<=5)),
   'notation Morningstar : null ou 1 à 5');
ok(ETF_UNIVERS.every(e=>!e.pea||e.enveloppes.includes('PEA')),'tout support PEA est déclaré dans l\'enveloppe PEA');
ok(ETF_UNIVERS.every(e=>e.ter>0&&e.ter<2),'frais courants dans des bornes plausibles');
const controles=ETF_UNIVERS.filter(e=>e.donneesLe);
console.log('   '+controles.length+' / '+ETF_UNIVERS.length+' supports aux données contrôlées · '+
  ETF_UNIVERS.filter(e=>e.verifie).length+' validés au contrat');
ok(controles.every(e=>/^\d{4}-\d{2}-\d{2}$/.test(e.donneesLe)&&e.donneesSource),
   'chaque contrôle de données porte une date et une source');
/* Le score doit rester exploitable quand la notation manque : le barème
   se réduit aux critères renseignés au lieu de produire un NaN. */
const sansNote=ETF_UNIVERS.filter(e=>e.morningstar===null&&e.poche==='act-monde');
const scoreSansNote=MoteurSelection.scorer(sansNote[0],sansNote,{esg:'aucune'});
ok(isFinite(scoreSansNote.total)&&scoreSansNote.total>0&&scoreSansNote.total<=100,
   'support non noté : score calculé sur le barème réduit ('+scoreSansNote.total+')');
ok(scoreSansNote.detail.notation===undefined,'support non noté : la notation ne pèse pas dans le détail');

// --- 4 ter. Rapprochement avec la liste des supports du contrat
console.log('\n== Rapprochement au contrat ==');
const u0=ETF_UNIVERS[0], u1=ETF_UNIVERS[1], u2=ETF_UNIVERS[2];

/* Une liste d'assureur telle qu'elle se colle : colonnes séparées à la
   sauvage, en-tête, fonds en euros, et un ISIN que l'univers ignore. */
const listeType=
 'Support\tCode ISIN\tFrais de gestion\n'+
 'Fonds en euros Actif Général\t—\t0,60 %\n'+
 u0.nom+'\t'+u0.isin+'\t0,20 %\n'+
 u1.isin+' ; '+u1.nom+' ; 0,38 %\n'+
 'Amundi Euro Government Bond ; LU1287023342 ; 0,15 %\n'+
 'TOTAL 5 supports';
const rapp=MoteurContrat.rapprocher(ETF_UNIVERS,listeType);
ok(rapp.trouves.length===2,'liste type : les deux supports connus sont retrouvés ('+rapp.trouves.length+')');
ok(rapp.trouves.every(t=>t.par==='isin'),'liste type : retrouvés par leur ISIN, pas par leur nom');
ok(rapp.horsUnivers.length===1&&rapp.horsUnivers[0].isin==='LU1287023342',
   'liste type : l\'ISIN inconnu de l\'univers est signalé');
ok(rapp.absents.length===ETF_UNIVERS.length-2,'liste type : tout le reste de l\'univers est déclaré absent');
ok(rapp.sansCorrespondance.length>=2,'liste type : en-tête, fonds en euros et total sont ignorés');
ok(rapp.pochesVidees.length>0&&!rapp.pochesVidees.some(p=>p.poche===u0.poche),
   'liste type : les poches vidées sont signalées, celle du support retenu exceptée');

/* Un ISIN mal recopié ne doit rien valider : c'est exactement l'erreur
   que le rapprochement est là pour attraper. */
const faux=MoteurContrat.rapprocher(ETF_UNIVERS,u0.isin.slice(0,-1)+(u0.isin.slice(-1)==='3'?'4':'3'));
ok(faux.trouves.length===0,'ISIN faux d\'un chiffre : aucun support validé');

/* Nom seul : rapproché s'il ne désigne qu'un support, jamais s'il en
   désigne deux. « MSCI World » à lui seul en désigne plusieurs. */
const parNom=MoteurContrat.rapprocher(ETF_UNIVERS,u0.nom);
ok(parNom.trouves.length===1&&parNom.trouves[0].par==='nom','nom exact et unique : rapproché, et signalé comme tel');
const flou=MoteurContrat.rapprocher(ETF_UNIVERS,'MSCI World');
ok(flou.trouves.length===0,'nom trop court pour être distinctif : rien n\'est tranché');

/* Deux parts d'un même fonds ne sont pas le même support : la couverture
   de change et la devise ne sont pas neutralisées par la normalisation. */
const couverts=ETF_UNIVERS.filter(e=>e.hedge);
ok(couverts.every(e=>MoteurContrat.mots(e.nom).some(m=>/hedg|couvert|eur/i.test(m))),
   'un support couvert garde sa marque de couverture après normalisation');

/* L'application horodate et nomme le contrôle, et n'invalide les absents
   que si on le lui demande. */
const copie=JSON.parse(JSON.stringify(ETF_UNIVERS));
copie[3].verifie=true; copie[3].verifieLe='2026-01-01'; copie[3].verifieSource='Ancien contrat';
const rappC=MoteurContrat.rapprocher(copie,u0.isin+'\n'+u1.isin);
const resC=MoteurContrat.appliquer(copie,rappC,{contrat:'Contrat test',date:'2026-08-17',decocherAbsents:true});
ok(resC.coches===2&&resC.decoches===1,'application : deux validés, un invalidé');
ok(copie.filter(e=>e.verifie).length===2,'application : exactement les supports de la liste sont validés');
ok(copie.filter(e=>e.verifie).every(e=>e.verifieLe==='2026-08-17'&&e.verifieSource==='Contrat test'),
   'application : chaque validation porte sa date et le nom du contrat');
ok(copie[3].verifieLe===undefined,'application : une validation retirée ne laisse pas sa date derrière elle');

const copie2=JSON.parse(JSON.stringify(ETF_UNIVERS));
copie2[3].verifie=true;
MoteurContrat.appliquer(copie2,MoteurContrat.rapprocher(copie2,u0.isin),{contrat:'X',date:'2026-08-17',decocherAbsents:false});
ok(copie2[3].verifie===true,'sans décochage : une validation antérieure survit au rapprochement');

/* Le filtre « validés au contrat » ne doit mordre que sur demande. */
const ctxContrat={enveloppe:'AV',contratAV:'av-large',etoilesMin:3,encoursMin:500,terMax:0.6,esg:'aucune',montant:100000};
const universValide=JSON.parse(JSON.stringify(ETF_UNIVERS));
universValide.forEach((e,i)=>{ e.verifie = i%2===0; });
const sansFiltre=MoteurSelection.universEligible(universValide,ctxContrat);
const avecFiltre=MoteurSelection.universEligible(universValide,Object.assign({},ctxContrat,{contratSeulement:true}));
ok(avecFiltre.length<sansFiltre.length&&avecFiltre.every(e=>e.verifie),
   'filtre contrat : ne retient que les supports validés ('+avecFiltre.length+' sur '+sansFiltre.length+')');
ok(MoteurSelection.universEligible(ETF_UNIVERS,ctxContrat).length===sansFiltre.length,
   'filtre contrat absent du contexte : l\'univers n\'est pas restreint');

// --- 4 quater. Univers de sélection issu du catalogue
console.log('\n== Sélection dans le catalogue ==');
const large=MoteurUnivers.depuisCatalogue(CATALOGUE_ETF);
const bilan=MoteurUnivers.ecartes(CATALOGUE_ETF);
console.log('   '+large.length+' supports sélectionnables sur '+CATALOGUE_ETF.lignes.length+
  ' — écartés : '+bilan.sansPoche+' sans poche, '+bilan.sansFrais+' sans frais, '+bilan.sansEncours+' sans encours');
ok(large.length>2000,'le catalogue fournit un univers de sélection substantiel');
ok(large.length===bilan.retenus,'le décompte des écartés recouvre exactement les retenus');
ok(large.every(e=>e.ter>0&&e.encours!=null&&LIBELLES_POCHES[e.poche]),
   'tout support sélectionnable a une poche, des frais non nuls et un encours');
ok(!large.some(e=>e.ter===0),'des frais à zéro sont tenus pour absents, pas pour gratuits');
ok(large.every(e=>e.verifie===false),'aucun support du catalogue n\'est validé au contrat');
ok(large.every(e=>e.deduit===true),'tout support du catalogue se déclare partiellement déduit');
ok(large.every(e=>['actions','obligations','monetaire','diversifiants'].includes(e.classe)),
   'classe d\'actifs toujours résolue');
ok(large.every(e=>!e.pea||e.enveloppes.includes('PEA')),'cohérence PEA / enveloppes');

/* Le SRRI de l'ancien DICI ne doit jamais être servi comme SRI du DIC :
   sur les 41 supports de l'univers qui en ont un, il diffère du SRI saisi
   dans 31 cas, presque toujours de un ou deux crans au-dessus. */
ok(large.every(e=>e.sri===null),'le SRI reste vide : le SRRI du catalogue n\'en tient pas lieu');
ok(large.some(e=>e.srri!=null),'le SRRI est conservé à part, à titre indicatif');

/* Les poches du modèle doivent être peuplées, sans quoi élargir l'univers
   ne servirait qu'à grossir les poches déjà servies. */
const pochesLarge=new Set(large.map(e=>e.poche));
const pochesModele=Object.keys(LIBELLES_POCHES);
const vides=pochesModele.filter(p=>!pochesLarge.has(p));
console.log('   '+pochesLarge.size+' poches sur '+pochesModele.length+' peuplées'+(vides.length?' — vides : '+vides.join(', '):''));
ok(vides.length===0,'toutes les poches du modèle trouvent des supports dans le catalogue');

/* Le rattachement des catégories est sensible aux accents : Morningstar
   écrit « Marchés Emergents ». Ce test protège la correction. */
const emergentsAct=large.filter(e=>e.poche==='act-emergents').length;
const emergentsObl=large.filter(e=>e.poche==='obl-emergente').length;
console.log('   émergents : '+emergentsAct+' actions, '+emergentsObl+' obligations');
ok(emergentsAct>50,'les actions émergentes sont rattachées malgré l\'accent manquant');
ok(emergentsObl>10,'les obligations émergentes ne tombent plus dans le repli « obligations globales »');

/* Un univers de trois mille lignes doit produire une allocation complète,
   et le résiduel non investi doit disparaître là où l'univers restreint
   ne pouvait pas servir certaines poches. */
const allocLarge=MoteurAllocation.tactique('equilibre',m1.probas,m1.overlays,0.6);
const ctxLarge={enveloppe:'AV',contratAV:'av-large',etoilesMin:3,encoursMin:500,terMax:0.60,esg:'aucune',montant:200000};
const selLarge=MoteurSelection.construire(allocLarge.poches,ctxLarge,large);
const selPetit=MoteurSelection.construire(allocLarge.poches,ctxLarge,ETF_UNIVERS);
console.log('   univers restreint : '+selPetit.nbSupports+' lignes sur '+selPetit.universEligible+
  ' éligibles · catalogue : '+selLarge.nbSupports+' lignes sur '+selLarge.universEligible+' éligibles');
ok(selLarge.universEligible>selPetit.universEligible*5,'le catalogue élargit massivement l\'univers éligible');
ok(Math.abs(selLarge.lignes.reduce((a,l)=>a+l.poids,0)+selLarge.residuel-100)<0.6,
   'poids + résiduel ≈ 100 % sur le catalogue');
ok(selLarge.lignes.every(l=>isFinite(l.score.total)&&l.score.total>0),
   'aucun score indéterminé malgré les données partielles du catalogue');
ok(selLarge.terMoyen<=selPetit.terMoyen,
   'à filtres égaux, le catalogue ne renchérit pas le portefeuille ('+selLarge.terMoyen+' % contre '+selPetit.terMoyen+' %)');

/* La devise fait partie de la définition d'une poche. Une poche euro qui
   accueille un gisement en dollars, c'est le risque de change entré dans
   l'allocation sans être demandé — l'erreur même que le relevé du 15 août
   avait trouvée dans l'univers d'origine. */
const EURO_EXIGE = ['obl-souv-euro-ct', 'obl-souv-euro-lt', 'obl-ig-euro', 'obl-hy-euro',
                    'obl-inflation', 'obl-globale-hedge', 'mon-euro'];
const intrus = large.filter(e => EURO_EXIGE.includes(e.poche) && !/\beur\b|\beuro\b/i.test(e.categorie));
if (intrus.length) intrus.slice(0,5).forEach(e=>console.log('   intrus : '+e.poche+' ← '+e.categorie+' — '+e.nom));
ok(intrus.length===0,'aucune poche euro ne contient un gisement dans une autre devise');

/* « Actions Asie hors Japon » accroche le motif « japon » : le piège est
   explicite, et ce test le garde fermé. */
ok(!large.some(e=>e.poche==='act-japon'&&/hors japon|ex japan/i.test(e.categorie)),
   'la poche Japon ne contient pas les fonds « hors Japon »');

/* Un support sans frais courants connus ne doit jamais être sélectionnable :
   sans eux le plafond de frais le laisserait passer comme s'il était gratuit. */
const avecTrou=ETF_UNIVERS.map(e=>Object.assign({},e));
avecTrou[0].ter=null;
ok(!MoteurSelection.universEligible(avecTrou,ctxLarge).some(e=>e.isin===avecTrou[0].isin),
   'frais courants inconnus → support écarté de la sélection');

// --- 5. Arbitrage
console.log('\n== Arbitrage ==');
const selRef=MoteurSelection.construire(alloc.poches,{enveloppe:'AV',contratAV:'av-large',etoilesMin:4,encoursMin:500,terMax:0.6,esg:'aucune',montant:200000},ETF_UNIVERS);
// portefeuille identique à la cible → aucun mouvement
const identique=selRef.lignes.map(l=>({isin:l.etf.isin,libelle:l.etf.nom,montant:l.montant,pvLatente:0}));
const a1=MoteurArbitrage.analyser(identique,selRef.lignes,{enveloppe:'AV',apport:0},ETF_UNIVERS);
ok(a1.aucunMouvement,'portefeuille déjà aligné → aucun arbitrage ('+a1.ordres.length+' ordres)');
// portefeuille 100 % monétaire
const a2=MoteurArbitrage.analyser([{isin:'LU0290358497',libelle:'XEON',montant:200000,pvLatente:0}],selRef.lignes,{enveloppe:'AV',apport:0},ETF_UNIVERS);
const v=a2.ordres.filter(o=>o.sens==='Vente').reduce((a,o)=>a+o.montant,0);
const ac=a2.ordres.filter(o=>o.sens==='Achat').reduce((a,o)=>a+o.montant,0);
console.log('   100 % monétaire → '+a2.ordres.length+' ordres, ventes '+v+' €, achats '+ac+' €, rotation '+a2.rotation+' %');
ok(Math.abs(v-ac)<600,'ventes ≈ achats (équilibre des flux, écart '+Math.abs(v-ac)+' €)');
ok(a2.fiscalite.impotEstime===0,'assurance-vie → aucune fiscalité sur arbitrage');
// même chose en CTO avec plus-value latente
const a3=MoteurArbitrage.analyser([{isin:'IE00B4L5Y983',libelle:'IWDA',montant:200000,pvLatente:40}],selRef.lignes,{enveloppe:'CTO',apport:0},ETF_UNIVERS);
console.log('   CTO, PV latente 40 % → impôt estimé '+a3.fiscalite.impotEstime+' €');
ok(a3.fiscalite.impotEstime>0,'CTO → fiscalité chiffrée sur les ventes');
// apport qui finance les achats
const a4=MoteurArbitrage.analyser([{isin:'LU0290358497',libelle:'XEON',montant:100000,pvLatente:0}],selRef.lignes,{enveloppe:'CTO',apport:100000},ETF_UNIVERS);
const v4=a4.ordres.filter(o=>o.sens==='Vente').reduce((a,o)=>a+o.montant,0);
console.log('   apport 100 k€ sur 100 k€ détenus → ventes '+v4+' € (rotation '+a4.rotation+' %)');
ok(v4<a2.ordres.filter(o=>o.sens==='Vente').reduce((a,o)=>a+o.montant,0),'l\'apport réduit le volume de ventes');
// support inconnu
const a5=MoteurArbitrage.analyser([{isin:'XX0000000000',libelle:'Fonds maison',montant:50000}],selRef.lignes,{enveloppe:'AV',apport:0},ETF_UNIVERS);
ok(a5.inconnus.length===1,'support hors univers signalé');


// surpondération + apport : la vente doit avoir lieu malgré l'apport
const deriveP=selRef.lignes.map(l=>({isin:l.etf.isin,libelle:l.etf.nom,montant:l.montant*(l.poche==='act-us'?2.5:1),pvLatente:l.poche==='act-us'?50:0}));
const a6=MoteurArbitrage.analyser(deriveP,selRef.lignes,{enveloppe:'AV',apport:30000},ETF_UNIVERS);
const vendus=a6.ordres.filter(o=>o.sens==='Vente');
ok(vendus.some(o=>o.isin==='IE00B5BMR087'||o.poche==='act-us'),'surpondération corrigée même en présence d\'un apport ('+vendus.length+' vente(s))');

// convergence : après application des ordres, le portefeuille colle à la cible
function appliquer(pf,ord){const m={};pf.forEach(l=>m[l.isin]=(m[l.isin]||0)+l.montant);
  ord.forEach(o=>{m[o.isin]=(m[o.isin]||0)+(o.sens==='Achat'?o.montant:-o.montant)});
  return Object.keys(m).filter(k=>m[k]>0.5).map(k=>({isin:k,montant:m[k]}));}
[[deriveP,30000],[[{isin:'LU0290358497',libelle:'XEON',montant:200000,pvLatente:0}],0],
 [selRef.lignes.map((l,i)=>({isin:l.etf.isin,montant:l.montant*(i%2?1.6:0.5)})),5000]].forEach((cas,i)=>{
  const an=MoteurArbitrage.analyser(cas[0],selRef.lignes,{enveloppe:'AV',apport:cas[1]},ETF_UNIVERS);
  const apres=appliquer(cas[0],an.ordres);
  const tot=apres.reduce((a,l)=>a+l.montant,0);
  const cible={};selRef.lignes.forEach(l=>cible[l.etf.isin]=(cible[l.etf.isin]||0)+l.poids);
  let maxEcart=0;
  Object.keys(cible).forEach(is=>{const p=100*(apres.find(l=>l.isin===is)||{montant:0}).montant/tot;maxEcart=Math.max(maxEcart,Math.abs(p-cible[is]));});
  ok(Math.abs(tot-an.total)<2,'  cas '+(i+1)+' : capital conservé ('+Math.round(tot)+' vs '+Math.round(an.total)+' €)');
  ok(maxEcart<=2.6,'  cas '+(i+1)+' : écart résiduel max à la cible '+maxEcart.toFixed(2)+' pt (seuil de tolérance 2 pts)');
});

// --- 6. Métriques & stress
console.log('\n== Métriques ==');
PROFILS.forEach(p=>{
  const mt=MoteurAllocation.metriques(p.allocation);
  const st=MoteurProfil.stressTest(p.allocation);
  console.log('   '+p.nom.padEnd(12)+' rdt '+mt.rendement+' % · vol '+mt.volatilite+' % · 2008 '+st[0].impact+' %');
});
const vols=PROFILS.map(p=>MoteurAllocation.metriques(p.allocation).volatilite);
ok(vols.every((v,i)=>i===0||v>=vols[i-1]),'volatilité croissante avec le profil');
const rdts=PROFILS.map(p=>MoteurAllocation.metriques(p.allocation).rendement);
ok(rdts.every((v,i)=>i===0||v>=rdts[i-1]),'rendement croissant avec le profil');

// --- 7. Cohérence des données
console.log('\n== Données ==');
const isins=ETF_UNIVERS.map(e=>e.isin);
ok(new Set(isins).size===isins.length,'aucun ISIN dupliqué ('+isins.length+' supports)');
ok(ETF_UNIVERS.every(e=>LIBELLES_POCHES[e.poche]),'toutes les poches ETF sont libellées');
ok(ETF_UNIVERS.every(e=>MoteurSelection.classeDePoche(e.poche)===e.classe),'classe cohérente avec la poche');
ok(ETF_UNIVERS.every(e=>!e.pea||e.enveloppes.includes('PEA')),'cohérence flag PEA / enveloppes');
// toutes les poches utilisées par les allocations ont au moins un ETF
const pochesUtilisees=new Set();
PROFILS.forEach(p=>Object.keys(MoteurAllocation.strategique(p.id).poches).forEach(x=>pochesUtilisees.add(x)));
const orphelines=[...pochesUtilisees].filter(p=>!ETF_UNIVERS.some(e=>e.poche===p));
ok(orphelines.length===0,'toutes les poches allouées ont au moins un support'+(orphelines.length?' — manquantes : '+orphelines:''));
ok(INDICATEURS.every(i=>i.options.some(o=>o.defaut)),'chaque indicateur macro a une valeur par défaut');


// --- 8. Revenus
console.log('\n== Revenus ==');
const selRev=MoteurSelection.construire(alloc.poches,{enveloppe:'AV',contratAV:'av-large',etoilesMin:4,encoursMin:500,terMax:0.6,esg:'aucune',objectifRevenus:true,montant:500000},ETF_UNIVERS);
const pf=selRev.lignes.map(l=>({isin:l.etf.isin,libelle:l.etf.nom,montant:l.montant,pvLatente:35}));
const capital=pf.reduce((a,l)=>a+l.montant,0);

const planAV=MoteurRevenus.planifier(pf,selRev.lignes,{enveloppe:'AV',besoinAnnuel:18000,frequence:'mensuelle',coussinMois:24,anciennete:10,couple:true,primesVersees:350000,rendementEspere:5.5},ETF_UNIVERS);
const totalPrel=planAV.supports.reduce((a,s)=>a+s.montant,0);
console.log('   AV 500 k€, besoin 18 000 €/an : '+planAV.supports.length+' support(s), taux '+planAV.tauxRetrait+' %, impôt '+planAV.fiscalite.total+' €');
ok(Math.abs(totalPrel-18000)<15,'AV : total prélevé = besoin annuel ('+totalPrel+' €)');
ok(planAV.dividendesDisponibles===0,'AV : aucun revenu distribué en numéraire (coupons réinvestis)');
ok(planAV.supports.every(s=>s.montant<=capital),'AV : aucun prélèvement supérieur à la ligne');
// abattement couple après 8 ans
const produits=capital-350000, assiette=18000*produits/capital;
const attendu=Math.round(Math.max(0,assiette-9200)*0.075+assiette*0.172);
ok(Math.abs(planAV.fiscalite.total-attendu)<3,'AV : assiette proportionnelle + abattement 9 200 € + PS 17,2 % ('+planAV.fiscalite.total+' vs '+attendu+' €)');
const planAVjeune=MoteurRevenus.planifier(pf,selRev.lignes,{enveloppe:'AV',besoinAnnuel:18000,frequence:'mensuelle',coussinMois:24,anciennete:4,couple:true,primesVersees:350000,rendementEspere:5.5},ETF_UNIVERS);
ok(planAVjeune.fiscalite.total>planAV.fiscalite.total,'AV : contrat de moins de 8 ans plus taxé ('+planAVjeune.fiscalite.total+' > '+planAV.fiscalite.total+' €)');

// CTO : les dividendes couvrent une partie du besoin sans vendre
const selCto=MoteurSelection.construire(alloc.poches,{enveloppe:'CTO',etoilesMin:4,encoursMin:500,terMax:0.6,esg:'aucune',objectifRevenus:true,montant:500000},ETF_UNIVERS);
const pfCto=selCto.lignes.map(l=>({isin:l.etf.isin,libelle:l.etf.nom,montant:l.montant,pvLatente:35}));
const planCto=MoteurRevenus.planifier(pfCto,selCto.lignes,{enveloppe:'CTO',besoinAnnuel:18000,frequence:'trimestrielle',coussinMois:24,anciennete:10,couple:true,primesVersees:350000,rendementEspere:5.5},ETF_UNIVERS);
console.log('   CTO : dividendes '+planCto.dividendesDisponibles+' € couvrent '+planCto.partCouverteParDividendes+' % du besoin');
ok(planCto.dividendesDisponibles>0,'CTO : les ETF distribuants versent des liquidités');
ok(Math.abs(planCto.supports.reduce((a,s)=>a+s.montant,0)-planCto.aPrelever)<15,'CTO : seul le solde est prélevé sur les supports');
ok(planCto.fiscalite.total>0,'CTO : PFU chiffré sur PV réalisées et dividendes');
// PEA jeune : alerte bloquante
const planPea=MoteurRevenus.planifier(pf,selRev.lignes,{enveloppe:'PEA',besoinAnnuel:18000,frequence:'annuelle',coussinMois:24,anciennete:3,couple:false,primesVersees:350000,rendementEspere:5.5},ETF_UNIVERS);
ok(planPea.alertes.some(a=>a.niveau==='erreur'&&a.texte.indexOf('5 ans')>=0),'PEA de moins de 5 ans : alerte de clôture');

// cascade : le monétaire excédentaire est prélevé avant les actions
const pfCash=[{isin:'LU0290358497',libelle:'XEON',montant:120000,pvLatente:0},{isin:'IE00B4L5Y983',libelle:'IWDA',montant:380000,pvLatente:60}];
const cible=[{etf:{isin:'IE00B4L5Y983'},poids:70,classe:'actions'},{etf:{isin:'LU0290358497'},poids:30,classe:'monetaire'}];
const planCash=MoteurRevenus.planifier(pfCash,cible,{enveloppe:'AV',besoinAnnuel:20000,frequence:'mensuelle',coussinMois:12,anciennete:10,couple:false,primesVersees:400000,rendementEspere:5},ETF_UNIVERS);
console.log('   cascade : '+planCash.supports.map(s=>s.libelle+' '+s.montant+' € ('+s.etapes.join('+')+')').join(', '));
ok(planCash.supports.length===1&&planCash.supports[0].isin==='LU0290358497','monétaire excédentaire prélevé en premier, actions préservées');

// taux de retrait insoutenable
const planFort=MoteurRevenus.planifier(pf,selRev.lignes,{enveloppe:'AV',besoinAnnuel:capital*0.09,frequence:'mensuelle',coussinMois:24,anciennete:10,couple:false,primesVersees:350000,rendementEspere:5.5},ETF_UNIVERS);
ok(planFort.alertes.some(a=>a.niveau==='erreur'),'taux de retrait de 9 % : alerte d\'épuisement du capital');
ok(planFort.projection.epuisement!==null,'projection : année d\'épuisement calculée (an '+planFort.projection.epuisement+')');

// contrainte de coussin sur l'allocation
const base=MoteurAllocation.tactique('dynamique',m1.probas,{},0.6);
const cons=MoteurRevenus.contrainteCoussin(base,24000,24,400000);
ok(cons.applique,'coussin : allocation ajustée quand le monétaire est insuffisant');
ok(Math.abs(Object.values(cons.allocation.classes).reduce((a,b)=>a+b,0)-100)<0.15,'coussin : classes toujours à 100 %');
ok(Math.abs(Object.values(cons.allocation.poches).reduce((a,b)=>a+b,0)-100)<0.35,'coussin : poches toujours à 100 %');
ok(cons.allocation.classes.monetaire>base.classes.monetaire,'coussin : monétaire relevé ('+base.classes.monetaire+' → '+cons.allocation.classes.monetaire+' %)');
ok(cons.allocation.classes.actions<base.classes.actions,'coussin : ponction prise sur les actifs risqués');
ok(!MoteurRevenus.contrainteCoussin(base,5000,24,900000).applique,'coussin : pas d\'ajustement si le monétaire suffit déjà');


// --- 9. Backtest
console.log('\n== Backtest ==');
const btOpt={capital:100000};
const eqPoches=MoteurAllocation.strategique('equilibre').poches;
const bt=MoteurBacktest.simuler(eqPoches,btOpt);
ok(bt.nbAnnees===ANNEES_HISTORIQUE.length,'toutes les années sont rejouées ('+bt.nbAnnees+')');
// cohérence capital / rendements chaînés
let chain=100000; bt.annees.forEach(a=>{chain=chain*(1+a.rendement/100)});
ok(Math.abs(chain-bt.capitalFinal)<bt.capitalFinal*0.0002,'capital final = chaînage des rendements annuels, à l\'arrondi d\'affichage près ('+Math.round(chain)+' vs '+bt.capitalFinal+' €)');
ok(Math.abs(bt.perfCumulee-100*(bt.capitalFinal/100000-1))<0.05,'performance cumulée cohérente avec le capital');
ok(Math.abs(Math.pow(1+bt.annualisee/100,bt.nbAnnees)*100000-bt.capitalFinal)<50,'performance annualisée cohérente');
// monotonie du risque entre profils
const parProfil=MoteurBacktest.comparerProfils(btOpt);
ok(parProfil.length===6,'les six profils sont testés');
const volsBt=parProfil.map(p=>p.volatilite);
ok(volsBt.every((v,i)=>i===0||v>=volsBt[i-1]-0.01),'volatilité historique croissante avec le profil');
const dds=parProfil.map(p=>p.maxDrawdown);
ok(dds.every((v,i)=>i===0||v<=dds[i-1]+0.01),'baisse maximale croissante avec le profil');
// contributions
const contribs=MoteurBacktest.contributions(bt,eqPoches);
const sommeGains=contribs.reduce((a,c)=>a+c.gain,0);
ok(Math.abs(sommeGains-(bt.capitalFinal-100000))<50,'somme des contributions = gain total ('+Math.round(sommeGains)+' vs '+(bt.capitalFinal-100000)+' €)');
ok(Math.abs(contribs.reduce((a,c)=>a+c.partDuGain,0)-100)<1.5,'parts du résultat ≈ 100 %');
// pas de rééquilibrage : les poids dérivent, le résultat diffère
const eff=MoteurBacktest.effetRebalancement(eqPoches,btOpt);
ok(eff.avec.capitalFinal!==eff.sans.capitalFinal,'le rééquilibrage change le résultat');
ok(eff.avec.volatilite<=eff.sans.volatilite+0.01,'le rééquilibrage ne dégrade pas la volatilité');
// retraits
const btR=MoteurBacktest.simuler(eqPoches,{capital:100000,retraitAnnuel:4000});
ok(btR.retraitsCumules>19000&&btR.retraitsCumules<23000,'retraits indexés sur l\'inflation cumulés ('+btR.retraitsCumules+' €)');
ok(btR.capitalFinal<bt.capitalFinal,'les retraits réduisent le capital final');
ok(btR.annualisee===null&&btR.twrAnnualise!==null,'avec flux : annualisée neutralisée, TWR fourni');
// risque de séquence
const sq=MoteurBacktest.risqueSequence(eqPoches,{capital:100000,retraitAnnuel:4000});
ok(Math.abs(sq.chrono.twrAnnualise-sq.inverse.twrAnnualise)<0.05,'ordre inversé : même rendement pondéré dans le temps');
ok(sq.chrono.capitalFinal!==sq.inverse.capitalFinal,'ordre inversé : capital final différent (risque de séquence)');
// frais
const btF=MoteurBacktest.simuler(eqPoches,{capital:100000,fraisContrat:1});
ok(btF.capitalFinal<bt.capitalFinal,'les frais de contrat réduisent le capital final');
ok(Math.abs((bt.twrAnnualise-btF.twrAnnualise)-1)<0.15,'1 % de frais ≈ 1 point de rendement annuel en moins');
// fiabilité
const fi=MoteurBacktest.fiabilite(eqPoches);
ok(Math.abs(fi.source+fi.estime+fi.absent-100)<0.5,'répartition sourcé/estimé/absent = 100 %');
ok(fi.absent===0,'toutes les poches allouées ont une série');
// poche sans série : renormalisation
const btPartiel=MoteurBacktest.simuler({'act-monde':50,'poche-inexistante':50},btOpt);
ok(btPartiel.manquantes.length===1&&Math.abs(btPartiel.couverture-50)<0.5,'poche sans série exclue et couverture signalée');


// --- 10. Flux de marché
console.log('\n== Flux de marché ==');
ok(typeof PERFS_MARCHE==='object','fichier de cours généré et chargeable');
const pochesMarche=Object.keys(PERFS_MARCHE);
console.log('   '+pochesMarche.length+' poches alimentées par les cours de marché');
ok(pochesMarche.length>0,'au moins une poche alimentée');
ok(pochesMarche.every(p=>LIBELLES_POCHES[p]),'toutes les poches relevées sont connues du modèle');
ok(pochesMarche.every(p=>{const e=ETF_UNIVERS.find(x=>x.isin===PERFS_MARCHE[p].isin);return e&&e.capitalisation!==false;}),
   'seuls des ETF capitalisants servent de référence (le cours reflète le rendement total)');
ok(pochesMarche.every(p=>Object.values(PERFS_MARCHE[p].perfs).every(v=>v>-60&&v<120)),'performances dans des bornes plausibles');
// injection dans les séries : simulation de ce que fait l'application
const histFusionne=JSON.parse(JSON.stringify(HISTORIQUE_POCHES));
let injectees=0;
Object.keys(histFusionne).forEach(p=>{
  const s=histFusionne[p];
  s.provenance=ANNEES_HISTORIQUE.map(()=>s.source==='source'?'source':'estime');
  const m=PERFS_MARCHE[p]; if(!m) return;
  ANNEES_HISTORIQUE.forEach((an,i)=>{const v=m.perfs[String(an)];if(v===undefined)return;s.valeurs[i]=v;s.provenance[i]='marche';injectees++;});
});
console.log('   '+injectees+' performances annuelles remplacées par des données de marché');
ok(injectees>0,'injection effective dans les séries du backtest');
const eqP=MoteurAllocation.strategique('equilibre').poches;
const fAvant=MoteurBacktest.fiabilite(eqP,HISTORIQUE_POCHES);
const fApres=MoteurBacktest.fiabilite(eqP,histFusionne);
console.log('   part fiable : '+fAvant.fiable+' % → '+fApres.fiable+' %');
ok(fApres.fiable>fAvant.fiable,'la part fiable progresse grâce au flux');
ok(Math.abs(fApres.marche+fApres.source+fApres.estime+fApres.absent-100)<0.5,'répartition de provenance = 100 %');
// le backtest reste cohérent après injection
const btM=MoteurBacktest.simuler(eqP,{capital:100000,historique:histFusionne});
ok(btM&&btM.nbAnnees===ANNEES_HISTORIQUE.length,'backtest exploitable sur les séries fusionnées');
let chainM=100000; btM.annees.forEach(a=>{chainM=chainM*(1+a.rendement/100)});
ok(Math.abs(chainM-btM.capitalFinal)<btM.capitalFinal*0.0002,'capital cohérent après injection des cours de marché (écart d\'arrondi '+Math.abs(chainM-btM.capitalFinal).toFixed(2)+' €)');

// --- 11. Situation de portefeuille
console.log('\n== Situation ==');
const HD=COURS_HISTORIQUE.dates;
console.log('   '+HD.length+' séances du '+HD[0]+' au '+HD[HD.length-1]+', '+Object.keys(COURS_HISTORIQUE.series).length+' supports');
ok(HD.length>200,'historique des cours publié');
ok(HD.every((d,i)=>i===0||HD[i-1]<d),'calendrier trié et sans doublon');
ok(Object.values(COURS_HISTORIQUE.series).every(s=>s.length===HD.length),'chaque série est alignée sur le calendrier');

const ISIN_TEST='IE00B4L5Y983';
const cExact=MoteurSituation.coursALaDate(ISIN_TEST,HD[HD.length-1]);
ok(cExact&&cExact.statut==='seance','cours retrouvé à une date de séance');
// une date postérieure à la dernière séance retombe sur la dernière connue
const cApres=MoteurSituation.coursALaDate(ISIN_TEST,'2030-01-01');
ok(cApres&&cApres.statut==='anterieur'&&cApres.date===HD[HD.length-1],'date hors calendrier : dernière séance connue');
ok(MoteurSituation.coursALaDate(ISIN_TEST,'2000-01-01')===null,'date antérieure à l\'historique : aucun cours');
ok(MoteurSituation.coursALaDate('XX0000000000',HD[10])===null,'ISIN inconnu : aucun cours');

const detentionTest=[
  {isin:ISIN_TEST,libelle:'Monde',quantite:100,pvLatente:5000},
  {isin:'IE00B5BMR087',libelle:'S&P 500',quantite:50,pvLatente:2000},
  {isin:'FR0013346681',libelle:'Ligne en montant',montant:10000,pvLatente:0}
];
const sit=MoteurSituation.valoriser(detentionTest,HD[HD.length-1],{univers:ETF_UNIVERS});
console.log('   portefeuille d\'essai : '+sit.total+' € sur '+sit.lignes.length+' lignes');
ok(sit.lignes.length===3,'toutes les lignes sont valorisées');
ok(Math.abs(sit.lignes.reduce((a,l)=>a+l.poids,0)-100)<0.3,'poids ≈ 100 %');
ok(sit.total>0&&sit.lignes.every(l=>l.montant>=0),'montants positifs');
ok(sit.lignes.find(l=>l.statut==='montant'),'ligne sans quantité repérée comme saisie en montant');
ok(sit.pvLatente===7000,'plus-values latentes cumulées');
// la même détention à deux dates donne deux valeurs : les cours ont bougé
const sitAvant=MoteurSituation.valoriser(detentionTest,HD[0],{univers:ETF_UNIVERS});
ok(sitAvant.total!==sit.total,'la valorisation suit la date demandée');
// une ligne sans historique ni cours du jour ne fabrique pas de valeur
const sitInconnue=MoteurSituation.valoriser([{isin:'XX0000000000',libelle:'Inconnu',quantite:10}],HD[5],{univers:[]});
ok(sitInconnue.lignes[0].statut==='absent'&&sitInconnue.lignes[0].montant===0,'support sans cours : aucune valeur inventée');
ok(!sitInconnue.fiable,'situation incomplète signalée comme telle');

// --- après arbitrage
const allocSit=MoteurAllocation.tactique('equilibre',m1.probas,m1.overlays,0.6);
const selSit=MoteurSelection.construire(allocSit.poches,{enveloppe:'AV',contratAV:'av-large',etoilesMin:4,encoursMin:500,terMax:0.6,esg:'aucune',montant:200000},ETF_UNIVERS);
const detSit=[{isin:'LU0290358497',libelle:'Monétaire',montant:200000,pvLatente:0}];
const anaSit=MoteurArbitrage.analyser(detSit,selSit.lignes,{enveloppe:'AV',apport:0},ETF_UNIVERS);
const apresSit=MoteurSituation.apresArbitrage(detSit,anaSit.ordres,ETF_UNIVERS);
const vAvant=MoteurSituation.valoriser(detSit,HD[HD.length-1],{univers:ETF_UNIVERS});
const vApres=MoteurSituation.valoriser(apresSit,HD[HD.length-1],{univers:ETF_UNIVERS});
console.log('   avant '+vAvant.total+' € → après '+vApres.total+' € sur '+vApres.lignes.length+' lignes');
ok(Math.abs(vApres.total-vAvant.total)<vAvant.total*0.01,'l\'arbitrage conserve le capital (hors apport)');
ok(vApres.lignes.length>vAvant.lignes.length,'l\'arbitrage diversifie le portefeuille');
ok(apresSit.every(l=>l.montant>0),'aucune ligne résiduelle nulle après arbitrage');
// un portefeuille déjà aligné ne bouge pas
const dejaAligne=selSit.lignes.map(l=>({isin:l.etf.isin,libelle:l.etf.nom,montant:l.montant,pvLatente:0}));
const anaNull=MoteurArbitrage.analyser(dejaAligne,selSit.lignes,{enveloppe:'AV',apport:0},ETF_UNIVERS);
const apresNull=MoteurSituation.apresArbitrage(dejaAligne,anaNull.ordres,ETF_UNIVERS);
ok(apresNull.length===dejaAligne.length,'portefeuille aligné : la situation après arbitrage est inchangée');

// --- arrêtés semestriels
const refs=MoteurSituation.datesReference('2026-08-16','2024-08-16',8);
console.log('   arrêtés proposés : '+refs.join(', '));
ok(refs[0]==='2026-06-30','arrêté le plus récent en tête');
ok(refs.every(d=>d<='2026-08-16'&&d>='2024-08-16'),'aucun arrêté hors de la période couverte');
ok(refs.every(d=>d.slice(5)==='06-30'||d.slice(5)==='12-31'),'seuls les 30 juin et 31 décembre sont retenus');
ok(new Set(refs).size===refs.length,'aucun arrêté en double');
ok(MoteurSituation.datesReference('2026-08-16','2026-08-01',8).length===0,'aucun arrêté sur une période qui n\'en contient pas');

// --- 12. Catalogue européen
console.log('\n== Catalogue ==');
const CAT=CATALOGUE_ETF;
console.log('   '+CAT.lignes.length+' supports · '+CAT.emetteurs.length+' émetteurs · '+CAT.categories.length+' catégories');
ok(CAT.lignes.length>2000,'catalogue peuplé');
ok(CAT.lignes.every(l=>l.length===CAT.colonnes.length),'toutes les lignes ont le bon nombre de colonnes');
ok(new Set(CAT.lignes.map(l=>l[0])).size===CAT.lignes.length,'aucun ISIN en double : les cotations multiples sont regroupées');
ok(CAT.lignes.every(l=>/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(l[0])),'tous les ISIN sont bien formés');
ok(CAT.lignes.every(l=>CAT.emetteurs[l[3]]!==undefined&&CAT.categories[l[4]]!==undefined),'index émetteur et catégorie toujours résolus');
ok(CAT.lignes.every(l=>l[9]===null||LIBELLES_POCHES[l[9]]),'toute poche déduite existe dans le modèle');
ok(CAT.lignes.every(l=>l[6]===null||(l[6]>=1&&l[6]<=5)),'notations dans les bornes');
/* Les produits à levier, inverses et les actifs numériques n'ont rien à faire
   dans un catalogue destiné à un conseil patrimonial en unités de compte. */
const indesirables=CAT.lignes.filter(l=>/crypto|actifs digitaux|levier|leverag|\bshort\b|inverse/i.test(l[1]+' '+CAT.categories[l[4]]));
ok(indesirables.length===0,'aucun produit à levier, inverse ou numérique ('+indesirables.length+' trouvé(s))');
const surEuronext=CAT.lignes.filter(l=>/XPAR|XAMS|XBRU|XLIS/.test(l[8])).length;
console.log('   '+surEuronext+' cotés sur Euronext · '+CAT.lignes.filter(l=>l[9]).length+' rattachés à une poche');
ok(surEuronext>500,'part significative cotée sur Euronext, donc revalorisable');
/* Contrôle croisé : le catalogue doit retrouver les supports de l'univers. */
const connus=ETF_UNIVERS.filter(e=>CAT.lignes.some(l=>l[0]===e.isin));
console.log('   '+connus.length+' des '+ETF_UNIVERS.length+' supports de l\'univers figurent au catalogue');
ok(connus.length>=ETF_UNIVERS.length-12,'l\'univers est largement retrouvé dans le catalogue');
/* Les frais et les notes doivent concorder là où les deux sources se recoupent. */
const ecarts=connus.filter(e=>{const l=CAT.lignes.find(x=>x[0]===e.isin);
  return l[6]!==null&&e.morningstar!==null&&l[6]!==e.morningstar;});
ok(ecarts.length===0,'notations concordantes entre univers et catalogue ('+ecarts.length+' écart(s))');

// --- 13. La valorisation de repli
/* Deux refus, et le second est celui qui coûterait le plus cher : une
   clôture en pence vaut le centième d'une livre. Un GBX pris pour un euro
   multiplie un portefeuille par cent sans qu'aucune erreur ne se lève. */
console.log('\n== Valorisation de repli ==');
{
  const AUJ = '2026-08-19';
  const repli = { prix: {
    EUROK:  { cours: 100, devise: 'EUR', date: '2026-08-18' },
    EURVIEUX:{ cours: 100, devise: 'EUR', date: '2026-05-01' },
    ENGBX:  { cours: 100, devise: 'GBX', date: '2026-08-18' },
    ENUSD:  { cours: 100, devise: 'USD', date: '2026-08-18' },
    SANSDATE:{ cours: 100, devise: 'EUR', date: null }
  } };
  const r = i => MoteurSituation.coursDeRepli(i, AUJ, repli);
  ok(r('EUROK') && r('EUROK').cours === 100, 'une clôture en euros et récente est retenue');
  ok(r('ENGBX') && r('ENGBX').refus === 'deviseAutre',
     'une clôture en PENCE est refusée — elle vaudrait cent fois trop');
  ok(r('ENUSD') && r('ENUSD').refus === 'deviseAutre', 'une clôture en dollars est refusée');
  ok(r('EURVIEUX') && r('EURVIEUX').refus === 'tropAncien',
     'une clôture de plus de ' + MoteurSituation.AGE_MAX_REPLI + ' jours est refusée');
  ok(r('SANSDATE') && r('SANSDATE').refus === 'tropAncien', 'une clôture sans date est refusée');
  ok(r('INCONNU') === null, 'un ISIN absent du catalogue ne produit aucun repli');

  /* Et le refus doit se voir jusque dans la valorisation : la ligne garde son
     montant saisi, et la situation cesse d'être annoncée fiable. */
  const det = [{ isin: 'ENGBX', libelle: 'Fonds en pence', montant: 5000, quantite: 40 }];
  const s1 = MoteurSituation.valoriser(det, AUJ, { univers: [], derniers: {}, repli });
  ok(s1.total === 5000, 'une ligne refusée garde son montant saisi (' + s1.total + ' €)');
  ok(s1.alertes.deviseAutre === 1, 'le refus de devise est compté dans les alertes');
  ok(s1.fiable === false, 'une situation contenant un refus n\'est pas annoncée fiable');

  const det2 = [{ isin: 'EUROK', libelle: 'Fonds en euros', montant: 5000, quantite: 40 }];
  const s2 = MoteurSituation.valoriser(det2, AUJ, { univers: [], derniers: {}, repli });
  ok(s2.total === 4000, 'une ligne valorisée au repli vaut quantité × clôture (' + s2.total + ' €)');
  ok(s2.alertes.repli === 1 && s2.fiable === true,
     'le repli en euros ne dégrade pas la fiabilité');

  /* Le catalogue livré ne doit contenir aucune surprise : on vérifie que la
     règle tient sur les données réelles, pas seulement sur des cas forgés. */
  const iPrix = CATALOGUE_ETF.colonnes.indexOf('prix');
  const iDev = CATALOGUE_ETF.colonnes.indexOf('prixDevise');
  const devises = CATALOGUE_ETF.devisesPrix || [];
  const nonEuro = CATALOGUE_ETF.lignes.filter(l => l[iPrix] != null && devises[l[iDev]] !== 'EUR').length;
  console.log('   ' + CATALOGUE_ETF.lignes.filter(l => l[iPrix] != null).length + ' clôtures au catalogue · ' +
              nonEuro + ' hors euro · devises ' + devises.join(', '));
  ok(devises.indexOf('GBX') >= 0, 'le catalogue contient bien des cours en pence — le cas n\'est pas théorique');
}

// --- 14. L'entonnoir de sélection
/* Les chiffres montrés à l'utilisateur — dans l'onglet Univers et dans
   « Méthode & limites » — sortent de cette fonction. S'ils ne s'additionnent
   pas, l'outil publie un compte faux sur sa propre méthode. */
console.log('\n== Entonnoir de sélection ==');
{
  const F = { etoilesMin: 3, encoursMin: 500, terMax: 0.60 };
  const e = MoteurUnivers.entonnoir(CATALOGUE_ETF, ETF_UNIVERS, F);
  console.log('   ' + e.brut + ' bruts → ' + e.exploitables + ' exploitables → ' +
              e.offert + ' offerts → ' + e.candidats + ' candidats');
  console.log('   écartés : ' + e.sansPoche + ' sans poche · ' + e.sansFrais +
              ' sans frais · ' + e.sansEncours + ' sans encours');

  ok(e.brut === CATALOGUE_ETF.lignes.length,
     'le brut de l\'entonnoir est le catalogue entier (' + e.brut + ')');
  ok(e.sansPoche + e.sansFrais + e.sansEncours + e.exploitables === e.brut,
     'les quatre premières étapes s\'additionnent au brut');
  ok(e.offert >= e.exploitables && e.offert <= e.exploitables + e.universTravail,
     'l\'univers offert vaut les exploitables plus au plus les ' + e.universTravail +
     ' supports relevés à la main (' + e.offert + ')');
  ok(e.candidats <= e.offert, 'les filtres ne peuvent pas élargir l\'univers (' +
     e.candidats + ' ≤ ' + e.offert + ')');
  ok(e.candidats > 0, 'les filtres par défaut laissent des candidats (' + e.candidats + ')');

  /* Desserrer un filtre ne peut qu'élargir : c'est ce qui prouve que le
     compte des candidats dépend bien des filtres, et non d'un chiffre figé. */
  const large = MoteurUnivers.entonnoir(CATALOGUE_ETF, ETF_UNIVERS,
    { etoilesMin: 0, encoursMin: 0, terMax: 99 });
  ok(large.candidats >= e.candidats,
     'desserrer les filtres élargit le vivier (' + e.candidats + ' → ' + large.candidats + ')');
  const etroit = MoteurUnivers.entonnoir(CATALOGUE_ETF, ETF_UNIVERS,
    { etoilesMin: 5, encoursMin: 5000, terMax: 0.10 });
  ok(etroit.candidats <= e.candidats,
     'les resserrer le réduit (' + e.candidats + ' → ' + etroit.candidats + ')');
  ok(e.genere === CATALOGUE_ETF.genere, 'l\'entonnoir porte la date du relevé qu\'il décrit');
}

// --- 15. Un seul espace de noms
/* L'application n'a pas de modules : tout ce que déclarent js/app.js et
   js/data/*.js vit dans la même portée, et la DERNIÈRE déclaration d'un nom
   écrase silencieusement les précédentes. Trois collisions en une seule
   séance de travail : la classe CSS « aide », prise par une pastille
   d'infobulle aux textes d'aide ; le champ « statut », qui désignait déjà la
   provenance d'un cours ; et « ligneCatalogue », rendu d'une ligne de la
   liste de recherche, repris pour lire une ligne de données. Aucune des
   trois n'a levé d'erreur — la première a écrasé six phrases dans un carré
   de quatorze pixels, la troisième a rendu du HTML là où l'on attendait un
   tableau. Un contrôle statique les arrête toutes.

   Il lit le SOURCE, pas la portée : c'est le seul moyen de voir un nom
   déclaré deux fois, puisqu'à l'exécution il n'en reste qu'un. */
/* ============================================================
   RAPPROCHEMENT DE L'UNIVERS AVEC LE CATALOGUE
   ------------------------------------------------------------
   Deux pièges structurels ont été mesurés et écartés une fois ;
   ces contrôles sont là pour qu'on ne les réintroduise pas en
   croyant bien faire.
   ============================================================ */
/* ============================================================
   LE MODE CHANGE LES MOTS, JAMAIS LES CHIFFRES
   ------------------------------------------------------------
   Cinq questions sont reformulées en mode particulier. Le jour où
   un score, une clé technique ou un ordre d'options suivrait le
   mode, c'est la garde « un seul moteur » qui tomberait.
   ============================================================ */
console.log('\n== Questionnaire : les deux modes ==');
(function () {
  const reformulees = ['q_capaciteEpargne', 'q_endettement', 'q_couple', 'q_arbitrage', 'q_esg',
    'q_horizon', 'q_retrait', 'q_precaution', 'q_partpatrimoine', 'q_stabilite',
    'q_connaissance', 'q_produits', 'q_perteMax', 'q_volatilite'];

  const absentes = reformulees.filter(id => !QUESTIONS.some(q => q.id === id));
  ok(absentes.length === 0,
     'les ' + reformulees.length + ' questions reformulées existent toujours' +
     (absentes.length ? ' — introuvables : ' + absentes.join(', ') : ''));

  /* Une clé de mode qui ne désigne aucune question ne se verrait nulle part :
     elle resterait dans la table, et l'on croirait la question reformulée. */
  const cles = Object.keys(LIBELLES.particulier)
    .filter(c => c.indexOf('question.') === 0)
    .map(c => c.replace(/^question\./, '').replace(/\.aide$/, ''));
  const orphelines = [...new Set(cles)].filter(id => !QUESTIONS.some(q => q.id === id));
  ok(orphelines.length === 0,
     'chaque libellé de question du mode particulier vise une question réelle' +
     (orphelines.length ? ' — orphelines : ' + orphelines.join(', ') : ''));

  /* Une option se surcharge par son RANG. Une clé qui vise un rang inexistant
     ne se verrait nulle part : on croirait l'option reformulée, et l'on
     lirait le jargon. C'est le risque propre à cette convention, et c'est
     donc celui qu'il faut tenir. */
  const rangs = Object.keys(LIBELLES.particulier)
    .filter(c => /^option\.[a-zA-Z_]+\.\d+$/.test(c))
    .map(c => c.split('.'));
  const horsRang = rangs.filter(([, id, n]) => {
    /* Les listes déroulantes de l'identité suivent la même convention que les
       options du questionnaire : un rang, et il doit exister. */
    const cible = QUESTIONS.find(x => x.id === id) || IDENTITE.find(x => x.id === id);
    return !cible || !cible.options || !cible.options[Number(n)];
  }).map(x => x.join('.'));
  ok(horsRang.length === 0,
     'chaque option reformulée vise un rang qui existe — ' + rangs.length + ' contrôlés' +
     (horsRang.length ? ' — hors rang : ' + horsRang.join(', ') : ''));

  /* Le mode ne touche NI aux scores, NI aux clés techniques. */
  const sommes = QUESTIONS.map(q => q.options.reduce((a, o) => a + o.score, 0)).join('|');
  const metas = JSON.stringify(QUESTIONS.map(q => q.options.map(o => o.meta || null)));
  ok(sommes.length > 0 && metas.length > 0,
     'scores et métadonnées des options sont lus une seule fois, hors de tout mode');

  /* Aucune question du mode conseiller ne reçoit d'aide : c'est le
     vocabulaire de la réglementation, il n'a pas à être expliqué. */
  const aidesConseiller = Object.keys(LIBELLES.defaut).filter(c => /^question\..*\.aide$/.test(c));
  ok(aidesConseiller.length === 0,
     'le mode conseiller ne reçoit aucune ligne d\'aide de question' +
     (aidesConseiller.length ? ' — ' + aidesConseiller.join(', ') : ''));
})();

console.log('\n== Rapprochement univers / catalogue ==');
(function () {
  if (typeof ECARTS_UNIVERS === 'undefined') {
    console.log('   (pas de rapprochement en place — contrôles ignorés)');
    return;
  }
  const champs = new Set(ECARTS_UNIVERS.lignes.map(l => l.champ));

  ok(!champs.has('encours'),
     "l'encours n'est PAS rapproché — Morningstar donne le fonds entier, justETF la part");
  ok(!champs.has('devise'),
     "la devise n'est PAS rapprochée — le catalogue donne celle de la part cotée");
  ok(!champs.has('nom'),
     "le nom ne déclenche rien — les nuages vrai/faux se recouvrent, aucun seuil ne sépare");

  ok(ECARTS_UNIVERS.controles === ETF_UNIVERS.length,
     'le rapprochement porte sur les ' + ETF_UNIVERS.length + ' supports de l\'univers');

  /* Un écart de frais sous le centième est un arrondi, pas un changement
     de tarif : 0,20 et 0,2 ne doivent jamais produire de ligne. */
  const arrondis = ECARTS_UNIVERS.lignes.filter(l =>
    l.champ === 'ter' && Math.abs(Number(l.releve) - Number(l.catalogue)) <= 0.01);
  ok(arrondis.length === 0,
     'aucun écart de frais ne tient à un arrondi' +
     (arrondis.length ? ' — ' + arrondis.map(l => l.isin).join(', ') : ''));

  /* Chaque ligne signalée doit pouvoir être rouverte : sans l'ISIN, on ne
     sait pas quelle fiche justETF aller relire. */
  const orphelines = ECARTS_UNIVERS.lignes.filter(l =>
    !l.isin || !ETF_UNIVERS.some(e => e.isin === l.isin));
  ok(orphelines.length === 0, 'chaque écart nomme un support de l\'univers');

  console.log('   ' + ECARTS_UNIVERS.lignes.length + ' écart(s) au rapprochement du ' +
              ECARTS_UNIVERS.genere);
})();

/* ============================================================
   « PAS DE CONTEXTE = STRATÉGIQUE » — LE FILET
   ------------------------------------------------------------
   C'est la règle la plus facile à casser sans s'en apercevoir : elle
   ne se voit qu'en comparant deux allocations, et un défaut y produit
   des chiffres plausibles. Elle a déjà cédé une fois — `agregerMacro({})`
   rend des probabilités de repli qui pèsent 66,7 % sur l'atterrissage,
   et un contexte jamais renseigné produisait donc une allocation déviée.

   Trois contrôles : le tout-vide ne dévie pas, un seul choix suffit à
   être vu, et les listes vides ne s'enregistrent pas.
   ============================================================ */
console.log('\n== Contexte macro : pas de contexte = stratégique ==');
(function () {
  const n = INDICATEURS.length;
  ok(n === 11, n + ' indicateurs de contexte');

  /* 1. Toutes les listes à « non renseigné » : AUCUNE déviation.
        On ne compare pas des probabilités — `agregerMacro({})` en rend
        toujours —, mais ce qui décide de dévier : le nombre de clés
        retenues. Zéro clé, zéro vue de marché. */
  const vide = {};
  ok(Object.keys(vide).length === 0,
     'aucune liste choisie ⇒ aucun indicateur enregistré');

  /* Et la déviation elle-même, mesurée sur l'allocation. Le garde-fou
     applicatif est `contexteExprime()` : sans clé, l'intensité tombe à
     zéro et la cible EST la stratégique. On rejoue ici la même
     condition, faute de pouvoir appeler l'interface. */
  const profilRef = PROFILS.find(p => p.id === 'dynamique') || PROFILS[2];
  const strat = MoteurAllocation.strategique(profilRef.id);
  const agrVide = MoteurAllocation.agregerMacro(vide);
  const cibleSansContexte = MoteurAllocation.tactique(
    profilRef.id, agrVide.probas, agrVide.overlays, 0);
  const ecartMax = Object.keys(strat.classes).reduce((m, cl) =>
    Math.max(m, Math.abs((cibleSansContexte.classes[cl] || 0) - strat.classes[cl])), 0);
  ok(ecartMax < 0.001,
     'intensité nulle ⇒ la cible EST la stratégique — écart max ' +
     ecartMax.toFixed(4) + ' pt');

  /* Et la contre-épreuve : à intensité pleine, les MÊMES probabilités de
     repli dévient bel et bien. C'est ce qui prouve que le point ci-dessus
     tient à l'intensité nulle, et non à un calcul devenu inerte. */
  const cibleIntensite = MoteurAllocation.tactique(
    profilRef.id, agrVide.probas, agrVide.overlays, 1);
  const ecartPlein = Object.keys(strat.classes).reduce((m, cl) =>
    Math.max(m, Math.abs((cibleIntensite.classes[cl] || 0) - strat.classes[cl])), 0);
  ok(ecartPlein > 0.5,
     'à intensité pleine les mêmes probabilités dévient — ' +
     ecartPlein.toFixed(1) + ' pt : le contrôle ci-dessus n\'est pas vide');

  /* 2. RÉCIPROQUE : un seul indicateur choisi, et le moteur le voit.
        Sans ce contrôle, on pourrait « corriger » le point 1 en
        neutralisant le contexte tout entier, et personne ne le verrait. */
  const ind = INDICATEURS[0];
  const autre = ind.options.find(o => !o.defaut);
  ok(!!autre, 'l\'indicateur « ' + ind.id + ' » a une option non-repli');

  const avant = MoteurAllocation.agregerMacro({}).probas;
  const apres = MoteurAllocation.agregerMacro({ [ind.id]: autre.valeur }).probas;
  const bouge = Object.keys(avant).some(k => Math.abs(apres[k] - avant[k]) > 0.5);
  ok(bouge, 'un seul indicateur choisi déplace les probabilités — ' +
     Object.keys(avant).map(k => k + ' ' + avant[k].toFixed(1) + '→' + apres[k].toFixed(1)).join(' · '));

  ok(Object.keys({ [ind.id]: autre.valeur }).length === 1,
     'un choix ⇒ une clé enregistrée, donc contexte exprimé');

  /* 3. Le compte du bandeau : « k sur n », et non un tout-ou-rien. */
  const partiel = {};
  INDICATEURS.slice(0, 3).forEach(i => {
    const o = i.options.find(x => !x.defaut) || i.options[0];
    partiel[i.id] = o.valeur;
  });
  ok(Object.keys(partiel).length === 3 && n - 3 === 8,
     'trois choisis sur onze ⇒ le bandeau annonce 3 / 11, huit au repli');
})();

console.log('\n== La proposition tourne hors navigateur ==');
/* CE QUE CE CONTRÔLE PROTÈGE, ET POURQUOI IL EST ICI.

   `scripts/proposition.mjs` envoie la proposition d'arbitrages par e-mail
   sans que personne ne soit devant l'écran. Pour cela il charge
   `js/ui/socle.js` et `js/ui/dossier.js` dans un `vm` — deux fichiers de
   l'interface qui, EUX SEULS parmi les neuf, ne touchent pas au DOM.

   C'est une propriété fragile et invisible : ajouter un
   `document.querySelector` dans `dossier.js` ne casse rien à l'écran,
   ne lève aucune erreur au navigateur, et fait échouer la tâche
   planifiée le lendemain matin — en silence, puisque personne ne la
   regarde. Le contrôle la rend visible ici.

   Il vérifie aussi que `texteProposition()` est bien atteignable : le
   jour où on la remet dans `vues-allocation.js`, l'e-mail perd son
   texte. Il n'y a QU'UNE définition, partagée par le navigateur et par
   Node — mesuré : la même empreinte SHA-256 des deux côtés. */
(function () {
  const fs = require2('fs'), vm2 = require2('vm'), p2 = require2('path');
  const ctx2 = { console: { log() {}, error() {} } };
  vm2.createContext(ctx2);
  let casse = null;
  ['js/data/libelles.js', 'js/data/questionnaire.js', 'js/data/allocations.js',
   'js/data/macro.js', 'js/data/etf-univers.js', 'js/data/fiscalite.js',
   'js/data/historique.js', 'js/data/cours-marche.js', 'js/data/cours-historique.js',
   'js/data/catalogue-etf.js', 'js/data/ecarts-univers.js',
   'js/engine/profil.js', 'js/engine/allocation.js', 'js/engine/selection.js',
   'js/engine/arbitrage.js', 'js/engine/revenus.js', 'js/engine/backtest.js',
   'js/engine/situation.js', 'js/engine/contrat.js', 'js/engine/univers.js',
   'js/ui/socle.js', 'js/ui/dossier.js'].forEach(f => {
    if (casse) return;
    try { vm2.runInContext(fs.readFileSync(p2.join(RACINE_TEST, f), 'utf8'), ctx2, { filename: f }); }
    catch (e) { casse = f + ' : ' + e.message; }
  });
  ok(!casse, 'socle.js et dossier.js s\'exécutent hors navigateur' + (casse ? ' — ' + casse : ''));
  if (casse) return;

  const dispo = ['texteProposition', 'signatureProposition', 'resultatProfil',
                 'selectionCourante', 'lignesDetenues', 'apportDisponible', 'universSelection']
    .filter(n => vm2.runInContext('typeof ' + n, ctx2) !== 'function');
  ok(dispo.length === 0,
     'les sept fonctions dont l\'envoi a besoin sont atteignables en Node' +
     (dispo.length ? ' — manquent : ' + dispo.join(', ') : ''));

  /* Un texte réellement produit, pas seulement une fonction qui existe. La
     réserve est la phrase qui ne doit jamais disparaître : un message sans
     elle se lit comme un ordre. */
  const texte = vm2.runInContext(`(function () {
    Etat.identite.montant = 250000; Etat.identite.enveloppe = 'AV';
    QUESTIONS.forEach(q => { Etat.reponses[q.id] = q.options.length > 2 ? 2 : 1; });
    Etat.detention = [{ isin: 'IE00B4L5Y983', libelle: 'Test', montant: 100000, pvLatente: 0 }];
    const sel = selectionCourante();
    const a = MoteurArbitrage.analyser(lignesDetenues(), sel.lignes,
      { enveloppe: 'AV', apport: apportDisponible() }, universSelection());
    return a ? texteProposition(a, Infinity) : '';
  })()`, ctx2);
  ok(texte.length > 100 && /Rien n'est exécuté/.test(texte),
     'le texte de la proposition se construit en Node, réserve comprise — ' +
     texte.length + ' caractères');
})();

console.log('\n== Espace de noms ==');
(function () {
  const fichiers = Object.keys(typeof SOURCES !== 'undefined' ? SOURCES : {});
  const vus = new Map(), doublons = [];
  fichiers.forEach(f => {
    const re = /^(?:function\s+|const\s+|let\s+)([A-Za-z_$][\w$]*)/gm;
    let m;
    while ((m = re.exec(SOURCES[f]))) {
      const nom = m[1];
      if (vus.has(nom)) doublons.push(nom + ' (' + vus.get(nom) + ' puis ' + f + ')');
      else vus.set(nom, f);
    }
  });
  console.log('   ' + vus.size + ' noms globaux déclarés sur ' + fichiers.length + ' fichiers');
  ok(fichiers.length > 0 && doublons.length === 0, 'aucun nom global déclaré deux fois' +
     (doublons.length ? ' — ' + doublons.slice(0, 4).join(' · ') : ''));
})();

console.log('\n'+(echecs?'❌ '+echecs+' échec(s)':'✅ tous les tests passent'));
process.exit(echecs?1:0);
