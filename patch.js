const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "    if(Array.isArray(staffRes)) DB.users=staffRes.map(u=>({id:u.id,name:u.name,role:u.role,program:u.program_id,email:u.email,pass:''}));\r\n    showPage('dashboard');";
const newCode = "    if(Array.isArray(staffRes)) DB.users=staffRes.map(u=>({id:u.id,name:u.name,role:u.role,program:u.program_id,email:u.email,pass:''}));\r\n    // Build roomBookings from bookings\r\n    DB.roomBookings=DB.bookings.flatMap(b=>b.roomBookings||[]);\r\n    showPage('dashboard');";
c=c.replace(old,newCode);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", c.includes("DB.roomBookings=DB.bookings.flatMap"));
