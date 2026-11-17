// SummerCamp-fliken i admin. Laddas av prototype.html och använder dess inloggning (fetch skickar nyckeln automatiskt),
// showModal/closeModal/toast. All text från servern går genom esc() innan den visas.
(function(){
var C={cfg:null,tracks:[],access:{},regs:[],track:'',q:'',cancelled:false,sel:{}};
var ROOM={dubbel:'Dubbelrum',enkel:'Enkelrum'};
var STATUS={bokad:'Bokad',bekraftad:'Bekräftad',avbokad:'Avbokad'};
var DEFAULT_FINAL='Hej {namn}!\n\nNu är din plats på {inriktning} på {camp} ({datum}) slutgiltigt bekräftad. Vi ser fram emot att träffa dig!\n\nHör av dig om du har frågor.';
function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
function el(id){return document.getElementById(id);}
function page(){return el('page-camp');}
function trackOf(id){return C.tracks.find(function(t){return t.id===id;})||{name:id,icon:''};}
function j(r){return r.json();}

window.renderCamp=function(){
  page().innerHTML='<div class="page-header"><h1>⛺ SummerCamp</h1><p>Laddar...</p></div>';
  load();
};

function load(){
  return Promise.all([fetch('/api/camp/admin').then(j),fetch('/api/camp/registrations').then(j)]).then(function(res){
    var a=res[0],r=res[1];
    if(a.error){page().innerHTML='<div class="page-header"><h1>⛺ SummerCamp</h1><p>'+esc(a.error)+'</p></div>';return;}
    if(!a.config){page().innerHTML='<div class="page-header"><h1>⛺ SummerCamp</h1></div><div class="card"><p>SummerCamp är inte uppsatt i databasen än. Kör filen <strong>camp_setup.sql</strong> i Supabase SQL Editor.</p></div>';return;}
    C.cfg=a.config;C.tracks=a.tracks;C.access=a.access;C.regs=Array.isArray(r)?r:[];
    C.sel={};
    draw();
  }).catch(function(){page().innerHTML='<div class="page-header"><h1>⛺ SummerCamp</h1><p>Kunde inte ladda. Försök igen.</p></div>';});
}

function visibleTracks(){return C.tracks.filter(function(t){return C.access.trackIds.indexOf(t.id)>=0&&(t.active||t.taken>0);});}
function filtered(){
  var q=C.q.toLowerCase();
  return C.regs.filter(function(r){
    if(!C.cancelled&&r.status==='avbokad')return false;
    if(C.track&&r.track_id!==C.track)return false;
    if(q&&(r.student_name+' '+r.school+' '+r.id+' '+r.municipality).toLowerCase().indexOf(q)<0)return false;
    return true;
  });
}
function count(list,key,labels){
  var m={};list.forEach(function(r){var k=r[key]||'—';m[k]=(m[k]||0)+1;});
  return Object.keys(m).sort().map(function(k){return esc(labels&&labels[k]||k)+' <strong>'+m[k]+'</strong>';}).join(' · ')||'—';
}
var STATUS_TXT={open:'Öppen för anmälan',closed:'Stängd',not_yet:'Öppnar senare',ended:'Stängd (tiden ute)'};

function draw(){
  var cfg=C.cfg,list=filtered(),active=list.filter(function(r){return r.status!=='avbokad';});
  var h='<div class="page-header"><h1>⛺ '+esc(cfg.title)+'</h1><p>'+esc(cfg.dates_text||'Inga datum angivna')+' · <strong>'+esc(STATUS_TXT[cfg.status]||cfg.status)+'</strong></p></div>';
  h+='<div class="stat-grid">'+visibleTracks().map(function(t){
    var pct=t.capacity?Math.min(100,Math.round(t.taken/t.capacity*100)):100,over=t.taken>t.capacity;
    return '<div class="stat-card"><div class="stat-label">'+esc(t.icon)+' '+esc(t.name)+(t.active?'':' (dold)')+'</div>'
      +'<div class="stat-val">'+t.taken+'<span style="font-size:1rem;color:var(--muted);"> / '+t.capacity+'</span></div>'
      +'<div style="height:6px;background:var(--forest-light);border-radius:3px;margin-top:8px;"><div style="height:6px;width:'+pct+'%;background:'+(over?'var(--red)':'var(--forest)')+';border-radius:3px;"></div></div>'
      +'<div class="stat-sub">'+t.confirmed+' slutbekräftade'+(over?' · FLER ÄN PLATSER':'')+'</div></div>';
  }).join('')+'</div>';
  h+='<div class="card" style="font-size:.85rem;line-height:1.9;"><div><strong>Tröjor:</strong> '+count(active,'tshirt')+'</div><div><strong>Boende:</strong> '+count(active,'room_pref',ROOM)+'</div></div>';
  h+='<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px;">'
    +'<select id="cp-track" style="padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;min-height:40px;"><option value="">Alla inriktningar</option>'+visibleTracks().map(function(t){return '<option value="'+esc(t.id)+'"'+(C.track===t.id?' selected':'')+'>'+esc(t.icon)+' '+esc(t.name)+'</option>';}).join('')+'</select>'
    +'<input id="cp-q" placeholder="Sök namn, skola, nummer" value="'+esc(C.q)+'" style="flex:1;min-width:150px;padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;min-height:40px;">'
    +'<label style="font-size:.82rem;display:flex;gap:6px;align-items:center;"><input type="checkbox" id="cp-canc"'+(C.cancelled?' checked':'')+'> Visa avbokade</label></div>';
  h+='<div class="mb-8" style="display:flex;gap:8px;flex-wrap:wrap;">'
    +'<button class="btn btn-secondary btn-sm" onclick="campExport()">Exportera lista (CSV)</button><button class="btn btn-secondary btn-sm" onclick="campPrint()">Skriv ut lista</button>'
    +(C.access.write?'<button class="btn btn-primary btn-sm" onclick="campConfirmModal()"><span>Skicka slutbekräftelse (<span id="cp-nsel">0</span>)</span></button>':'')
    +(C.access.admin?'<button class="btn btn-ghost btn-sm" onclick="campTracksModal()">Inriktningar</button><button class="btn btn-ghost btn-sm" onclick="campSettingsModal()">Inställningar</button>':'')
    +'</div>';
  h+='<div class="table-wrap"><table><thead><tr>'+(C.access.write?'<th style="width:34px;"><input type="checkbox" id="cp-all"></th>':'')+'<th>Nr</th><th>Elev</th><th>Inriktning</th><th>Boende</th><th>Tröja</th><th>Status</th></tr></thead><tbody>'
  +(list.length?list.map(function(r){
    var t=trackOf(r.track_id),warn=(r.mail_booked==='fel'||r.mail_final==='fel')?' <span title="Ett mail gick inte fram — öppna för detaljer">⚠️</span>':'';
    return '<tr style="cursor:pointer;'+(r.status==='avbokad'?'opacity:.5;':'')+'" data-id="'+esc(r.id)+'">'
      +(C.access.write?'<td data-nosel="1">'+(r.status!=='avbokad'?'<input type="checkbox" class="cp-ck" data-id="'+esc(r.id)+'">':'')+'</td>':'')
      +'<td>'+esc(r.id)+'</td><td><strong>'+esc(r.student_name)+'</strong><br><span class="td-m text-sm">'+esc(r.school)+'</span></td>'
      +'<td>'+esc(t.icon)+' '+esc(t.name)+'</td>'
      +'<td>'+esc(ROOM[r.room_pref]||r.room_pref)+(r.room_pref==='dubbel'&&r.roommate_wish?'<br><span class="td-m text-sm">med '+esc(r.roommate_wish)+'</span>':'')+'</td>'
      +'<td>'+esc(r.tshirt)+'</td><td>'+esc(STATUS[r.status]||r.status)+warn+'</td></tr>';
  }).join(''):'<tr><td colspan="7" class="td-m" style="padding:20px;text-align:center;">Inga anmälningar</td></tr>')
  +'</tbody></table></div><p class="td-m text-sm">'+list.length+' visas</p>';
  page().innerHTML=h;
  el('cp-track').onchange=function(){C.track=this.value;draw();};
  var q=el('cp-q');q.oninput=function(){C.q=this.value;var pos=this.selectionStart;draw();var q2=el('cp-q');q2.focus();q2.setSelectionRange(pos,pos);};
  el('cp-canc').onchange=function(){C.cancelled=this.checked;draw();};
  page().querySelectorAll('tbody tr[data-id]').forEach(function(tr){tr.onclick=function(e){if(e.target.closest('[data-nosel]'))return;campDetail(tr.getAttribute('data-id'));};});
  page().querySelectorAll('.cp-ck').forEach(function(c){c.checked=!!C.sel[c.getAttribute('data-id')];c.onchange=function(){C.sel[this.getAttribute('data-id')]=this.checked;updSel();};});
  var all=el('cp-all');if(all)all.onchange=function(){var on=this.checked;page().querySelectorAll('.cp-ck').forEach(function(c){c.checked=on;C.sel[c.getAttribute('data-id')]=on;});updSel();};
  updSel();
}
function selIds(){return Object.keys(C.sel).filter(function(k){return C.sel[k]&&C.regs.some(function(r){return r.id===k&&r.status!=='avbokad';});});}
function updSel(){var n=el('cp-nsel');if(n)n.textContent=selIds().length;}

window.campDetail=function(id){
  var r=C.regs.find(function(x){return x.id===id;});if(!r)return;var t=trackOf(r.track_id);
  function row(l,v){return v?'<div class="sum-line" style="display:flex;justify-content:space-between;gap:12px;padding:6px 0;border-bottom:1px solid var(--forest-light);"><span class="td-m">'+l+'</span><span style="text-align:right;">'+v+'</span></div>':'';}
  var mail=function(x){return x==='ok'?'skickat':x==='fel'?'<strong style="color:var(--red);">gick inte fram</strong>':'—';};
  showModal('<h3>'+esc(r.student_name)+'</h3><p class="modal-sub">'+esc(r.id)+' · '+esc(t.icon)+' '+esc(t.name)+' · '+esc(STATUS[r.status])+'</p>'
    +row('Skola',esc(r.school)+(r.municipality?' ('+esc(r.municipality)+')':''))+row('Årskurs',esc(r.grade))
    +row('Elev e-post',esc(r.student_email))+row('Elev telefon',esc(r.phone))
    +row('Vårdnadshavare',esc(r.guardian_name))+row('Vårdnadshavare e-post',esc(r.guardian_email))+row('Vårdnadshavare telefon',esc(r.guardian_phone))
    +row('Tröja',esc(r.tshirt))+row('Boende',esc(ROOM[r.room_pref]||r.room_pref))+row('Önskad rumskompis',esc(r.roommate_wish))
    +row('Specialkost',esc(r.special_food))+row(esc(t.own_animal_text||'Egen hund/häst'),esc(r.own_animal))+row('Övrigt',esc(r.other_info))
    +row('Anmäld',esc(new Date(r.created_at).toLocaleString('sv-SE')))
    +row('Bokningsmail',mail(r.mail_booked))+row('Slutbekräftelse',r.confirmation_sent_at?'skickad '+esc(new Date(r.confirmation_sent_at).toLocaleDateString('sv-SE'))+' ('+mail(r.mail_final)+')':mail(r.mail_final))
    +'<div class="modal-footer" style="flex-wrap:wrap;">'
    +(C.access.write&&r.status!=='avbokad'?'<button class="btn btn-secondary" onclick="campAct(\'resend_booked\',\''+esc(r.id)+'\')">Skicka bokningsmail igen</button><button class="btn btn-danger" onclick="campCancel(\''+esc(r.id)+'\')">Avboka</button>':'')
    +'<button class="btn btn-ghost" onclick="closeModal()">Stäng</button></div>');
};

window.campCancel=function(id){
  var r=C.regs.find(function(x){return x.id===id;});if(!r)return;
  showModal('<h3>Avboka '+esc(r.student_name)+'?</h3><p class="modal-sub">Platsen blir ledig direkt och ett avbokningsmail skickas till eleven och vårdnadshavaren, samt till samma personal som fick bokningsmailet.</p>'
    +'<div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Behåll</button><button class="btn btn-danger" id="cp-cgo">Ja, avboka</button></div>');
  el('cp-cgo').onclick=function(){this.disabled=true;campAct('cancel',id);};
};

window.campAct=function(action,id){
  fetch('/api/camp/registrations',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:action,ids:[id]})}).then(j).then(function(d){
    closeModal();
    if(d.error){toast(d.error,'e');return;}
    var bad=(d.results||[]).filter(function(x){return x.ok===false;});
    if(bad.length)toast('Mailet gick inte fram: '+(bad[0].error||'okänt fel'),'e');else toast(action==='cancel'?'Avbokad':'Skickat');
    load();
  }).catch(function(){toast('Något gick fel','e');});
};

