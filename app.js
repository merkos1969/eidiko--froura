
(function(){
  const $ = id => document.getElementById(id);
  const fmt = n => (Math.round((Number(n)||0)*100)/100).toFixed(2).replace('.', ',');
  const LS = 'eidiko_v22_state';

  let selectedShift = 'P';
  let calYear, calMonth;
  let shifts = {}; // ISO -> P/A/N/AD/R/PN

  function todayISO(){
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function iso(y,m,d){
    return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  }

  function fromIso(s){
    return new Date(s + 'T00:00:00');
  }

  function yearsBetween(a, b){
    const d1 = new Date(a), d2 = new Date(b);
    if (isNaN(d1) || isNaN(d2)) return null;
    return (d2 - d1) / (365.25 * 24 * 3600 * 1000);
  }

  function categoryKey(){
    const fam = $('family').value;
    const kids = Math.min(4, Number($('kids').value || 0));
    if (fam === 'single') return 'Άγαμος';
    if (kids === 0) return 'Έγγαμος χωρίς παιδιά';
    if (kids === 1) return '1 παιδί';
    return `${kids} παιδιά`;
  }

  function stepForYears(y){
    const R = window.PAY_TABLE.ranges || [];
    for (const r of R){
      if (y >= r.from && y < r.to) return r;
    }
    return R.length ? R[R.length - 1] : null;
  }

  function taxRatesForKids(kids){
    if (kids >= 4) return [0.00,0.00,0.18,0.34,0.39,0.44];
    if (kids === 3) return [0.09,0.09,0.20,0.34,0.39,0.44];
    if (kids === 2) return [0.09,0.16,0.22,0.34,0.39,0.44];
    if (kids === 1) return [0.09,0.18,0.24,0.34,0.39,0.44];
    return [0.09,0.20,0.26,0.34,0.39,0.44];
  }

  function taxCreditBase(kids){
    if (kids <= 0) return 777;
    if (kids === 1) return 900;
    if (kids === 2) return 1120;
    if (kids === 3) return 1340;
    if (kids === 4) return 1580;
    if (kids === 5) return 1780;
    return 1780 + (kids - 5) * 220;
  }

  function progressiveTax(annualTaxable, kids){
    const rates = taxRatesForKids(kids);
    const bounds = [10000,20000,30000,40000,60000,Infinity];
    let prev = 0, tax = 0;
    for (let i=0; i<bounds.length; i++){
      const upTo = bounds[i];
      const slice = Math.max(0, Math.min(annualTaxable, upTo) - prev);
      tax += slice * rates[i];
      prev = upTo;
      if (annualTaxable <= upTo) break;
    }
    let credit = taxCreditBase(kids);
    if (annualTaxable > 12000){
      credit = Math.max(0, credit - Math.floor((annualTaxable - 12000)/1000) * 20);
    }
    return {taxBeforeCredit: tax, credit, finalTax: Math.max(0, tax - credit)};
  }

  function compute(){
    const calc = $('calcDate').value || todayISO();
    const hire = $('hireDate').value || '2000-07-20';
    const y = yearsBetween(hire, calc);
    $('years').value = y == null ? '-' : y.toFixed(2).replace('.', ',');
    const stepRec = stepForYears(y == null ? 0 : y);
    const step = stepRec ? stepRec.step : null;
    $('step').value = step ? String(step) : '-';
    $('rangeLabel').value = stepRec ? stepRec.label : '-';

    const cat = categoryKey();
    const rec = (step && window.PAY_TABLE.byStep && window.PAY_TABLE.byStep[String(step)] && window.PAY_TABLE.byStep[String(step)][cat]) || {base:0,duty:0,child:0,total:0};
    const base = Number(rec.base || 0);
    const duty = Number(rec.duty || 0);
    const child = Number(rec.child || 0);

    const border = $('borderYes').value === 'yes' ? 130 : 0;
    const personal = Number($('personalDiff').value || 0);

    const fiveCount = Number($('fiveDaysCount').value || 0);
    const fiveRate = Number($('fiveDaysRate').value || 46);
    const nightCount = Number($('nightCount').value || 0);
    const nightRate = Number($('nightRate').value || 26.5);

    const fiveGross = fiveCount * fiveRate;
    const nightGross = nightCount * nightRate;

    $('basePay').textContent = fmt(base);
    $('dutyPay').textContent = fmt(duty);
    $('childPay').textContent = fmt(child);

    const fiveDed = fiveGross * 0.02;
    const fiveTax = (fiveGross - fiveDed) * 0.20;
    const fiveNet = fiveGross - fiveDed - fiveTax;

    const nightDed = nightGross * 0.04;
    const nightTax = (nightGross - nightDed) * 0.20;
    const nightNet = nightGross - nightDed - nightTax;

    $('fiveGross').textContent = fmt(fiveGross);
    $('fiveDed').textContent = fmt(fiveDed);
    $('fiveTax').textContent = fmt(fiveTax);
    $('fiveNet').textContent = fmt(fiveNet);

    $('nightGross').textContent = fmt(nightGross);
    $('nightDed').textContent = fmt(nightDed);
    $('nightTax').textContent = fmt(nightTax);
    $('nightNet').textContent = fmt(nightNet);

    const gross = base + duty + child + border + personal + fiveGross + nightGross;
    $('grossTotal').textContent = fmt(gross);

    const regular = base + duty + child + border + personal;
    const health = regular * (Number($('rHealth').value || 2.05) / 100);
    const efka = regular * (Number($('rEfka').value || 6.67) / 100);
    const fiveYears = $('fiveYearsOn').value === 'yes' ? Number($('fiveYearsAmount').value || 39.87) : 0;
    const other = Number($('otherFixed').value || 0);

    const monthlyTaxable = Math.max(0, gross - health - efka - fiveYears - other);
    const annualTaxable = monthlyTaxable * 12;
    const kids = Number($('kids').value || 0);
    const taxInfo = progressiveTax(annualTaxable, kids);

    $('annualTaxable').value = fmt(annualTaxable);
    $('taxCreditOut').value = fmt(taxInfo.credit);
    $('taxAmt').textContent = fmt(taxInfo.finalTax / 12);
    $('taxMonthlyOut').value = fmt(taxInfo.finalTax / 12);

    $('healthAmt').textContent = fmt(health);
    $('efkaAmt').textContent = fmt(efka);
    $('fiveYearsDed').textContent = fmt(fiveYears);
    $('otherAmt').textContent = fmt(other);

    const deds = health + efka + fiveYears + other + (taxInfo.finalTax / 12) + fiveDed + fiveTax + nightDed + nightTax;
    $('dedTotal').textContent = fmt(deds);
    $('netTotal').textContent = fmt(gross - deds);

    saveState();
  }

  function setShiftButtons(){
    document.querySelectorAll('.shiftBtn[data-shift]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.shift === selectedShift);
    });
  }

  function renderCalendar(){
    const title = new Date(calYear, calMonth - 1, 1).toLocaleString('el-GR', {month:'long', year:'numeric'});
    $('calTitle').textContent = title.charAt(0).toUpperCase() + title.slice(1);

    const grid = $('calGrid');
    grid.innerHTML = '';

    const first = new Date(calYear, calMonth - 1, 1);
    const start = (first.getDay() + 6) % 7;
    const dim = new Date(calYear, calMonth, 0).getDate();
    const prevDim = new Date(calYear, calMonth - 1, 0).getDate();

    for (let i=0; i<start; i++){
      grid.appendChild(makeDay(calYear, calMonth - 1, prevDim - start + 1 + i, true));
    }
    for (let d=1; d<=dim; d++){
      grid.appendChild(makeDay(calYear, calMonth, d, false));
    }
    const total = start + dim;
    const rest = total <= 35 ? 35 - total : 42 - total;
    for (let d=1; d<=rest; d++){
      grid.appendChild(makeDay(calYear, calMonth + 1, d, true));
    }

    updateCountsFromCalendar();
    setShiftButtons();
    saveState();
  }

  function makeDay(y, m, d, out){
    const date = new Date(y, m - 1, d);
    const key = iso(date.getFullYear(), date.getMonth()+1, date.getDate());
    const val = shifts[key] || '';
    const dow = date.getDay();

    const cell = document.createElement('div');
    cell.className = 'day' + ((dow===0 || dow===6) ? ' weekend' : '') + (out ? ' out' : '');
    cell.innerHTML = '<div class="num">' + date.getDate() + '</div>';

    const mark = document.createElement('div');
    mark.className = 'mark';

    if (val === 'PN'){
      mark.innerHTML = '<div class="splitWrap"><div class="splitTop">ΠΡ</div><div class="splitBottom">ΝΥ</div></div>';
    } else if (val) {
      const cls = val === 'P' ? 'singleP' : val === 'A' ? 'singleA' : val === 'N' ? 'singleN' : val === 'AD' ? 'singleAD' : 'singleR';
      const label = val === 'P' ? 'ΠΡ' : val === 'A' ? 'ΑΠ' : val === 'N' ? 'ΝΥ' : val === 'AD' ? 'ΑΔ' : 'Ρ';
      mark.innerHTML = '<div class="' + cls + '">' + label + '</div>';
    }
    cell.appendChild(mark);

    cell.addEventListener('click', function(){
      applyShift(key);
      renderCalendar();
      $('nightCount').value = $('sumNights').textContent;
      $('fiveDaysCount').value = $('sumFivedays').textContent;
      compute();
    });

    return cell;
  }

  function applyShift(key){
    const cur = shifts[key] || '';
    const sel = selectedShift;

    if (cur === sel){
      delete shifts[key];
      return;
    }
    if (cur === 'PN'){
      if (sel === 'P'){ shifts[key] = 'N'; return; }
      if (sel === 'N'){ shifts[key] = 'P'; return; }
      shifts[key] = sel;
      return;
    }
    if ((cur === 'P' && sel === 'N') || (cur === 'N' && sel === 'P')){
      shifts[key] = 'PN';
      return;
    }
    shifts[key] = sel;
  }

  function updateCountsFromCalendar(){
    let nights = 0;
    let fives = 0;
    for (const [key, val] of Object.entries(shifts)){
      const d = fromIso(key);
      const day = d.getDay(); // 0 Sun ... 6 Sat
      const hasNight = (val === 'N' || val === 'PN');
      const hasWeekendDuty = (val === 'P' || val === 'A' || val === 'N' || val === 'PN');

      if (day >= 1 && day <= 4 && hasNight){ // Mon-Thu
        nights += 1;
      }
      if ((day === 5 && hasNight) || ((day === 6 || day === 0) && hasWeekendDuty)){
        fives += 1;
      }
    }
    $('sumNights').textContent = String(nights);
    $('sumFivedays').textContent = String(fives);
  }

  function clearCurrentMonth(){
    const dim = new Date(calYear, calMonth, 0).getDate();
    for (let d=1; d<=dim; d++){
      delete shifts[iso(calYear, calMonth, d)];
    }
    renderCalendar();
    $('nightCount').value = $('sumNights').textContent;
    $('fiveDaysCount').value = $('sumFivedays').textContent;
    compute();
  }

  function copyCycle(){
    const len = Number($('cycleLen').value || 5);
    const months = Number($('copyRange').value || 1);

    // read pattern from first len days of current month
    const pattern = [];
    for (let d=1; d<=len; d++){
      pattern.push(shifts[iso(calYear, calMonth, d)] || '');
    }
    for (let mi=0; mi<months; mi++){
      let y = calYear;
      let m = calMonth + mi;
      while (m > 12){ m -= 12; y += 1; }
      const dim = new Date(y, m, 0).getDate();
      for (let d=1; d<=dim; d++){
        const v = pattern[(d-1) % pattern.length];
        const key = iso(y, m, d);
        if (v){ shifts[key] = v; } else { delete shifts[key]; }
      }
    }
    renderCalendar();
    $('nightCount').value = $('sumNights').textContent;
    $('fiveDaysCount').value = $('sumFivedays').textContent;
    compute();
  }

  function saveState(){
    try{
      const state = {
        selectedShift, calYear, calMonth, shifts,
        insurance: $('insurance').value,
        family: $('family').value,
        kids: $('kids').value,
        hireDate: $('hireDate').value,
        borderYes: $('borderYes').value,
        personalDiff: $('personalDiff').value,
        fiveDaysCount: $('fiveDaysCount').value,
        fiveDaysRate: $('fiveDaysRate').value,
        nightCount: $('nightCount').value,
        nightRate: $('nightRate').value,
        rHealth: $('rHealth').value,
        rEfka: $('rEfka').value,
        fiveYearsOn: $('fiveYearsOn').value,
        fiveYearsAmount: $('fiveYearsAmount').value,
        otherFixed: $('otherFixed').value,
        cycleLen: $('cycleLen').value,
        copyRange: $('copyRange').value
      };
      localStorage.setItem(LS, JSON.stringify(state));
    } catch(e){}
  }

  function loadState(){
    try{
      const raw = localStorage.getItem(LS);
      if (!raw) return;
      const s = JSON.parse(raw);
      selectedShift = s.selectedShift || 'P';
      calYear = s.calYear || calYear;
      calMonth = s.calMonth || calMonth;
      shifts = s.shifts || {};
      if (s.insurance != null) $('insurance').value = s.insurance;
      if (s.family != null) $('family').value = s.family;
      if (s.kids != null) $('kids').value = s.kids;
      if (s.hireDate) $('hireDate').value = s.hireDate;
      if (s.borderYes != null) $('borderYes').value = s.borderYes;
      if (s.personalDiff != null) $('personalDiff').value = s.personalDiff;
      if (s.fiveDaysCount != null) $('fiveDaysCount').value = s.fiveDaysCount;
      if (s.fiveDaysRate != null) $('fiveDaysRate').value = s.fiveDaysRate;
      if (s.nightCount != null) $('nightCount').value = s.nightCount;
      if (s.nightRate != null) $('nightRate').value = s.nightRate;
      if (s.rHealth != null) $('rHealth').value = s.rHealth;
      if (s.rEfka != null) $('rEfka').value = s.rEfka;
      if (s.fiveYearsOn != null) $('fiveYearsOn').value = s.fiveYearsOn;
      if (s.fiveYearsAmount != null) $('fiveYearsAmount').value = s.fiveYearsAmount;
      if (s.otherFixed != null) $('otherFixed').value = s.otherFixed;
      if (s.cycleLen != null) $('cycleLen').value = s.cycleLen;
      if (s.copyRange != null) $('copyRange').value = s.copyRange;
    } catch(e){}
  }

  function init(){
    const now = new Date();
    calYear = now.getFullYear();
    calMonth = now.getMonth() + 1;
    $('calcDate').value = todayISO(); // always today's date
    if (!$('hireDate').value) $('hireDate').value = '2000-07-20';

    loadState();
    $('calcDate').value = todayISO(); // force today after loading

    document.querySelectorAll('.shiftBtn[data-shift]').forEach(btn => {
      btn.addEventListener('click', function(){
        selectedShift = btn.dataset.shift;
        setShiftButtons();
        saveState();
      });
    });

    $('prevMonth').addEventListener('click', function(){
      calMonth -= 1;
      if (calMonth < 1){ calMonth = 12; calYear -= 1; }
      renderCalendar();
    });
    $('nextMonth').addEventListener('click', function(){
      calMonth += 1;
      if (calMonth > 12){ calMonth = 1; calYear += 1; }
      renderCalendar();
    });
    $('copyBtn').addEventListener('click', copyCycle);
    $('clearMonthBtn').addEventListener('click', clearCurrentMonth);

    document.querySelectorAll('input,select').forEach(el => {
      el.addEventListener('input', compute);
      el.addEventListener('change', compute);
    });

    renderCalendar();
    $('nightCount').value = $('sumNights').textContent;
    $('fiveDaysCount').value = $('sumFivedays').textContent;
    compute();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
