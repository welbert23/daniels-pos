/* ============================================================
   MODULE: 40-inventory.js
   inventory CRUD + stock
   ============================================================ */
/* ============================================================
   INVENTORY
   ============================================================ */
let invQ='',invCat='All',editItem=null;
function renderInventory(){
  const db=load(),can=CAN.editStock(me().role),canDel=CAN.deleteStock(me().role);
  const list=db.items.filter(i=>(invCat==='All'||i.category===invCat)&&(!invQ||i.name.toLowerCase().includes(invQ)));
  $('#content').innerHTML=`
    <div class="toolrow"><div class="search-wrap" style="flex:0 1 300px"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input placeholder="Search menu..." value="${esc(invQ)}" oninput="invQ=this.value.toLowerCase();renderInventory()"></div>
      <select style="padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;background:var(--surface);font-weight:700" onchange="invCat=this.value;renderInventory()">${itemCats().map(c=>`<option ${invCat===c?'selected':''}>${esc(c)}</option>`).join('')}</select>
      <div class="spacer"></div>${can?'<button class="btn btn-sm" onclick="invForm()">+ Add Item</button>':''}
      ${can?'<button class="btn btn-ghost btn-sm" onclick="exportCSV()">Export CSV</button>':''}
    </div>
    <div class="tbl-wrap"><table><tr><th>Item</th><th>Category</th><th>Price</th><th>Cost</th><th>Margin</th><th>Stock</th><th>Expiry</th><th>Status</th>${can?'<th style="text-align:right">Actions</th>':''}</tr>
      ${list.length?list.map(i=>{const m=i.cost>0?(i.price-i.cost)/i.price*100:0;const es=expStatus(i.expiry);const st=es?es.st:(i.stock<=0?'bad':i.stock<=i.minStock?'warn':'ok');const lb=es?es.lb:(i.stock<=0?'OUT':i.stock<=i.minStock?'LOW':'IN STOCK');
        return`<tr><td><b>${esc(i.name)}</b><small style="display:block;color:var(--mut2);font-size:9.5px;font-weight:600">${(i.recipe||[]).length?(i.recipe.slice(0,2).map(r=>r.name+' ×'+qty(r.qty)).join(', '))+(i.recipe.length>2?' +'+(i.recipe.length-2)+' more':''):'No ingredients'}</small></td><td><span class="pill brand" style="background:${catColor(i.category)}15;color:${catColor(i.category)}">${i.category}</span></td><td class="num"><b>PHP ${money0(i.price)}</b></td><td class="num">PHP ${money0(i.cost)}</td><td class="num">${m.toFixed(1)}%</td><td class="num"><b>${i.stock}</b></td><td class="num" style="white-space:nowrap">${i.expiry?fmtD(i.expiry):'—'}</td><td><span class="pill ${st}">${lb}</span></td>${can?`<td><div class="act"><button class="icon-btn view" title="Stock in" onclick="stockIn('${i.id}')"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button><button class="icon-btn edit" title="Edit" onclick="invForm('${i.id}')"><svg viewBox="0 0 24 24"><path d="M11 4H4v16h16v-7 M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg></button><button class="icon-btn view" title="Recipe" onclick="recForm('${i.id}')"><svg viewBox="0 0 24 24"><path d="M5 3h14v7a5 5 0 0 1-5 5h-4a5 5 0 0 1-5-5z M9 15v6 M15 15v6 M9 19h6 M9 7h6"/></svg></button>${canDel?`<button class="icon-btn del" title="Delete" onclick="delItem('${i.id}')"><svg viewBox="0 0 24 24"><path d="M3 6h18 M8 6V4h8v2 M6 6l1 14h10l1-14"/></svg></button>`:''}</div></td>`:''}</tr>`}).join(''):`<tr><td colspan="10" class="card-empty">No items found</td></tr>`}
    </table></div>`;
}
function invForm(id){if(!requireEdit())return;const db=load();editItem=id?db.items.find(i=>i.id===id):null;const it=editItem||{};
  openModal(`<h3>${editItem?'Edit Item':'Add Item'}</h3><div class="msub">${editItem?'Update item details.':'New menu item.'}</div>
    <div class="field"><label>Name *</label><input id="f_name" value="${esc(it.name||'')}"></div>
    <div class="field"><label>Category *</label>
      <select id="f_cat" onchange="catChanged('item','f',this)">${catOptions('item',it.category||'')}</select>
      <div id="f_cat_box" style="display:none;margin-top:7px;gap:6px"><input id="f_cat_new" placeholder="New category name" style="flex:1" onkeydown="if(event.key==='Enter'){event.preventDefault();commitNewCat('item','f')}"><button type="button" class="btn btn-xs" onclick="commitNewCat('item','f')">Add</button></div>
    </div>
    <div class="row2"><div class="field"><label>Price (PHP) *</label><input id="f_price" type="number" min="0" step="0.01" value="${it.price!=null?it.price:''}"></div><div class="field"><label>Cost (PHP)</label><input id="f_cost" type="number" min="0" step="0.01" value="${it.cost!=null?it.cost:''}"></div></div>
    <div class="row2"><div class="field"><label>Stock</label><input id="f_stock" type="number" min="0" value="${it.stock!=null?it.stock:0}"></div><div class="field"><label>Expiry date</label><input id="f_exp" type="date" value="${it.expiry||''}"></div></div>
    <div class="field"><label>Low-stock alert</label><input id="f_min" type="number" min="0" value="${it.minStock!=null?it.minStock:5}"></div>
    <div class="mfoot"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn" onclick="saveItem()">${editItem?'Save':'Add Item'}</button></div>`);
  $('#f_cat').dataset.prev=$('#f_cat').value;
}
function saveItem(){
  if(!requireEdit())return;
  const name=$('#f_name').value.trim(),cat=$('#f_cat').value,price=parseFloat($('#f_price').value||0),cost=parseFloat($('#f_cost').value||0),stock=parseInt($('#f_stock').value||0),min=parseInt($('#f_min').value||5),exp=$('#f_exp').value||'';
  if(!name)return toast('Name required');if(price<=0)return toast('Enter valid price');
  const db=load(),wasEdit=!!editItem,before=wasEdit?JSON.parse(JSON.stringify(editItem)):null;let id;
  if(wasEdit){const it=db.items.find(i=>i.id===editItem.id);Object.assign(it,{name,category:cat,price,cost,minStock:min,expiry:exp});id=it.id;toast('Item updated')}
  else{const it={id:uid(),name,category:cat,price,cost,stock,minStock:min,expiry:exp};db.items.push(it);id=it.id;toast('Item added')}
  save(db);logAction(wasEdit?'edit':'add','item',id,name+' · '+cat,before,db.items.find(i=>i.id===id));closeModal();renderInventory();
}
function stockIn(id){if(!requireEdit())return;const db=load(),it=db.items.find(i=>i.id===id);openModal(`<h3>Stock In</h3><div class="msub">${esc(it.name)} &middot; current stock: <b>${it.stock}</b></div><div class="field"><label>Quantity</label><input id="fadd" type="number" min="1" value="10"></div><div class="mfoot"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn" onclick="saveStockIn('${id}')">Add</button></div>`)}
function saveStockIn(id){if(!requireEdit())return;const q=parseInt($('#fadd').value||0);if(q<=0)return toast('Enter quantity');const db=load(),it=db.items.find(i=>i.id===id),before={stock:it.stock};it.stock+=q;save(db);logAction('stock','item',id,it.name+' +'+q,before,{stock:it.stock});closeModal();renderInventory();toast('+'+q+' added')}
function delItem(id){if(!requireDelete())return;const db=load(),it=db.items.find(i=>i.id===id);openModal(`<h3>Delete Item?</h3><div class="msub">"${esc(it.name)}" will be removed permanently.</div><div class="mfoot"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-danger" onclick="confirmDel('${id}')">Delete</button></div>`)}
function confirmDel(id){if(!requireDelete())return;const db=load(),it=db.items.find(i=>i.id===id),before=it?JSON.parse(JSON.stringify(it)):null;db.items=db.items.filter(i=>i.id!==id);save(db);logAction('delete','item',id,before?.name||id,before);closeModal();renderInventory();toast('Item deleted')}
function exportCSV(){const db=load();const rows=[['Name','Category','Price','Cost','Stock','Min','Expiry','Ingredients']];db.items.forEach(i=>rows.push([i.name,i.category,i.price,i.cost,i.stock,i.minStock,i.expiry||'',(i.recipe||[]).map(r=>r.name+' x'+qty(r.qty)).join(', ')]));const csv=rows.map(r=>r.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv'}));a.download='inventory-'+todayStr()+'.csv';a.click();toast('CSV exported')}

