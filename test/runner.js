const fs=require('fs'),vm=require('vm'),path=require('path');
const base='/Users/Mayeul/APP ETF CGP';
/* Les sources sont passées TELLES QUELLES au contexte : un contrôle de la
   suite lit le texte des fichiers pour y repérer un nom global déclaré deux
   fois. À l'exécution il n'en resterait qu'un — seul le source le montre. */
const SOURCES={};
['js/app.js','js/data/libelles.js','js/data/questionnaire.js','js/data/allocations.js',
 'js/data/macro.js','js/data/fiscalite.js'].forEach(f=>{
  try{SOURCES[f]=fs.readFileSync(path.join(base,f),'utf8');}catch(e){}
});
const ctx={console,process,SOURCES};vm.createContext(ctx);
['js/data/questionnaire.js','js/data/allocations.js','js/data/macro.js','js/data/etf-univers.js','js/data/fiscalite.js','js/data/historique.js','js/data/cours-marche.js','js/data/cours-historique.js','js/data/catalogue-etf.js',
 'js/engine/profil.js','js/engine/allocation.js','js/engine/selection.js','js/engine/arbitrage.js','js/engine/revenus.js','js/engine/backtest.js','js/engine/situation.js','js/engine/contrat.js','js/engine/univers.js',
 ]. forEach(f=>vm.runInContext(fs.readFileSync(path.join(base,f),'utf8'),ctx,{filename:f}));
vm.runInContext(fs.readFileSync(__dirname+'/suite.js','utf8'),ctx,{filename:__dirname+'/suite.js'});
