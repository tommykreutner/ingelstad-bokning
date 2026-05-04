const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "  if(!fn||!ln||!e||!g||!p||!gp||!sc||!mu||!gr){toast('Fyll i alla obligatoriska fält (*)','e');return;}";
const newCode = "  if(!fn||!ln||!e||!g||!p||!gp||!sc||!mu||!gr){toast('Fyll i alla obligatoriska fält (*)','e');return;}\n  if(!document.getElementById('f-gdpr')?.checked){toast('Du måste godkänna hanteringen av personuppgifter','e');return;}";
c=c.replace(old,newCode);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", c.includes("f-gdpr"));
