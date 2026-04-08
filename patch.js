const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "      <div class=\"sum-line\"><span class=\"sl\">Elevens e-post</span><span class=\"sv\">${s.studentEmail}</span></div>\r\n      <div class=\"sum-line\"><span class=\"sl\">Vård.hav. e-post</span><span class=\"sv\">${s.guardianEmail}</span></div>\r\n      <div class=\"sum-line\"><span class=\"sl\">Telefon</span><span class=\"sv\">${s.phone}</span></div>";
const newCode = "      <div class=\"sum-line\"><span class=\"sl\">Elevens e-post</span><span class=\"sv\">${s.studentEmail}</span></div>\r\n      <div class=\"sum-line\"><span class=\"sl\">Elevens telefon</span><span class=\"sv\">${s.phone}</span></div>\r\n      <div class=\"sum-line\"><span class=\"sl\">Vård.hav. e-post</span><span class=\"sv\">${s.guardianEmail}</span></div>\r\n      <div class=\"sum-line\"><span class=\"sl\">Vård.hav. telefon</span><span class=\"sv\">${s.guardianPhone||''}</span></div>";
c=c.replace(old,newCode);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", c.includes("Vård.hav. telefon"));
