const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "    '\\n\\n--- DIN BOKNINGSKOD ---\\n'+booking.code+\r\n    ';";
const newCode = "    '\\n\\n--- DIN BOKNINGSKOD ---\\n'+booking.code;";
c=c.replace(old,newCode);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", c.includes("booking.code;"));
