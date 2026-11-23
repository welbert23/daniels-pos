/* ============================================================
   MODULE: 80-attendance.js
   attendance + 2-week schedules
   ============================================================ */
/* ============================================================
   ATTENDANCE — time in / out, schedules, late / absent detection
   ============================================================ */
const PUNCH_LABEL={time_in:'TIME IN',lunch_out:'LUNCH OUT',lunch_in:'LUNCH IN',coffee_out:'COFFEE OUT',coffee_in:'COFFEE IN',time_out:'TIME OUT'};
const ATT_STATUS={in:'ON DUTY',lunch:'LUNCH BREAK',back:'BACK FROM LUNCH',coffee:'COFFEE BREAK',back2:'BACK FROM COFFEE',done:'DUTY DONE'};
const ATT_SHORT={in:'IN',lunch:'LUNCH',back:'BACK',coffee:'COFFEE',back2:'BACK',done:'DONE'};
const DAY_LIST=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const SCHEDULABLE=r=>r==='cashier'||r==='inventory';
let attDate=todayStr(),_schedCache={};
function localStamp(){const d=new Date(),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`}
function fmtClock(s){const m=String(s||'').match(/(\d{2}):(\d{2})/);if(!m)return '—';let h=+m[1];const ap=h>=12?'PM':'AM';h=h%12||12;return `${h}:${m[2]} ${ap}`}
function fmtShortClock(s){const m=String(s||'').match(/(\d{2}):(\d{2})/);return m?`${m[1]}:${m[2]}`:'—'}
function attMins(a,b){if(!a||!b)return null;const x=Date.parse(String(a).replace(' ','T')),y=Date.parse(String(b).replace(' ','T'));return isNaN(x)||isNaN(y)?null:Math.max(0,Math.round((y-x)/60000))}
function fmtDur(m){if(m==null)return '—';const h=Math.floor(m/60),mm=m%60;return h?`${h}h ${String(mm).padStart(2,'0')}m`:`${mm}m`}
function attBreaks(r){return{lunch:attMins(r?.lunch_out,r?.lunch_in),coffee:attMins(r?.coffee_out,r?.coffee_in)}}
function dayOfWeek(dateStr){return DAY_LIST[(new Date(dateStr+'T12:00:00').getDay()+6)%7]}
function isoWeek(dateStr){
  const d=new Date(dateStr+'T12:00:00Z'),shift=(d.getUTCDay()+6)%7;
  d.setUTCDate(d.getUTCDate()-shift+3);
  const first=new Date(Date.UTC(d.getUTCFullYear(),0,4)),fs=(first.getUTCDay()+6)%7;
  first.setUTCDate(first.getUTCDate()-fs+3);
  return 1+Math.round((d-first)/604800000);
}
function schedWeek(dateStr){return isoWeek(dateStr)%2===1?1:2}
function minsOfClock(v){const m=String(v||'').match(/^(\d{1,2}):(\d{2})/);return m?(+m[1]*60+ +m[2]):null}
function minsOfStamp(v){const m=String(v||'').match(/(\d{2}):(\d{2})/);return m?(+m[1]*60+ +m[2]):null}
function attFlag(row,sch,day,week){
  if(!sch)return{lb:'NO SCHEDULE',st:'mut',note:'No schedule set'};
  const activeDays=String((week===2?(sch.days2||sch.days):sch.days)||'').split(',');
  if(!activeDays.includes(day))return{lb:'DAY OFF',st:'mut',note:'Not scheduled for today (Week '+week+')'};
  const start=minsOfClock(sch.start_time),end=minsOfClock(sch.end_time),grace=Number(sch.grace_min||0);
  if(!row||!row.time_in)return{lb:'ABSENT',st:'bad',note:'No TIME IN on the scheduled day'};
  const tin=minsOfStamp(row.time_in),late=(tin==null||start==null)?null:tin-(start+grace);
  const tout=minsOfStamp(row.time_out),under=(tout==null||end==null)?null:end-tout;
  if(late!=null&&late>0)return{lb:'LATE '+late+'m',st:'bad',note:(under>0?'Undertime '+under+'m · ':'')+'Expected '+fmtClock(sch.start_time)};
  if(under!=null&&under>0)return{lb:'UNDERTIME '+under+'m',st:'warn',note:'Time out before '+fmtClock(sch.end_time)};
  return{lb:'ON TIME',st:'ok',note:'Within schedule'};
}
function attNext(r){
  if(!r||!r.time_in)return['time_in'];
  if(r.status==='in')return['lunch_out','time_out'];
  if(r.status==='lunch')return['lunch_in'];
  if(r.status==='back')return['coffee_out','time_out'];
  if(r.status==='coffee')return['coffee_in'];
  if(r.status==='back2')return['time_out'];
  return[];
}
async function renderAttendance(){
  $('#content').innerHTML='<div class="card"><div class="card-empty">Loading attendance…</div></div>';
  try{
    const [ar,sr]=await Promise.all([
      apiFetch('attendance&date='+encodeURIComponent(attDate)),
      apiFetch('schedules'),
    ]);
    const j=await ar.json(),sj=await sr.json();
    if(!j.ok)throw new Error(j.error||'Cannot load attendance');
    _schedCache=Object.fromEntries((sj.rows||[]).map(s=>[s.user_id,s]));
    const me=session()||{},day=dayOfWeek(attDate),week=schedWeek(attDate),byUser={};
    (j.rows||[]).forEach(r=>{byUser[r.user_id]=r});
    const known=(DB.users||[]).map(u=>({id:u.id,name:u.name,username:u.username,role:u.role}));
    (j.rows||[]).forEach(r=>{if(!known.some(u=>u.id===r.user_id))known.push({id:r.user_id,name:r.name,username:r.username,role:r.role})});
    const view=known.map(u=>{const r=byUser[u.id]||null,sc=_schedCache[u.id]||null;return{u,r,s:sc,f:attFlag(r,sc,day,week)}});
    const mine=view.find(v=>v.u.id===me.id)||null,row=mine?.r||null,next=attNext(row),bk=attBreaks(row);
    const total=row?.time_in&&row?.time_out?attMins(row.time_in,row.time_out)-(bk.lunch||0)-(bk.coffee||0):null;
    const cells=[['TIME IN',row?.time_in],['LUNCH OUT',row?.lunch_out],['LUNCH IN',row?.lunch_in],['COFFEE OUT',row?.coffee_out],['COFFEE IN',row?.coffee_in],['TIME OUT',row?.time_out]];
    $('#content').innerHTML=`
      <div class="toolrow"><div><b style="font-size:13px">${esc(attDate)} · ${esc(day)} · Week ${week}</b></div><div class="spacer"></div>
        <input type="date" value="${esc(attDate)}" onchange="attDate=this.value;renderAttendance()" style="padding:8px;border:2px solid var(--border);border-radius:10px;font-weight:700;background:var(--surface)">
        ${CAN.manageSchedules(me.role)?'<button class="btn btn-ghost btn-sm" onclick="scheduleList()">⚙ Schedules</button>':''}
        <button class="btn btn-ghost btn-sm" onclick="renderAttendance()">↻ Refresh</button></div>
      <div class="card" style="margin-bottom:12px;padding:10px 14px;font-size:10px;line-height:1.6;color:var(--mut2)">
        <b style="color:var(--ink)">LEGEND:</b> ON TIME = time in &le; start + grace &middot; LATE = after start + grace &middot; ABSENT = no TIME IN even if scheduled &middot; UNDERTIME = time out before end &middot; DAY OFF = not scheduled<br>
        <b style="color:var(--ink)">2-WEEK CYCLE:</b> Week 1 = odd ISO weeks, Week 2 = even ISO weeks. The 'Sched' column shows the current week.
      </div>
      <div class="card" style="margin-bottom:14px"><h3>My Attendance <span class="grow"></span><span class="pill ${row?.status==='done'?'ok':'info'}">${esc(ATT_STATUS[row?.status]||'NOT YET TIME IN')}</span> ${mine?`<span class="pill ${mine.f.st}" title="${esc(mine.f.note)}">${esc(mine.f.lb)}</span>`:''}</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:9px">
          ${cells.map(([lb,v])=>`<div style="border:2px solid var(--border);border-radius:11px;padding:10px;background:var(--surface)"><div style="font-size:9px;font-weight:800;letter-spacing:.07em;color:var(--mut2)">${lb}</div><div style="font-size:17px;font-weight:800;margin-top:3px">${esc(fmtClock(v))}</div></div>`).join('')}
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:13px">
          ${next.length?next.map(k=>`<button class="btn ${k==='time_out'?'btn-ghost':''}" onclick="punch('${k}')">${PUNCH_LABEL[k]}</button>`).join(''):'<span class="pill ok">Duty complete for this day</span>'}
        </div>
        <div style="margin-top:10px;font-size:10px;color:var(--mut2);font-family:var(--font-m)">LUNCH ${fmtDur(bk.lunch)} &middot; COFFEE ${fmtDur(bk.coffee)} &middot; NET ${fmtDur(total)}</div>
      </div>
      <div class="card"><h3>All Users <span class="grow"></span><small>${view.length} users</small></h3>
        <div class="tbl-wrap tbl-wide"><table><tr><th>User</th><th>Role</th><th>Sched</th><th title="Expected hours">Hours</th><th title="Time In">In</th><th title="Lunch Out">L-Out</th><th title="Lunch In">L-In</th><th title="Coffee Out">C-Out</th><th title="Coffee In">C-In</th><th title="Time Out">Out</th><th>Lunch</th><th>Coffee</th><th>Net</th><th>State</th><th>Flag</th></tr>
          ${view.length?view.map(v=>{const r=v.r,b=attBreaks(r),net=r?.time_in&&r?.time_out?attMins(r.time_in,r.time_out)-(b.lunch||0)-(b.coffee||0):null;return`<tr><td><b>${esc(v.u.name)}</b><small style="display:block;color:var(--mut2);font-size:9px">@${esc(v.u.username)}</small></td><td>${esc(v.u.role)}</td><td style="font-size:9px;white-space:normal">${v.s?esc(String(week===2?(v.s.days2||v.s.days):v.s.days).replace(/,/g,' ')):'<span style="color:var(--mut2)">—</span>'}</td><td class="num" style="white-space:nowrap">${v.s?esc(fmtShortClock(v.s.start_time))+'–'+esc(fmtShortClock(v.s.end_time)):'—'}</td><td class="num">${esc(fmtShortClock(r?.time_in))}</td><td class="num">${esc(fmtShortClock(r?.lunch_out))}</td><td class="num">${esc(fmtShortClock(r?.lunch_in))}</td><td class="num">${esc(fmtShortClock(r?.coffee_out))}</td><td class="num">${esc(fmtShortClock(r?.coffee_in))}</td><td class="num">${esc(fmtShortClock(r?.time_out))}</td><td class="num">${fmtDur(b.lunch)}</td><td class="num">${fmtDur(b.coffee)}</td><td class="num"><b>${fmtDur(net)}</b></td><td><span class="pill ${r?.status==='done'?'ok':'info'}" title="${esc(ATT_STATUS[r?.status]||'NOT YET TIME IN')}">${esc(ATT_SHORT[r?.status]||'—')}</span></td><td><span class="pill ${v.f.st}" title="${esc(v.f.note)}">${esc(v.f.lb)}</span></td></tr>`}).join(''):'<tr><td colspan="15" class="card-empty">No users found</td></tr>'}
        </table></div></div>`;
  }catch(e){$('#content').innerHTML=`<div class="card"><div class="card-empty">Cannot load attendance — ${esc(e.message)}</div></div>`}
}
async function punch(type){
  const s=session()||{},u=(DB.users||[]).find(x=>x.id===s.id)||s;
  try{
    const j=await(await apiFetch('punch',{method:'POST',body:JSON.stringify({type,ts:localStamp(),user_id:u.id,username:u.username||'',name:u.name||'',role:u.role||''})})).json();
    if(!j.ok)return toast(j.error||'Punch failed');
    logAction('punch','attendance',j.row.id,PUNCH_LABEL[type]+' · '+(u.name||''));
    toast(PUNCH_LABEL[type]+' recorded — '+fmtClock(j.row[type]));
    renderAttendance();
  }catch(e){toast('Cannot record punch — '+e.message)}
}
function scheduleList(){
  const me=session()||{};if(!CAN.manageSchedules(me.role))return toast('Superadmin / Client only');
  openModal(`<h3>Employee Schedules</h3><div class="msub">Only Cashier and Inventory can be scheduled. Set expected days and duty hours. LATE = TIME IN after start + grace. ABSENT = no TIME IN on a scheduled day.</div>
    <div class="tbl-wrap tbl-compact"><table><tr><th>User</th><th>Days (W1 / W2)</th><th>Hours</th><th>Grace</th><th></th></tr>
      ${(DB.users||[]).filter(u=>SCHEDULABLE(u.role)).map(u=>{const s=_schedCache[u.id];const d1=s?String(s.days).replace(/,/g,' '):'Not set',d2=s?String(s.days2||s.days).replace(/,/g,' '):'—';return`<tr><td><b>${esc(u.name)}</b><small style="display:block;color:var(--mut2);font-size:9px">@${esc(u.username)} · ${esc(ROLE_LABEL[u.role]||u.role)}</small></td><td style="font-size:9.5px;line-height:1.5"><span style="color:var(--mut2)">W1</span> ${esc(d1)}<br><span style="color:var(--mut2)">W2</span> ${esc(d2)}</td><td class="num">${s?esc(fmtClock(s.start_time))+'–'+esc(fmtClock(s.end_time)):'—'}</td><td class="num">${s?s.grace_min+'m':'—'}</td><td><button class="icon-btn edit" onclick="scheduleForm('${u.id}')" title="Edit schedule"><svg viewBox="0 0 24 24"><path d="M11 4H4v16h16v-7 M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg></button></td></tr>`}).join('')}
    </table></div><div class="mfoot"><button class="btn" onclick="closeModal()">Done</button></div>`,true);
}
function scheduleForm(id){
  const u=(DB.users||[]).find(x=>x.id===id);if(!u)return;
  if(!SCHEDULABLE(u.role))return toast('Only Cashier and Inventory can be scheduled');
  const s=_schedCache[id]||{},days=String(s.days||'Mon,Tue,Wed,Thu,Fri').split(','),days2=String(s.days2||s.days||'Mon,Tue,Wed,Thu,Fri').split(',');
  const dayBox=(prefix,picked)=>`<div style="display:flex;gap:6px;flex-wrap:wrap">${DAY_LIST.map(d=>`<label class="cat-pill day-check ${picked.includes(d)?'active':''}"><input type="checkbox" id="${prefix}_${d}" value="${d}" ${picked.includes(d)?'checked':''} onchange="this.parentElement.classList.toggle('active',this.checked)">${d}</label>`).join('')}</div>`;
  openModal(`<h3>Schedule · ${esc(u.name)}</h3><div class="msub">@${esc(u.username)} · ${esc(ROLE_LABEL[u.role]||u.role)} · 2-week cycle</div>
    <div class="field"><label>Week 1 — odd weeks</label>${dayBox('sch_w1_day',days)}</div>
    <div class="field"><label>Week 2 — even weeks</label>${dayBox('sch_w2_day',days2)}<div style="font-size:9px;color:var(--mut2);margin-top:5px">If nothing is selected, Week 1 will be used.</div></div>
    <div class="row2"><div class="field"><label>Time In</label><input type="time" id="sch_start" value="${esc(s.start_time||'08:00')}"></div><div class="field"><label>Time Out</label><input type="time" id="sch_end" value="${esc(s.end_time||'17:00')}"></div></div>
    <div class="field"><label>Grace period (minutes)</label><input type="number" id="sch_grace" min="0" max="240" value="${s.grace_min??10}"></div>
    <div class="mfoot"><button class="btn btn-ghost" onclick="scheduleList()">← Back</button><button class="btn" onclick="saveSchedule('${id}')">Save schedule</button></div>`,true);
}
async function saveSchedule(id){
  const u=(DB.users||[]).find(x=>x.id===id);if(!u)return;
  if(!SCHEDULABLE(u.role))return toast('Only Cashier and Inventory can be scheduled');
  const days=DAY_LIST.filter(d=>$('#sch_w1_day_'+d)?.checked);
  const days2=DAY_LIST.filter(d=>$('#sch_w2_day_'+d)?.checked);
  if(!days.length)return toast('Select at least one day in Week 1');
  const start=$('#sch_start').value,end=$('#sch_end').value,grace=Number($('#sch_grace').value||0);
  if(!start||!end)return toast('Time in and time out are required');
  try{
    const j=await(await apiFetch('schedule-save',{method:'POST',body:JSON.stringify({user_id:id,days,days2,start_time:start,end_time:end,grace_min:grace})})).json();
    if(!j.ok)return toast(j.error||'Cannot save schedule');
    const before=_schedCache[id]?JSON.parse(JSON.stringify(_schedCache[id])):null;
    _schedCache[id]=j.row;
    logAction('edit','schedule',id,u.name+' · W1:'+days.join(',')+' · W2:'+(days2.length?days2.join(','):'same')+' · '+fmtClock(start)+'–'+fmtClock(end),before,j.row);
    closeModal();renderAttendance();toast('Schedule saved — '+u.name);
  }catch(e){toast('Cannot save schedule — '+e.message)}
}

