const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const target = "if(selectedDate){";
const i=c.indexOf(target);
const archiveCode = "// Archive\r\n    const today2=new Date().toISOString().slice(0,10);\r\n    var unconfCount=0,archCount=0;\r\n    mySlots.forEach(function(sl){\r\n      if(sl.date<today2){\r\n        var bks=list.filter(function(b){return b.slots.some(function(sid){var s=DB.slots.find(function(x){return x.id===sid;});return s&&s.programId===mp&&s.date===sl.date;});});\r\n        if(bks.length>0){\r\n          var allMarked=bks.every(function(b){return DB.attendance.find(function(a){return a.booking_id===b.id&&a.program_id===mp;});});\r\n          if(allMarked) archCount++;\r\n          else unconfCount++;\r\n        }\r\n      }\r\n    });\r\n    if(unconfCount>0) html+='<div class=\"info-box amber\" style=\"margin-bottom:12px;\">⚠️ '+unconfCount+' passerade datum saknar närvaro-bekräftelse.</div>';\r\n    if(archCount>0) html+='<div style=\"margin-bottom:12px;\"><span class=\"text-sm text-muted\">📁 '+archCount+' bekräftade datum i arkivet</span></div>';\r\n    ";
c=c.slice(0,i)+archiveCode+c.slice(i);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", c.includes("unconfCount"));
