const WATER_OPTIONS=[1,1.5,2,2.5,3];
const REFERENCE_ONLY_NAMES=new Set([
  '5-Amino-1MQ','Adamax','Adamax-982','ADAMAX-984','Adipotide','Cagrilintide + Semaglutide','Dihexa','FOXO4-DRI','Humanin','Oxytocin Acetate','PE-22-28','PNC-27','GLP-3RT + Cagrilintide','GLP-3RT 20mg + Trizepatide 40mg (10ml)','Selank+Semax','SLU-PP-332','Tesamorelin + Ipamorelin',
  'ACE-031','Alprostadil','Botulinum toxin','EPO','Follistatin','GDF-8','Gonadorelin','HCG','HGH 191AA','HGH Fragment 176-191','HMG','IGF-1 LR3','IGF-DES','Insulin-1vial','Testosterone Cypionate','Testosterone Enanthate'
]);
const REFERENCE_SCHEDULES={
  '5-Amino-1MQ':'Common community reference\nAmount: 50–100 mg daily\nRoute: Oral\nNo reconstitution or syringe calculation applies',
  'Cagrilintide + Semaglutide':'Reference only\nThe listed total strength does not consistently identify the amount of each component\nConfirm both component amounts before applying either titration schedule',
  'Dihexa':'Common community reference\nAmount: 5–20 mg daily\nRoute: Oral is most commonly reported\nEvidence: Preclinical + anecdotal; no human dose-finding studies',
  'Oxytocin Acetate':'Reference only\nIntranasal, sublingual, and injectable products use different units and concentrations\nUse the exact formulation instructions',
  'GLP-3RT + Cagrilintide':'Reference only\nThe listed total strength does not establish the amount of each component\nDo not calculate a draw until both component strengths are confirmed',
  'GLP-3RT 20mg + Trizepatide 40mg (10ml)':'Reference only\nFixed blend: 20 mg GLP-3RT + 40 mg tirzepatide\nNo general schedule is provided for combining two overlapping incretin agonists',
  'Selank+Semax':'Reference only\nBoth components are intranasal, but the total vial strength does not consistently establish each component amount\nConfirm the ratio before calculating sprays',
  'SLU-PP-332':'Reference only\nNo human dosing protocol has been established\nPublished research used animal dosing and non-water vehicles that should not be converted into a human schedule',
  'Tesamorelin + Ipamorelin':'Reference only\nThe total vial strength does not consistently establish the amount of each component\nConfirm both component amounts before calculating a draw'
};
let products=(window.PROTOCOL_DATA||[]).map(p=>({...p,calculable:p.calculable===false?false:!REFERENCE_ONLY_NAMES.has(p.name),strengths:[...p.strengths]}));
const $=id=>document.getElementById(id);
const productSelect=$('productSelect'),strengthSelect=$('strengthSelect'),doseSelect=$('doseSelect');

