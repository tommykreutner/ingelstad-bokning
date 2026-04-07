const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "function saveEmail(){";
const newFn = "function toggleBookingOpen(){\r\n  const isOpen=DB.settings.openTerms.length>0;\r\n  if(isOpen){\r\n    if(!confirm('Är du säker på att du vill stänga bokningen? Inga nya bokningar kommer att kunna göras.')) return;\r\n    const updates={open_terms:[]};\r\n    fetch('/api/settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(updates)})\r\n      .then(r=>r.json()).then(data=>{if(data.error){toast(data.error,'e');return;}DB.settings.openTerms=[];renderAdmin();renderDashboard();toast('Bokning stängd!');}).catch(()=>toast('Fel','e'));\r\n  } else {\r\n    const term=prompt('Ange termin att öppna (t.ex. VT26):',getTermId(new Date().toISOString().slice(0,10)));\r\n    if(!term) return;\r\n    const updates={open_terms:[term]};\r\n    fetch('/api/settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(updates)})\r\n      .then(r=>r.json()).then(data=>{if(data.error){toast(data.error,'e');return;}DB.settings.openTerms=[term];renderAdmin();renderDashboard();toast('Bokning öppnad för '+term+'!');}).catch(()=>toast('Fel','e'));\r\n  }\r\n}\r\nfunction saveEmail(){";
c=c.replace(old,newFn);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", c.includes("toggleBookingOpen"));
