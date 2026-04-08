const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "        const orderedSlots=nvType==='fm'?[nvS.id,cs.id]:[cs.id,nvS.id];\r\n        return {nvSlotId:nvS.id,compatSlotId:cs.id,nvType,compatType,label,slots:orderedSlots,\r\n                usedTypes:{fm:nvType==='fm'?nvS.id:cs.id, em:nvType==='em'?nvS.id:cs.id},\r\n                spots:Math.min(nvS.capacity-nvS.booked, cs.capacity-cs.booked)};";
const newCode = "        const csId=cs.virtual?'virtual-'+compatId+'-'+date+'-'+compatType:cs.id;\r\n        const orderedSlots=nvType==='fm'?[nvS.id,csId]:[csId,nvS.id];\r\n        const typeOverride={};\r\n        if(cs.type==='hel') typeOverride[csId]=compatType;\r\n        const compatSpots=cs.virtual?cs.capacity:(cs.capacity-cs.booked);\r\n        return {nvSlotId:nvS.id,compatSlotId:csId,nvType,compatType,label,slots:orderedSlots,typeOverride,\r\n                usedTypes:{fm:nvType==='fm'?nvS.id:csId, em:nvType==='em'?nvS.id:csId},\r\n                spots:Math.min(nvS.capacity-nvS.booked, compatSpots)};";
c=c.replace(old,newCode);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", c.includes("cs.virtual"));
