const WATER_OPTIONS=[1,1.5,2,2.5,3];
let products=(window.PROTOCOL_DATA||[]).map(p=>({...p,strengths:[...p.strengths]}));
const $=id=>document.getElementById(id);
const productSelect=$('productSelect'),strengthSelect=$('strengthSelect'),doseSelect=$('doseSelect');

function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fmt(n,digits=2){return Number(n).toLocaleString(undefined,{maximumFractionDigits:digits})}
function strengthLabel(mg){return `${fmt(mg)}mg vial`}
function doseLabel(d){return `${fmt(d.value,3)}${d.unit}`}
function current(){return products.find(p=>p.name===productSelect.value)||products[0]}
function isNasal(p){return /^(semax|selank)(?:\+semax)?$/i.test(p.name)}

const PROTOCOL_OVERRIDES={
  'BPC-157 + TB500':{
    overview:'A 1:1 blend of BPC-157 and TB-500 commonly discussed for soft-tissue and recovery research. Evidence is mainly animal data plus community reports; controlled human dosing data are limited.',
    schedule:'Common community range\nDose: 250–500 mcg of each peptide\nFrequency: Once daily\nTiming: Any time; fasting is not commonly required\nRoute: Subcutaneous\nCycle: Commonly 4–8 weeks\nEvidence: Animal research + anecdotal/community use'
  },
  'Tesamorelin':{
    overview:'A GHRH analog that stimulates natural growth-hormone release. Community body-composition protocols commonly use less than the 2 mg daily disease-specific prescription regimen.',
    schedule:'Common community range\nDose: 0.5–1 mg\nFrequency: Once daily, often 5 days on / 2 days off\nTiming: Commonly fasted before bed or fasted in the morning\nRoute: Subcutaneous\nCycle: Commonly 8–12 weeks; longer cycles are also reported\nStudied/approved context: 2 mg daily is the HIV-lipodystrophy regimen, not the default community starting amount'
  },
  'Tesamorelin + Ipamorelin':{
    overview:'A GHRH/GHRP blend used in community body-composition and recovery protocols. Human research on the combined formulation is limited.',
    schedule:'Common community range\nTesamorelin: 0.5–1 mg\nIpamorelin: 100–200 mcg\nFrequency: Once daily, often 5 days on / 2 days off\nTiming: Fasted before bed is most commonly reported\nRoute: Subcutaneous\nCycle: Commonly 8–12 weeks\nEvidence: Component research + anecdotal/community use'
  },
  'Semax':{
    overview:'An ACTH-derived neuropeptide used intranasally in Russian clinical practice and discussed by the community for focus and cognitive support. Long-term continuous-use evidence is limited.',
    schedule:'Common community range\nDose: 200–600 mcg daily\nFrequency: Once or twice daily\nTiming: Morning or early afternoon\nRoute: Intranasal\nCycle: Commonly 10–14 days; breaks of 1–4 weeks are reported\nConsensus: No evidence establishes one mandatory break length or continuous year-round use'
  },
  'Selank':{
    overview:'A tuftsin-derived peptide used intranasally in Russian practice and discussed by the community for calmness and cognitive support. U.S. human evidence remains limited.',
    schedule:'Common community range\nDose: 200–400 mcg per administration\nFrequency: 2–3 times daily\nTiming: Morning and early afternoon\nRoute: Intranasal\nCycle: 10–14 days is common; extended 4–6 week use is also reported\nBreak: Commonly 1–3 weeks between cycles'
  }
};

