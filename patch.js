const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "  const allDates=[...new Set(DB.slots.filter(s=>isDateBookable(s.date)).map(s=>s.date))].sort();";
const newCode = "  // Generate all candidate dates: from slots + next 90 days for open programs\r\n  const slotDates=DB.slots.filter(s=>isDateBookable(s.date)).map(s=>s.date);\r\n  const hasOpenProg=halfProgIds.some(pid=>{const p=DB.programs.find(x=>x.id===pid);return p&&p.slotMode==='open';});\r\n  const extraDates=[];\r\n  if(hasOpenProg){\r\n    const today=new Date();today.setDate(today.getDate()+7);\r\n    for(let i=0;i<90;i++){\r\n      const d=new Date(today);d.setDate(today.getDate()+i);\r\n      const ds=d.toISOString().slice(0,10);\r\n      if(isDateBookable(ds)) extraDates.push(ds);\r\n    }\r\n  }\r\n  const allDates=[...new Set([...slotDates,...extraDates])].sort();";
c=c.replace(old,newCode);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", c.includes("hasOpenProg"));
