(function(){
  const $ = id => document.getElementById(id);
  const fmt = n => (Math.round((Number(n)||0)*100)/100).toFixed(2).replace('.', ',');

  // TAX_TABLE.js πρέπει να φορτώνεται πριν

  function todayISO(){
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function ageYears(birth, calc){
    const d1 = new Date(birth), d2 = new Date(calc);
    if(isNaN(d1)||isNaN(d2)) return null;
    let age = d2.getFullYear()-d1.getFullYear();
    const m=d2.getMonth()-d1.getMonth();
    if(m<0||(m===0&&d2.getDate()<d1.getDate())) age--;
    return age;
  }

  function getAgeGroup(age){
    if(age<=25) return '<=25';
    if(age<=30) return '26-30';
    return '>30';
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

  function computeTax(monthlyTaxable, age, kids){
    const ageGroup = getAgeGroup(age);
    const children = Math.min(kids,6);
    const annualIncome = monthlyTaxable*12;

    const rateObj = TAX_TABLE.find(r => r.AgeGroup===ageGroup && annualIncome>r.IncomeFrom && annualIncome<=r.IncomeTo && r.Children===children);
    const taxRate = rateObj ? rateObj.Rate : 0;

    const annualTaxBeforeCredit = annualIncome * taxRate / 100;
    let credit = taxCreditBase(kids);

    if (annualIncome > 12000){
      credit = Math.max(0, credit - Math.floor((annualIncome - 12000)/1000) * 20);
    }

    const annualTax = Math.max(0, annualTaxBeforeCredit - credit);
    return annualTax/12;
  }

  function compute(){
    const calc = $('calcDate').value || todayISO();
    const birth = $('birthDate').value || '';
    const age = ageYears(birth,calc) || 0;

    const base = Number($('basePay').textContent.replace(',','.')||0);
    const duty = Number($('dutyPay').textContent.replace(',','.')||0);
    const child = Number($('childPay').textContent.replace(',','.')||0);
    const gross = base+duty+child;

    const kids = Number($('kids').value||0);
    const monthlyTax = computeTax(gross, age, kids);
    $('taxMonthlyOut').value = fmt(monthlyTax);

    const net = gross - monthlyTax;
    $('netTotal').textContent = fmt(net);
  }

  document.querySelectorAll('input,select').forEach(el=>{
    el.addEventListener('input',compute);
    el.addEventListener('change',compute);
  });

  document.addEventListener('DOMContentLoaded',compute);
})();