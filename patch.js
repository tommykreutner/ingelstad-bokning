const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "\n    <hr class=\"divider\">\n    <div class=\"demo-section\">\n      <p>Testinloggningar</p>\n      <button class=\"demo-btn\" onclick=\"quickLogin('admin')\">🔑 <strong>Admin</strong> <span>— full kontroll</span></button>\n      <button class=\"demo-btn\" onclick=\"quickLogin('djurvard')\">🐾 <strong>Personal Djurvård</strong></button>\n      <button class=\"demo-btn\" onclick=\"quickLogin('na')\">🔬 <strong>Personal NV</strong></button>\n      <button class=\"demo-btn\" onclick=\"quickLogin('internat')\">🛏️ <strong>Internatansvarig</strong></button>\n    </div>\n    <hr class=\"divider\">";
c=c.replace(old,"");
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", !c.includes("quickLogin('admin')"));
