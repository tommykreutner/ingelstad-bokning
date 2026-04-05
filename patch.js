const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "// Start on booking flow\nshowBooking();";
const newCode = `// Load data from API then start
async function initDB(){
  try {
    const [progs, staffRes, slotsRes, bookingsRes, settingsRes] = await Promise.all([
      fetch('/api/programs').then(r=>r.json()),
      fetch('/api/staff').then(r=>r.json()),
      fetch('/api/slots').then(r=>r.json()),
      fetch('/api/bookings').then(r=>r.json()),
      fetch('/api/settings').then(r=>r.json()),
    ]);
    if(Array.isArray(progs)) DB.programs=progs.map(p=>({id:p.id,name:p.name,icon:p.icon||'🎓',isNV:p.is_nv,hidden:p.hidden,slotMode:p.slot_mode,defaultCapacity:p.default_capacity,emailText:p.email_text||'',nvCompatible:p.nv_compatible||[],description:p.description||''}));
    if(Array.isArray(staffRes)) DB.users=staffRes.map(u=>({id:u.id,name:u.name,role:u.role,program:u.program_id,email:u.email,pass:''}));
    if(Array.isArray(slotsRes)) DB.slots=slotsRes.map(s=>({id:s.id,programId:s.program_id,date:s.date,type:s.type,capacity:s.capacity,booked:s.booked}));
    if(Array.isArray(bookingsRes)) DB.bookings=bookingsRes.map(b=>({id:b.id,studentName:b.student_name,studentEmail:b.student_email,guardianEmail:b.guardian_email,phone:b.phone,school:b.school,municipality:b.municipality,grade:b.grade,days:b.days,overnight:b.overnight,slots:b.slot_ids||[],specialFood:b.special_food||'',otherInfo:b.other_info||'',code:b.code,createdAt:b.created_at}));
    if(settingsRes && !settingsRes.error) DB.settings=Object.assign(DB.settings,{schoolName:settingsRes.school_name,senderEmail:settingsRes.sender_email,adminEmails:settingsRes.admin_emails||[],kitchenEmail:settingsRes.kitchen_email,internatEmail:settingsRes.internat_email,internatEmailText:settingsRes.internat_email_text,adminEmailText:settingsRes.admin_email_text,overnightCapacity:settingsRes.overnight_capacity||3,smtpHost:settingsRes.smtp_host,smtpPort:settingsRes.smtp_port,smtpUser:settingsRes.smtp_user,smtpPass:settingsRes.smtp_pass,openTerms:settingsRes.open_terms||[],blockedDates:(settingsRes.blocked_dates||[]).map(d=>d.slice(0,10))});
  } catch(e) { console.error('initDB error:', e); }
}
// Start on booking flow
initDB().then(()=>showBooking());`;
c=c.replace(old,newCode);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", c.includes("initDB"));
