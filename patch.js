const fs=require("fs");
let c=fs.readFileSync("src/app/api/bookings/route.ts","utf-8");
const old = "      program_email_text: s.programs?.email_text || '',\r\n    }))";
const newCode = "      program_email_text: s.programs?.email_text || '',\r\n      program_id: s.program_id || '',\r\n    }))";
c=c.replace(old,newCode);
fs.writeFileSync("src/app/api/bookings/route.ts",c);
console.log("Done:", c.includes("program_id: s.program_id"));
