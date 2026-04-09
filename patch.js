const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "    const d=document.getElementById('bd-single').value;\r\n    if(!d){toast('Välj ett datum','e');return;}\r\n    if(!DB.settings.blockedDates.includes(d))DB.settings.blockedDates.push(d);\r\n    closeModal();renderAdmin();toast('Datum blockerat');";
const newCode = "    const d=document.getElementById('bd-single').value;\r\n    if(!d){toast('Välj ett datum','e');return;}\r\n    if(DB.settings.blockedDates.includes(d)){toast('Redan blockerat','e');return;}\r\n    confirmBlockWithBookings([d],fmtDate(d),()=>{\r\n      DB.settings.blockedDates.push(d);\r\n      fetch('/api/settings',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({blocked_dates:DB.settings.blockedDates})});\r\n      closeModal();renderAdmin();toast('Datum blockerat');\r\n    });";
c=c.replace(old,newCode);
fs.writeFileSync("public/prototype.html",c);
console.log("Done single:", c.includes("confirmBlockWithBookings([d]"));
