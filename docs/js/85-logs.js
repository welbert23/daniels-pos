/* ============================================================
   MODULE: 85-logs.js
   activity log / audit viewer
   ============================================================ */
/* ============================================================
   ACTIVITY LOG (audit trail)
   ============================================================ */
let _logsCache=[],logQ='',logFilter='All';
function fmtLogTs(s){
  if(!s)return '';
  const m=String(s).match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if(!m)return s;
  const mos=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  let h=+m[4];const ap=h>=12?'PM':'AM';h=h%12||12;
  return `${mos[+m[2]-1]} ${+m[3]}, ${m[1]} · ${h}:${m[5]} ${ap}`;
}
async function renderLogs(){
  $('#content').innerHTML='<div class="card"><div class="card-empty">Loading activity log…</div></div>';
  try{
    const j=await(await fetch(API+'?action=logs&limit=500',{cache:'no-store'})).json();
    if(!j.ok)throw new Error(j.error||'Cannot load logs');
    _logsCache=j.logs||[];
    const rows=_logsCache.filter(l=>(logFilter==='All'||l.action===logFilter)&&(!logQ||[l.actor_name,l.actor_username,l.entity,l.summary,l.action].some(v=>String(v||'').toLowerCase().includes(logQ))));
    const pc=a=>a==='delete'?'bad':a==='edit'?'info':a==='stock'?'ok':a==='void'?'warn':'mut';
    $('#content').innerHTML=`
      <div class="toolrow">
        <div class="search-wrap" style="flex:0 1 300px"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input placeholder="Search user, module, action..." value="${esc(logQ)}" oninput="logQ=this.value.toLowerCase();renderLogs()"></div>
        ${['All','add','edit','delete','stock','void','category'].map(f=>`<div class="cat-pill ${logFilter===f?'active':''}" onclick="logFilter='${f}';renderLogs()">${f==='All'?'All':f.toUpperCase()}</div>`).join('')}
        <div class="spacer"></div><button class="btn btn-ghost btn-sm" onclick="renderLogs()">↻ Refresh</button>
      </div>
      <div class="card"><h3>Activity Log <span class="grow"></span><small>${rows.length} entries</small></h3>
        <div class="tbl-wrap"><table><tr><th>When</th><th>User</th><th>Role</th><th>Action</th><th>Module</th><th>Details</th><th></th></tr>
          ${rows.length?rows.map(l=>`<tr><td class="num" style="white-space:nowrap" title="${esc(l.ts)}">${esc(fmtLogTs(l.ts))}</td><td><b>${esc(l.actor_name||'Unknown')}</b><small style="display:block;color:var(--mut2);font-size:9.5px">@${esc(l.actor_username||'—')}</small></td><td>${esc(l.actor_role||'—')}</td><td><span class="pill ${pc(l.action)}">${esc(l.action.toUpperCase())}</span></td><td>${esc(l.entity)}</td><td style="max-width:340px">${esc(l.summary)}</td><td>${(l.before_json||l.after_json)?`<button class="icon-btn view" title="View changes" onclick="viewLog(${l.id})"><svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>`:''}</td></tr>`).join(''):'<tr><td colspan="7" class="card-empty">No activity recorded yet</td></tr>'}
        </table></div></div>`;
  }catch(e){$('#content').innerHTML=`<div class="card"><div class="card-empty">Cannot load activity log — ${esc(e.message)}</div></div>`}
}
function viewLog(id){
  const l=_logsCache.find(x=>x.id===id);if(!l)return;
  const pretty=s=>{try{return JSON.stringify(JSON.parse(s),null,2)}catch(e){return s||'—'}};
  openModal(`<h3>${esc(l.action.toUpperCase())} · ${esc(l.entity)}</h3><div class="msub">${esc(l.actor_name)} (${esc(l.actor_role)}) &middot; <span title="${esc(l.ts)}">${esc(fmtLogTs(l.ts))}</span><br>${esc(l.summary)}</div>
    <div style="font-size:10px;font-weight:800;letter-spacing:.06em;color:var(--mut2);margin:10px 0 4px">BEFORE</div><pre style="max-height:24vh;overflow:auto;background:var(--bg);border:2px solid var(--border);border-radius:10px;padding:10px;font-size:10px">${esc(pretty(l.before_json))}</pre>
    <div style="font-size:10px;font-weight:800;letter-spacing:.06em;color:var(--mut2);margin:10px 0 4px">AFTER</div><pre style="max-height:24vh;overflow:auto;background:var(--bg);border:2px solid var(--border);border-radius:10px;padding:10px;font-size:10px">${esc(pretty(l.after_json))}</pre>
    <div class="mfoot"><button class="btn" onclick="closeModal()">Close</button></div>`,true);
}

