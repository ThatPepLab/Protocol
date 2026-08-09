const WATER_OPTIONS=[1,1.5,2,2.5,3];
let products=(window.PROTOCOL_DATA||[]).map(p=>({...p,strengths:[...p.strengths]}));
const $=id=>document.getElementById(id);
const productSelect=$('productSelect'),strengthSelect=$('strengthSelect'),doseSelect=$('doseSelect');

function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fmt(n,digits=2){return Number(n).toLocaleString(undefined,{maximumFractionDigits:digits})}
function strengthLabel(mg){return `${fmt(mg)}mg vial`}
function doseLabel(d){return `${fmt(d.value,3)}${d.unit}`}
function current(){return products.find(p=>p.name===productSelect.value)||products[0]}

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
  p.displayDoses=scheduledDoses(p);
  doseSelect.innerHTML=p.displayDoses.map((d,i)=>`<option value="${i}">${d.weekLabel?`${esc(d.weekLabel)} — `:''}${doseLabel(d)}${i===0?' — starting dose':''}</option>`).join('');
  render();
}
function render(){
  const p=current();if(!p)return;
  const vialMg=Number(strengthSelect.value||p.strengths[0]);
  const doses=p.displayDoses||scheduledDoses(p),dose=doses[Number(doseSelect.value)||0]||doses[0];
  const rows=WATER_OPTIONS.map(ml=>({ml,units:dose.mg/vialMg*ml*100,concentration:vialMg/ml}));
  const eligible=rows.filter(r=>r.units>0&&r.units<50.000001).sort((a,b)=>a.units-b.units||a.ml-b.ml);
  const recommended=eligible[0]||null;
  $('productName').textContent=p.name;
  $('category').textContent=p.category;
  $('vialPill').textContent=strengthLabel(vialMg);
  $('overview').textContent=p.overview;
  $('schedule').textContent=p.schedule;
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
