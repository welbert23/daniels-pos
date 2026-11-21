/* ============================================================
   MODULE: 60-sales.js
   sales history + void
   ============================================================ */
/* ============================================================
   SALES HISTORY
   ============================================================ */
let salesFilter='all',salesQ='';
function renderSales(){
  const db=load(),srvOps=CAN.salesOps(me().role);let list=[...db.transactions].sort((a,b)=>new Date(b.date)-new Date(a.date));
  if(salesFilter==='today')list=list.filter(t=>t.date.slice(0,10)===todayStr());
  else if(salesFilter!=='all')list=list.filter(t=>t.status===salesFilter);
  if(salesQ)list=list.filter(t=>t.ref.toLowerCase().includes(salesQ)||(t.customer||'').toLowerCase().includes(salesQ));
  const done=db.transactions.filter(t=>t.status==='completed');
  const todaySales=done.filter(t=>t.date.slice(0,10)===todayStr()).reduce((s,t)=>s+t.total,0);
  $('#content').innerHTML=`
    <div class="kpi-row">
      <div class="kpi"><div class="icon" style="background:var(--grad)"><svg viewBox="0 0 24 24"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div><div><b>PHP ${money0(todaySales)}</b><br><small>Today's Completed</small></div></div>
      <div class="kpi"><div class="icon" style="background:linear-gradient(135deg,#0EA5E9,#0284C7)"><svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z M4 9h16"/></svg></div><div><b>${db.transactions.length}</b><br><small>Total Orders</small></div></div>
      <div class="kpi"><div class="icon" style="background:var(--grad-warm)"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></div><div><b>${db.transactions.filter(t=>t.status==='cancelled').length}</b><br><small>Cancelled</small></div></div>
      <div class="kpi"><div class="icon" style="background:linear-gradient(135deg,#7C3AED,#6D28D9)"><svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M19 8v6 M22 11h-6"/></svg></div><div><b>${new Set(db.transactions.map(t=>cashierName(t,db))).size}</b><br><small>Cashiers</small></div></div>
    </div>
    <div class="toolrow"><div class="search-wrap" style="flex:0 1 280px"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input placeholder="Search ref or customer..." value="${esc(salesQ)}" oninput="salesQ=this.value.toLowerCase();renderSales()"></div>
      ${[['all','All'],['today','Today'],['completed','Completed'],['cancelled','Cancelled']].map(([k,l])=>`<div class="cat-pill ${salesFilter===k?'active':''}" onclick="salesFilter='${k}';renderSales()">${l}</div>`).join('')}
      <div class="spacer"></div>${srvOps?'<button class="btn btn-ghost btn-sm" onclick="exportSalesCSV()">Export CSV</button>':''}
    </div>
    <div class="tbl-wrap"><table><tr><th>Ref</th><th>Date</th><th>Cashier</th><th>Customer</th><th>Order</th><th>Items</th><th>Total</th><th>Status</th><th style="text-align:right">Actions</th></tr>
      ${list.length?list.map(t=>`<tr><td><b>${t.ref}</b></td><td class="num">${fmtDT(t.date)}</td><td>${esc(cashierName(t,db))}</td><td>${esc(t.customer||'Walk-in')}</td><td><span class="pill info">${esc(t.orderType||'Dine-in')}</span></td><td class="num">${t.items.reduce((s,i)=>s+i.qty,0)}</td><td class="num"><b>PHP ${money0(t.total)}</b></td><td><span class="pill ${t.status==='completed'?'ok':'bad'}">${t.status.toUpperCase()}</span></td><td><div class="act"><button class="icon-btn view" onclick="viewSale('${t.id}')"><svg viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg></button>${srvOps&&t.status==='completed'?`<button class="icon-btn del" onclick="voidSale('${t.id}')" title="Void"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button>`:''}</div></td></tr>`).join(''):`<tr><td colspan="9" class="card-empty">No orders found</td></tr>`}
    </table></div>`;
}
function viewSale(id){const db=load(),t=db.transactions.find(x=>x.id===id);if(t)showReceiptModal(t)}
function voidSale(id){const db=load(),t=db.transactions.find(x=>x.id===id);openModal(`<h3>Void this order?</h3><div class="msub">${t.ref} &middot; PHP ${money0(t.total)} by ${esc(cashierName(t,db))}. Food is already prepared — menu and ingredient stocks are NOT returned; only this sale is removed from totals.</div><div class="mfoot"><button class="btn btn-ghost" onclick="closeModal()">Keep</button><button class="btn btn-danger" onclick="confirmVoid('${id}')">Void Order</button></div>`)}
function confirmVoid(id){const db=load(),t=db.transactions.find(x=>x.id===id),before={status:t.status,total:t.total};t.status='cancelled';save(db);logAction('void','transaction',id,t.ref+' · PHP '+money0(t.total),before,{status:t.status,total:t.total});closeModal();renderSales();toast('Order voided — no stock returned')}
function exportSalesCSV(){const db=load();const rows=[['Ref','Date','Cashier','Customer','OrderType','Items','Total','Status']];db.transactions.forEach(t=>rows.push([t.ref,t.date,cashierName(t,db),t.customer||'Walk-in',t.orderType||'Dine-in',t.items.reduce((s,i)=>s+i.qty,0),t.total,t.status]));const csv=rows.map(r=>r.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv'}));a.download='sales-'+todayStr()+'.csv';a.click();toast('CSV exported')}

