const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "  setTimeout(()=>simulateSendEmail(newBooking),400);\r\n  bookingState.step=6;renderBStep();";
const newCode = "  bookingState.step=6;renderBStep();";
c=c.replace(old,newCode);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", !c.includes("simulateSendEmail(newBooking)"));
