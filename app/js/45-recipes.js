/* ============================================================
   MODULE: 45-recipes.js
   item recipes / BOM
   ============================================================ */
/* --- recipe / BOM --- */
let _rec=[],_recItem=null;
function recForm(id){if(!requireEdit())return;
  const db=load();_recItem=db.items.find(i=>i.id===id);if(!_recItem)return;
  _rec=(_recItem.recipe||[]).map(r=>({name:r.name,qty:r.qty}));
  if(!_rec.length)_rec.push({name:'',qty:0.2});
  openModal(`<h3>Recipe / BOM</h3><div class="msub">${esc(_recItem.name)} &middot; ingredients consumed per sale</div>
    <div style="max-height:40vh;overflow-y:auto;padding-right:4px"><div style="display:flex;flex-direction:column;gap:6px" id="recRows"></div>
    <button class="btn btn-ghost btn-xs" style="width:100%;margin-top:8px" onclick="addIngRow()">+ Add ingredient row</button>
    <div style="margin-top:8px;font-size:9.5px;letter-spacing:.06em;color:var(--mut2);font-family:var(--font-m);font-weight:700;text-transform:uppercase">Auto-deduct every sale &middot; voided orders do not return stock — food already prepared</div></div>
    <div class="mfoot"><button class="btn btn-ghost" onclick="closeModal()">Close</button><button class="btn" onclick="saveRecipe()">Save Recipe</button></div>`,true);
  renderRecRows();
}
function renderRecRows(){
  const box=$('#recRows');if(!box)return;
  const db=load();
  box.innerHTML=_rec.map((r,i)=>`<div class="rec-row" style="display:flex;gap:6px;align-items:center">
    <select style="flex:1;padding:8px;border:1.5px solid var(--border);border-radius:10px;background:var(--surface);font-weight:700;font-family:var(--font-m);font-size:11px">${db.ingredients.some(g=>g.name===r.name)?'':`<option value="${esc(r.name)}" selected>${esc(r.name)} (missing)</option>`}${db.ingredients.map(g=>`<option value="${esc(g.name)}" ${g.name===r.name?'selected':''}>${esc(g.name)} (${qty(g.stock)} ${g.unit} left)</option>`).join('')}</select>
    <input id="rec_q_${i}" type="number" min="0" step="0.01" value="${qty(r.qty)}" style="width:70px;padding:8px;border:1.5px solid var(--border);border-radius:10px;background:var(--surface);font-weight:700;font-family:var(--font-m);font-size:11px;text-align:center">
    <button class="icon-btn del" title="Remove" onclick="rmRecRow(${i})"><svg viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>`).join('');
}
function addIngRow(){_rec.push({name:'',qty:0.2});renderRecRows()}
function rmRecRow(i){_rec.splice(i,1);if(!_rec.length)_rec.push({name:'',qty:0.2});renderRecRows()}
function saveRecipe(){if(!requireEdit())return;
  const db=load(),it=db.items.find(x=>x.id===_recItem.id);if(!it)return closeModal();
  const rec=[];
  document.querySelectorAll('#recRows .rec-row').forEach(row=>{
    const sel=row.querySelector('select'),q=parseFloat(row.querySelector('input').value||0);
    if(sel&&sel.value&&q>0)rec.push({name:sel.value,qty:q});
  });
  const before={recipe:JSON.parse(JSON.stringify(it.recipe||[]))};it.recipe=rec;save(db);logAction('edit','recipe',it.id,it.name+' — '+rec.length+' ingredients',before,{recipe:rec});closeModal();renderInventory();toast('Recipe saved');
}

