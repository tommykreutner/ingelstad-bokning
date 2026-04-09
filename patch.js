const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "function saveBlock(){";
const newFn = "function doConfirmBlock(){\r\n  if(!document.getElementById('block-confirm-cb').checked){toast('Kryssa i bekräftelsen','e');return;}\r\n  notifyAdminAboutAffectedBookings(window._blockConfirmDates,window._blockConfirmContext);\r\n  closeModal();\r\n  window._blockConfirmCb();\r\n}\r\nfunction saveBlock(){";
c=c.replace(old,newFn);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", c.includes("doConfirmBlock"));