function conciseOverview(p){
  if(PROTOCOL_OVERRIDES[p.name])return PROTOCOL_OVERRIDES[p.name].overview;
  const clean=String(p.overview||'').replace(/\s+/g,' ').replace(/\bI (?:have|used|started|noticed|experienced)\b[\s\S]*$/i,'').trim();
  const sentences=clean.match(/[^.!?]+[.!?]+/g)||[clean];
  let summary=sentences.slice(0,2).join(' ').trim();
  if(summary.length>520)summary=summary.slice(0,summary.lastIndexOf(' ',500))+'…';
  const evidence=/no human|zero published human|animal studies|preclinical/i.test(clean)
    ?' Evidence is primarily preclinical and/or anecdotal.'
    :/FDA approved|clinical trial|human subjects|human clinical/i.test(clean)
      ?' Human research exists, although community use may differ from studied disease protocols.'
      :' Published human dosing evidence is limited; community use supplies much of the practical protocol.';
  return summary+evidence;
}

function conciseSchedule(p){
  if(PROTOCOL_OVERRIDES[p.name])return PROTOCOL_OVERRIDES[p.name].schedule;
  const lines=String(p.schedule||'').replace(/\.\.\.$/gm,'').split(/\n/).map(line=>line.trim().replace(/\s+/g,' ')).filter(Boolean);
  const kept=[];
  for(const line of lines){
    if(/^(?:weeks?|days?)\s*\d+(?:\s*(?:to|through|–|-)\s*\d+)?\s*:/i.test(line)
      || /^(?:dose|frequency|timing|route|administration|duration|cycle(?: length)?|break|total daily|initial|loading|maintenance)\s*:/i.test(line))kept.push(line);
    if(kept.length===12)break;
  }
  if(!kept.length){
    kept.push(`Commonly listed amount: ${p.doses.map(d=>doseLabel(d)).join('–')}`);
    if(p.frequency)kept.push(`Frequency: ${p.frequency}`);
  }
  return ['Concise protocol reference',...new Set(kept),'Evidence: Published research where available; otherwise repeated animal and community practice'].join('\n');
}

function nasalSchedule(p){
  return String(p.schedule||'').replace(/\nSUBCUTANEOUS(?: INJECTION)? PROTOCOL[\s\S]*?(?=\n(?:NASAL SPRAY PREPARATION|CYCLE GUIDANCE))/i,'\n').trim();
}

function nasalDoses(p){
  let text=nasalSchedule(p),end=text.search(/\n(?:Total daily|SUBCUTANEOUS|CYCLE GUIDANCE)/i);
  if(end>0)text=text.slice(0,end);
  const values=[];
  for(const m of text.matchAll(/(\d+(?:\.\d+)?)\s*(?:to|–|-)\s*(\d+(?:\.\d+)?)\s*(mcg|μg|ug|mg)\b/gi)){
    const unit=/mcg|μg|ug/i.test(m[3])?'mcg':'mg';
    for(const raw of [m[1],m[2]]){const value=Number(raw),mg=unit==='mcg'?value/1000:value;if(!values.some(d=>d.mg===mg))values.push({value,unit,mg})}
  }
  return values.length?values.sort((a,b)=>a.mg-b.mg):p.doses;
}

function scheduledDoses(p){
  const found=[];
  for(const rawLine of String(p.schedule||'').split(/\n/)){
    const line=rawLine.trim();
    const match=line.match(/^((?:(?:weeks?|days?)\s*\d+(?:\s*(?:to|through|–|-)\s*\d+)?|(?:week|day)\s*\d+\s*(?:onward|and beyond|\+)?)[^:]*):\s*(?:dose\s*)?(\d+(?:\.\d+)?)\s*(mcg|μg|ug|mg)\b/i);
    if(!match)continue;
    const unit=/mcg|μg|ug/i.test(match[3])?'mcg':'mg',value=Number(match[2]),mg=unit==='mcg'?value/1000:value;
    if(!found.some(d=>d.mg===mg))found.push({value,unit,mg,weekLabel:match[1].replace(/\s+/g,' ')});
  }
  return found.length?found:p.doses;
}

