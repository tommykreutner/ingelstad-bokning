const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "'<div class=\"sl-header\"><span class=\"sl-date\">'+fmtDate(c.date)+d2str+'</span>";
const newCode = "'<div class=\"sl-header\"><span class=\"sl-date\">'+fmtDateLong(c.date)+d2str+'</span>";
c=c.replace(old,newCode);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", c.includes("fmtDateLong(c.date)+d2str"));
