const fs=require('fs'),vm=require('vm'),path=require('path');
const base='/Users/Mayeul/APP ETF CGP';
/* Les sources sont passées TELLES QUELLES au contexte : un contrôle de la
   suite lit le texte des fichiers pour y repérer un nom global déclaré deux
   fois. À l'exécution il n'en resterait qu'un — seul le source le montre. */
const SOURCES={};
['js/app.js',
 'js/ui/socle.js','js/ui/dossier.js','js/ui/navigation.js','js/ui/vues-profil.js',
 'js/ui/vues-allocation.js','js/ui/vues-suivi.js','js/ui/catalogue.js','js/ui/rapport.js',
 'js/ui/entrees.js',
 'js/data/libelles.js','js/data/questionnaire.js','js/data/allocations.js',
 'js/data/macro.js','js/data/fiscalite.js','js/data/etf-univers.js','js/data/historique.js'].forEach(f=>{
  try{SOURCES[f]=fs.readFileSync(path.join(base,f),'utf8');}catch(e){}
});
/* `require` et le chemin de base sont passés au contexte : la suite en a
   besoin pour rejouer, dans un SECOND `vm`, ce que fait
   `scripts/proposition.mjs`. Nommés autrement que `require`/`__dirname`
   pour qu'on voie au premier coup d'oeil qu'on sort du bac à sable. */
const ctx={console,process,SOURCES,require2:require,RACINE_TEST:base};vm.createContext(ctx);
['js/data/libelles.js','js/data/questionnaire.js','js/data/allocations.js','js/data/macro.js','js/data/etf-univers.js','js/data/fiscalite.js','js/data/historique.js','js/data/cours-marche.js','js/data/cours-historique.js','js/data/catalogue-etf.js','js/data/ecarts-univers.js',
 'js/engine/profil.js','js/engine/allocation.js','js/engine/selection.js','js/engine/arbitrage.js','js/engine/revenus.js','js/engine/backtest.js','js/engine/situation.js','js/engine/contrat.js','js/engine/univers.js',
 ]. forEach(f=>vm.runInContext(fs.readFileSync(path.join(base,f),'utf8'),ctx,{filename:f}));
vm.runInContext(fs.readFileSync(__dirname+'/suite.js','utf8'),ctx,{filename:__dirname+'/suite.js'});