function esc(value){return String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function fmt(n,digits=2){return Number(n).toLocaleString(undefined,{maximumFractionDigits:digits})}
function strengthLabel(mg,p=current()){return `${fmt(mg)}${p?.strengthUnit||'mg'} vial`}
function doseLabel(d){return d?.note||`${fmt(d.value,3)}${d.unit}`}
function isTitrationProtocol(p){
  const text=String(p.schedule||'');
  return /titration|dose escalation/i.test(text)||(/weeks?\s*1\b/i.test(text)&&/weeks?\s*(?:5|6|7|8|9|1\d)\b/i.test(text));
}
function doseGuidance(p,dose,index){return index>0&&isTitrationProtocol(p)?'STAY HERE IF EFFECTIVE — increase only if needed and tolerated':''}
function current(){return products.find(p=>p.name===productSelect.value)||products[0]}
function isNasal(p){return /^(?:semax|selank|vip)$/i.test(p.name)}

const DOSE_OVERRIDES={
  'AOD-9604':[doseRecord(250,'mcg'),doseRecord(300,'mcg'),doseRecord(500,'mcg')],
  'BPC-157 + TB500':[doseRecord(.5,'mg','250 mcg each peptide'),doseRecord(1,'mg','500 mcg each peptide')],
  'Cagrilintide':[doseRecord(.25),doseRecord(.5),doseRecord(1),doseRecord(1.7),doseRecord(2.4)],
  'CJC-1295 No DAC + Ipamorelin':[doseRecord(.2,'mg','100 mcg each peptide'),doseRecord(.4,'mg','200 mcg each peptide')],
  'FOXO4-DRI':[doseRecord(2),doseRecord(3),doseRecord(5),doseRecord(.3)],
  'GHK-Cu':[doseRecord(.5),doseRecord(1),doseRecord(2)],
  'Glutathione':[doseRecord(100),doseRecord(200),doseRecord(400),doseRecord(600)],
  'MOTS-C':[doseRecord(2.5),doseRecord(3),doseRecord(4),doseRecord(5)],
  'NAD+':[doseRecord(50),doseRecord(75),doseRecord(100)],
  'Tesamorelin':[doseRecord(.5),doseRecord(1),doseRecord(2)],
  'VIP':[doseRecord(25,'mcg'),doseRecord(50,'mcg'),doseRecord(100,'mcg')]
};
function doseRecord(value,unit='mg',note){return {value,unit,mg:unit==='mcg'?value/1000:value,note}}

function frequencyRange(p){
  const text=conciseSchedule(p).toLowerCase();
  if(/as needed|prn|no general|reference only/.test(text))return null;
  let m=text.match(/frequency:\s*(\d+(?:\.\d+)?)\s*(?:to|–|-)\s*(\d+(?:\.\d+)?)\s*times daily/);
  if(m)return {min:+m[1],max:+m[2],basis:'day'};
  if(/frequency:\s*(?:twice|2 times) daily/.test(text))return {min:2,max:2,basis:'day'};
  if(/frequency:\s*(?:three|3 times) daily/.test(text))return {min:3,max:3,basis:'day'};
  if(/frequency:[^\n]*(?:once or twice daily|once\/twice daily)/.test(text))return {min:1,max:2,basis:'day'};
  if(/frequency:[^\n]*daily or 5 days (?:weekly|per week)/.test(text))return {min:5,max:7,basis:'week'};
  if(/frequency:[^\n]*(?:once daily|daily)|dose:[^\n]*daily|amount:[^\n]*daily/.test(text))return {min:1,max:1,basis:'day'};
  m=text.match(/frequency:\s*(\d+(?:\.\d+)?)\s*(?:to|–|-)\s*(\d+(?:\.\d+)?)\s*times (?:per )?week/);
  if(m)return {min:+m[1],max:+m[2],basis:'week'};
  if(/frequency:[^\n]*(?:three times weekly|3 times (?:per )?week|split across three)/.test(text))return {min:3,max:3,basis:'week'};
  if(/frequency:[^\n]*(?:twice weekly|2 times (?:per )?week)/.test(text))return {min:2,max:2,basis:'week'};
  if(/frequency:[^\n]*(?:once weekly|weekly)|weekly titration/.test(text))return {min:1,max:1,basis:'week'};
  if(/every other day/.test(text))return {min:.5,max:.5,basis:'day'};
  if(/5 days weekly|5 days per week|five days weekly/.test(text))return {min:5,max:5,basis:'week'};
  return null;
}

function durationText(p,vialAmount,dose){
  const frequency=frequencyRange(p),uses=vialAmount/dose.mg;
  if(!frequency||!Number.isFinite(uses)||uses<=0)return 'Vial duration: no fixed schedule';
  const toDays=f=>frequency.basis==='week'?uses/f*7:uses/f;
  const shortest=toDays(frequency.max),longest=toDays(frequency.min);
  const days=n=>fmt(n,n<10?1:0),useLabel=`${fmt(uses,1)} dose${Math.abs(uses-1)<.001?'':'s'}`;
  const duration=Math.abs(shortest-longest)<.01?days(shortest):`${days(shortest)}–${days(longest)}`;
  return `Vial lasts about ${duration} days at this dose · ${useLabel}${longest>28?' · review stability':''}`;
}

const PROTOCOL_OVERRIDES={
  'Cagrilintide + Semaglutide':{
    overview:'A fixed blend of an amylin analog and a GLP-1 receptor agonist. The total vial strength does not reliably identify each component amount, so dose and draw calculations are withheld until the exact ratio is confirmed.',
    schedule:'Reference only\nConfirm the amount of cagrilintide and semaglutide separately\nNo generalized dosage or reconstitution calculation is provided for an unknown blend ratio'
  },
  'DSIP':{
    overview:'A naturally occurring neuropeptide investigated for sleep and stress signaling. Human studies are limited and inconsistent, so practical protocols remain community-based rather than clinically established.',
    schedule:'Common community reference\nDose: 100–300 mcg\nFrequency: Once daily\nTiming: 30–60 minutes before bed\nCycle: Commonly 5–10 nights before reassessment\nEvidence: Limited human research + community use'
  },
  'GHRP-2 Acetate':{
    overview:'A synthetic growth-hormone secretagogue that activates the ghrelin receptor and stimulates growth-hormone release. Human research exists, but generalized wellness dosing is not FDA approved.',
    schedule:'Common community reference\nDose: 100–300 mcg per administration\nFrequency: One to three times daily\nTiming: Commonly fasted\nCycle: Commonly 8–12 weeks\nEvidence: Human pharmacology + community use'
  },
  'IGF-1 LR3':{
    overview:'A long-acting synthetic IGF-1 analog with substantial hypoglycemia and growth-signaling concerns. Product concentration, indication, glucose monitoring, and clinical oversight materially affect dosing.',
    schedule:'Reference only\nNo generalized dosage or reconstitution calculation is provided because of hypoglycemia risk and indication-specific monitoring requirements.'
  },
  'GLP-3RT':{
    overview:'An investigational once-weekly agonist of GLP-1, GIP, and glucagon receptors studied for obesity and metabolic disease. It is not FDA approved, and no single community titration schedule should be represented as an approved regimen.',
    schedule:'Investigational community titration reference\nWeeks 1–4: 2 mg once weekly\nWeeks 5–8: 4 mg once weekly\nWeeks 9–12: 8 mg once weekly\nWeek 13 onward: 12 mg once weekly\nImportant: Phase 2 research tested several target-dose groups with different starting doses; this stepwise schedule is a community model, not one validated trial regimen.'
  },
  'Semaglutide':{
    overview:'A GLP-1 receptor agonist approved in specific formulations for type 2 diabetes and chronic weight management. Injection and oral formulations use different schedules and are not interchangeable.',
    schedule:'FDA-labeled weekly injection titration for weight management\nWeeks 1–4: 0.25 mg once weekly\nWeeks 5–8: 0.5 mg once weekly\nWeeks 9–12: 1 mg once weekly\nWeeks 13–16: 1.7 mg once weekly\nWeek 17 onward: 1.7 or 2.4 mg once weekly, based on indication and tolerability\nUse the labeling for the exact formulation and indication.'
  },
  'SS-31':{
    overview:'Also called elamipretide, SS-31 is a mitochondria-targeting peptide studied for effects on mitochondrial membranes and cellular energy function. Human trials exist for specific diseases, while community wellness protocols remain unapproved and less certain.',
    schedule:'Common community reference\nDose: 1–2 mg\nFrequency: Once daily\nTiming: No established fasting requirement\nCycle: Commonly 4–8 weeks\nEvidence: Human disease trials + community use outside approved indications'
  },
  'BPC-157 + TB500':{
    overview:'A 1:1 blend of BPC-157 and TB-500 commonly discussed for soft-tissue and recovery research. Evidence is mainly animal data plus community reports; controlled human dosing data are limited.',
    schedule:'Common community range\nDose: 250–500 mcg of each peptide\nFrequency: Once daily\nTiming: Any time; fasting is not commonly required\nRoute: Subcutaneous\nCycle: Commonly 4–8 weeks\nEvidence: Animal research + anecdotal/community use'
  },
  'Tesamorelin':{
    overview:'A GHRH analog that stimulates natural growth-hormone release. Community body-composition protocols commonly use less than the 2 mg daily disease-specific prescription regimen.',
    schedule:'Common community range\nDose: 0.5–1 mg\nFrequency: Once daily, often 5 days on / 2 days off\nTiming: Commonly fasted before bed or fasted in the morning\nRoute: Subcutaneous\nCycle: Commonly 8–12 weeks; longer cycles are also reported\nStudied/approved context: 2 mg daily is the HIV-lipodystrophy regimen, not the default community starting amount'
  },
  'Tirzepatide':{
    overview:'A dual GIP and GLP-1 receptor agonist approved in specific formulations for type 2 diabetes and chronic weight management. It uses once-weekly dosing and gradual escalation to reduce gastrointestinal adverse effects.',
    schedule:'FDA-labeled weekly injection titration\nWeeks 1–4: 2.5 mg once weekly\nWeeks 5–8: 5 mg once weekly\nFurther increases: 2.5 mg increments only after at least 4 weeks at the current dose\nMaintenance doses depend on indication and response; maximum labeled dose is 15 mg once weekly\nUse the labeling for the exact product and indication.'
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
  },
  'NAD+':{
    overview:'A cellular coenzyme involved in energy metabolism and repair pathways. Subcutaneous wellness protocols are community-led because controlled human evidence for long-term daily injection remains limited.',
    schedule:'Common community range\nDose: 50–100 mg daily\nFrequency: Once daily\nTiming: Morning is commonly preferred\nCycle: Commonly 8–16 weeks\nAlternative maintenance: 50–100 mg one to three times weekly is also reported\nEvidence: Emerging clinical practice + anecdotal/community use'
  },
  'AOD-9604':{
    overview:'A modified growth-hormone fragment studied for metabolic effects. Human obesity trials found limited weight-loss efficacy, while community use commonly continues at lower injectable amounts.',
    schedule:'Common community range\nDose: 250–500 mcg daily\nFrequency: Once daily\nTiming: Commonly fasted in the morning\nCycle: Commonly 4–12 weeks\nEvidence: Human safety data + community use'
  },
  'Cagrilintide':{
    overview:'A long-acting amylin analog studied for appetite and weight management. It is commonly titrated slowly because gastrointestinal effects are dose-related.',
    schedule:'Weekly titration\nWeeks 1–4: 0.25 mg\nWeeks 5–8: 0.5 mg\nWeeks 9–12: 1 mg\nWeeks 13–16: 1.7 mg\nWeek 17 onward: 2.4 mg\nFrequency: Once weekly'
  },
  'CJC-1295 No DAC':{
    overview:'A short-acting GHRH analog used in community growth-hormone pulse protocols. It is not interchangeable with the longer-acting DAC form.',
    schedule:'Common community range\nDose: 100–300 mcg per administration\nFrequency: Once daily; some protocols use two or three administrations\nTiming: Fasted\nCycle: Commonly 12–16 weeks, then 4 weeks off'
  },
  'CJC-1295 With DAC':{
    overview:'A longer-acting GHRH analog whose DAC complex extends exposure. Its community schedule differs materially from CJC-1295 without DAC.',
    schedule:'Common community range\nDose: 1–2 mg total weekly\nFrequency: Once or twice weekly\nTiming: No strict time requirement is commonly reported\nCycle: Commonly 8–12 weeks'
  },
  'FOXO4-DRI':{
    overview:'An experimental peptide intended to disrupt FOXO4-p53 signaling in senescent-cell models. Evidence is preclinical and community dosing is highly uncertain.',
    schedule:'Common community cycle\nDose: 2–5 mg every other day\nCourse: 3 total administrations\nRepeat: Commonly one to three cycles yearly\nAlternative low-dose report: 0.3–0.5 mg daily for 7 days\nEvidence: Preclinical + anecdotal'
  },
  'GHK-Cu':{
    overview:'A naturally occurring copper-binding peptide studied for tissue repair, collagen signaling, skin, and hair. Injectable use is community-led; topical formulations use different concentration math.',
    schedule:'Common injectable community range\nDose: 0.5–2 mg per administration\nFrequency: Daily or 5 days weekly\nCycle: Commonly 4–8 weeks; some extend to 12 weeks\nBreak: Commonly 4–6 weeks between cycles\nTopical formulations are not included in this syringe calculator'
  },
  'Glutathione':{
    overview:'An endogenous antioxidant used in several injectable and oral formulations. Absorption, route, and product concentration materially change the protocol.',
    schedule:'Common subcutaneous range\nDose: 100–200 mg\nFrequency: Three times weekly\nIntensive community schedule: 200 mg daily or five days weekly for 4–8 weeks\nIM maintenance reports: 400–600 mg weekly'
  },
  'MOTS-C':{
    overview:'A mitochondrial-derived peptide investigated for metabolic signaling and exercise response. Practical dosing is primarily community-based.',
    schedule:'Common community range\nWeekly total: 5–10 mg\nFrequency: Split across three administrations, commonly Monday / Wednesday / Friday\nTiming: Morning or before training\nCycle: Commonly 4–8 weeks, followed by equal time off'
  },
  'VIP':{
    overview:'Vasoactive intestinal peptide is used in specialized compounded nasal protocols and studied for immune, inflammatory, and pulmonary signaling.',
    schedule:'Specialized intranasal reference\nStarting amount: 25–50 mcg per administration\nCommon published protocol: 50 mcg four times daily, then 100 mcg four times daily\nRoute: Intranasal\nUse depends on the underlying indication and compounded formulation'
  }
};

function conciseOverview(p){
  if(PROTOCOL_OVERRIDES[p.name])return PROTOCOL_OVERRIDES[p.name].overview;
  const clean=String(p.overview||'').replace(/\s+/g,' ').replace(/\bI (?:have|used|started|noticed|experienced)\b[\s\S]*$/i,'').trim();
  const sentences=clean.match(/[^.!?]+[.!?]+/g)||[clean];
  const neutral=sentences.filter(sentence=>!/\b(i|me|my|mine|we|our|ours|you|your|yours)\b/i.test(sentence));
  let summary=(neutral.length?neutral:sentences).slice(0,2).join(' ').trim();
  if(summary.length>520)summary=summary.slice(0,summary.lastIndexOf(' ',500))+'…';
  if(p.calculable===false)return summary+' This entry is reference-only; no generalized dosage or reconstitution calculation is provided.';
  const evidence=/no human|zero published human|animal studies|preclinical/i.test(clean)
    ?' Evidence is primarily preclinical and/or anecdotal.'
    :/FDA approved|clinical trial|human subjects|human clinical/i.test(clean)
      ?' Human research exists, although community use may differ from studied disease protocols.'
      :' Published human dosing evidence is limited; community use supplies much of the practical protocol.';
  return summary+evidence;
}

function conciseSchedule(p){
  if(p.calculable===false)return REFERENCE_SCHEDULES[p.name]||'Reference only\nNo generalized dosage or reconstitution calculation is provided because dosing is formulation-specific, indication-specific, or requires clinical monitoring.';
  if(REFERENCE_SCHEDULES[p.name])return REFERENCE_SCHEDULES[p.name];
  if(PROTOCOL_OVERRIDES[p.name])return withEscalationGuidance(p,PROTOCOL_OVERRIDES[p.name].schedule);
  const lines=String(p.schedule||'').replace(/\.\.\.$/gm,'').split(/\n/).map(line=>line.trim().replace(/\s+/g,' ')).filter(line=>line&&!/\b(i|me|my|mine|we|our|ours|you|your|yours)\b/i.test(line));
  const kept=[];
  for(const line of lines){
    if(/^(?:weeks?|days?)\s*\d+(?:\s*(?:to|through|–|-)\s*\d+)?\s*:/i.test(line)
      || /^(?:week|day)\s*\d+\s*(?:onward|and beyond|\+)?[^:]*:/i.test(line)
      || /^(?:dose|frequency|timing|route|administration|duration|cycle(?: length)?|break|total daily|initial|loading|maintenance)\s*:/i.test(line))kept.push(line);
    if(kept.length===12)break;
  }
  if(!kept.length){
    kept.push(`Commonly listed amount: ${p.doses.map(d=>doseLabel(d)).join('–')}`);
    if(p.frequency)kept.push(`Frequency: ${p.frequency}`);
  }
  return withEscalationGuidance(p,['Concise protocol reference',...new Set(kept),'Evidence: Published research where available; otherwise repeated animal and community practice'].join('\n'));
}

function withEscalationGuidance(p,text){
  return isTitrationProtocol(p)?`${text}\nTitration guidance: After the starter dose, STAY HERE if the current dose remains effective and tolerated. Do not increase automatically just because the next step is available.`:text;
}

function nasalSchedule(p){
  return String(p.schedule||'').replace(/\nSUBCUTANEOUS(?: INJECTION)? PROTOCOL[\s\S]*?(?=\n(?:NASAL SPRAY PREPARATION|CYCLE GUIDANCE))/i,'\n').trim();
}

function nasalDoses(p){
  if(DOSE_OVERRIDES[p.name])return DOSE_OVERRIDES[p.name];
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
  if(DOSE_OVERRIDES[p.name])return DOSE_OVERRIDES[p.name];
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
  strengthSelect.innerHTML=p.strengths.map(mg=>`<option value="${mg}">${strengthLabel(mg,p)}</option>`).join('');
  if(p.strengths.includes(old))strengthSelect.value=old;
  p.displayDoses=p.calculable===false?[{value:0,unit:'',mg:0,note:'No general calculation'}]:isNasal(p)?nasalDoses(p):scheduledDoses(p);
  doseSelect.innerHTML=p.displayDoses.map((d,i)=>`<option value="${i}">${d.weekLabel?`${esc(d.weekLabel)} — `:''}${doseLabel(d)}${i===0?' — STARTER DOSE':doseGuidance(p,d,i)?` — ${esc(doseGuidance(p,d,i))}`:''}</option>`).join('');
  render();
}
function render(){
  const p=current();if(!p)return;
  const vialMg=Number(strengthSelect.value||p.strengths[0]);
  const doses=p.displayDoses||scheduledDoses(p),dose=doses[Number(doseSelect.value)||0]||doses[0];
  if(p.calculable===false){renderReferenceOnly(p,vialMg);return}
  if(isNasal(p)){renderNasal(p,vialMg,dose);return}
  const rows=WATER_OPTIONS.map(ml=>({ml,units:dose.mg/vialMg*ml*100,concentration:vialMg/ml}));
  const eligible=rows.filter(r=>r.units>0&&r.units<50.000001).sort((a,b)=>a.units-b.units||a.ml-b.ml);
  const recommended=eligible[0]||null;
  $('productName').textContent=p.name;
  $('category').textContent=p.category;
  $('vialPill').textContent=strengthLabel(vialMg,p);
  $('overview').textContent=conciseOverview(p);
  $('schedule').textContent=conciseSchedule(p);
  $('reconHeading').textContent='Reconstitution comparison';
  $('reconSubtext').textContent='U-100 syringe calculation: 100 units = 1 mL. The recommendation follows the requested rule: the lowest draw that is under 50 units.';
  $('volumeHeading').textContent='BAC volume';$('drawHeading').textContent='Unit draw';$('reconNotesHeading').textContent='Reconstitution notes';$('unitsLabel').textContent='UNITS ON A U-100 SYRINGE';
  $('reconNotes').textContent=p.reconstitution;
  $('stability').textContent=p.stability;
  $('disclaimer').textContent=(p.disclaimer||'For educational planning only. Not medical advice.')+' Verify dosing, route, compatibility, and preparation with a qualified clinician or pharmacist.';
  $('vialDuration').textContent=durationText(p,vialMg,dose);
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

function renderReferenceOnly(p,vialAmount){
  $('productName').textContent=p.name;$('category').textContent=p.category;$('vialPill').textContent=strengthLabel(vialAmount,p);
  $('overview').textContent=conciseOverview(p);$('schedule').textContent=conciseSchedule(p);
  $('reconHeading').textContent='Calculation unavailable';$('reconSubtext').textContent='A general-use unit calculation is intentionally not provided for this prescription product, supply, topical material, or insufficiently documented compound.';
  $('volumeHeading').textContent='Volume';$('drawHeading').textContent='Draw';$('reconRows').innerHTML='';
  $('reconNotesHeading').textContent='Handling notes';$('reconNotes').textContent=p.reconstitution||'Follow the product-specific manufacturer or pharmacy instructions.';
  $('stability').textContent=p.stability||'Follow the labeled storage instructions for the exact formulation.';
  $('recommendation').hidden=true;$('disclaimer').textContent=(p.disclaimer||'Research ONLY. Not medical advice.')+' No general dosing or reconstitution calculation is provided.';
  $('vialDuration').textContent='';
}

function renderNasal(p,vialMg,dose){
  const salineMl=5,spraysPerMl=10,totalSprays=salineMl*spraysPerMl,mcgPerSpray=vialMg*1000/totalSprays,sprays=dose.mg*1000/mcgPerSpray;
  $('productName').textContent=p.name;$('category').textContent=p.category;$('vialPill').textContent=strengthLabel(vialMg,p);$('overview').textContent=conciseOverview(p);$('schedule').textContent=conciseSchedule(p);
  $('reconHeading').textContent='Nasal spray preparation';
  $('reconSubtext').textContent='Calculated using a 5 mL sprayer delivering approximately 0.1 mL per spray (about 50 sprays total). Actual pump output can vary; verify your sprayer.';
  $('volumeHeading').textContent='Saline volume';$('drawHeading').textContent='Sprays per dose';
  $('reconRows').innerHTML=`<tr class="recommended"><td>5 mL sterile saline · RECOMMENDED</td><td>${fmt(mcgPerSpray,2)} mcg/spray</td><td>${doseLabel(dose)}</td><td>${fmt(sprays,2)} spray${Math.abs(sprays-1)<.001?'':'s'}</td></tr>`;
  $('reconNotesHeading').textContent='Nasal preparation notes';
  $('reconNotes').textContent='Reconstitute the selected vial with 5 mL of sterile saline and transfer it to a clean 5 mL nasal sprayer. Do not use bacteriostatic water for this nasal preparation.';
  $('stability').textContent='Keep the prepared nasal spray refrigerated and protected from light. Label it with the preparation date. Follow the saline and sprayer manufacturer’s storage guidance.';
  $('recommendedMl').textContent='5 mL sterile saline';$('recommendedDose').textContent=`${doseLabel(dose)} from a ${fmt(vialMg)}mg vial · ${fmt(mcgPerSpray,2)} mcg per spray`;$('recommendedUnits').textContent=fmt(sprays,2);$('unitsLabel').textContent='SPRAYS PER DOSE';
  $('vialDuration').textContent=durationText(p,vialMg,dose);
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
      const unit=p.strengthUnit||'mg',unitPattern=unit.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
      const found=offers.filter(o=>o.product.toLowerCase()===p.name.toLowerCase()).map(o=>Number((String(o.strength||o.spec).match(new RegExp(`(\\d+(?:\\.\\d+)?)\\s*${unitPattern}`,'i'))||[])[1])).filter(Number.isFinite);
      if(found.length)p.strengths=[...new Set(found)].sort((a,b)=>a-b);
    }
    populateProducts(old);$('syncStatus').textContent=`TPLPrice strengths checked ${new Date().toLocaleTimeString()}. Automatic check repeats every 5 minutes.`;
  }catch(error){$('syncStatus').textContent=`Using the built-in TPLPrice snapshot. Live check could not complete: ${error.message}`;}
}

productSelect.addEventListener('change',populateStrengths);strengthSelect.addEventListener('change',render);doseSelect.addEventListener('change',render);$('printButton').addEventListener('click',()=>window.print());
populateProducts();syncStrengths();setInterval(syncStrengths,5*60*1000);