function populateProducts(keep){
  products.sort((a,b)=>a.name.localeCompare(b.name));
  productSelect.innerHTML=products.map(p=>`<option value="${esc(p.name)}">${esc(p.name)}</option>`).join('');
  if(keep&&products.some(p=>p.name===keep))productSelect.value=keep;
  populateStrengths();
}
function populateStrengths(){
  const p=current(); if(!p)return;
  const old=Number(strengthSelect.value);
  strengthSelect.innerHTML=p.strengths.map(mg=>`<option value="${mg}">${strengthLabel(mg)}</option>`).join('');
  if(p.strengths.includes(old))strengthSelect.value=old;
  p.displayDoses=isNasal(p)?nasalDoses(p):scheduledDoses(p);
  doseSelect.innerHTML=p.displayDoses.map((d,i)=>`<option value="${i}">${d.weekLabel?`${esc(d.weekLabel)} — `:''}${doseLabel(d)}${i===0?' — starting dose':''}</option>`).join('');
  render();
}
function render(){
  const p=current();if(!p)return;
  const vialMg=Number(strengthSelect.value||p.strengths[0]);
  const doses=p.displayDoses||scheduledDoses(p),dose=doses[Number(doseSelect.value)||0]||doses[0];
  if(isNasal(p)){renderNasal(p,vialMg,dose);return}
  const rows=WATER_OPTIONS.map(ml=>({ml,units:dose.mg/vialMg*ml*100,concentration:vialMg/ml}));
  const eligible=rows.filter(r=>r.units>0&&r.units<50.000001).sort((a,b)=>a.units-b.units||a.ml-b.ml);
  const recommended=eligible[0]||null;
  $('productName').textContent=p.name;
  $('category').textContent=p.category;
  $('vialPill').textContent=strengthLabel(vialMg);
  $('overview').textContent=conciseOverview(p);
  $('schedule').textContent=conciseSchedule(p);
  $('reconHeading').textContent='Reconstitution comparison';
  $('reconSubtext').textContent='U-100 syringe calculation: 100 units = 1 mL. The recommendation follows the requested rule: the lowest draw that is under 50 units.';
  $('volumeHeading').textContent='BAC volume';$('drawHeading').textContent='Unit draw';$('reconNotesHeading').textContent='Reconstitution notes';$('unitsLabel').textContent='UNITS ON A U-100 SYRINGE';
  $('reconNotes').textContent=p.reconstitution;
  $('stability').textContent=p.stability;
  $('disclaimer').textContent=(p.disclaimer||'For educational planning only. Not medical advice.')+' Verify dosing, route, compatibility, and preparation with a qualified clinician or pharmacist.';
  $('reconRows').innerHTML=rows.map(r=>`<tr class="${recommended&&r.ml===recommended.ml?'recommended':''}"><td>${r.ml} mL${recommended&&r.ml===recommended.ml?' · RECOMMENDED':''}</td><td>${fmt(r.concentration,3)} mg/mL</td><td>${doseLabel(dose)}</td><td>${fmt(r.units,2)} units</td></tr>`).join('');
  if(recommended){
    $('recommendedMl').textContent=`${recommended.ml} mL BAC water`;
    $('recommendedDose').textContent=`${doseLabel(dose)} from a ${fmt(vialMg)}mg vial`;
    $('recommendedUnits').textContent=fmt(recommended.units,2);
    $('recommendation').hidden=false;
  }else{
    $('recommendedMl').textContent='No listed volume keeps this dose below 50 units';
    $('recommendedDose').textContent=`Review the vial strength and dose before proceeding`;
    $('recommendedUnits').textContent='—';
    $('recommendation').hidden=false;
  }
}

