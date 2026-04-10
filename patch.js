const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "  return 'Ankomst '+fmtDate(arrivalNight)+' kväll, avresa '+fmtDate(day1)+';";
const newCode = "  return 'Ankomst '+fmtDate(arrivalNight)+' kväll, avresa '+fmtDate(day1);";
c=c.replace(old,newCode);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", !c.includes("fmtDate(day1)+'"));
