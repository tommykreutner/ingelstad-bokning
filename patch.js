const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "    const parts=vid.split('-'); // virtual-pid-date-type\r\n    const type=parts[parts.length-1];\r\n    const date=parts[parts.length-2];\r\n    const pid=parts.slice(1,parts.length-2).join('-');";
const newCode = "    // Format: virtual-{pid}-{YYYY-MM-DD}-{type}\r\n    const withoutPrefix=vid.slice('virtual-'.length); // e.g. djurvard-2026-04-22-em\r\n    const typeMatch=withoutPrefix.match(/-(fm|em|hel)$/);\r\n    const type=typeMatch?typeMatch[1]:'hel';\r\n    const withoutType=withoutPrefix.slice(0,withoutPrefix.lastIndexOf('-'+type));\r\n    const dateMatch=withoutType.match(/(\\d{4}-\\d{2}-\\d{2})$/);\r\n    const date=dateMatch?dateMatch[1]:'';\r\n    const pid=withoutType.slice(0,withoutType.lastIndexOf('-'+date));";
c=c.replace(old,newCode);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", c.includes("withoutPrefix"));
