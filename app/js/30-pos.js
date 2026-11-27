/* ============================================================
   MODULE: 30-pos.js
   point of sale + FEFO deduction
   ============================================================ */
/* ============================================================
   POS
   ============================================================ */
let cart=[],cartSeq=0,cartDiscount=0,cartCustomer='',cartNote='',cartNoteH='',orderType='Dine-in',catFilter='All',posQ='',custSearchQuery='',custPopupOpen=false;
function cartTotals(){const sub=cart.reduce((s,c)=>s+c.price*c.qty,0);let disc=Math.round(sub*cartDiscount*100)/100;if(disc>sub)disc=sub;return{sub,disc,total:Math.round((sub-disc)*100)/100}}
function renderPOS(){
  const db=load(),items=db.items.filter(i=>i.stock>0);
  const catCounts={};items.forEach(i=>{catCounts[i.category]=(catCounts[i.category]||0)+1});
  catCounts['All']=items.length;
  const f=items.filter(i=>(catFilter==='All'||i.category===catFilter)&&(!posQ||i.name.toLowerCase().includes(posQ)));
  $('#content').innerHTML=`
    <div class="pos-wrap">
      <div class="pos-left">
        <div class="pos-search">
          <div class="search-wrap"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input id="posSearch" placeholder="Search menu..." value="${esc(posQ)}" oninput="posQ=this.value.toLowerCase();renderPOS()"></div>
        </div>
        <div class="cat-row">${itemCats().map(c=>{const col=c==='All'?'var(--brand)':catColor(c),on=catFilter===c;return`<div class="cat-pill ${on?'active':''}" style="${on?`background:${col};color:#FFFDF5;`:''}" onclick="catFilter='${esc(c).replace(/'/g,"\\'")}';renderPOS()"><span class="cdot" style="background:${col}"></span>${esc(c)} <span class="cnt">${catCounts[c]||0}</span></div>`}).join('')}</div>
        <div class="plist">${f.length?f.map(i=>{
          const col=catColor(i.category);
          return`<div class="pcard ${i.stock===0?'out':''}" onclick="${i.stock>0?`addCart('${i.id}')`:''}">
            <div class="accent-bar" style="background:${col}"></div>
            ${i.stock===0?'<div class="badge out">OUT</div>':i.stock<=i.minStock?'<div class="badge low">LOW</div>':''}
            <div class="body">
              <div class="pname">${esc(i.name)}</div>${catFilter!=='All'?`<div class="pcat">${esc(i.category)}</div>`:''}
              <div class="pprice">PHP ${money0(i.price)}</div><div class="pstock">${i.stock} in stock</div>
            </div>
          </div>`;}).join(''):'<div class="card-empty">No items found</div>'}
        </div>
      </div>
      <div class="cart">
        <div class="cart-head"><h4>Current Sale</h4><span class="cnt">${cart.reduce((s,c)=>s+c.qty,0)} items</span><button class="clear" onclick="clearCart()">CLEAR</button></div>
        <div class="cart-body" id="cartBody"></div>
        <div class="cart-foot" id="cartFoot"></div>
      </div>
    </div>`;
  renderCart();
}
function addCart(id){if(!CAN.usePOS(me().role))return toast('No POS access');const db=load(),it=db.items.find(i=>i.id===id);if(!it||it.stock<=0)return toast('Out of stock');const has=cart.find(c=>c.id===id);if(has){if(has.qty+1>it.stock)return toast('Only '+it.stock+' available');has.qty++;has.seq=++cartSeq}else cart.push({id,name:it.name,price:it.price,qty:1,seq:++cartSeq});renderCart()}
function setQty(id,d){const db=load(),c=cart.find(x=>x.id===id),it=db.items.find(i=>i.id===id);if(!c)return;c.qty+=d;if(c.qty<=0)cart=cart.filter(x=>x.id!==id);else if(it&&c.qty>it.stock){c.qty=it.stock;toast('Max stock: '+it.stock)}renderCart()}
function rmCart(id){cart=cart.filter(x=>x.id!==id);renderCart()}
function clearCart(){cart=[];cartSeq=0;cartDiscount=0;cartCustomer='';cartNote='';cartNoteH='';custSearchQuery='';custPopupOpen=false;renderCart()}
function renderCart(){
  const body=$('#cartBody'),foot=$('#cartFoot');if(!body)return;
  const oldNote=$('#cartNote');if(oldNote)cartNoteH=oldNote.style.height||'';
  const db=load();
  if(!cart.length){body.innerHTML=`<div class="cart-empty"><b>Cart is empty</b>Tap a menu item to start</div>`}else{
    body.innerHTML=[...cart].sort((a,b)=>(b.seq||0)-(a.seq||0)).map(c=>`<div class="cline"><div class="info"><b>${esc(c.name)}</b><span>PHP ${money0(c.price)} each</span></div><div class="amt">PHP ${money0(c.price*c.qty)}</div><div class="qty"><button onclick="setQty('${c.id}',-1)">&minus;</button><b>${c.qty}</b><button onclick="setQty('${c.id}',1)">+</button></div><button class="rm" onclick="rmCart('${c.id}')"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>`).join('')}
  const t=cartTotals(),discPct=t.sub?t.disc/t.sub*100:0;
  const dbNow=load();
  if(cartCustomer&&!(dbNow.customers||[]).some(c=>c.id===cartCustomer)){cartCustomer='';custSearchQuery=''}
  if(cartCustomer&&!custSearchQuery){const c=(dbNow.customers||[]).find(x=>x.id===cartCustomer);if(c)custSearchQuery=String(c.name||'')+(c.phone?' \u00b7 '+String(c.phone):'')}
  foot.innerHTML=`
    <div class="ot-row">${['Dine-in','Take-out','Delivery'].map(ot=>`<div class="ot-btn ${orderType===ot?'active':''}" onclick="orderType='${ot}';renderCart()">${ot}</div>`).join('')}</div>
    <div class="cust-row">
  <label class="clbl" for="custSearch">Customer</label>
  <div class="cust-picker">
    <input id="custSearch" class="cust-search" type="text" autocomplete="off" role="combobox" aria-autocomplete="list" aria-controls="custPopup" aria-expanded="false" placeholder="Walk-in / search customers" value="${esc(custSearchQuery)}" oninput="custSearchInput(this.value)" onfocus="custPopupOpen=true;renderCustPopup()" onkeydown="custSearchKey(event)">
    <div id="custPopup" class="cust-popup" role="listbox"></div>
  </div>
</div>
    <div class="note-row"><textarea id="cartNote" maxlength="500" placeholder="Order note (optional)" oninput="cartNote=this.value" onpointerup="cartNoteH=this.style.height"></textarea></div>
    <div class="sum-row"><span>Subtotal</span><span class="ph">PHP ${money0(t.sub)}</span></div>
    <div class="disc-row"><select id="discSel" onchange="cartDiscount=parseFloat(this.value||0);renderCart()"><option value="0">No discount</option><option value="0.05">5% off</option><option value="0.1">10% off</option><option value="0.15">15% off</option><option value="0.2">20% off</option><option value="0.25">25% off</option></select>${cartDiscount?`<button class="clear" onclick="cartDiscount=0;renderCart()">remove</button>`:''}</div>
    <div class="sum-row"><span>Discount</span><span style="color:var(--ok)">- PHP ${money0(t.disc)}</span></div>
    <div class="sum-row grand"><span>TOTAL</span><span class="ph">PHP ${money0(t.total)}</span></div>
    <div class="cash-row"><div class="label">Cash Payment</div><div class="cash-wrap"><span>PHP</span><input id="cashInput" type="number" min="0" placeholder="0.00" oninput="updateChange()"></div>
      <div class="qcash"><button onclick="quickCash(50)">50</button><button onclick="quickCash(100)">100</button><button onclick="quickCash(200)">200</button><button onclick="quickCash(500)">500</button><button onclick="quickCash(1000)">1000</button><button class="exact" onclick="quickCash(${t.total})">EXACT</button></div>
    </div>
    <div class="change-row"><span>Change</span><span id="changeTxt">—</span></div>
    <button class="checkout-btn" ${cart.length?'':'disabled'} onclick="checkout()">CHECKOUT — PHP ${money0(t.total)}</button>`;
  if(cartDiscount){const sel=$('#discSel');if(sel){sel.value=String(cartDiscount);}}
  const nt=$('#cartNote');if(nt){nt.value=cartNote;if(cartNoteH)nt.style.height=cartNoteH;}
  renderCustPopup();
}
function renderCustPopup(){
  const pop=$('#custPopup'),inp=$('#custSearch');if(!pop)return;
  const db=load(),query=String(custSearchQuery||'').trim().toLowerCase();
  const matches=(db.customers||[]).filter(c=>!query||[c.name,c.phone,c.email].some(v=>String(v||'').toLowerCase().includes(query)));
  const rows=matches.map(c=>{
    const sub=[c.phone,c.email].filter(Boolean).map(String).join(' \u00b7 ');
    return `<div class="cust-popup-item" role="option" aria-selected="false" data-customer-id="${esc(c.id)}"><span class="cust-popup-name">${esc(c.name)}</span>${sub?`<span class="cust-popup-sub">${esc(sub)}</span>`:''}</div>`;
  });
  const walkin=`<div class="cust-popup-item walkin" role="option" aria-selected="false" data-customer-id=""><span class="cust-popup-name">Walk-in / No customer</span><span class="cust-popup-sub">clears selection</span></div>`;
  const empty=matches.length?'':`<div class="cust-popup-empty">No customers found</div>`;
  pop.innerHTML=`<div class="cust-popup-list">${rows.join('')+empty}</div>`+walkin;
  pop.classList.toggle('open',custPopupOpen);
  if(custPopupOpen){pop.classList.remove('up');if(pop.getBoundingClientRect().bottom>window.innerHeight-8)pop.classList.add('up')}
  if(inp)inp.setAttribute('aria-expanded',custPopupOpen?'true':'false');
}
function custSearchInput(v){
  custSearchQuery=v;
  const c=cartCustomer?(load().customers||[]).find(x=>x.id===cartCustomer):null;
  const label=c?String(c.name||'')+(c.phone?' \u00b7 '+String(c.phone):''):'';
  if(v!==label)cartCustomer='';
  custPopupOpen=true;
  renderCustPopup();
}
function custSearchKey(e){
  if(e.key==='Escape'){
    e.preventDefault();custPopupOpen=false;
    const c=cartCustomer?(load().customers||[]).find(x=>x.id===cartCustomer):null;
    custSearchQuery=c?String(c.name||'')+(c.phone?' \u00b7 '+String(c.phone):''):'';
    const inp=$('#custSearch');if(inp)inp.value=custSearchQuery;
    renderCustPopup();return;
  }
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){
    e.preventDefault();custPopupOpen=true;renderCustPopup();
    const items=[...($('#custPopup')?.querySelectorAll('.cust-popup-item')||[])];
    if(!items.length)return;
    const cur=items.findIndex(x=>x.classList.contains('active'));
    const next=e.key==='ArrowDown'?(cur+1)%items.length:(cur<=0?items.length-1:cur-1);
    items.forEach((x,i)=>{x.classList.toggle('active',i===next);x.setAttribute('aria-selected',i===next?'true':'false')});
    items[next].scrollIntoView({block:'nearest'});return;
  }
  if(e.key==='Enter'){
    e.preventDefault();
    const pop=$('#custPopup');
    const target=pop?.querySelector('.cust-popup-item.active')||pop?.querySelector('.cust-popup-list .cust-popup-item')||pop?.querySelector('.cust-popup-item.walkin');
    if(target)target.click();
  }
}
function selectCust(id){
  const db=load();
  if(id===''||id===undefined||id===null){
    cartCustomer='';
    custSearchQuery='';
    custPopupOpen=false;
    const inp=$('#custSearch');if(inp)inp.value='';
    renderCustPopup();
    return;
  }
  const c=(db.customers||[]).find(x=>x.id===id);
  if(c){
    cartCustomer=id;
    custSearchQuery=String(c.name||'')+(c.phone?' \u00b7 '+String(c.phone):'');
    custPopupOpen=false;
    const inp=$('#custSearch');if(inp)inp.value=custSearchQuery;
    renderCustPopup();
  }else{
    cartCustomer='';
    custSearchQuery='';
    custPopupOpen=false;
    const inp=$('#custSearch');if(inp)inp.value='';
    renderCustPopup();
    toast('Customer not found — treated as Walk-in');
  }
}
function quickCash(amt){const i=$('#cashInput');if(i){i.value=amt.toFixed(2);updateChange();i.focus()}}
function updateChange(){const t=cartTotals(),paid=parseFloat($('#cashInput')?.value)||0,el=$('#changeTxt');if(el)el.textContent=paid>=t.total?`PHP ${money0(paid-t.total)}`:'—'}
function ingBatches(db,name){
  const key=String(name||'').toLowerCase();
  return (db.ingredients||[]).filter(g=>String(g.name||'').toLowerCase()===key).sort((a,b)=>{
    const ea=a.expiry||'9999-12-31',eb=b.expiry||'9999-12-31';
    return ea<eb?-1:ea>eb?1:String(a.id).localeCompare(String(b.id));
  });
}
function deductIngredient(db,name,amount){
  let left=Number(amount||0);
  for(const g of ingBatches(db,name)){
    if(left<=0)break;
    const take=Math.min(Math.max(0,Number(g.stock||0)),left);
    g.stock=Number((g.stock-take).toFixed(3));
    left=Number((left-take).toFixed(3));
  }
}
async function checkout(){
  if(!CAN.usePOS(me().role))return toast('No POS access');
  if(!cart.length)return;
  const btn=$('.checkout-btn');if(btn&&btn.disabled)return;
  const db=load(),t=cartTotals(),paid=parseFloat($('#cashInput')?.value)||0;
  let customer=null;
  if(cartCustomer){
    customer=(db.customers||[]).find(c=>c.id===cartCustomer)||null;
  }
  if(paid<t.total)return toast('Insufficient cash amount');
  for(const c of cart){
    const it=db.items.find(i=>i.id===c.id);
    for(const r of (it&&it.recipe)||[]){
      const batches=ingBatches(db,r.name),need=r.qty*c.qty;
      const avail=batches.reduce((s,g)=>s+Number(g.stock||0),0);
      if(avail<need)return toast('Not enough '+r.name+' ('+qty(avail)+' '+(batches[0]?.unit||'')+' left)');
    }
  }
  const payload={id:uid(),items:cart.map(c=>({id:c.id,qty:c.qty})),discountRate:cartDiscount,discount:t.disc,payment:paid,customerId:customer?.id||'',orderType,note:cartNote.trim()};
  if(btn)btn.disabled=true;
  dbStatus('saving','Saving sale…');
  try{
    const r=await apiFetch('cashier_sale',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    const j=await r.json();
    if(!j.ok)throw new Error(j.error||'Sale failed');
    const trx=j.transaction;
    if(j.meta&&typeof j.meta.seq==='number')db.meta.seq=j.meta.seq;
    const itemStock=(j.stock&&j.stock.items)||[];
    const ingStock=(j.stock&&j.stock.ingredients)||[];
    itemStock.forEach(s=>{const it=db.items.find(i=>i.id===s.id);if(it)it.stock=Number(s.stock)});
    ingStock.forEach(s=>{const g=db.ingredients.find(i=>i.id===s.id);if(g)g.stock=Number(s.stock)});
    if(!db.transactions.some(x=>x.id===trx.id))db.transactions.push(trx);
    DB=db;
    localStorage.removeItem(OFFLINE_KEY);
    if(me().role==='cashier'){clearTimeout(_syncTimer);_dirty=false}
    dbStatus('ok','MySQL connected');
    cart=[];cartSeq=0;cartDiscount=0;cartCustomer='';cartNote='';cartNoteH='';custSearchQuery='';custPopupOpen=false;
    renderPOS();renderNav();showReceiptModal(trx);toast('Order completed — '+trx.ref);
  }catch(e){
    console.error('[POS] sale failed:',e);
    dbStatus('err','Sale not saved — try again');
    toast('Sale not saved: '+(e.message||'database error'));
  }finally{if(btn)btn.disabled=false}
}

/* --- receipt --- */
function showReceiptModal(t){
  const db=load(),rows=t.items.map(i=>`<tr><td>${esc(i.name)}</td><td class="num">${i.qty}</td><td class="num" style="text-align:right">${money0(i.price)}</td><td class="num" style="text-align:right">${money0(i.qty*i.price)}</td></tr>`).join('');
  const krows=t.items.map(i=>`<tr><td>${esc(i.name)}</td><td class="num">${i.qty}</td></tr>`).join('');
  const note=String(t.note||'').trim();
  const knote=note?`<div class="kc-note"><b>ORDER NOTE</b><div>${esc(note).replace(/\n/g,'<br>')}</div></div>`:`<div class="kc-note empty"><b>ORDER NOTE</b><div>—</div></div>`;
  openModal(`<h3>${t.status==='cancelled'?'Voided Order':'Order Receipt'}</h3><div class="msub">${t.ref}</div>
    <div class="receipt-wrap">
      <div><div class="receipt-caption">CUSTOMER RECEIPT</div>
        <div class="receipt" id="rcArea">
          <div class="rc"><b>POINT OF SALES &amp; INVENTORY MANAGEMENT SYSTEM</b><div>54 Barangay Mamatid Road, City of Cabuyao, Laguna</div><div>Tel: 0916 989 583</div></div>
          <div style="font-size:10.5px;margin-bottom:6px"><div>Ref: <b>${t.ref}</b> &nbsp; ${fmtDT(t.date)}</div><div>Cashier: ${esc(cashierName(t,db))}</div><div>Order: ${esc(t.orderType||'Dine-in')}</div>${t.customer?`<div>Customer: ${esc(t.customer)}</div>`:''}${note?`<div>Order Note: ${esc(note)}</div>`:''}${t.status==='cancelled'?'<div style="color:#DC2626;font-weight:bold">VOIDED</div>':''}</div>
          <table><tr><th style="text-align:left">Item</th><th>Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Amount</th></tr>${rows}</table>
          <div class="tot"><div class="trow"><span>Subtotal</span><span>PHP ${money0(t.subtotal)}</span></div>${t.discount?`<div class="trow"><span>Discount</span><span>- PHP ${money0(t.discount)}</span></div>`:''}<div class="trow" style="font-weight:bold;font-size:12px"><span>TOTAL</span><span>PHP ${money0(t.total)}</span></div>${t.status==='completed'?`<div class="trow"><span>Cash</span><span>PHP ${money0(t.payment)}</span></div><div class="trow"><span>Change</span><span>PHP ${money0(t.change)}</span></div>`:''}</div>
          <div class="rc" style="border:none;padding-top:6px;margin-bottom:0"><div style="font-size:9px">Thank you for dining with us!</div></div>
        </div>
      </div>
      <div><div class="receipt-caption">KITCHEN RECEIPT</div>
        <div class="receipt kitchen" id="kcArea">
          <div class="rc"><b>KITCHEN ORDER</b><div>${t.ref} &nbsp; ${fmtDT(t.date)}</div></div>
          <div class="kc-meta"><div>Order: <b>${esc(t.orderType||'Dine-in')}</b></div><div>Cashier: ${esc(cashierName(t,db))}</div>${t.customer?`<div>Customer: ${esc(t.customer)}</div>`:''}</div>
          ${knote}
          <table><tr><th style="text-align:left">Item</th><th style="text-align:right">Qty</th></tr>${krows}</table>
          <div class="rc" style="border:none;padding-top:6px;margin-bottom:0"><div style="font-size:9px">Prepare ${t.items.reduce((s,i)=>s+i.qty,0)} item(s)</div></div>
        </div>
      </div>
    </div>
    <div class="mfoot"><button class="btn btn-ghost" onclick="closeModal()">Close</button><button class="btn btn-ghost" onclick="printKitchenReceipt()">Print Kitchen</button><button class="btn" onclick="printReceipt()">Print Customer</button></div>`,true);
  $('#printArea').innerHTML=$('#rcArea')?.outerHTML||'';
}
function printReceipt(){const a=$('#printArea');a.style.display='block';a.innerHTML=$('#rcArea')?.outerHTML||'';window.print();setTimeout(()=>{a.style.display='none'},200)}
function printKitchenReceipt(){const a=$('#printArea');a.style.display='block';a.innerHTML=$('#kcArea')?.outerHTML||'';window.print();setTimeout(()=>{a.style.display='none'},200)}
document.addEventListener('click',e=>{
  const item=e.target.closest?.('.cust-popup-item');
  if(item&&$('#custPopup')?.contains(item)){selectCust(item.dataset.customerId||'');return}
  if(custPopupOpen&&!e.target.closest?.('.cust-picker')){custPopupOpen=false;renderCustPopup()}
});

