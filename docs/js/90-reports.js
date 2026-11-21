/* ============================================================
   MODULE: 90-reports.js
   reports
   ============================================================ */
/* ============================================================
   REPORTS
   ============================================================ */
function renderReports(){
  const db=load(),done=db.transactions.filter(t=>t.status==='completed');
  const byItem={};done.forEach(t=>t.items.forEach(i=>{byItem[i.name]=byItem[i.name]||{qty:0,sales:0};byItem[i.name].qty+=i.qty;byItem[i.name].sales+=i.qty*i.price}));
  const best=Object.entries(byItem).sort((a,b)=>b[1].qty-a[1].qty).slice(0,8);
  const topCat=[...new Set(db.items.map(i=>i.category))].map(cat=>{const items=db.items.filter(i=>i.category===cat);return{cat,count:items.length,stock:items.reduce((s,i)=>s+i.stock,0),value:items.reduce((s,i)=>s+i.stock*i.price,0)}}).sort((a,b)=>b.value-a.value);
  const days=[];for(let i=6;i>=0;i--){const d=new Date(Date.now()-i*86400000),key=d.toISOString().slice(0,10);days.push({key,label:d.toLocaleDateString('en-PH',{weekday:'short'}),sum:done.filter(t=>t.date.slice(0,10)===key).reduce((s,t)=>s+t.total,0)})}
  const maxDay=Math.max(1,...days.map(d=>d.sum));
  const grand=done.reduce((s,t)=>s+t.total,0);
  const invValue=db.items.reduce((s,i)=>s+i.stock*i.price,0);
  $('#content').innerHTML=`
    <div class="kpi-row">
      <div class="kpi"><div class="icon" style="background:var(--grad)"><svg viewBox="0 0 24 24"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div><div><b>PHP ${money0(grand)}</b><br><small>Total Sales</small></div></div>
      <div class="kpi"><div class="icon" style="background:linear-gradient(135deg,#0EA5E9,#0284C7)"><svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z M8 8h8M8 12h8M8 16h5"/></svg></div><div><b>${done.length}</b><br><small>Completed Orders</small></div></div>
      <div class="kpi"><div class="icon" style="background:var(--grad-warm)"><svg viewBox="0 0 24 24"><path d="M4 6h16v14H4z M4 6l2-3h12l2 3"/></svg></div><div><b>${db.items.reduce((s,i)=>s+i.stock,0)}</b><br><small>Units in Stock</small></div></div>
      <div class="kpi"><div class="icon" style="background:linear-gradient(135deg,#7C3AED,#6D28D9)"><svg viewBox="0 0 24 24"><path d="M3 3v18h18"/></svg></div><div><b>PHP ${money0(invValue)}</b><br><small>Inventory Value</small></div></div>
    </div>
    <div class="grid-2">
      <div class="card"><h3>7-Day Sales</h3><div class="chart">${days.map(d=>`<div class="bar"><em>PHP ${money0(d.sum)}</em><i style="height:${Math.max(3,(d.sum/maxDay)*100)}%"></i><span>${d.label}</span></div>`).join('')}</div></div>
      <div class="card"><h3>Best Sellers</h3>${best.length?best.map(([n,v],idx)=>`<div class="ls-row"><span class="pill mut" style="min-width:22px;justify-content:center">${idx+1}</span><b style="min-width:0;flex:1">${esc(n)}</b><div class="stk">${v.qty} sold</div><div class="stk"><b>PHP ${money0(v.sales)}</b></div></div>`).join(''):'<div class="card-empty">No data yet</div>'}</div>
    </div>
    <div class="card" style="margin-top:16px"><h3>Menu by Category</h3><table><tr><th>Category</th><th>Items</th><th>Units</th><th>Value</th><th>Share</th></tr>
      ${topCat.map(c=>`<tr><td><b>${c.cat}</b></td><td class="num">${c.count}</td><td class="num">${c.stock}</td><td class="num"><b>PHP ${money0(c.value)}</b></td><td style="width:120px"><div class="ls-row" style="border:none;padding:0"><div class="bar" style="flex:1"><i style="width:${db.items.length?(c.count/db.items.length*100):0}%;background:var(--grad)"></i></div></div></td></tr>`).join('')}
    </table></div>`;
}

