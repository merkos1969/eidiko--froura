
(function(){
  const $ = (id)=>document.getElementById(id);
  const fmt = (n)=>{
    const x = (Math.round((Number(n)||0)*100)/100).toFixed(2);
    return x.replace('.', ',');
  };
  const LS_KEY='poyef_efoura_v20_state';

  function todayISO(){
    const d=new Date();
    const yyyy=d.getFullYear();
    const mm=String(d.getMonth()+1).padStart(2,'0');
    const dd=String(d.getDate()).padStart(2,'0');
    return `${yyyy}-${mm}-${dd}`;
  }
  function clampKids(k){ return Math.min(4, Math.max(0, Number(k)||0)); }

  function yearsBetween(aISO,bISO){
    const a=new Date(aISO), b=new Date(bISO);
    if(isNaN(a)||isNaN(b)) return null;
    return (b-a)/(365.25*24*3600*1000);
  }

  function getStepForYears(y){
    const T=window.PAY_TABLE;
    if(!T||!T.stepRanges||y==null) return {step:null,label:'-'};
    for(const r of T.stepRanges){
      if(y>=r.from && y<r.to) return {step:r.step,label:r.label};
    }
    const last=T.stepRanges[T.stepRanges.length-1];
    return {step:last.step,label:last.label};
  }

  function getCatKey(){
    const fam=$('family')?.value||'single';
    const kidsRaw=$('kids')?.value||'0';
    const k = kidsRaw==='5' ? 4 : clampKids(kidsRaw);
    if(fam==='single') return 'Άγαμος';
    if(k<=0) return 'Έγγαμος χωρίς παιδιά';
    if(k===1) return '1 παιδί';
    return `${k} παιδιά`;
  }

  // ---------- calendar (month) ----------
  let calYM = null; // {y,m}
  let selectedShift = 'N';
  let calMap = new Map(); // key ISO -> 'P'|'A'|'N'|'AD'|'R'|'PN'
  function iso(d){ return d.toISOString().slice(0,10); }
  function fromISO(s){ return new Date(s+'T00:00:00'); }

  function saveState(){
    try{
      const s={
        insurance:$('insurance')?.value,
        family:$('family')?.value,
        kids:$('kids')?.value,
        hireDate:$('hireDate')?.value,
        borderYes:$('borderYes')?.value,
        personalDiff:$('personalDiff')?.value,
        fiveDaysCount:$('fiveDaysCount')?.value,
        fiveDaysRate:$('fiveDaysRate')?.value,
        nightCount:$('nightCount')?.value,
        nightRate:$('nightRate')?.value,
        rHealth:$('rHealth')?.value,
        rEfka:$('rEfka')?.value,
        manualTax:$('manualTax')?.value,
        fiveYearsOn:$('fiveYearsOn')?.value,
        fiveYearsAmount:$('fiveYearsAmount')?.value,
        otherFixed:$('otherFixed')?.value,
        calYM,
        selectedShift,
        calendar:Object.fromEntries(calMap.entries())
      };
      localStorage.setItem(LS_KEY, JSON.stringify(s));
    }catch(e){}
  }

  function loadState(){
    try{
      const raw=localStorage.getItem(LS_KEY);
      if(!raw) return;
      const s=JSON.parse(raw);
      const set=(id,val)=>{ const el=$(id); if(el && val!==undefined && val!==null) el.value=val; };
      set('insurance', s.insurance);
      set('family', s.family);
      set('kids', s.kids);
      set('hireDate', s.hireDate);
      set('borderYes', s.borderYes);
      set('personalDiff', s.personalDiff);
      set('fiveDaysCount', s.fiveDaysCount);
      set('fiveDaysRate', s.fiveDaysRate);
      set('nightCount', s.nightCount);
      set('nightRate', s.nightRate);
      set('rHealth', s.rHealth);
      set('rEfka', s.rEfka);
      set('manualTax', s.manualTax);
      set('fiveYearsOn', s.fiveYearsOn);
      set('fiveYearsAmount', s.fiveYearsAmount);
      set('otherFixed', s.otherFixed);
      if(s.calYM) calYM=s.calYM;
      if(s.selectedShift) selectedShift=s.selectedShift;
      if(s.calendar) calMap=new Map(Object.entries(s.calendar));
    }catch(e){}
  }

  function setActiveShiftButtons(){
    document.querySelectorAll('.shiftBtn[data-shift]').forEach(btn=>{
      btn.classList.toggle('active', btn.dataset.shift===selectedShift);
    });
  }

  function shiftLabel(code){
    if(code==='P') return 'ΠΡ';
    if(code==='A') return 'ΑΠ';
    if(code==='N') return 'ΝΥ';
    if(code==='AD') return 'ΑΔ';
    if(code==='R') return 'Ρ';
    return '';
  }

  function renderCalendar(){
    const grid=$('calGrid');
    if(!grid) return;
    grid.innerHTML='';

    const y=calYM.y, m=calYM.m;
    const title = new Date(y,m-1,1).toLocaleString('el-GR',{month:'long',year:'numeric'});
    $('calTitle').textContent = title.charAt(0).toUpperCase()+title.slice(1);

    const first=new Date(y,m-1,1);
    const startDow=(first.getDay()+6)%7; // Monday=0
    const daysInMonth=new Date(y,m,0).getDate();

    // previous month spill
    const prevDays = new Date(y,m-1,0).getDate();
    for(let i=0;i<startDow;i++){
      const dayNum = prevDays - (startDow-1-i);
      const cell=makeDayCell(new Date(y,m-2,dayNum), true);
      grid.appendChild(cell);
    }
    // current month
    for(let d=1; d<=daysInMonth; d++){
      grid.appendChild(makeDayCell(new Date(y,m-1,d), false));
    }
    // next month spill to complete 6 rows (42 cells)
    const totalCells = startDow + daysInMonth;
    const remaining = (totalCells<=35)?(35-totalCells):(42-totalCells);
    for(let d=1; d<=remaining; d++){
      grid.appendChild(makeDayCell(new Date(y,m,d), true));
    }

    updateCalendarSummary();
    setActiveShiftButtons();
    saveState();
  }

  function makeDayCell(dateObj, isOut){
    const key=iso(dateObj);
    const val=calMap.get(key)||'';

    const el=document.createElement('div');
    el.className='day'+(isOut?' out':'');
    const num=document.createElement('div');
    num.className='num';
    num.textContent = String(dateObj.getDate());
    el.appendChild(num);

    const mark=document.createElement('div');
    mark.className='mark';
    if(val==='PN'){
      const wrap=document.createElement('div');
      wrap.className='markSplit';
      const h1=document.createElement('div'); h1.className='half hP'; h1.textContent='ΠΡ';
      const h2=document.createElement('div'); h2.className='half hN'; h2.textContent='ΝΥ';
      wrap.appendChild(h1); wrap.appendChild(h2);
      mark.appendChild(wrap);
    } else if(val){
      const b=document.createElement('div');
      b.className='badge ' + (val==='P'?'bP':val==='A'?'bA':val==='N'?'bN':val==='AD'?'bAD':'bR');
      b.textContent=shiftLabel(val);
      mark.appendChild(b);
    }
    el.appendChild(mark);

    el.addEventListener('click', ()=>{
      applyShiftToDay(key);
      renderCalendar();
      // push counts to inputs
      $('nightCount').value = String(Number($('sumNights').textContent||0));
      $('fiveDaysCount').value = String(Number($('sumFivedays').textContent||0));
      compute();
    });
    return el;
  }

  function applyShiftToDay(key){
    const cur=calMap.get(key)||'';
    const sel=selectedShift;

    // toggle off if same
    if(cur===sel){ calMap.delete(key); return; }

    // allow only P+N as double (PN)
    const isPN = (cur==='P' && sel==='N') || (cur==='N' && sel==='P') || (cur==='PN' && (sel==='P' || sel==='N'));
    if(cur==='PN'){
      // if click P or N while PN, remove (toggle) that side -> if choose P set N only etc
      if(sel==='P'){ calMap.set(key,'N'); return; }
      if(sel==='N'){ calMap.set(key,'P'); return; }
      // else replace
      calMap.set(key, sel);
      return;
    }
    if(isPN){ calMap.set(key,'PN'); return; }

    // otherwise replace with selected
    calMap.set(key, sel);
  }

  function updateCalendarSummary(){
    let nights=0, fived=0;
    for(const [k,v] of calMap.entries()){
      if(v==='N' || v==='PN') nights++;
      const d=fromISO(k);
      const dow=d.getDay(); // 0 Sun ... 5 Fri 6 Sat
      const isFri=(dow===5), isSat=(dow===6), isSun=(dow===0);
      const isWeekend=isSat||isSun;

      const hasNight = (v==='N' || v==='PN');
      const hasDay = (v==='P' || v==='A' || hasNight);

      if(isFri && hasNight) fived++;
      if(isWeekend && hasDay) fived++;
    }
    $('sumNights').textContent=String(nights);
    $('sumFivedays').textContent=String(fived);
  }

  function clearMonth(){
    const y=calYM.y, m=calYM.m;
    for(const key of Array.from(calMap.keys())){
      const d=fromISO(key);
      if(d.getFullYear()===y && (d.getMonth()+1)===m){
        calMap.delete(key);
      }
    }
    renderCalendar();
    $('nightCount').value='0';
    $('fiveDaysCount').value='0';
    compute();
  }

  function fillPattern(len){
    const pattern = (len===10)
      ? ['P','A','N','AD','R','P','A','N','AD','R']
      : ['P','A','N','AD','R'];

    const y=calYM.y, m=calYM.m;
    const daysInMonth=new Date(y,m,0).getDate();
    for(let d=1; d<=daysInMonth; d++){
      calMap.set(iso(new Date(y,m-1,d)), pattern[(d-1)%pattern.length]);
    }
    renderCalendar();
    $('nightCount').value=String(Number($('sumNights').textContent||0));
    $('fiveDaysCount').value=String(Number($('sumFivedays').textContent||0));
    compute();
  }

  // ---------- payroll ----------
  function compute(){
    const hire=$('hireDate')?.value || '2000-07-20';
    const calc=$('calcDate')?.value || todayISO();
    const y=yearsBetween(hire,calc);
    $('years').value = (y==null)?'-':y.toFixed(2).replace('.',',');

    const s=getStepForYears(y);
    $('step').value = s.step?String(s.step):'-';
    $('rangeLabel').value = s.label||'-';

    const catKey=getCatKey();
    const T=window.PAY_TABLE;
    let base=0,duty=0,child=0;
    if(T && T.steps && s.step && T.steps[s.step] && T.steps[s.step][catKey]){
      const rec=T.steps[s.step][catKey];
      base=Number(rec.base||0);
      duty=Number(rec.duty||0);
      child=Number(rec.child||0);
    }

    const border = ($('borderYes').value==='yes')?130:0;
    const pd = Number($('personalDiff').value||0);

    const fiveCount=Number($('fiveDaysCount').value||0);
    const fiveRate=Number($('fiveDaysRate').value||46);
    const nightCount=Number($('nightCount').value||0);
    const nightRate=Number($('nightRate').value||26.5);
    const fiveGross=fiveCount*fiveRate;
    const nightGross=nightCount*nightRate;

    $('basePay').textContent=fmt(base);
    $('dutyPay').textContent=fmt(duty);
    $('childPay').textContent=fmt(child);

    // extras deductions + 20% tax (as requested)
    const rUnemp=0.02;
    const rMtpyNight=0.02;

    const fiveDed=fiveGross*rUnemp;
    const nightDed=nightGross*(rUnemp+rMtpyNight);
    const fiveTax=(fiveGross-fiveDed)*0.20;
    const nightTax=(nightGross-nightDed)*0.20;

    $('fiveGross').textContent=fmt(fiveGross);
    $('fiveDed').textContent=fmt(fiveDed);
    $('fiveTax').textContent=fmt(fiveTax);
    $('fiveNet').textContent=fmt(fiveGross-fiveDed-fiveTax);

    $('nightGross').textContent=fmt(nightGross);
    $('nightDed').textContent=fmt(nightDed);
    $('nightTax').textContent=fmt(nightTax);
    $('nightNet').textContent=fmt(nightGross-nightDed-nightTax);

    const gross = base + duty + child + border + pd + fiveGross + nightGross;
    $('grossTotal').textContent=fmt(gross);

    // main deductions
    const rHealth=Number($('rHealth').value||2.05)/100;
    const rEfka=Number($('rEfka').value||6.67)/100;

    // apply to regular pay (base+duty+child+border)
    const regular=base+duty+child+border;
    const health=regular*rHealth;
    const efka=regular*rEfka;

    const manualTax=Number($('manualTax').value||0);

    const fiveYearsOn=$('fiveYearsOn').value==='yes';
    const fiveYears = fiveYearsOn ? Number($('fiveYearsAmount').value||39.87) : 0;
    const other=Number($('otherFixed').value||0);

    const tax = manualTax;
    $('healthAmt').textContent=fmt(health);
    $('efkaAmt').textContent=fmt(efka);
    $('taxAmt').textContent=fmt(tax);
    $('fiveYearsDed').textContent=fmt(fiveYears);
    $('otherAmt').textContent=fmt(other);

    const deds = health + efka + tax + fiveYears + other + fiveDed + nightDed + fiveTax + nightTax;
    $('dedTotal').textContent=fmt(deds);
    $('netTotal').textContent=fmt(gross-deds);

    saveState();
  }

  function init(){
    // defaults
    if($('hireDate') && !$('hireDate').value) $('hireDate').value='2000-07-20';
    // always today on load
    $('calcDate').value = todayISO();

    // calendar default month = current
    const now=new Date();
    calYM = {y: now.getFullYear(), m: now.getMonth()+1};

    loadState();
    // keep calcDate always today regardless of stored
    $('calcDate').value = todayISO();
    if(!calYM) calYM = {y: now.getFullYear(), m: now.getMonth()+1};

    // hook inputs
    document.querySelectorAll('input,select').forEach(el=>{
      el.addEventListener('input', compute);
      el.addEventListener('change', compute);
    });

    // shift buttons
    document.querySelectorAll('.shiftBtn[data-shift]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        selectedShift=btn.dataset.shift;
        setActiveShiftButtons();
        saveState();
      });
    });
    setActiveShiftButtons();

    // month nav
    $('prevMonth').addEventListener('click', ()=>{
      calYM.m -= 1;
      if(calYM.m<=0){ calYM.m=12; calYM.y-=1; }
      renderCalendar();
    });
    $('nextMonth').addEventListener('click', ()=>{
      calYM.m += 1;
      if(calYM.m>=13){ calYM.m=1; calYM.y+=1; }
      renderCalendar();
    });

    $('btnClearMonth').addEventListener('click', clearMonth);
    $('btnFill5').addEventListener('click', ()=>fillPattern(5));
    $('btnFill10').addEventListener('click', ()=>fillPattern(10));

    renderCalendar();
    // push calendar counts to inputs once
    $('nightCount').value = String(Number($('sumNights').textContent||0));
    $('fiveDaysCount').value = String(Number($('sumFivedays').textContent||0));
    compute();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
