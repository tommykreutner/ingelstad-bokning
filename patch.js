const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "+'<label style=\"display:flex;align-items:center;gap:10px;margin-bottom:10px;cursor:pointer;\"><input type=\"checkbox\" class=\"term-check\" value=\"'+ht+'\" '+(htChecked?'checked':'')+'> <span><strong>'+ht+'</strong> (aug\u2013jan '+yy2+')</span></label>'\r\n        +'<label style=\"display:flex;align-items:center;gap:10px;margin-bottom:16px;cursor:pointer;\"><input type=\"checkbox\" class=\"term-check\" value=\"'+vt+'\" '+(vtChecked?'checked':'')+'> <span><strong>'+vt+'</strong> (jan\u2013jun '+yy2+')</span></label>'";
const newCode = "+'<label style=\"display:flex;align-items:center;gap:10px;margin-bottom:10px;cursor:pointer;\"><input type=\"checkbox\" class=\"term-check\" value=\"'+ht+'\" '+(htChecked?'checked':'')+'> <span><strong>'+ht+'</strong> (aug\u2013dec 20'+yy+')</span></label>'\r\n        +'<label style=\"display:flex;align-items:center;gap:10px;margin-bottom:16px;cursor:pointer;\"><input type=\"checkbox\" class=\"term-check\" value=\"'+vt+'\" '+(vtChecked?'checked':'')+'> <span><strong>'+vt+'</strong> (jan\u2013jun 20'+yy2+')</span></label>'";
c=c.replace(old,newCode);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", c.includes("dec 20"));
