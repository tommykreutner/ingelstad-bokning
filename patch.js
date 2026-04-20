const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "    (combos.length===0?'<div class=\"info-box amber\">😕 Inga lediga tider matchar dina val just nu. Prova att ändra program eller kontakta skolan.</div>':'')+"
const newCode = "    (combos.length===0?'<div class=\"info-box amber\">😕 Inga lediga tider matchar dina val just nu. Prova att ändra program eller kontakta skolan.</div>':'<button class=\"btn btn-primary btn-full mb-8\" onclick=\"bNext3()\">Fortsätt →</button>')+";
c=c.replace(old,newCode);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", c.includes("mb-8"));
