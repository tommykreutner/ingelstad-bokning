const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = ".page-view{display:none;}\r\n.page-view.active{display:block;}";
const newCode = ".page-view{display:none;}\r\n.page-view.active{display:block;padding-bottom:80px;}";
c=c.replace(old,newCode);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", c.includes("padding-bottom:80px"));
