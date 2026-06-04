const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "fram till terminens slut</div></div>';\r\n        }";
const newCode = "fram till terminens slut</div></div>'\r\n            +(unconfirmed.length>0?'<div class=\"stat-card\" style=\"grid-column:1/-1;border-left:4px solid #f59e0b;\"><div class=\"stat-label\">⚠️ Obekräftade besök</div><div class=\"stat-val\" style=\"color:#d97706;\">'+unconfirmed.length+'</div><div class=\"stat-sub\">passerade besök utan närvaro-markering</div></div>':'');\r\n        }";
c=c.replace(old,newCode);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", c.includes("Obekräftade besök"));
