/* ============================================================
   MODULE: 20-dashboard.js
   dashboard
   ============================================================ */
/* ============================================================
   DASHBOARD
   ============================================================ */
function renderDashboard(){
  const db=load(),meU=me(),ty=todayStr();
  const done=db.transactions.filter(t=>t.status==='completed');
  const todayTxs=done.filter(t=>t.date.slice(0,10)===ty);
  const todaySales=todayTxs.reduce((s,t)=>s+t.total,0);
  const low=db.items.filter(i=>i.stock>0&&i.stock<=i.minStock);
  const out=db.items.filter(i=>i.stock<=0);
  const ingLow=db.ingredients.filter(g=>g.stock>0&&g.stock<=g.minStock);
  const ingOut=db.ingredients.filter(g=>g.stock<=0);
  const ingBad=db.ingredients.filter(g=>g.expiry&&expStatus(g.expiry)&&expStatus(g.expiry).st==='bad');
  const ingSoon=db.ingredients.filter(g=>g.expiry&&expStatus(g.expiry)&&expStatus(g.expiry).st==='warn'&&!ingBad.includes(g));
  const alerts=[
    ...out.map(i=>({t:i.name,sub:'Menu · no stock',pill:'OUT',cls:'bad'})),
    ...low.map(i=>({t:i.name,sub:'Menu · '+i.stock+' left',pill:'LOW',cls:'warn',pct:i.minStock?Math.min(100,100*i.stock/i.minStock):10})),
    ...ingOut.map(g=>({t:g.name,sub:'Ingredient · '+g.unit,pill:'OUT',cls:'bad'})),
    ...ingLow.map(g=>({t:g.name,sub:'Ingredient · '+qty(g.stock)+' '+g.unit+' left',pill:'LOW',cls:'warn',pct:g.minStock?Math.min(100,100*g.stock/g.minStock):10})),
    ...ingBad.map(g=>({t:g.name,sub:'Ingredient · expires '+fmtD(g.expiry),pill:'EXPIRED',cls:'bad'})),
    ...ingSoon.map(g=>({t:g.name,sub:'Ingredient · expires '+fmtD(g.expiry),pill:'EXP SOON',cls:'warn'})),
  ];
  const recent=[...done].sort((a,b)=>new Date(b.date)-new Date(a.date)).slice(0,5);
  const greeting=new Date().getHours()<12?'Good morning':new Date().getHours()<17?'Good afternoon':'Good evening';
  const now=new Date();

  $('#content').innerHTML=`
    <div class="welcome"><h2>${greeting}, ${esc(meU.name?.split(' ')[0]||'there')}</h2><small>${now.toLocaleDateString('en-PH',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</small></div>
    <div class="kpi-row">
      <div class="kpi"><div class="icon" style="background:var(--grad)"><svg viewBox="0 0 24 24"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div><div><b>PHP ${money0(todaySales)}</b><br><small>Today's Sales</small></div></div>
      <div class="kpi"><div class="icon" style="background:linear-gradient(135deg,#0EA5E9,#0284C7)"><svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z M4 9h16 M9 4v5 M15 4v5"/></svg></div><div><b>${todayTxs.length}</b><br><small>Transactions Today</small></div></div>
      <div class="kpi"><div class="icon" style="background:var(--grad-warm)"><svg viewBox="0 0 24 24"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.27 6.96 12 12.01l8.73-5.05"/><path d="M12 22.08V12"/></svg></div><div><b>${low.length+out.length+ingLow.length+ingOut.length}</b><br><small>Low / Out of Stock</small></div></div>
      <div class="kpi"><div class="icon" style="background:linear-gradient(135deg,#7C3AED,#6D28D9)"><svg viewBox="0 0 24 24"><path d="M4 3h16v18H4z M8 7h8M8 11h8M8 15h5"/></svg></div><div><b>${db.items.length}</b><br><small>Menu Items</small></div></div>
    </div>
    <div class="grid-2">
      <div class="card"><h3>Low Stock Alert <span class="grow"></span></h3>
        ${alerts.length?alerts.map(a=>`<div class="ls-row"><b>${esc(a.t)}</b><span class="d" style="flex:1;font-size:10px;color:var(--mut2)">${a.sub}</span>${a.pct!=null?`<div class="bar"><i style="width:${a.pct}%;background:var(--accent)"></i></div>`:''}<div class="stk"><span class="pill ${a.cls}">${a.pill}</span></div></div>`).join(''):'<div class="card-empty">All items well stocked</div>'}
      </div>
      <div class="card"><h3>Recent Sales <span class="grow"></span><button class="btn btn-ghost btn-xs" onclick="go('sales')">View all</button></h3>
        ${recent.length?recent.map(t=>`<div class="recent-row"><div><b>${t.ref}</b><div class="d">${fmtDT(t.date)}</div></div><span class="pill ${t.status==='completed'?'ok':'bad'}">${t.status.toUpperCase()}</span><div class="tot">PHP ${money0(t.total)}</div></div>`).join(''):'<div class="card-empty">No sales yet</div>'}
      </div>
    </div>`;
}

