const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "function saveInternatEmail(){\r\n  var email=(document.getElementById('ia-email')||{value:''}).value.trim();\r\n  currentUser.email=email;\r\n  var u=DB.users.find(function(x){return x.id===currentUser.id;});\r\n  if(u) u.email=email;\r\n  DB.settings.internatEmail=email;\r\n  toast('E-postadress sparad!');\r\n}";
const newFn = "function saveInternatEmail(){\n  var email=(document.getElementById('ia-email')||{value:''}).value.trim();\n  currentUser.email=email;\n  var u=DB.users.find(function(x){return x.id===currentUser.id;});\n  if(u) u.email=email;\n  DB.settings.internatEmail=email;\n  fetch('/api/staff',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:currentUser.id,email:email,role:currentUser.role,programId:currentUser.program})})\n    .then(r=>r.json()).then(data=>{if(data.error){toast(data.error,'e');return;}toast('E-postadress sparad!');}).catch(()=>toast('Fel vid sparande','e'));\n}";
c=c.replace(old,newFn);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", c.includes("fetch('/api/staff'"));
