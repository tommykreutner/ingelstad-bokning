const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "function saveInternatMailText(){\r\n  var el=document.getElementById('ia-emailtext');\r\n  if(el){DB.settings.internatEmailText=el.value;toast('Mailtext sparad!');}\r\n}";
const newFn = "function saveInternatMailText(){\n  var el=document.getElementById('ia-emailtext');\n  if(!el) return;\n  var txt=el.value;\n  fetch('/api/settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({internat_email_text:txt})})\n    .then(r=>r.json()).then(data=>{if(data.error){toast(data.error,'e');return;}DB.settings.internatEmailText=txt;toast('Mailtext sparad!');}).catch(()=>toast('Fel vid sparande','e'));\n}";
c=c.replace(old,newFn);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", c.includes("internat_email_text"));
