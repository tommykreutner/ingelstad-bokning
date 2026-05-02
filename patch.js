const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "    +'<button class=\"btn btn-danger\" onclick=\"doDeleteProg(\\\"'+id+'\\\",\\\"'+p.name+'\\\")\">Radera permanent</button>'";
const newCode = "    +'<button class=\"btn btn-danger\" onclick=\"doDeleteProg()\">Radera permanent</button>'";
c=c.replace(old,newCode);
// Also store id and name in global vars
const old2 = "function deleteProgConfirm(id){\n  const p=DB.programs.find(x=>x.id===id);";
const newCode2 = "function deleteProgConfirm(id){\n  const p=DB.programs.find(x=>x.id===id);\n  window._deleteProgId=id;\n  window._deleteProgName=p.name;";
c=c.replace(old2,newCode2);
// Fix doDeleteProg to use globals
const old3 = "function doDeleteProg(id,name){\n  const typed=document.getElementById('delete-prog-confirm')?.value.trim();\n  if(typed!==name){toast('Namnet stämmer inte','e');return;}";
const newCode3 = "function doDeleteProg(){\n  const id=window._deleteProgId;\n  const name=window._deleteProgName;\n  const typed=document.getElementById('delete-prog-confirm')?.value.trim();\n  if(typed!==name){toast('Namnet stämmer inte','e');return;}";
c=c.replace(old3,newCode3);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", c.includes("window._deleteProgId"));
