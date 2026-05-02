const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "['Vegetarisk','Vegan','Glutenfri','Laktosfri','Halal','Nötallergi','Annan allergi']";
const newCode = "['Vegetarisk','Glutenfri','Laktosfri','Nötallergi','Annan allergi']";
c=c.replace(old,newCode);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", !c.includes("'Vegan'"));
