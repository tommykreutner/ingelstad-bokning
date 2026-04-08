const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
c=c.split("&&isDateInOpenTerm(d)").join("&&isDateInAnyTerm(d)");
c=c.split("&&isDateInOpenTerm(date)").join("&&isDateInAnyTerm(date)");
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", c.includes("isDateInAnyTerm"));
