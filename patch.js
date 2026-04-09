const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "        const getFullDay=(date)=>{\r\n          const avail=DB.slots.filter(s=>s.programId===pid&&s.date===date&&s.booked<s.capacity&&isDateBookable(s.date));\r\n          const hel=avail.find(s=>s.type==='hel');\r\n          if(hel) return {slots:[hel.id],label:prog.icon+' '+prog.name+' (heldag)',spots:hel.capacity-hel.booked};";
const newCode = "        const getFullDay=(date)=>{\r\n          const avail=getSlotsForProg(date,pid);\r\n          const hel=avail.find(s=>s.type==='hel');\r\n          if(hel) return {slots:[hel.id],label:prog.icon+' '+prog.name+' (heldag)',spots:hel.capacity-hel.booked};";
c=c.replace(old,newCode);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", c.includes("getSlotsForProg(date,pid);\r\n          const hel=avail.find"));