window.campConfirmModal=function(){
  var ids=selIds();
  if(!ids.length){toast('Markera först de anmälningar som ska få bekräftelsen','e');return;}
  var already=C.regs.filter(function(r){return ids.indexOf(r.id)>=0&&r.status==='bekraftad';}).length;
  showModal('<h3>Slutgiltig bekräftelse</h3><p class="modal-sub">Skickas till '+ids.length+' elev'+(ids.length>1?'er':'')+' och vårdnadshavare. Anmälningarna markeras som bekräftade.'
    +(already?' <strong>'+already+' av dem har redan fått en bekräftelse.</strong>':'')+'</p>'
    +'<div class="form-group"><label>Meddelande</label><textarea id="cp-ftext" style="min-height:170px;">'+esc(C.cfg.final_text||DEFAULT_FINAL)+'</textarea>'
    +'<div class="td-m text-sm" style="margin-top:6px;">Du kan skriva {namn}, {inriktning}, {datum} och {camp}, de byts ut för varje elev. Elevens uppgifter och inriktningens utrustning läggs till under texten.</div></div>'
    +(C.cfg.info_text?'<div class="form-group"><label style="display:flex;gap:10px;align-items:center;font-weight:600;"><input type="checkbox" id="cp-finfo" checked style="width:auto;min-height:0;"> Bifoga lägerinformationen (schema, vad man ska ta med)</label></div>':'')
    +'<div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Avbryt</button><button class="btn btn-primary" id="cp-fgo">Skicka</button></div>');
  el('cp-fgo').onclick=function(){
    var text=el('cp-ftext').value.trim();if(!text){toast('Skriv ett meddelande','e');return;}
    this.disabled=true;this.textContent='Skickar...';
    var chunks=[];for(var i=0;i<ids.length;i+=10)chunks.push(ids.slice(i,i+10));
    var okN=0,fails=[];
    (function next(k){
      if(k>=chunks.length){closeModal();toast(okN+' skickade'+(fails.length?', '+fails.length+' misslyckades':''),fails.length?'e':'s');
        if(fails.length)alert('Dessa gick inte fram:\n'+fails.map(function(f){return f.id+': '+(f.error||'okänt fel');}).join('\n'));load();return;}
      el('cp-fgo')&&(el('cp-fgo').textContent='Skickar '+Math.min((k+1)*10,ids.length)+' av '+ids.length+'...');
      fetch('/api/camp/registrations',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'confirm',ids:chunks[k],text:text,includeInfo:!!(el('cp-finfo')&&el('cp-finfo').checked)})}).then(j).then(function(d){
        if(d.error){fails=fails.concat(chunks[k].map(function(id){return {id:id,error:d.error};}));}
        else (d.results||[]).forEach(function(x){if(x.ok)okN++;else fails.push(x);});
        next(k+1);
      }).catch(function(){fails=fails.concat(chunks[k].map(function(id){return {id:id,error:'nätverksfel'};}));next(k+1);});
    })(0);
  };
};

