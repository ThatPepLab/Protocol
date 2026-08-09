const fs=require('fs');
const vm=require('vm');

const element=()=>({value:'',innerHTML:'',textContent:'',hidden:false,addEventListener(){}});
const context={window:{},document:{getElementById:element},console,setInterval(){}};
context.window=context;
vm.createContext(context);
for(const file of ['protocol-data.js','protocol-additions.js','app.js']){
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
}

const normalize=value=>String(value||'').toLowerCase().replace(/thymosin beta-?4/g,'tb500').replace(/wolverine/g,'').replace(/[^a-z0-9]+/g,'');
const records={};
const products=vm.runInContext('products',context);
for(const product of products){
  const doses=product.calculable===false?[]:context.isNasal(product)?context.nasalDoses(product):context.scheduledDoses(product);
  records[normalize(product.name)]={
    overview:context.conciseOverview(product),
    schedule:context.conciseSchedule(product),
    doses:doses.map(dose=>({value:dose.value,unit:dose.unit,mg:dose.mg,note:dose.note||'',weekLabel:dose.weekLabel||''})),
    calculable:product.calculable!==false
  };
}

fs.writeFileSync('protocol-display-data.js',`window.PROTOCOL_DISPLAY_DATA=${JSON.stringify(records)};\n`);
