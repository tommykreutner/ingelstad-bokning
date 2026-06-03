const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "function exportDayCSV(date){";
const newFn = "function markAttendance(bookingId,programId,status){\r\n  fetch('/api/attendance',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({booking_id:bookingId,program_id:programId,status:status})})\r\n    .then(r=>r.json())\r\n    .then(data=>{\r\n      if(data.error){toast(data.error,'e');return;}\r\n      const existing=DB.attendance.findIndex(a=>a.booking_id===bookingId&&a.program_id===programId);\r\n      if(existing>=0) DB.attendance[existing]=data;\r\n      else DB.attendance.push(data);\r\n      renderBookings(document.querySelector('.day-card.selected')?.dataset?.date);\r\n      toast('Närvaro sparad!');\r\n    }).catch(()=>toast('Fel vid sparande','e'));\r\n}\r\nfunction exportDayCSV(date){";
c=c.replace(old,newFn);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", c.includes("markAttendance"));
