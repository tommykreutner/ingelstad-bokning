const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "DB.slots.filter(s=>s.programId===prog.id).map(sl=>`";
const newCode = "DB.slots.filter(s=>s.programId===prog.id&&s.date>=new Date().toISOString().slice(0,10)).map(sl=>`";
c=c.replace(old,newCode);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", c.includes("&&s.date>=new Date"));
