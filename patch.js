const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "    studentName:bookingState.studentName,studentEmail:bookingState.studentEmail,\r\n    guardianEmail:bookingState.guardianEmail,phone:bookingState.phone,";
const newCode = "    studentName:bookingState.studentName,studentEmail:bookingState.studentEmail,\r\n    guardianEmail:bookingState.guardianEmail,phone:bookingState.phone,guardianPhone:bookingState.guardianPhone||'',";
c=c.replace(old,newCode);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", c.includes("guardianPhone"));
