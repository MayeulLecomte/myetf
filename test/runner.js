const fs=require('fs'),vm=require('vm'),path=require('path');
const base='/Users/Mayeul/APP ETF CGP';
const ctx={console,process};vm.createContext(ctx);
['js/data/questionnaire.js','js/data/allocations.js','js/data/macro.js','js/data/etf-univers.js','js/data/fiscalite.js','js/data/historique.js','js/data/cours-marche.js','js/data/cours-historique.js','js/data/catalogue-etf.js',
 'js/engine/profil.js','js/engine/allocation.js','js/engine/selection.js','js/engine/arbitrage.js','js/engine/revenus.js','js/engine/backtest.js','js/engine/situation.js',
 ]. forEach(f=>vm.runInContext(fs.readFileSync(path.join(base,f),'utf8'),ctx,{filename:f}));
vm.runInContext(fs.readFileSync(__dirname+'/suite.js','utf8'),ctx,{filename:__dirname+'/suite.js'});
