const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "    '<button class=\"btn btn-ghost btn-full mt-8\" onclick=\"bookingState.step=1;renderBStep()\">← Tillbaka</button>'+\r\n    '</div>';";
const newCode = "    '<button class=\"btn btn-ghost btn-full mt-8\" onclick=\"bookingState.step=1;renderBStep()\">← Tillbaka</button>'+\r\n    '<div style=\"height:80px;\"></div>'+\r\n    '</div>';";
c=c.replace(old,newCode);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", c.includes("height:80px"));
