
const baseSalary = 1100;

function calc(){
document.getElementById("tpdy").innerText=(baseSalary*0.04).toFixed(2);
document.getElementById("mtpy").innerText=(baseSalary*0.045).toFixed(2);
document.getElementById("teady").innerText=(baseSalary*0.03).toFixed(2);
document.getElementById("health").innerText=(baseSalary*0.0205).toFixed(2);
document.getElementById("efka").innerText=(baseSalary*0.0667).toFixed(2);
document.getElementById("unemp").innerText=(baseSalary*0.02).toFixed(2);
}

calc();
