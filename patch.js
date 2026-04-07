const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "if(Array.isArray(bookingsRes)) DB.bookings=bookingsRes.map(b=>({id:b.id,studentName:b.student_name,studentEmail:b.student_email,guardianEmail:b.guardian_email,phone:b.phone,school:b.school,municipality:b.municipality,grade:b.grade,days:b.days,overnight:b.overnight,slots:b.slot_ids||[],specialFood:b.special_food||'',otherInfo:b.other_info||'',code:b.code,createdAt:b.created_at}));";
const newCode = "if(Array.isArray(bookingsRes)) DB.bookings=bookingsRes.map(b=>({id:b.id,studentName:b.student_name,studentEmail:b.student_email,guardianEmail:b.guardian_email,phone:b.phone,school:b.school,municipality:b.municipality,grade:b.grade,days:b.days,overnight:b.overnight,slots:(b.booking_slots||[]).map(bs=>bs.slot_id),specialFood:b.special_food||'',otherInfo:b.other_info||'',code:b.code,createdAt:b.created_at}));";
const count = (c.match(/slot_ids\|\|\[\]/g)||[]).length;
console.log('Occurrences to replace:', count);
c=c.split(old).join(newCode);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", c.includes("booking_slots||[]"));
