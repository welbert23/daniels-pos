/* ============================================================
   MODULE: 70-customers.js
   customers
   ============================================================ */
/* ============================================================
   CUSTOMERS
   ============================================================ */
let custQ='';
function renderCustomers(){
  const db=load(),can=CAN.manageStock(me().role);const list=db.customers.filter(c=>!custQ||c.name.toLowerCase().includes(custQ)||c.phone?.includes(custQ));
  $('#content').innerHTML=`
    <div class="toolrow"><div class="search-wrap" style="flex:0 1 280px"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input placeholder="Search customers..." value="${esc(custQ)}" oninput="custQ=this.value.toLowerCase();renderCustomers()"></div>
      <div class="spacer"></div>${can?'<button class="btn btn-sm" onclick="custForm()">+ Add Customer</button>':''}</div>
    <div class="tbl-wrap"><table><tr><th>Customer</th><th>Phone</th><th>Email</th><th>Address</th><th>Spend</th><th>Orders</th><th>Tier</th>${can?'<th style="text-align:right">Actions</th>':''}</tr>
      ${list.length?list.map(c=>{const txs=db.transactions.filter(t=>t.customerId===c.id&&t.status==='completed');const spent=txs.reduce((s,t)=>s+t.total,0);const n=txs.length;const tier=spent>=10000?'PRESTIGE':spent>0?'REGULAR':'NEW';const tp=tier==='PRESTIGE'?'info':tier==='REGULAR'?'ok':'mut';
        return`<tr><td><b>${esc(c.name)}</b></td><td class="num">${esc(c.phone||'—')}</td><td>${esc(c.email||'—')}</td><td>${esc(c.address||'—')}</td><td class="num"><b>PHP ${money0(spent)}</b></td><td class="num">${n}</td><td><span class="pill ${tp}">${tier}</span></td>${can?`<td><div class="act"><button class="icon-btn view" onclick="custHistory('${c.id}')"><svg viewBox="0 0 24 24"><path d="M4 4h16v16H4z M8 8h8M8 12h8M8 16h5"/></svg></button><button class="icon-btn edit" onclick="custForm('${c.id}')"><svg viewBox="0 0 24 24"><path d="M11 4H4v16h16v-7 M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg></button><button class="icon-btn del" onclick="delCust('${c.id}')"><svg viewBox="0 0 24 24"><path d="M3 6h18 M8 6V4h8v2 M6 6l1 14h10l1-14"/></svg></button></div></td>`:'<td></td>'}</tr>`}).join(''):`<tr><td colspan="8" class="card-empty">No customers found</td></tr>`}
    </table></div>`;
}
function custForm(id){const db=load(),c=id?db.customers.find(x=>x.id===id):null;
  openModal(`<h3>${c?'Edit':'Add'} Customer</h3><div class="msub">${c?'Update details':'New customers start as NEW tier.'}</div>
    <div class="field"><label>Name *</label><input id="c_name" value="${esc(c?.name||'')}"></div>
    <div class="row2"><div class="field"><label>Phone</label><input id="c_phone" value="${esc(c?.phone||'')}"></div><div class="field"><label>Email</label><input id="c_email" value="${esc(c?.email||'')}"></div></div>
    <div class="field"><label>Address</label><input id="c_addr" value="${esc(c?.address||'')}"></div>
    <div class="mfoot"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn" onclick="saveCust('${c?c.id:''}')">${c?'Save':'Add'}</button></div>`);
}
function saveCust(id){const name=$('#c_name').value.trim();if(!name)return toast('Name required');const db=load(),before=id?JSON.parse(JSON.stringify(db.customers.find(x=>x.id===id)||{})):null;let cid;if(id){const c=db.customers.find(x=>x.id===id);Object.assign(c,{name,phone:$('#c_phone').value.trim(),email:$('#c_email').value.trim(),address:$('#c_addr').value.trim()});cid=c.id;toast('Updated')}else{const c={id:uid(),name,phone:$('#c_phone').value.trim(),email:$('#c_email').value.trim(),address:$('#c_addr').value.trim(),created:new Date().toISOString()};db.customers.push(c);cid=c.id;toast('Customer added')}save(db);logAction(id?'edit':'add','customer',cid,name,before,db.customers.find(c=>c.id===cid));closeModal();renderCustomers()}
function custHistory(id){const db=load(),c=db.customers.find(x=>x.id===id),txs=db.transactions.filter(t=>t.customerId===id).sort((a,b)=>new Date(b.date)-new Date(a.date)),spent=txs.filter(t=>t.status==='completed').reduce((s,t)=>s+t.total,0);
  openModal(`<h3>${esc(c.name)}</h3><div class="msub">Total: PHP ${money0(spent)} &middot; ${txs.length} transactions</div><div style="max-height:42vh;overflow-y:auto">${txs.length?txs.map(t=>`<div class="ls-row"><div><b>${t.ref}</b><div class="d" style="font-size:10.5px;color:var(--mut2)">${fmtDT(t.date)}</div></div><span class="pill ${t.status==='completed'?'ok':'bad'}">${t.status.toUpperCase()}</span><div class="stk"><b>PHP ${money0(t.total)}</b></div></div>`).join(''):'<div class="card-empty">No purchases</div>'}</div><div class="mfoot"><button class="btn" onclick="closeModal()">Close</button></div>`)}
function delCust(id){const db=load(),c=db.customers.find(x=>x.id===id);openModal(`<h3>Delete Customer?</h3><div class="msub">"${esc(c.name)}" — past transactions are preserved.</div><div class="mfoot"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-danger" onclick="confirmDelCust('${id}')">Delete</button></div>`)}
function confirmDelCust(id){const db=load(),c=db.customers.find(x=>x.id===id),before=c?JSON.parse(JSON.stringify(c)):null;db.customers=db.customers.filter(x=>x.id!==id);save(db);logAction('delete','customer',id,before?.name||id,before);closeModal();renderCustomers();toast('Customer deleted')}

