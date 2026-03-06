
(function(){
  const $ = (id)=>document.getElementById(id);
  const fmt = (n)=>{
    const x = (Math.round((Number(n)||0)*100)/100).toFixed(2);
    return x.replace('.', ',');
  };
  const LS_KEY = 'poyef_efoura_state_v18';

  function todayISO(){
    const d=new Date();
    const yyyy=d.getFullYear();
    const mm=String(d.getMonth()+1).padStart(2,'0');
    const dd=String(d.getDate()).padStart(2,'0');
    return `${yyyy}-${mm}-${dd}`;
  }

  function saveState(){
    try{
      const ids=[
        'insurance','family','kids','hireDate','borderYes','personalDiff',
        'fiveDaysCount','fiveDaysRate','nightCount','nightRate',
        'taxMode','manualTax','taxMonths','fiveYearsOn','fiveYearsAmount','otherFixed',
        'calView','calStartMonth','cycleLen'
      ];
      const s={};
      ids.forEach(id=>{
        const n=$(id);
        if(!n) return;
        s[id]=n.type==='checkbox'?n.checked:n.value;
      });
      s.calendar = Object.fromEntries(calMap.entries());
      localStorage.setItem(LS_KEY, JSON.stringify(s));
    }catch(e){}
  }
  function loadState(){
    try{
      const raw=localStorage.getItem(LS_KEY);
      if(!raw) return;
      const s=JSON.parse(raw);
      Object.keys(s).forEach(id=>{
        const n=$(id);
        if(!n) return;
        if(id==='calendar') return;
        if(n.type==='checkbox') n.checked=!!s[id];
        else n.value=s[id];
      });
      if(s.calendar){
        calMap = new Map(Object.entries(s.calendar));
      }
    }catch(e){}
  }

  function yearsBetween(aISO,bISO){
    const a=new Date(aISO);
    const b=new Date(bISO);
    if(isNaN(a)||isNaN(b)) return null;
    const ms=b-a;
    return ms/(365.25*24*3600*1000);
  }

  function getStepForYears(y){
    // 20 steps: 0-1.99 -> 1, ... simple 2-year steps example; replace with PAY_TABLE logic if present
    if(y==null) return null;
    const step=Math.min(20, Math.max(1, Math.floor(y/2)+1));
    return step;
  }

  function compute(){
    const hire=$('hireDate')?.value || '2020-07-20';
    const calc=$('calcDate')?.value || todayISO();
    const y=yearsBetween(hire,calc);
    if($('years')) $('years').value = (y==null)?'-':y.toFixed(2).replace('.',',');
    const step=getStepForYears(y);
    if($('step')) $('step').value = step?String(step):'-';

    // Read pay table (expects window.PAY_TABLE[step] -> {base,duty,child} etc). Fallback simple.
    const kids=Number($('kids')?.value||0);
    let base=0, duty=0, child=0;
    const T=window.PAY_TABLE;
    if(T && T.steps && T.steps[step]){
      base=Number(T.steps[step].base||0);
      duty=Number(T.steps[step].duty||0);
      child=Number(T.child?.[kids]||0);
    }else{
      base=1500 + (step? (step-1)*15:0);
      duty=200;
      child=kids*35;
    }

    const border = ($('borderYes')?.value==='yes') ? 130 : 0;
    const pd = Number($('personalDiff')?.value||0);
    const fiveCount=Number($('fiveDaysCount')?.value||0);
    const fiveRate=Number($('fiveDaysRate')?.value||46);
    const nightCount=Number($('nightCount')?.value||0);
    const nightRate=Number($('nightRate')?.value||26.5);

    const fiveGross=fiveCount*fiveRate;
    const nightGross=nightCount*nightRate;

    const gross = base + duty + child + border + pd + fiveGross + nightGross;
    if($('basePay')) $('basePay').textContent=fmt(base);
    if($('dutyPay')) $('dutyPay').textContent=fmt(duty);
    if($('childPay')) $('childPay').textContent=fmt(child);
    if($('grossTotal')) $('grossTotal').textContent=fmt(gross);

    // Deductions
    const rHealth = Number($('rHealth')?.value||2.05)/100;
    const rEfka = Number($('rEfka')?.value||6.67)/100;
    const rUnemp = 0.02;
    const rMtpyNight = 0.02;

    const health = (base + duty + child + border)*rHealth;
    const efka = (base + duty + child + border)*rEfka;

    // extras deductions
    const fiveDed = fiveGross*rUnemp;
    const nightDed = nightGross*(rUnemp + rMtpyNight);

    const fiveTax = (fiveGross - fiveDed)*0.20;
    const nightTax = (nightGross - nightDed)*0.20;

    if($('fiveGross')) $('fiveGross').textContent=fmt(fiveGross);
    if($('fiveDed')) $('fiveDed').textContent=fmt(fiveDed);
    if($('fiveTax')) $('fiveTax').textContent=fmt(fiveTax);
    if($('fiveNet')) $('fiveNet').textContent=fmt(fiveGross - fiveDed - fiveTax);

    if($('nightGross')) $('nightGross').textContent=fmt(nightGross);
    if($('nightDed')) $('nightDed').textContent=fmt(nightDed);
    if($('nightTax')) $('nightTax').textContent=fmt(nightTax);
    if($('nightNet')) $('nightNet').textContent=fmt(nightGross - nightDed - nightTax);

    // Main tax (simple placeholder): 0 unless manual
    let tax=0;
    const taxMode=$('taxMode')?.value||'auto';
    if(taxMode==='manual'){
      tax = Number($('manualTax')?.value||0);
    }else{
      tax = 0;
    }

    const fiveYearsOn=$('fiveYearsOn')?.value||'no';
    const fiveYearsAmt = (fiveYearsOn==='yes') ? Number($('fiveYearsAmount')?.value||39.87) : 0;
    const other = Number($('otherFixed')?.value||0);

    const deds = health + efka + tax + fiveYearsAmt + other + fiveDed + nightDed + fiveTax + nightTax;
    if($('healthAmt')) $('healthAmt').textContent=fmt(health);
    if($('efkaAmt')) $('efkaAmt').textContent=fmt(efka);
    if($('taxAmt')) $('taxAmt').textContent=fmt(tax);
    if($('fiveYearsAmt')) $('fiveYearsAmt').textContent=fmt(fiveYearsAmt);
    if($('otherAmt')) $('otherAmt').textContent=fmt(other);
    if($('dedTotal')) $('dedTotal').textContent=fmt(deds);
    if($('netTotal')) $('netTotal').textContent=fmt(gross-deds);

    saveState();
  }

  // Calendar
  let calMap = new Map(); // iso -> 'P'|'A'|'N'|'R' or 'P+N'
  function iso(d){ return d.toISOString().slice(0,10); }

  function renderCalendar(){
    const grid=$('calGrid');
    if(!grid) return;
    grid.innerHTML='';
    const view=$('calView')?.value||'month';
    const start=$('calStartMonth')?.value;
    if(!start){ return; }
    const [y,m]=start.split('-').map(Number);
    const first=new Date(y,m-1,1);
    const months = view==='month'?1:(view==='quarter'?3:(view==='half'?6:12));
    for(let mi=0; mi<months; mi++){
      const d=new Date(first.getFullYear(), first.getMonth()+mi, 1);
      const monthTitle=document.createElement('div');
      monthTitle.className='calMonthTitle';
      monthTitle.textContent=d.toLocaleString('el-GR',{month:'long',year:'numeric'});
      grid.appendChild(monthTitle);

      const table=document.createElement('div');
      table.className='calTable';
      const daysInMonth=new Date(d.getFullYear(), d.getMonth()+1, 0).getDate();
      for(let day=1; day<=daysInMonth; day++){
        const cur=new Date(d.getFullYear(), d.getMonth(), day);
        const cell=document.createElement('button');
        cell.type='button';
        cell.className='calCell';
        const key=iso(cur);
        const val=calMap.get(key)||'';
        cell.innerHTML=`<div class="calNum">${day}</div><div class="calVal">${val}</div>`;
        cell.addEventListener('click', ()=>cycleShift(key, cell));
        table.appendChild(cell);
      }
      grid.appendChild(table);
    }
    updateSummary();
    saveState();
  }

  function cycleShift(key, cell){
    const order=['', 'P', 'A', 'N', 'R', 'P+N'];
    const cur=calMap.get(key)||'';
    const next=order[(order.indexOf(cur)+1)%order.length];
    if(next==='') calMap.delete(key);
    else calMap.set(key,next);
    renderCalendar();
  }

  function clearCalendar(){
    calMap=new Map();
    renderCalendar();
  }

  function applyCycle(){
    const start=$('calStartMonth')?.value;
    if(!start) return;
    const len=Number($('cycleLen')?.value||5);
    const pattern = len===10 ? ['P','A','N','R','R','P','A','N','R','R'] : ['P','A','N','R','R'];
    const view=$('calView')?.value||'month';
    const months = view==='month'?1:(view==='quarter'?3:(view==='half'?6:12));
    const [y,m]=start.split('-').map(Number);
    let idx=0;
    for(let mi=0; mi<months; mi++){
      const d=new Date(y,m-1+mi,1);
      const daysInMonth=new Date(d.getFullYear(), d.getMonth()+1,0).getDate();
      for(let day=1; day<=daysInMonth; day++){
        const cur=new Date(d.getFullYear(), d.getMonth(), day);
        calMap.set(iso(cur), pattern[idx%pattern.length]);
        idx++;
      }
    }
    renderCalendar();
  }

  function updateSummary(){
    let nights=0, fived=0;
    const breakdown={friNight:0,satAny:0,sunAny:0};
    for(const [k,v] of calMap.entries()){
      if(v.includes('N')) nights++;
      const d=new Date(k+'T00:00:00');
      const dow=d.getDay(); // 0 Sun
      const isFri=(dow===5), isSat=(dow===6), isSun=(dow===0);
      const isWeekend=isSat||isSun;
      if(isFri && v==='N'){ fived++; breakdown.friNight++; }
      if(isWeekend && (v==='P'||v==='A'||v.includes('N'))){ fived++; if(isSat) breakdown.satAny++; if(isSun) breakdown.sunAny++; }
    }
    if($('sumNights')) $('sumNights').textContent=String(nights);
    if($('sumFivedays')) $('sumFivedays').textContent=String(fived);
    if($('sumBreakdown')) $('sumBreakdown').textContent=`ΠΑ(Ν): ${breakdown.friNight} • ΣΑ(Π/Α/Ν): ${breakdown.satAny} • ΚΥ(Π/Α/Ν): ${breakdown.sunAny}`;

    // push to inputs
    if($('nightCount')) $('nightCount').value = String(nights);
    if($('fiveDaysCount')) $('fiveDaysCount').value = String(fived);
  }

  function init(){
    // defaults
    if($('hireDate') && !$('hireDate').value) $('hireDate').value='2020-07-20';
    if($('calcDate')) $('calcDate').value=todayISO(); // ALWAYS today as requested

    loadState(); // loads other values & calendar, but we re-apply calcDate today after
    if($('calcDate')) $('calcDate').value=todayISO();

    // hook inputs
    document.querySelectorAll('input,select').forEach(n=>{
      n.addEventListener('input', ()=>{ compute(); if(n.id.startsWith('cal')) renderCalendar(); });
      n.addEventListener('change', ()=>{ compute(); if(n.id.startsWith('cal')) renderCalendar(); });
    });

    $('btnFill')?.addEventListener('click', applyCycle);
    $('btnClearView')?.addEventListener('click', ()=>{ calMap=new Map(); renderCalendar(); });
    $('btnClearMonth')?.addEventListener('click', clearCalendar);

    // render calendar if start month exists or set to current month
    if($('calStartMonth') && !$('calStartMonth').value){
      const d=new Date();
      const y=d.getFullYear();
      const m=String(d.getMonth()+1).padStart(2,'0');
      $('calStartMonth').value=`${y}-${m}`;
    }
    renderCalendar();
    compute();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
