const fs=require('fs');
const vm=require('vm');

const context={window:{}};
vm.createContext(context);
vm.runInContext(fs.readFileSync('protocol-display-data.js','utf8'),context);
const records=context.window.PROTOCOL_DISPLAY_DATA;
const failures=[];
const mustBeReferenceOnly=['insulin1vial','botulinumtoxin','epo','testosteronecypionate','testosteroneenanthate','hcg','hmg','alprostadil','oxytocinacetate','igf1lr3','igfdes','ace031','follistatin','gdf8','gonadorelin','hgh191aa','hghfragment176191','adipotide','foxo4dri','pe2228','pnc27'];

for(const [name,record] of Object.entries(records)){
  if(/\b(i|me|my|mine|we|our|ours|you|your|yours)\b/i.test(`${record.overview} ${record.schedule}`))failures.push(`${name}: personalized wording`);
  for(const dose of record.doses||[]){
    const expected=/^(?:mcg|μg|ug)$/i.test(dose.unit)?dose.value/1000:dose.value;
    if(!Number.isFinite(dose.mg)||Math.abs(expected-dose.mg)>1e-9)failures.push(`${name}: ${dose.value}${dose.unit} stored as ${dose.mg}mg`);
  }
  if(record.calculable&&!(record.doses||[]).length)failures.push(`${name}: calculable without dose records`);
}
for(const name of mustBeReferenceOnly){if(records[name]?.calculable!==false)failures.push(`${name}: high-risk entry is not reference-only`)}

if(failures.length){console.error(failures.join('\n'));process.exit(1)}
console.log(`Protocol audit passed: ${Object.keys(records).length} records, no unit-conversion errors, no personalized wording, and all high-risk entries gated.`);
