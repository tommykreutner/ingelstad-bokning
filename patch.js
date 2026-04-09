const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
c=c.split("' kl 15:50 (2 nätter)'").join("' (2 nätter)'");
c=c.split("' kl 15:50'").join("'");
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", !c.includes("kl 15:50"));
