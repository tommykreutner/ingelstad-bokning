const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "  if(r==='admin'||r==='internat') items.push({id:'overnight',icon:'🛏️',label:'Internat'});\r\n  if(r==='internat') items.push({id:'internatadmin',icon:'⚙️',label:'Admin'});\r\n  if(r==='admin') items.push({id:'admin',icon:'⚙️',label:'Admin'});";
const newCode = "  if(r==='admin'||r==='internat') items.push({id:'overnight',icon:'🛏️',label:'Internat'});\r\n  if(r==='internat') items.push({id:'internatadmin',icon:'⚙️',label:'Admin'});\r\n  if(r==='kok') items.push({id:'bookings',icon:'📋',label:'Bokningar'});\r\n  if(r==='kok') items.push({id:'kokadmin',icon:'⚙️',label:'Inställningar'});\r\n  if(r==='admin') items.push({id:'admin',icon:'⚙️',label:'Admin'});";
c=c.replace(old,newCode);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", c.includes("r==='kok'"));
