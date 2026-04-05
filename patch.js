const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "function fmtDate(d){if(!d)return'';const[y,m,day]=d.split('-');return`${parseInt(day)} ${['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'][parseInt(m)-1]} ${y}`;}";
const newCode = "function fmtDate(d){if(!d)return'';const[y,m,day]=d.split('-');return`${parseInt(day)} ${['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'][parseInt(m)-1]} ${y}`;}\nfunction fmtDateLong(d){if(!d)return'';const days=['söndagen','måndagen','tisdagen','onsdagen','torsdagen','fredagen','lördagen'];const dt=new Date(d);const dayName=days[dt.getDay()];const[y,m,day]=d.split('-');return`${dayName} ${parseInt(day)} ${['jan','feb','mar','apr','maj','jun','jul','aug','sep','okt','nov','dec'][parseInt(m)-1]} ${y}`;}";
c=c.replace(old,newCode);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", c.includes("fmtDateLong"));
