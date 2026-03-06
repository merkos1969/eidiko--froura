const PAY_TABLE = window.PAY_TABLE;
const el = (id)=>document.getElementById(id);
const has = (id)=>!!el(id);
function setText(id, value){ const n=el(id); if(n) n.textContent = value; }
function setValue(id, value){ const n=el(id); if(n) n.value = value; }
function setChecked(id, value){ const n=el(id); if(n) n.checked = !!value; }
const fmt = (n)=>{
  const v = Number(n||0);
  return v.toLocaleString('el-GR', {minimumFractionDigits:2, maximumFractionDigits:2});
};

function clampKids(raw){
  const k = Number(raw);
  if (Number.isNaN(k)) return 0;
  return k >= 4 ? 4 : Math.max(0, Math.min(3, k));
}
function kidsForCredit(raw){
  const k = Number(raw);
  if (Number.isNaN(k)) return 0;
  return k >= 4 ? 4 : Math.max(0, k); // UI έχει 4+
}

function categoryLabel(family, kidsRaw){
  const kids = clampKids(kidsRaw);
  if (family === 'single') return 'Άγαμος';
  if (kids === 0) return 'Έγγαμος χωρίς παιδιά';
  if (kids === 1) return '1 παιδί';
  return `${kids} παιδιά`;
}

function yearsBetween(dateA, dateB){
  if (!dateA || !dateB) return null;
  const a = new Date(dateA);
  const b = new Date(dateB);
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null;
  const ms = b.getTime() - a.getTime();
  const days = ms / (1000*60*60*24);
  const years = days / 365.2425;
  return years < 0 ? 0 : years;
}

function stepForYears(y){
  const yr = Number(y);
  for (const s of PAY_TABLE.steps){
    const r = PAY_TABLE.ranges[s];
    if (r && yr >= r.lo && yr < r.hi) return s;
  }
  return PAY_TABLE.steps[PAY_TABLE.steps.length - 1];
}

function readNum(id){
  const node = el(id);
  if (!node) return 0;
  const v = Number(node.value);
  return Number.isFinite(v) ? v : 0;
}

/**
 * Φορολογική κλίμακα (2026, άνω των 30) όπως στην εικόνα που έστειλες.
 * Ποσοστά ανά ζώνη εισοδήματος και ανά τέκνα (t).
 * kidsIdx: 0..4 (όπου 4 = 4+)
 */
function computeAnnualTax2026(annualTaxable, kidsIdx){
  const inc = Math.max(0, annualTaxable);
  const k = Math.max(0, Math.min(4, kidsIdx));

  // thresholds
  const bands = [10000, 20000, 30000, 40000, 60000, Infinity];

  // rates per band (0-10k, 10-20k, 20-30k, 30-40k, 40-60k, 60k+)
  const rates = [
    [0.09, 0.09, 0.09, 0.09, 0.00],
    [0.20, 0.18, 0.16, 0.09, 0.00],
    [0.26, 0.24, 0.22, 0.20, 0.18],
    [0.34, 0.34, 0.34, 0.34, 0.34],
    [0.39, 0.39, 0.39, 0.39, 0.39],
    [0.44, 0.44, 0.44, 0.44, 0.44],
  ].map(row => row[k]);

  let tax = 0;
  let prev = 0;
  for (let i=0;i<bands.length;i++){
    const upTo = bands[i];
    const taxable = Math.max(0, Math.min(inc, upTo) - prev);
    tax += taxable * rates[i];
    prev = upTo;
    if (inc <= upTo) break;
  }

  // Έκπτωση φόρου (όπως στην εικόνα)
  // 0τ:777, 1τ:900, 2τ:1120, 3τ:1340, 4τ:1580, 5τ:1780 (+220/παιδί)
  // UI έχει μέχρι 4+, άρα παίρνουμε 4τ:1580 για 4+.
  const creditByKids = [777, 900, 1120, 1340, 1580];
  let credit = creditByKids[k] ?? 777;

  // Μείωση 20€/1000€ πάνω από 12.000€
  if (inc > 12000){
    const over = inc - 12000;
    const thousands = Math.floor(over / 1000);
    credit = Math.max(0, credit - thousands * 20);
  }

  tax = Math.max(0, tax - credit);
  return tax;
}

