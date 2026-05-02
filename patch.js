const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "{admin:'Admin',personal:'Personal',internat:'Internat'}[u.role]";
const newCode = "{admin:'Admin',personal:'Personal',internat:'Internat',kok:'Köket'}[u.role]";
c=c.replace(old,newCode);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", c.includes("kok:'Köket'"));
