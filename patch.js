const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "'<div class=\"stat-card\"><div class=\"stat-label\">Framtida bokningar</div><div class=\"stat-val\">'+futureBks.length+'</div><div class=\"stat-sub\">resterande denna termin</div></div>'";
const newCode = "'<div class=\"stat-card\"><div class=\"stat-label\">Framtida bokningar</div><div class=\"stat-val\">'+futureBks.length+'</div><div class=\"stat-sub\">resterande denna termin</div></div>'\r\n          +(allUnconf.length>0?'<div class=\"stat-card\" style=\"border-left:4px solid #f59e0b;\"><div class=\"stat-label\">⚠️ Obekräftade besök</div><div class=\"stat-val\" style=\"color:#d97706;\">'+allUnconf.length+'</div><div class=\"stat-sub\">passerade besök utan närvaro-markering — se resp. program</div></div>':'')";
c=c.replace(old,newCode);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", c.includes("passerade besök utan närvaro"));
