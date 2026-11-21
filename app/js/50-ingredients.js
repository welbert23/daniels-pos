/* ============================================================
   MODULE: 50-ingredients.js
   ingredient CRUD + batches
   ============================================================ */
/* ============================================================
   INGREDIENTS
   ============================================================ */
let ingQ='',ingCat='All',editIng=null;
function renderIngredients(){
  const db=load(),can=CAN.editStock(me().role),canDel=CAN.deleteStock(me().role);
  const list=db.ingredients.filter(g=>(ingCat==='All'||g.category===ingCat)&&(!ingQ||g.name.toLowerCase().includes(ingQ)));
  $('#content').innerHTML=`
    <div class="toolrow"><div class="search-wrap" style="flex:0 1 300px"><svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg><input placeholder="Search ingredients..." value="${esc(ingQ)}" oninput="ingQ=this.value.toLowerCase();renderIngredients()"></div>
      <select style="padding:9px 12px;border:1.5px solid var(--border);border-radius:10px;background:var(--surface);font-weight:700" onchange="ingCat=this.value;renderIngredients()">${ingCats().map(c=>`<option ${ingCat===c?'selected':''}>${esc(c)}</option>`).join('')}</select>
      <div class="spacer"></div>${can?'<button class="btn btn-sm" onclick="ingForm()">+ Add Ingredient</button>':''}
      ${can?'<button class="btn btn-ghost btn-sm" onclick="exportIngCSV()">Export CSV</button>':''}
    </div>
    <div class="tbl-wrap"><table><tr><th>Ingredient</th><th>Category</th><th>Unit</th><th>Stock</th><th>Expiry</th><th>Status</th>${can?'<th style="text-align:right">Actions</th>':''}</tr>
      ${list.length?list.map(g=>{const es=expStatus(g.expiry);const st=es?es.st:(g.stock<=0?'bad':g.stock<=g.minStock?'warn':'ok');const lb=es?es.lb:(g.stock<=0?'OUT':g.stock<=g.minStock?'LOW':'IN STOCK');const bc=db.ingredients.filter(x=>x.name.toLowerCase()===String(g.name||'').toLowerCase()).length;
        return`<tr><td><b>${esc(g.name)}</b>${bc>1?`<span class="pill info" style="margin-left:6px">BATCH ×${bc}</span>`:''}</td><td><span class="pill brand" style="background:${catColor(g.category)}15;color:${catColor(g.category)}">${g.category}</span></td><td class="num">${esc(g.unit)}</td><td class="num"><b>${qty(g.stock)}</b></td><td class="num" style="white-space:nowrap">${g.expiry?fmtD(g.expiry):'—'}</td><td><span class="pill ${st}">${lb}</span></td>${can?`<td><div class="act"><button class="icon-btn view" title="Stock in" onclick="stockInG('${g.id}')"><svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14"/></svg></button><button class="icon-btn edit" title="Edit" onclick="ingForm('${g.id}')"><svg viewBox="0 0 24 24"><path d="M11 4H4v16h16v-7 M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg></button>${canDel?`<button class="icon-btn del" title="Delete" onclick="delIng('${g.id}')"><svg viewBox="0 0 24 24"><path d="M3 6h18 M8 6V4h8v2 M6 6l1 14h10l1-14"/></svg></button>`:''}</div></td>`:''}</tr>`}).join(''):`<tr><td colspan="8" class="card-empty">No ingredients found</td></tr>`}
    </table></div>`;
}
function ingForm(id){if(!requireEdit())return;const db=load();editIng=id?db.ingredients.find(g=>g.id===id):null;const g=editIng||{};
  openModal(`<h3>${editIng?'Edit Ingredient':'Add Ingredient'}</h3><div class="msub">${editIng?'Update ingredient details.':'New ingredient.'}</div>
    <div class="field"><label>Name *</label><input id="g_name" value="${esc(g.name||'')}"></div>
    <div class="field"><label>Category *</label>
      <select id="g_cat" onchange="catChanged('ingredient','g',this)">${catOptions('ingredient',g.category||'')}</select>
      <div id="g_cat_box" style="display:none;margin-top:7px;gap:6px"><input id="g_cat_new" placeholder="New category name" style="flex:1" onkeydown="if(event.key==='Enter'){event.preventDefault();commitNewCat('ingredient','g')}"><button type="button" class="btn btn-xs" onclick="commitNewCat('ingredient','g')">Add</button></div>
    </div>
    <div class="row2"><div class="field"><label>Unit</label><input id="g_unit" value="${esc(g.unit||'kg')}"></div><div class="field"><label>Stock</label><input id="g_stock" type="number" min="0" step="0.01" value="${g.stock!=null?g.stock:0}"></div></div>
    <div class="row2"><div class="field"><label>Expiry date</label><input id="g_exp" type="date" value="${g.expiry||''}"></div><div class="field"><label>Low-stock alert</label><input id="g_min" type="number" min="0" value="${g.minStock!=null?g.minStock:3}"></div></div>
    <div class="mfoot"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn" onclick="saveIng()">${editIng?'Save':'Add Ingredient'}</button></div>`);
  $('#g_cat').dataset.prev=$('#g_cat').value;
}
function saveIng(){
  if(!requireEdit())return;
  const name=$('#g_name').value.trim(),cat=$('#g_cat').value,unit=$('#g_unit').value.trim()||'kg',stock=parseFloat($('#g_stock').value||0),min=parseInt($('#g_min').value||3),exp=$('#g_exp').value||'';
  if(!name)return toast('Name required');
  const db=load(),wasEdit=!!editIng,before=wasEdit?JSON.parse(JSON.stringify(editIng)):null;let id;
  if(!wasEdit && db.ingredients.some(x=>x.name.toLowerCase()===name.toLowerCase() && (x.expiry||'')===exp))return toast('Same ingredient + expiry already exists — use Stock In instead');
  if(wasEdit){const g=db.ingredients.find(x=>x.id===editIng.id);Object.assign(g,{name,category:cat,unit,minStock:min,expiry:exp});id=g.id;toast('Ingredient updated')}
  else{const g={id:uid(),name,category:cat,unit,stock,minStock:min,expiry:exp};db.ingredients.push(g);id=g.id;toast('Ingredient added')}
  editIng=null;save(db);logAction(wasEdit?'edit':'add','ingredient',id,name+' · '+cat,before,db.ingredients.find(g=>g.id===id));closeModal();renderIngredients();
}
function stockInG(id){if(!requireEdit())return;const db=load(),g=db.ingredients.find(x=>x.id===id);openModal(`<h3>Stock In</h3><div class="msub">${esc(g.name)} &middot; current stock: <b>${qty(g.stock)}</b> ${g.unit}</div><div class="field"><label>Quantity</label><input id="gadd" type="number" min="0" step="0.01" value="10"></div><div class="mfoot"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn" onclick="saveStockInG('${id}')">Add</button></div>`)}
function saveStockInG(id){if(!requireEdit())return;const q=parseFloat($('#gadd').value||0);if(q<=0)return toast('Enter quantity');const db=load(),g=db.ingredients.find(x=>x.id===id),before={stock:g.stock};g.stock=Number((g.stock+q).toFixed(3));save(db);logAction('stock','ingredient',id,g.name+' +'+qty(q)+' '+g.unit,before,{stock:g.stock});closeModal();renderIngredients();toast('+'+qty(q)+' '+g.unit+' added')}
function delIng(id){if(!requireDelete())return;const db=load(),g=db.ingredients.find(x=>x.id===id);openModal(`<h3>Delete Ingredient?</h3><div class="msub">"${esc(g.name)}" will be removed permanently.</div><div class="mfoot"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-danger" onclick="confirmDelIng('${id}')">Delete</button></div>`)}
function confirmDelIng(id){if(!requireDelete())return;const db=load(),g=db.ingredients.find(x=>x.id===id),before=g?JSON.parse(JSON.stringify(g)):null;db.ingredients=db.ingredients.filter(x=>x.id!==id);save(db);logAction('delete','ingredient',id,before?.name||id,before);closeModal();renderIngredients();toast('Ingredient deleted')}
function exportIngCSV(){const db=load();const rows=[['Ingredient','Category','Unit','Stock','Min','Expiry']];db.ingredients.forEach(g=>rows.push([g.name,g.category,g.unit,g.stock,g.minStock,g.expiry||'']));const csv=rows.map(r=>r.map(x=>'"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\n');const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv'}));a.download='ingredients-'+todayStr()+'.csv';a.click();toast('CSV exported')}