function compute(){
  // Inputs
  const hireDate = el('hireDate').value;
  const calcDate = el('calcDate').value;
  const family = el('family').value;
  const kidsRaw = el('kids').value;
  const kidsIdx = clampKids(kidsRaw); // 0..4
  const insurance = el('insurance')?.value ?? 'post93';

  // Years/step
  const yrs = yearsBetween(hireDate, calcDate);
  setValue('years', (yrs==null) ? '-' : yrs.toFixed(2).replace('.', ','));

  const step = (yrs==null) ? null : stepForYears(yrs);
  setValue('step', step ? String(step) : '-');

  const cat = categoryLabel(family, kidsRaw);
  setText('tableCategory', cat);

  // Table values
  let base=0, duty=0, child=0, tableTotal=0, rangeLabel='-';
  if (step){
    const r = PAY_TABLE.ranges[step];
    rangeLabel = r?.label ?? '-';
    const rec = PAY_TABLE.byStep[String(step)]?.[cat];
    if (rec){
      base = rec.base;
      duty = rec.duty;
      child = rec.child;
      tableTotal = rec.total;
    }
  }
  setText('rangeLabel', rangeLabel);
  setText('basePay', fmt(base));
  setText('dutyPay', fmt(duty));
  setText('childPay', fmt(child));
  setText('tableTotal', fmt(tableTotal));

  // Extras
  const border = (el('borderYes')?.value === 'yes') ? 130 : 0;
  const personalDiff = readNum('personalDiff');
  const fiveDaysGross = readNum('fiveDaysCount') * readNum('fiveDaysRate');
  const nightGross = readNum('nightCount') * readNum('nightRate');

  const grossRegular = tableTotal + border + personalDiff;
  const gross = grossRegular + fiveDaysGross + nightGross;
  setText('grossTotal', fmt(gross));

  // Rates (defaults set in HTML)
  const rEfka = readNum('rEfka');            // 6,67%
  const rHealth = readNum('rHealth');        // 2,05%
  const rSolidarity = readNum('rSolidarity');// ανεργία 2%
  const rTeady = readNum('rTeayap');         // TEADY 3%
  const rTpdy = readNum('rTpyap');           // TPDY 4%
  const rEteaep = readNum('rEteaep');        // default 0
  const rSpecial = readNum('rSpecial');      // default 0

  // Βάση κρατήσεων (για κύριες κρατήσεις) — προεπιλογή "regular"
  const baseMode = el('baseMode')?.value ?? 'regular';
  let contribBase = tableTotal;
  if (baseMode === 'table_plus_border') contribBase = tableTotal + border;
  if (baseMode === 'regular') contribBase = tableTotal + border + personalDiff;
  if (baseMode === 'gross') contribBase = gross;

  // Κύριες κρατήσεις (στον κύριο μισθό)
  const efkaAmt = contribBase * rEfka;
  const healthAmt = contribBase * rHealth;
  const solidarityAmt = contribBase * rSolidarity;
  const teadyAmt = contribBase * rTeady;
  const tpdyAmt = contribBase * rTpdy;
  const eteaepAmt = contribBase * rEteaep;
  const specialAcctAmt = contribBase * rSpecial;

  // ΜΤΠΥ (ιδιαιτερότητα πριν/μετά 1993):
  // A) Βασικός + επίδομα (εδώ: "ιδιαίτερων καθηκόντων") -> 4,5%
  // B) Οικογενειακή παροχή + παραμεθόριος -> 4,5% αν από 01/01/1993 και μετά, αλλιώς 1%
  const mtpyRateA = 0.045;
  const mtpyRateB = (insurance === 'post93') ? 0.045 : 0.01;
  const mtpyBaseA = base + duty;
  const mtpyBaseB = child + border;
  const mtpyAmt = mtpyBaseA * mtpyRateA + mtpyBaseB * mtpyRateB;

  // Κρατήσεις σε Πενθήμερα/Νυχτερινά (όπως στα παραδείγματα)
  // Πενθήμερα: Ανεργία 2%
  // Νυχτερινά: Ανεργία 2% + ΜΤΠΥ 2%
  const fiveDaysUnemp = fiveDaysGross * rSolidarity;
  const nightUnemp = nightGross * rSolidarity;
  const nightMtpyExtra = nightGross * 0.02;

  // 5ετία (σταθερό ποσό αν ΝΑΙ)
  const fiveYearsOn = el('fiveYearsOn')?.value ?? 'no';
  const fiveYearsAmount = readNum('fiveYearsAmount');
  const fiveYearsAmt = (fiveYearsOn === 'yes') ? fiveYearsAmount : 0;

  // Other fixed
  const otherAmt = readNum('otherFixed');

  // Φόρος
  const taxMode = el('taxMode')?.value ?? 'auto';
  const taxMonths = Math.max(1, Math.floor(readNum('taxMonths') || 12));

  let taxAmt = 0;
  if (taxMode === 'manual'){
    taxAmt = readNum('manualTax');
  } else {
    // Υπολογισμός φόρου με “διαφορά” για να χειριστούμε σωστά την παρακράτηση από πενθήμερα/νυχτερινά.
    const regularDedsForTax = efkaAmt + healthAmt + solidarityAmt + teadyAmt + tpdyAmt + mtpyAmt + eteaepAmt + specialAcctAmt + fiveYearsAmt + otherAmt;
    const extraDedsForTax = fiveDaysUnemp + nightUnemp + nightMtpyExtra;

    const annualTaxableRegular = Math.max(0, (grossRegular - regularDedsForTax) * taxMonths);
    const annualTaxableAll = Math.max(0, (gross - (regularDedsForTax + extraDedsForTax)) * taxMonths);

    const annualTaxRegular = computeAnnualTax2026(annualTaxableRegular, kidsIdx);
    const annualTaxAll = computeAnnualTax2026(annualTaxableAll, kidsIdx);

    taxAmt = annualTaxAll / taxMonths;
    // (αν θες, μπορούμε να δείχνουμε ξεχωριστά φόρο "μισθού" και φόρο "extras")
    // const monthlyExtraTax = (annualTaxAll - annualTaxRegular) / taxMonths;
  }

  // Render
  setText('taxAmt', fmt(taxAmt));
  setText('healthAmt', fmt(healthAmt));
  setText('efkaAmt', fmt(efkaAmt));
  setText('solidarityAmt', fmt(solidarityAmt + fiveDaysUnemp + nightUnemp); // μαζί και στα extras
  setText('mtpyAmt', fmt(mtpyAmt + nightMtpyExtra); // μαζί και MTPY extras (2% νύχτες)
  setText('healthBranchAmt', fmt(0); // δεν χρησιμοποιείται εδώ
  setText('teayapAmt', fmt(teadyAmt);
  setText('tpyapAmt', fmt(tpdyAmt);
  setText('eteaepAmt', fmt(eteaepAmt);
  setText('specialAcctAmt', fmt(specialAcctAmt);
  setText('fiveYearsAmt', fmt(fiveYearsAmt));
  setText('otherAmt', fmt(otherAmt));

  const deds =
    taxAmt +
    healthAmt +
    efkaAmt +
    (solidarityAmt + fiveDaysUnemp + nightUnemp) +
    (mtpyAmt + nightMtpyExtra) +
    teadyAmt +
    tpdyAmt +
    eteaepAmt +
    specialAcctAmt +
    fiveYearsAmt +
    otherAmt;

  setText('dedTotal', fmt(deds));
  setText('netTotal', fmt(gross - deds));
}


/* =========================
   Persistence (localStorage)
   ========================= */
const LS_KEY = 'poyef_efoura_state_v16';

function loadState(){
  try{
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  }catch(_){ return null; }
}

function saveState(partial){
  try{
    const cur = loadState() || {};
    const next = Object.assign({}, cur, partial);
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  }catch(_){}
}

function readInputsSnapshot(){
  const ids = [
    'hireDate','calcDate','family','kids','insurance','borderYes',
    'personalDiff','fiveDaysCount','fiveDaysRate','nightCount','nightRate',
    'baseMode','taxMode','manualTax','taxMonths',
    'fiveYearsOn','fiveYearsAmount','otherFixed',
    'rEfka','rHealth','rSolidarity','rTeayap','rTpyap','rEteaep','rSpecial'
  ];
  const snap = {};
  ids.forEach(id=>{
    const n = el(id);
    if (!n) return;
    if (n.type === 'checkbox') snap[id] = n.checked;
    else snap[id] = n.value;
  });
  return snap;
}

function applyInputsSnapshot(snap){
  if (!snap) return;
  Object.keys(snap).forEach(id=>{
    const n = el(id);
    if (!n) return;
    if (n.type === 'checkbox') n.checked = !!snap[id];
    else n.value = snap[id];
  });
}

function initDates(){
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth()+1).padStart(2,'0');
  const dd = String(today.getDate()).padStart(2,'0');
  const cd = el('calcDate');
  if (cd && !cd.value) cd.value = `${yyyy}-${mm}-${dd}`;
}


function hook(){
  const ids = [
    'hireDate','calcDate','family','kids','insurance',
    'borderYes','personalDiff','fiveDaysCount','fiveDaysRate','nightCount','nightRate',
    'baseMode','taxMode','manualTax','taxMonths',
    'fiveYearsOn','fiveYearsAmount','otherFixed',
    'rEfka','rHealth','rSolidarity','rTeayap','rTpyap','rEteaep','rSpecial'
  ];
  ids.forEach(id=>{
    const node = el(id);
    if (node) node.addEventListener('input', ()=>{ compute(); saveState({inputs: readInputsSnapshot()}); });
  });

  const btn = el('toggleSettings');
  const panel = el('settings');
  if (btn && panel){
    btn.addEventListener('click', ()=> panel.classList.toggle('hidden'));
  }
}


// Load persisted state (inputs + calendar)
const persisted = loadState();
if (persisted){
  applyInputsSnapshot(persisted.inputs);
}
if (persisted && persisted.calendar){
  loadCalendar(persisted.calendar);
}
if (persisted && persisted.calStartMonth && el('calStartMonth')) el('calStartMonth').value = persisted.calStartMonth;
if (persisted && persisted.calView && el('calView')) el('calView').value = persisted.calView;
if (persisted && persisted.cycleLen && el('cycleLen')) el('cycleLen').value = persisted.cycleLen;

initDates();
hook();
compute();
saveState({inputs: readInputsSnapshot()});


/* =========================
   Ημερολόγιο βαρδιών
   ========================= */
const DOW = ['ΔΕ','ΤΡ','ΤΕ','ΠΕ','ΠΑ','ΣΑ','ΚΥ'];

function isoDate(d){
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,'0');
  const da=String(d.getDate()).padStart(2,'0');
  return `${y}-${m}-${da}`;
}
function parseMonth(yyyy_mm){
  const [y,m]=yyyy_mm.split('-').map(Number);
  return new Date(y, m-1, 1);
}
function addMonths(date, n){
  return new Date(date.getFullYear(), date.getMonth()+n, 1);
}

const calState = {
  // map iso -> {a: 'P'|'A'|'N'|'R'|'AD'|null, b: 'N' or null} ; only allow P+N combo
  map: new Map(),
  selectedIso: null,
};


function serializeCalendar(){
  const obj = {};
  for (const [iso, v] of calState.map.entries()){
    obj[iso] = v;
  }
  return obj;
}
function loadCalendar(obj){
  calState.map = new Map();
  if (!obj) return;
  for (const iso of Object.keys(obj)){
    calState.map.set(iso, obj[iso]);
  }
}


function setShiftForDay(iso, shift){
  const cur = calState.map.get(iso) || {a:null, b:null};

  // helper: clear day
  const clear = ()=>{ calState.map.delete(iso); };

  // Clear
  if (shift === 'CLR'){ clear(); return; }

  // Toggle-off: αν πατήσεις το ίδιο κουμπί με αυτό που έχει ήδη η μέρα, σβήνει.
  // Single states
  if (cur.b === null && cur.a === shift){
    clear(); return;
  }
  // P+N state: αν πατήσεις Π σβήνει το Π (μένει Ν). Αν πατήσεις Ν σβήνει το Ν (μένει Π).
  if (cur.a === 'P' && cur.b === 'N'){
    if (shift === 'P'){ calState.map.set(iso, {a:'N', b:null}); return; }
    if (shift === 'N'){ calState.map.set(iso, {a:'P', b:null}); return; }
  }

  // If picking R or AD -> single shift (και καθαρίζει τυχόν διπλό)
  if (shift === 'R' || shift === 'AD'){
    calState.map.set(iso, {a: shift, b: null});
    return;
  }

  // A is always single (δεν επιτρέπεται διπλό με Α)
  if (shift === 'A'){
    calState.map.set(iso, {a: 'A', b: null});
    return;
  }

  // P/N rules: επιτρέπεται μόνο Π+Ν
  if (shift === 'P'){
    if (cur.a === 'N' && cur.b === null){
      calState.map.set(iso, {a:'P', b:'N'});
    } else {
      calState.map.set(iso, {a:'P', b:null});
    }
    return;
  }

  if (shift === 'N'){
    if (cur.a === 'P' && cur.b === null){
      calState.map.set(iso, {a:'P', b:'N'});
    } else {
      calState.map.set(iso, {a:'N', b:null});
    }
    return;
  }
}

function renderMonthBlock(startDate){
  const y = startDate.getFullYear();
  const m = startDate.getMonth(); // 0..11
  const first = new Date(y, m, 1);
  const lastDay = new Date(y, m+1, 0).getDate();

  // Monday-based index: JS Sunday=0. Convert to Monday=0
  const firstDow = (first.getDay()+6)%7; // 0 Mon ... 6 Sun
  const totalCells = Math.ceil((firstDow + lastDay)/7)*7;

  const monthName = first.toLocaleString('el-GR', {month:'long', year:'numeric'}).toUpperCase();

  let html = `<div class="month-block" data-month="${y}-${String(m+1).padStart(2,'0')}">`;
  html += `<div class="month-head">${monthName}</div>`;
  html += `<div class="cal-grid">`;
  for (const d of DOW){
    html += `<div class="dow">${d}</div>`;
  }
  for (let i=0;i<totalCells;i++){
    const dayNum = i - firstDow + 1;
    if (dayNum < 1 || dayNum > lastDay){
      html += `<div class="day muted"></div>`;
      continue;
    }
    const dateObj = new Date(y,m,dayNum);
    const iso = isoDate(dateObj);
    const st = calState.map.get(iso) || {a:null, b:null};

    let inner = '';
    if (st.a && st.b === 'N' && st.a === 'P'){
      inner = `<div class="badge-half"><div class="top">Π</div><div>Ν</div></div>`;
    } else if (st.a){
      const label = (st.a === 'AD') ? 'ΑΔ' : (st.a === 'R' ? 'Ρ' : st.a);
      inner = `<div class="badge-shift">${label}</div>`;
    } else {
      inner = '';
    }
    html += `<div class="day" data-iso="${iso}"><div class="num">${dayNum}</div>${inner}</div>`;
  }
  html += `</div></div>`;
  return html;
}

function renderCalendar(){
  const view = el('calView')?.value || 'month';
  const startMonthVal = el('calStartMonth')?.value;
  const start = startMonthVal ? parseMonth(startMonthVal) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);

  const monthsCount = (view === 'month') ? 1 : (view === 'quarter') ? 3 : (view === 'half') ? 6 : 12;

  let html = '';
  for (let i=0;i<monthsCount;i++){
    html += renderMonthBlock(addMonths(start, i));
  }
  el('calWrap').innerHTML = html;

  // Bind day clicks
  el('calWrap').querySelectorAll('.day[data-iso]').forEach(node=>{
    node.addEventListener('click', ()=>{
      calState.selectedIso = node.getAttribute('data-iso');
      openPicker(calState.selectedIso);
    });
  });

  updateCalendarSummary(); // also updates payroll inputs
}

function openPicker(iso){
  const picker = el('shiftPicker');
  const title = el('pickerTitle');
  if (title) title.textContent = `Βάρδια: ${iso}`;
  picker.classList.remove('hidden');
}
function closePicker(){
  el('shiftPicker').classList.add('hidden');
  calState.selectedIso = null;
}

function computeCountsForVisibleRange(){
  // Visible range from current calendar blocks
  const blocks = Array.from(el('calWrap').querySelectorAll('.month-block'));
  if (blocks.length === 0) return {nights:0, fivedays:0, breakdown:{friNight:0, satAny:0, sunAny:0}};
  const firstMonth = blocks[0].getAttribute('data-month');
  const lastMonth = blocks[blocks.length-1].getAttribute('data-month');
  const start = parseMonth(firstMonth);
  const end = addMonths(parseMonth(lastMonth), 1); // exclusive

  let nights = 0;
  let fivedays = 0;
  let friNight = 0, satAny = 0, sunAny = 0;

  for (let d=new Date(start); d<end; d.setDate(d.getDate()+1)){
    const iso = isoDate(d);
    const st = calState.map.get(iso);
    if (!st) continue;

    const hasN = (st.a === 'N') || (st.a === 'P' && st.b === 'N');
    const hasAnyWeekend = (st.a === 'P') || (st.a === 'A') || (st.a === 'N') || (st.a === 'P' && st.b === 'N');
    // weekend check
    const jsDow = d.getDay(); // 0 Sun ... 6 Sat
    const isFri = jsDow === 5;
    const isSat = jsDow === 6;
    const isSun = jsDow === 0;

    if (hasN) nights += 1;

    if (isFri && hasN){
      fivedays += 1;
      friNight += 1;
    }
    if (isSat && hasAnyWeekend){
      fivedays += 1;
      satAny += 1;
    }
    if (isSun && hasAnyWeekend){
      fivedays += 1;
      sunAny += 1;
    }
  }
  return {nights, fivedays, breakdown:{friNight, satAny, sunAny}};
}

function updateCalendarSummary(){
  const {nights, fivedays, breakdown} = computeCountsForVisibleRange();
  if (el('sumNights')) setText('sumNights', String(nights));
  if (el('sumFivedays')) setText('sumFivedays', String(fivedays));

  if (el('sumBreakdown')){
    setText('sumBreakdown', `ΠΑ(Ν): ${breakdown.friNight} • ΣΑ(Π/Α/Ν): ${breakdown.satAny} • ΚΥ(Π/Α/Ν): ${breakdown.sunAny}`);
  }

  // push to payroll inputs
  if (el('nightCount')) setValue('nightCount', String(nights));
  if (el('fiveDaysCount')) setValue('fiveDaysCount', String(fivedays));
  // recompute payroll
  if (typeof compute === 'function') compute();
}

function applyCycle(){
  const cycleLen = Number(el('cycleLen')?.value || 5);
  // Read first cycleLen filled days from the first visible month (day by day)
  const blocks = Array.from(el('calWrap').querySelectorAll('.month-block'));
  if (blocks.length === 0) return;
  const firstMonth = blocks[0].getAttribute('data-month');
  const start = parseMonth(firstMonth);

  // Build pattern from the first cycleLen days that are not muted cells (actual days)
  const pattern = [];
  for (let i=0; pattern.length<cycleLen; i++){
    const d = new Date(start);
    d.setDate(1+i);
    // stop if month ended
    if (d.getMonth() !== start.getMonth()) break
    const iso = isoDate(d);
    const st = calState.map.get(iso) || {a:null,b:null};
    pattern.push({a:st.a, b:st.b});
  }
  // If pattern shorter or empty, nothing
  if (pattern.length === 0) return;

  // Fill entire visible range
  const lastMonth = blocks[blocks.length-1].getAttribute('data-month');
  const rangeStart = parseMonth(firstMonth);
  const rangeEnd = addMonths(parseMonth(lastMonth), 1);

  let idx = 0;
  for (let d=new Date(rangeStart); d<rangeEnd; d.setDate(d.getDate()+1)){
    const iso = isoDate(d);
    const p = pattern[idx % pattern.length];
    if (p.a || p.b){
      calState.map.set(iso, {a:p.a, b:p.b});
    } else {
      calState.map.delete(iso);
    }
    idx += 1;
  }
  renderCalendar();
  saveState({calendar: serializeCalendar(), calStartMonth: el('calStartMonth')?.value, calView: el('calView')?.value, cycleLen: el('cycleLen')?.value});
}

function clearCalendar(){
  // Clear only visible range
  const blocks = Array.from(el('calWrap').querySelectorAll('.month-block'));
  if (blocks.length === 0) return;
  const firstMonth = blocks[0].getAttribute('data-month');
  const lastMonth = blocks[blocks.length-1].getAttribute('data-month');
  const rangeStart = parseMonth(firstMonth);
  const rangeEnd = addMonths(parseMonth(lastMonth), 1);
  for (let d=new Date(rangeStart); d<rangeEnd; d.setDate(d.getDate()+1)){
    calState.map.delete(isoDate(d));
  }
  renderCalendar();
  saveState({calendar: serializeCalendar(), calStartMonth: el('calStartMonth')?.value, calView: el('calView')?.value, cycleLen: el('cycleLen')?.value});
}

function clearMonthOnly(){
  const startMonthVal = el('calStartMonth')?.value;
  if (!startMonthVal) return;
  const start = parseMonth(startMonthVal);
  const end = addMonths(start, 1);
  for (let d=new Date(start); d<end; d.setDate(d.getDate()+1)){
    calState.map.delete(isoDate(d));
  }
  renderCalendar();
  saveState({calendar: serializeCalendar(), calStartMonth: el('calStartMonth')?.value, calView: el('calView')?.value, cycleLen: el('cycleLen')?.value});
}


function initCalendar(){
  // default start month from calcDate
  const cd = el('calcDate')?.value;
  const today = cd ? new Date(cd) : new Date();
  const ym = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
  if (el('calStartMonth')) setValue('calStartMonth', ym);

  // picker buttons
  document.querySelectorAll('.pbtn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      const shift = btn.getAttribute('data-shift');
      const iso = calState.selectedIso;
      if (!iso) return;
      setShiftForDay(iso, shift);
      closePicker();
      renderCalendar();
  saveState({calendar: serializeCalendar(), calStartMonth: el('calStartMonth')?.value, calView: el('calView')?.value, cycleLen: el('cycleLen')?.value});
    });
  });
  el('pickerClose')?.addEventListener('click', closePicker);
  el('shiftPicker')?.addEventListener('click', (e)=>{
    if (e.target && e.target.id === 'shiftPicker') closePicker();
  });

  el('calView')?.addEventListener('input', renderCalendar);
  el('calStartMonth')?.addEventListener('input', renderCalendar);
  el('applyCycle')?.addEventListener('click', applyCycle);
  el('cycleLen')?.addEventListener('input', ()=>{});
  el('clearCal')?.addEventListener('click', clearCalendar);
  el('clearMonth')?.addEventListener('click', clearMonthOnly);

  renderCalendar();
  saveState({calendar: serializeCalendar(), calStartMonth: el('calStartMonth')?.value, calView: el('calView')?.value, cycleLen: el('cycleLen')?.value});
}

// Start calendar after existing initDates/hook/compute have run
setTimeout(initCalendar, 0);
