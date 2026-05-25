const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "    (combos.length===0?'<div class=\"info-box amber\">😕 '+diagnoseNoTimes()+'</div>':'<button class=\"btn btn-primary btn-full mb-8\" onclick=\"bNext3()\">Fortsätt →</button>')+";
const newCode = "    (combos.length===0?'<div class=\"info-box amber\">😕 '+diagnoseNoTimes()+'</div>':'')+";
c=c.replace(old,newCode);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", !c.includes("diagnoseNoTimes()+'</div>':'<button"));
