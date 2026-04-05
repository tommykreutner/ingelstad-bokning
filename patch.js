const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "function deleteSlot(id){\r\n  if(DB.slots.find(s=>s.id===id)?.booked>0){toast('Kan inte ta bort tid med aktiva bokningar','e');return;}\r\n  DB.slots=DB.slots.filter(s=>s.id!==id);renderSlots();toast('Borttagen');\r\n}";
const newFn = "function deleteSlot(id){\n  if(DB.slots.find(s=>s.id===id)?.booked>0){toast('Kan inte ta bort tid med aktiva bokningar','e');return;}\n  fetch('/api/slots?id='+id,{method:'DELETE'}).then(r=>r.json()).then(data=>{if(data.error){toast(data.error,'e');return;}DB.slots=DB.slots.filter(s=>s.id!==id);renderSlots();toast('Borttagen');}).catch(()=>toast('Fel vid borttagning','e'));\n}";
c=c.replace(old,newFn);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", c.includes("api/slots?id="));
