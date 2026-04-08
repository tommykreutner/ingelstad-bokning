const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "    'Telefon: '+booking.phone+'\\n'+\r\n    'E-post: '+booking.studentEmail+'\\n'+\r\n    'Vårdnadshavare: '+booking.guardianEmail+";
const newCode = "    'Telefon: '+booking.phone+'\\n'+\r\n    'E-post: '+booking.studentEmail+'\\n'+\r\n    'Vårdnadshavare e-post: '+booking.guardianEmail+'\\n'+\r\n    'Vårdnadshavare telefon: '+(booking.guardianPhone||'—')+";
c=c.replace(old,newCode);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", c.includes("Vårdnadshavare telefon"));