// Sorterad lista: inriktning, sedan namn. Följer aktuellt filter (inriktning, sökning, visa avbokade).
function sortedList(){
  var order={};C.tracks.forEach(function(t,i){order[t.id]=i;});
  return filtered().slice().sort(function(a,b){return (order[a.track_id]-order[b.track_id])||String(a.student_name).localeCompare(String(b.student_name),'sv');});
}
window.campExport=function(){
  var list=sortedList();
  var head=['Nr','Inriktning','Status','Namn','Skola','Kommun','Årskurs','Boende','Önskad rumskompis','Tröja','Specialkost','Egen hund/häst','Övrigt','Elev e-post','Elev telefon','Vårdnadshavare','Vårdnadshavare e-post','Vårdnadshavare telefon','Anmäld','Slutbekräftelse skickad'];
  var lines=['﻿'+head.join(';')];
  list.forEach(function(r){
    var row=[r.id,trackOf(r.track_id).name,STATUS[r.status],r.student_name,r.school,r.municipality,r.grade,ROOM[r.room_pref],r.roommate_wish,r.tshirt,r.special_food,r.own_animal,r.other_info,r.student_email,r.phone,r.guardian_name,r.guardian_email,r.guardian_phone,r.created_at.slice(0,10),r.confirmation_sent_at?r.confirmation_sent_at.slice(0,10):''];
    lines.push(row.map(function(v){v=String(v==null?'':v).replace(/\r?\n/g,' ');if(/^[=@]|^[+\-](?![\d\s])/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"';}).join(';'));
  });
  var blob=new Blob([lines.join('\r\n')],{type:'text/csv;charset=utf-8;'});
  var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='summercamp_deltagare_'+new Date().toISOString().slice(0,10)+'.csv';a.click();
};

// Utskriftsvänlig lista per inriktning, med det personalen behöver ha på plats (kost, övrigt, kontakt) och en kolumn för närvaro.
window.campPrint=function(){
  var list=sortedList().filter(function(r){return r.status!=='avbokad';});
  var groups={},order=[];list.forEach(function(r){if(!groups[r.track_id]){groups[r.track_id]=[];order.push(r.track_id);}groups[r.track_id].push(r);});
  var h='<!DOCTYPE html><html lang="sv"><head><meta charset="utf-8"><title>'+esc(C.cfg.title)+' – deltagarlista</title><style>'
   +'body{font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#111;margin:18px;}h1{font-size:18px;margin:0 0 2px;}h2{font-size:14px;margin:20px 0 6px;page-break-after:avoid;}'
   +'.sub{color:#555;margin-bottom:10px;}table{border-collapse:collapse;width:100%;margin-bottom:8px;}th,td{border:1px solid #999;padding:4px 6px;text-align:left;vertical-align:top;}th{background:#eee;font-size:10px;text-transform:uppercase;}'
   +'tr{page-break-inside:avoid;}.sum{margin:4px 0 10px;line-height:1.6;}.att{width:60px;}.noprint{margin-bottom:12px;}@media print{.noprint{display:none;}body{margin:8mm;}}'
   +'</style></head><body><div class="noprint"><button onclick="window.print()">Skriv ut</button></div>'
   +'<h1>'+esc(C.cfg.title)+' – deltagarlista</h1><div class="sub">'+esc(C.cfg.dates_text||'')+' · utskriven '+new Date().toLocaleDateString('sv-SE')+' · '+list.length+' deltagare</div>'
   +'<div class="sum"><strong>Tröjor:</strong> '+count(list,'tshirt')+'<br><strong>Boende:</strong> '+count(list,'room_pref',ROOM)+'<br><strong>Specialkost:</strong> '+(count(list.filter(function(r){return r.special_food;}),'special_food')||'—')+'</div>';
  order.forEach(function(id){
    var t=trackOf(id),own=groups[id].some(function(r){return r.own_animal;});
    h+='<h2>'+esc(t.icon)+' '+esc(t.name)+' ('+groups[id].length+')</h2><table><thead><tr><th>Nr</th><th>Namn</th><th>Skola / åk</th><th>Boende</th><th>Tröja</th><th>Kost</th>'+(own?'<th>Eget djur</th>':'')+'<th>Övrigt</th><th>Vårdnadshavare</th><th class="att">Närvaro</th></tr></thead><tbody>';
    groups[id].forEach(function(r){
      h+='<tr><td>'+esc(r.id)+'</td><td><strong>'+esc(r.student_name)+'</strong><br>'+esc(r.phone)+'</td><td>'+esc(r.school)+(r.municipality?' ('+esc(r.municipality)+')':'')+'<br>åk '+esc(r.grade)+'</td>'
        +'<td>'+esc(ROOM[r.room_pref]||r.room_pref)+(r.room_pref==='dubbel'&&r.roommate_wish?'<br>med '+esc(r.roommate_wish):'')+'</td><td>'+esc(r.tshirt)+'</td><td>'+esc(r.special_food)+'</td>'+(own?'<td>'+esc(r.own_animal)+'</td>':'')+'<td>'+esc(r.other_info)+'</td>'
        +'<td>'+esc(r.guardian_name)+'<br>'+esc(r.guardian_phone)+'<br>'+esc(r.guardian_email)+'</td><td class="att"></td></tr>';
    });
    h+='</tbody></table>';
  });
  if(!order.length)h+='<p>Inga deltagare att visa.</p>';
  h+='</body></html>';
  var w=window.open('','_blank');
  if(!w){toast('Webbläsaren blockerade utskriftsfönstret. Tillåt popup-fönster för sidan.','e');return;}
  w.document.open();w.document.write(h);w.document.close();
};

function localDT(iso){if(!iso)return '';var d=new Date(iso);d=new Date(d.getTime()-d.getTimezoneOffset()*60000);return d.toISOString().slice(0,16);}
window.campSettingsModal=function(){
  var c=C.cfg;
  showModal('<h3>Inställningar SummerCamp</h3><p class="modal-sub">Det som står här visas för eleverna och i mailen.</p>'
    +'<div class="form-group"><label>Rubrik</label><input id="cs-title" value="'+esc(c.title)+'"></div>'
    +'<div class="form-group"><label>Datum (fri text)</label><input id="cs-dates" value="'+esc(c.dates_text)+'" placeholder="T.ex. 15–17 juni 2027"></div>'
    +'<div class="form-group"><label>Text överst på anmälningssidan</label><textarea id="cs-intro">'+esc(c.intro_text)+'</textarea></div>'
    +'<div class="form-group"><label style="display:flex;gap:10px;align-items:center;"><input type="checkbox" id="cs-open" style="width:auto;min-height:0;"'+(c.open?' checked':'')+'> Anmälan är öppen</label></div>'
    +'<div class="form-group"><label>Öppnar (valfritt)</label><input type="datetime-local" id="cs-from" value="'+localDT(c.opens_at)+'"></div>'
    +'<div class="form-group"><label>Stänger (valfritt)</label><input type="datetime-local" id="cs-to" value="'+localDT(c.closes_at)+'"></div>'
    +'<div class="form-group"><label>Årskurser att välja mellan (kommaseparerat)</label><input id="cs-grades" value="'+esc(c.grade_options)+'"></div>'
    +'<div class="form-group"><label>Tröjstorlekar (kommaseparerat)</label><input id="cs-shirts" value="'+esc(c.shirt_sizes)+'"></div>'
    +'<div class="form-group"><label>Information om lägret (visas på anmälningssidan och kan bifogas slutbekräftelsen)</label><textarea id="cs-info" style="min-height:260px;font-family:monospace;font-size:.82rem;">'+esc(c.info_text)+'</textarea><div class="td-m text-sm" style="margin-top:6px;">Skriv <strong>## Rubrik</strong> för en ny ruta, <strong>### Underrubrik</strong>, <strong>- punkt</strong> för punktlista och <strong>09:00 Aktivitet</strong> för schemarader.</div></div>'
    +'<div class="form-group"><label>Avgift och betalning (visas i anmälan och i mailet "din plats är bokad")</label><textarea id="cs-billing">'+esc(c.billing_text)+'</textarea><div class="td-m text-sm" style="margin-top:6px;">T.ex. avgiftens storlek och att betalning sker med Swish.</div></div>'
    +'<div class="form-group"><label>Extra text i mailet "din plats är bokad"</label><textarea id="cs-booked">'+esc(c.booked_text)+'</textarea></div>'
    +'<div class="form-group"><label>Standardtext för slutgiltig bekräftelse</label><textarea id="cs-final" style="min-height:140px;">'+esc(c.final_text||DEFAULT_FINAL)+'</textarea><div class="td-m text-sm" style="margin-top:6px;">Du kan använda {namn}, {inriktning}, {datum} och {camp}.</div></div>'
    +'<div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal()">Avbryt</button><button class="btn btn-primary" id="cs-save">Spara</button></div>');
  el('cs-save').onclick=function(){
    var v=function(i){return el(i).value;};
    var body={config:{title:v('cs-title'),dates_text:v('cs-dates'),intro_text:v('cs-intro'),open:el('cs-open').checked,
      opens_at:v('cs-from')?new Date(v('cs-from')).toISOString():null,closes_at:v('cs-to')?new Date(v('cs-to')).toISOString():null,
      grade_options:v('cs-grades'),shirt_sizes:v('cs-shirts'),billing_text:v('cs-billing'),info_text:v('cs-info'),booked_text:v('cs-booked'),final_text:v('cs-final')}};
    fetch('/api/camp/admin',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(j).then(function(d){
      if(d.error){toast(d.error,'e');return;}closeModal();toast('Sparat');load();
    }).catch(function(){toast('Något gick fel','e');});
  };
};

window.campTracksModal=function(){
  var progs=(typeof DB!=='undefined'&&DB.programs)||[];
  function card(t,i){
    return '<div class="card" style="padding:14px;margin-bottom:10px;background:var(--forest-pale);" data-i="'+i+'">'
      +'<div style="display:grid;grid-template-columns:60px 1fr 80px;gap:8px;margin-bottom:8px;">'
      +'<input class="ct-icon" value="'+esc(t.icon)+'" placeholder="🐴" style="padding:8px;border:1.5px solid var(--border);border-radius:8px;text-align:center;">'
      +'<input class="ct-name" value="'+esc(t.name)+'" placeholder="Namn" style="padding:8px;border:1.5px solid var(--border);border-radius:8px;">'
      +'<input class="ct-cap" type="number" min="0" value="'+esc(t.capacity)+'" title="Antal platser" style="padding:8px;border:1.5px solid var(--border);border-radius:8px;"></div>'
      +'<textarea class="ct-desc" placeholder="Kort beskrivning (visas för eleven)" style="width:100%;padding:8px;border:1.5px solid var(--border);border-radius:8px;min-height:56px;margin-bottom:8px;">'+esc(t.description)+'</textarea>'
      +'<textarea class="ct-gear" placeholder="Utrustning att ta med för den här inriktningen (visas när eleven väljer den och följer med slutbekräftelsen)" style="width:100%;padding:8px;border:1.5px solid var(--border);border-radius:8px;min-height:56px;margin-bottom:8px;">'+esc(t.gear_text)+'</textarea>'
      +'<input class="ct-own" value="'+esc(t.own_animal_text||'')+'" placeholder="Fråga om eget djur, t.ex. Vill du ta med din egen häst? (lämna tomt om frågan inte ska ställas)" style="width:100%;padding:8px;border:1.5px solid var(--border);border-radius:8px;margin-bottom:8px;">'
      +'<select class="ct-prog" style="width:100%;padding:8px;border:1.5px solid var(--border);border-radius:8px;margin-bottom:8px;"><option value="">Ingen lärarkoppling</option>'+progs.map(function(p){return '<option value="'+esc(p.id)+'"'+(t.program_id===p.id?' selected':'')+'>'+esc(p.icon)+' '+esc(p.name)+'</option>';}).join('')+'</select>'
      +'<div style="display:flex;gap:8px;align-items:center;justify-content:space-between;"><label style="font-size:.82rem;display:flex;gap:6px;align-items:center;"><input type="checkbox" class="ct-act"'+(t.active!==false?' checked':'')+'> Visas för eleverna</label>'
      +'<span class="td-m text-sm">'+(t.taken||0)+' anmälda</span>'
      +'<span><button class="btn btn-primary btn-sm ct-save">Spara</button> <button class="btn btn-danger btn-sm ct-del">Ta bort</button></span></div></div>';
  }
  var list=C.tracks.slice();
  showModal('<h3>Inriktningar</h3><p class="modal-sub">Antal platser, beskrivning och vilken lärargrupp som ser anmälningarna. Lärarkopplingen väljer bland programmen i systemet.</p><div id="ct-list">'+list.map(card).join('')+'</div>'
    +'<button class="btn btn-secondary btn-full" id="ct-add">+ Ny inriktning</button><div class="modal-footer"><button class="btn btn-ghost" onclick="closeModal();load_()">Klar</button></div>');
  function bind(root){
    root.querySelectorAll('.ct-save').forEach(function(b){b.onclick=function(){
      var cd=b.closest('[data-i]'),i=+cd.getAttribute('data-i'),t=list[i]||{};
      var body={track:{id:t.id,name:cd.querySelector('.ct-name').value,icon:cd.querySelector('.ct-icon').value,capacity:cd.querySelector('.ct-cap').value,
        description:cd.querySelector('.ct-desc').value,gear_text:cd.querySelector('.ct-gear').value,own_animal_text:cd.querySelector('.ct-own').value,program_id:cd.querySelector('.ct-prog').value||null,active:cd.querySelector('.ct-act').checked,sort:t.sort!=null?t.sort:(i+1)}};
      fetch('/api/camp/admin',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(j).then(function(d){
        if(d.error){toast(d.error,'e');return;}
        list[i]=Object.assign({},list[i],d);cd.setAttribute('data-saved','1');toast('Sparat');
      }).catch(function(){toast('Något gick fel','e');});
    };});
    root.querySelectorAll('.ct-del').forEach(function(b){b.onclick=function(){
      var cd=b.closest('[data-i]'),t=list[+cd.getAttribute('data-i')]||{};
      if(!t.id){cd.remove();return;}
      if(!confirm('Ta bort '+t.name+'? Har den anmälningar döljs den i stället.'))return;
      fetch('/api/camp/admin?track='+encodeURIComponent(t.id),{method:'DELETE'}).then(j).then(function(d){
        if(d.error){toast(d.error,'e');return;}toast(d.hidden?'Har anmälningar – dold i stället':'Borttagen');cd.remove();
      });
    };});
  }
  bind(el('ct-list'));
  el('ct-add').onclick=function(){
    var i=list.length;list.push({name:'',icon:'',capacity:12,description:'',program_id:null,active:true,taken:0,sort:i+1});
    el('ct-list').insertAdjacentHTML('beforeend',card(list[i],i));bind(el('ct-list'));
  };
};
window.load_=function(){load();};
})();