function renderNasal(p,vialMg,dose){
  const salineMl=5,spraysPerMl=10,totalSprays=salineMl*spraysPerMl,mcgPerSpray=vialMg*1000/totalSprays,sprays=dose.mg*1000/mcgPerSpray;
  $('productName').textContent=p.name;$('category').textContent=p.category;$('vialPill').textContent=strengthLabel(vialMg);$('overview').textContent=conciseOverview(p);$('schedule').textContent=conciseSchedule(p);
  $('reconHeading').textContent='Nasal spray preparation';
  $('reconSubtext').textContent='Calculated using a 5 mL sprayer delivering approximately 0.1 mL per spray (about 50 sprays total). Actual pump output can vary; verify your sprayer.';
  $('volumeHeading').textContent='Saline volume';$('drawHeading').textContent='Sprays per dose';
  $('reconRows').innerHTML=`<tr class="recommended"><td>5 mL sterile saline · RECOMMENDED</td><td>${fmt(mcgPerSpray,2)} mcg/spray</td><td>${doseLabel(dose)}</td><td>${fmt(sprays,2)} spray${Math.abs(sprays-1)<.001?'':'s'}</td></tr>`;
  $('reconNotesHeading').textContent='Nasal preparation notes';
  $('reconNotes').textContent='Reconstitute the selected vial with 5 mL of sterile saline and transfer it to a clean 5 mL nasal sprayer. Do not use bacteriostatic water for this nasal preparation.';
  $('stability').textContent='Keep the prepared nasal spray refrigerated and protected from light. Label it with the preparation date. Follow the saline and sprayer manufacturer’s storage guidance.';
  $('recommendedMl').textContent='5 mL sterile saline';$('recommendedDose').textContent=`${doseLabel(dose)} from a ${fmt(vialMg)}mg vial · ${fmt(mcgPerSpray,2)} mcg per spray`;$('recommendedUnits').textContent=fmt(sprays,2);$('unitsLabel').textContent='SPRAYS PER DOSE';
  const fractional=Math.abs(sprays-Math.round(sprays))>.05?' This produces a fractional spray count that cannot be measured accurately with a fixed-dose pump.':'';
  $('disclaimer').textContent=(p.disclaimer||'For educational planning only. Not medical advice.')+' Verify the sprayer output and preparation with a qualified clinician or pharmacist.'+fractional;
  $('recommendation').hidden=false;
}

function extractOffers(html){
  const marker='const OFFERS=';let start=html.indexOf(marker);if(start<0)throw Error('TPLPrice offer data not found');start+=marker.length;
  let depth=0,quoted=false,escaped=false;
  for(let i=start;i<html.length;i++){
    const c=html[i];if(quoted){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c==='"')quoted=false;continue}
    if(c==='"')quoted=true;else if(c==='[')depth++;else if(c===']'&&--depth===0)return JSON.parse(html.slice(start,i+1));
  }throw Error('TPLPrice offer data incomplete');
}
function decodeBase64(value){const bytes=Uint8Array.from(atob(value.replace(/\n/g,'')),c=>c.charCodeAt(0));return new TextDecoder().decode(bytes)}
async function syncStrengths(){
  try{
    const url=`https://api.github.com/repos/ThatPepLab/TPLPrice/contents/index.html?ref=main&updated=${Date.now()}`;
    const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw Error(`GitHub returned ${response.status}`);
    const payload=await response.json(),offers=extractOffers(decodeBase64(payload.content));
    const old=current()?.name;
    for(const p of products){
      const found=offers.filter(o=>o.product.toLowerCase()===p.name.toLowerCase()).map(o=>Number((String(o.strength||o.spec).match(/(\d+(?:\.\d+)?)\s*mg/i)||[])[1])).filter(Number.isFinite);
      if(found.length)p.strengths=[...new Set(found)].sort((a,b)=>a-b);
    }
    populateProducts(old);$('syncStatus').textContent=`TPLPrice strengths checked ${new Date().toLocaleTimeString()}. Automatic check repeats every 5 minutes.`;
  }catch(error){$('syncStatus').textContent=`Using the built-in TPLPrice snapshot. Live check could not complete: ${error.message}`;}
}

productSelect.addEventListener('change',populateStrengths);strengthSelect.addEventListener('change',render);doseSelect.addEventListener('change',render);$('printButton').addEventListener('click',()=>window.print());
populateProducts();syncStrengths();setInterval(syncStrengths,5*60*1000);
