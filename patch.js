const fs=require("fs");
let c=fs.readFileSync("src/lib/email.ts","utf-8");
const old = "    progTexts ? `\\n${progTexts}` : '',\r\n  ].filter(s => s !== '').join('\\n').trim()";
const newCode = "    progTexts ? `\\n${progTexts}` : '',\r\n    booking.special_food && (settings as any).kitchen_email_text ? `\\n--- Specialkost info ---\\n${(settings as any).kitchen_email_text}` : '',\r\n  ].filter(s => s !== '').join('\\n').trim()";
c=c.replace(old,newCode);
fs.writeFileSync("src/lib/email.ts",c);
console.log("Done:", c.includes("kitchen_email_text"));
