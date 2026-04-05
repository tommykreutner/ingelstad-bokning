const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "onclick=\"confirmBooking()\">✅ Slutför bokning</button>";
const newBtn = "onclick=\"if(this.disabled)return;this.disabled=true;this.textContent='Sparar...';confirmBooking().finally(()=>{this.disabled=false;this.textContent='✅ Slutför bokning';})\">✅ Slutför bokning</button>";
c=c.replace(old,newBtn);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", c.includes("Sparar..."));
