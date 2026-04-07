const fs=require("fs");
let c=fs.readFileSync("public/prototype.html","utf-8");
const old = "      return '<div class=\"table-wrap\"><table><thead><tr><th>Elev</th><th>Program</th><th>Dagar</th><th>Övernattning</th></tr></thead><tbody>'\r\n        +bks.slice(0,5).map(b=>{\r\n          const progs=[...new Set(b.slots.map(sid=>{const s=DB.slots.find(x=>x.id===sid);return s?DB.programs.find(p=>p.id===s.programId)?.icon+' '+DB.programs.find(p=>p.id===s.programId)?.name:'';}))].join(', ');\r\n          return '<tr><td><strong>'+b.studentName+'</strong><br><span class=\"td-m text-sm\">'+b.school+'</span></td><td class=\"td-m text-sm\">'+progs+'</td><td>'+b.days+'</td><td>'+(b.overnight?'✅':'—')+'</td></tr>';\r\n        }).join('')\r\n        +'</tbody></table></div>';";
const newCode = "      return '<p class=\"text-sm text-muted\">Se <strong>Bokningar</strong>-fliken för detaljer.</p>';";
c=c.replace(old,newCode);
fs.writeFileSync("public/prototype.html",c);
console.log("Done:", c.includes("Bokningar-fliken"));
