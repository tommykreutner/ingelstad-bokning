const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "function isDateBookable(dateStr){\r\n  if(!DB.settings.openTerms.includes(getTermId(dateStr))) return false;\r\n  // Compare date strings directly to avoid timezone issues\r\n  var todayStr=new Date().toISOString().slice(0,10);\r\n  var todayDate=new Date(todayStr), slotDate=new Date(dateStr);\r\n  if((slotDate-todayDate)/(1000*60*60*24)<7) return false;\r\n  if(DB.settings.blockedDates.includes(dateStr)) return false;\r\n  return true;\r\n}";
const newFn = "function isDateBookable(dateStr){\r\n  if(!DB.settings.openTerms.includes(getTermId(dateStr))) return false;\r\n  var todayStr=new Date().toISOString().slice(0,10);\r\n  var todayDate=new Date(todayStr), slotDate=new Date(dateStr);\r\n  if((slotDate-todayDate)/(1000*60*60*24)<7) return false;\r\n  if(DB.settings.blockedDates.includes(dateStr)) return false;\r\n  var day=new Date(dateStr).getDay();\r\n  if(day===0||day===6) return false;\r\n  return true;\r\n}";
c=c.replace(old,newFn);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", c.includes("day===0||day===6"));
