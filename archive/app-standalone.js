
/* ============================================================
   SALES & INVENTORY POS — Daniel's Barbecue & Restaurant
   MySQL-backed, role-aware — index.html + styles.css + app.js
   ============================================================ */
const DB_KEY='sipos_db_v2',SESSION_KEY='sipos_session_v1';
const ROLE_LABEL={superadmin:'Superadmin',client:'Client',cashier:'Cashier',inventory:'Inventory',staff:'Cashier'};
const CAN={
  manageUsers:r=>r==='superadmin',
  viewReports:r=>r==='superadmin'||r==='client',
  usePOS:r=>r==='superadmin'||r==='client'||r==='cashier'||r==='staff',
  salesOps:r=>r==='superadmin'||r==='client',
  manageSchedules:r=>r==='superadmin'||r==='client',
  editStock:r=>r==='superadmin'||r==='client'||r==='inventory',
  deleteStock:r=>r==='superadmin'||r==='client',
  manageStock:r=>r==='superadmin'||r==='client'
};
const CAT_PALETTE=['#B91C1C','#D97706','#7C3AED','#0369A1','#DB2777','#15803D','#2563EB','#CA8A04','#92400E','#0F766E'];
function catColor(c){
  let h=0;for(const ch of String(c))h=(h*31+ch.charCodeAt(0))>>>0;
  return CAT_PALETTE[h%CAT_PALETTE.length];
}
function itemCats(){const db=load();return ['All',...new Set([...(db.itemCats||[]),...(db.items||[]).map(i=>i.category).filter(Boolean)])]}
function ingCats(){const db=load();return ['All',...new Set([...(db.ingCats||[]),...(db.ingredients||[]).map(g=>g.category).filter(Boolean)])]}
function addCategory(kind,name){
  const db=load(),key=kind==='item'?'itemCats':'ingCats',clean=String(name||'').trim();
  if(!clean)return '';
  if(!db[key])db[key]=[];
  const found=db[key].find(c=>c.toLowerCase()===clean.toLowerCase());
  if(found)return found;
  db[key].push(clean);return clean;
}
function catOptions(kind,selected){
  const list=(kind==='item'?itemCats():ingCats()).slice(1);
  return list.map(c=>`<option ${c===selected?'selected':''}>${esc(c)}</option>`).join('')+'<option value="__new__">+ Add new category…</option>';
}
function catChanged(kind,p,sel){
  if(sel.value==='__new__'){
    const prev=sel.dataset.prev||sel.options[0]?.value||'';
    $('#'+p+'_cat_box').style.display='flex';
    $('#'+p+'_cat_new').focus();
    sel.value=prev;
  }else{
    sel.dataset.prev=sel.value;
    $('#'+p+'_cat_box').style.display='none';
  }
}
function commitNewCat(kind,p){
  if(!requireEdit())return;
  const inp=$('#'+p+'_cat_new'),name=inp?.value.trim();
  if(!name)return toast('Enter category name');
  const list=kind==='item'?itemCats():ingCats();
  if(list.some(c=>c.toLowerCase()===name.toLowerCase()))return toast('Category already exists');
  const final=addCategory(kind,name);
  save(load());logAction('category',kind,final,final);
  const sel=$('#'+p+'_cat');
  sel.innerHTML=catOptions(kind,final);
  sel.dataset.prev=final;
  inp.value='';
  $('#'+p+'_cat_box').style.display='none';
  toast('Category added — '+final);
}
function expStatus(exp){if(!exp)return null;const d=new Date(exp),t=new Date();if(exp<todayStr())return{st:'bad',lb:'EXPIRED'};const days=Math.floor((d-t)/864e5);if(days<=3)return{st:'warn',lb:'EXP SOON'};return null}
const qty=n=>Number.isInteger(n)?n:Number(Number(n||0).toFixed(2));
/* --- helpers --- */
const $=s=>document.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=n=>'PHP '+Number(n||0).toLocaleString('en-PH',{minimumFractionDigits:2,maximumFractionDigits:2});
const money0=n=>Number(n||0).toLocaleString('en-PH',{maximumFractionDigits:2});
const todayStr=()=>{const d=new Date(),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`};
const fmtDT=iso=>{const d=new Date(iso);return d.toLocaleString('en-PH',{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit'})};
const fmtD=iso=>{const d=new Date(iso);return d.toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})};
const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);
const refNo=()=>{const db=load();const n=db.meta.seq+1;db.meta.seq=n;save(db);return'QF-'+new Date().toISOString().slice(0,10).replace(/-/g,'')+'-'+String(n).padStart(4,'0')};
let _toastTimer;
function toast(msg){const t=$('#toast'),tx=$('#toastTxt');tx.textContent=msg;t.classList.add('show');clearTimeout(_toastTimer);_toastTimer=setTimeout(()=>t.classList.remove('show'),2500)}
const hideToast=()=>{const t=$('#toast');if(t)t.classList.remove('show');clearTimeout(_toastTimer)};

/* --- storage: MySQL via api.php (every change is a real SQL write) --- */
const API = location.protocol==='file:' ? 'http://localhost/daniels-pos/api.php' : 'api.php';
const OFFLINE_KEY='sipos_offline_queue_v1';
let DB=null, OFFLINE=false, _syncTimer=null, _syncing=false, _dirty=false;

function emptyDB(){return{meta:{seq:0,seed:''},itemCats:[],ingCats:[],items:[],ingredients:[],transactions:[],customers:[],users:[]}}
function load(){if(!DB)DB=emptyDB();return DB}
function session(){try{return JSON.parse(localStorage.getItem(SESSION_KEY))}catch(e){return null}}

function dbStatus(kind,txt){const el=$('#dbChip');if(!el)return;el.className='dbchip '+kind;el.innerHTML='<i></i><span>'+txt+'</span>'}
function syncDbTools(){const el=$('#dbTools');if(!el)return;const s=session();el.style.display=s&&s.role==='superadmin'?'flex':'none'}
function requireSuper(){const s=session();if(!s||s.role!=='superadmin'){toast('Superadmin only');return false}return true}
function logAction(action,entity,entityId,summary,before,after){
  const s=session()||{},u=(DB?.users||[]).find(x=>x.id===s.id)||s;
  const payload={ts:new Date().toISOString(),actor_id:u.id||'',actor_name:u.name||'',actor_username:u.username||'',actor_role:u.role||'',action,entity,entity_id:String(entityId||''),summary:summary||'',before:before?JSON.stringify(before):null,after:after?JSON.stringify(after):null};
  fetch(API+'?action=audit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload),keepalive:true}).catch(e=>console.error('[POS] audit log failed:',e));
}
function save(db){DB=db;if(OFFLINE){localStorage.setItem(OFFLINE_KEY,JSON.stringify(db));dbStatus('err','DB offline — queued');return}_dirty=true;dbStatus('pending','Saving…');clearTimeout(_syncTimer);_syncTimer=setTimeout(()=>flushDB(),100)}
async function flushDB(force){
  if(OFFLINE||!DB||_syncing||(!_dirty&&!force))return;
  _syncing=true;_dirty=false;
  const snapshot=JSON.stringify(DB);
  dbStatus('saving','Saving…');
  try{
    const r=await fetch(API+'?action=save',{method:'POST',headers:{'Content-Type':'application/json'},body:snapshot});
    const j=await r.json();
    if(!j.ok)throw new Error(j.error||'Database error');
    localStorage.removeItem(OFFLINE_KEY);
    dbStatus('ok','MySQL connected');
  }catch(e){
    console.error('[POS] MySQL save failed:',e);
    localStorage.setItem(OFFLINE_KEY,snapshot);
    dbStatus('err','DB offline — queued');_dirty=true;
  }finally{_syncing=false;if(_dirty&&!OFFLINE)_syncTimer=setTimeout(()=>flushDB(),1500)}
}
async function pushQueued(){
  const q=localStorage.getItem(OFFLINE_KEY);
  if(!q)return false;
  try{
    const r=await fetch(API+'?action=save',{method:'POST',headers:{'Content-Type':'application/json'},body:q});
    const j=await r.json();
    if(!j.ok)throw new Error(j.error||'Database error');
    localStorage.removeItem(OFFLINE_KEY);
    return true;
  }catch(e){console.error('[POS] queued sync failed:',e);return false}
}
async function importLocal(){
  if(!requireSuper())return;
  const old=localData();
  if(!old)return toast('No saved local data in this browser');
  if(!confirm('Overwrite the MySQL tables with the data saved in this browser?'))return;
  OFFLINE=false;
  DB=migrate(old);
  save(DB);
  clearTimeout(_syncTimer);
  await flushDB(true);
  go(current);
  toast('Imported into MySQL');
}
async function refreshDB(){
  if(!requireSuper())return;
  dbStatus('saving','Refreshing…');
  try{
    const r=await fetch(API+'?action=bootstrap',{cache:'no-store'});
    const j=await r.json();
    if(!j.ok)throw new Error(j.error||'Database error');
    OFFLINE=false;_dirty=false;clearTimeout(_syncTimer);
    if(await pushQueued())toast('Queued changes synced to MySQL');
    const fresh=await (await fetch(API+'?action=bootstrap',{cache:'no-store'})).json();
    DB=fresh.db;
    dbStatus('ok','MySQL connected');
    go(current);toast('Loaded latest data from MySQL');
  }catch(e){console.error(e);dbStatus('err','DB offline');toast('Cannot reach MySQL')}
}
function cashierName(t,db){const u=t.cashierId&&db.users.find(x=>x.id===t.cashierId);return u?u.name:(t.cashier||'')}
function migrate(db){
  let changed=false;
  ['itemCats','ingCats','items','ingredients','transactions','customers','users'].forEach(k=>{
    if(!Array.isArray(db[k])){db[k]=[];changed=true}
  });
  if(!db.meta||typeof db.meta!=='object'){db.meta={seq:0,seed:''};changed=true}
  if(typeof db.meta.seq!=='number'){db.meta.seq=0;changed=true}
  (db.transactions||[]).forEach(t=>{
    if(!t.cashierId&&t.cashier){
      const u=db.users.find(x=>x.name===t.cashier);
      if(u){t.cashierId=u.id;t.cashier=u.name;changed=true}
    }else if(t.cashierId){
      const u=db.users.find(x=>x.id===t.cashierId);
      if(u&&t.cashier!==u.name){t.cashier=u.name;changed=true}
    }
  });
  [...(db.items||[]),...(db.ingredients||[])].forEach(i=>{if(i.expiry===undefined){i.expiry='';changed=true}});
  if(changed)save(db);
  return db;
}

/* ============================================================
   ROUTING
   ============================================================ */
const NAV=[
  {key:'dashboard',label:'Dashboard',icon:'M3 3h18v18H3z M3 9h18 M9 21V9',show:()=>true},
  {key:'pos',label:'Point of Sale',icon:'M4 3h13v18H4z M17 8h3v8h-3 M8 21h5',show:()=>CAN.usePOS(me().role)},
  {key:'inventory',label:'Inventory',icon:'M4 6h16v14H4z M4 6l2-3h12l2 3 M9 13h6',show:()=>true},
  {key:'ingredients',label:'Ingredients',icon:'M12 3c2 4 5 5 5 9a5 5 0 0 1-10 0c0-4 3-5 5-9z M12 12a3 3 0 0 1 3 3 M12 21v-3',show:()=>true},
  {key:'sales',label:'Sales History',icon:'M4 4h16v16H4z M4 9h16 M9 4v5 M15 4v5',show:()=>true},
  {key:'customers',label:'Customers',icon:'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M4 21c0-4 4-6 8-6s8 2 8 6',show:()=>true},
  {key:'attendance',label:'Time In/Out',icon:'M12 7v5l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',show:()=>true},
  {key:'reports',label:'Reports',icon:'M4 20V10 M10 20V4 M16 20v-8 M22 20H2',show:()=>CAN.viewReports(me().role)},
  {key:'users',label:'Users',icon:'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M19 8v6 M22 11h-6',show:()=>CAN.manageUsers(me().role)},
  {key:'logs',label:'Activity Log',icon:'M12 8v4l3 2 M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z',show:()=>CAN.viewReports(me().role)},
];
const TITLES={dashboard:'Dashboard',pos:'Point of Sale',inventory:'Inventory',ingredients:'Ingredients',sales:'Sales History',customers:'Customers',attendance:'Time In/Out',reports:'Reports',users:'User Management',logs:'Activity Log'};
let current='dashboard';
function me(){return session()||{role:'cashier'}}
function requireEdit(){if(!CAN.editStock(me().role)){toast('Read-only — no add/edit access');return false}return true}
function requireDelete(){if(!CAN.deleteStock(me().role)){toast('Delete not allowed for your role');return false}return true}
function renderNav(){
  const nav=$('#nav');
  nav.innerHTML=NAV.filter(n=>n.show()).map(n=>
    `<div class="ni ${n.key===current?'active':''}" onclick="go('${n.key}')"><svg viewBox="0 0 24 24"><path d="${n.icon}"/></svg>${n.label}</div>`
  ).join('');
}
function go(k){hideToast();if(k==='pos'&&!CAN.usePOS(me().role))k='dashboard';if(k==='reports'&&!CAN.viewReports(me().role))k='dashboard';if(k==='users'&&!CAN.manageUsers(me().role))k='dashboard';if(k==='logs'&&!CAN.viewReports(me().role))k='dashboard';current=k;renderNav();$('#pageTitle').textContent=TITLES[k];
  const fns={dashboard:renderDashboard,pos:renderPOS,inventory:renderInventory,ingredients:renderIngredients,sales:renderSales,customers:renderCustomers,attendance:renderAttendance,reports:renderReports,users:renderUsers,logs:renderLogs};
  fns[k]();if(k==='pos')setTimeout(()=>$('#posSearch')?.focus(),60)}

/* --- auth --- */
function doLogin(){
  if(!DB)return toast('Connecting to database…');
  const u=$('#logUser').value.trim(),p=$('#logPass').value.trim(),db=load();
  const user=db.users.find(x=>x.username.toLowerCase()===u.toLowerCase()&&x.password===p);
  if(!user){$('#loginErr').style.display='block';return}
  localStorage.setItem(SESSION_KEY,JSON.stringify({id:user.id,name:user.name,username:user.username,role:user.role}));
  syncDbTools();
  $('#login').style.display='none';$('#app').style.display='block';
  $('#userName').textContent=user.name;$('#userRole').textContent=ROLE_LABEL[user.role];
  $('#userAvatar').textContent=(user.name||'?').trim().charAt(0).toUpperCase();
  go('dashboard');toast('Welcome back, '+user.name.split(' ')[0]+'!')
}
function doLogout(){localStorage.removeItem(SESSION_KEY);syncDbTools();$('#app').style.display='none';$('#login').style.display='flex';$('#logUser').value='';$('#logPass').value='';$('#loginErr').style.display='none';current='dashboard'}
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&getComputedStyle($('#login')).display!=='none'&&document.activeElement.id?.startsWith('log'))doLogin()});

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

/* ============================================================
   POS
   ============================================================ */
let cart=[],cartDiscount=0,cartCustomer='',orderType='Dine-in',catFilter='All',posQ='';
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
        <div class="cat-row">${itemCats().map(c=>`<div class="cat-pill ${catFilter===c?'active':''}" onclick="catFilter='${esc(c).replace(/'/g,"\\'")}';renderPOS()">${esc(c)} <span class="cnt">${catCounts[c]||0}</span></div>`).join('')}</div>
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
function addCart(id){if(!CAN.usePOS(me().role))return toast('No POS access');const db=load(),it=db.items.find(i=>i.id===id);if(!it||it.stock<=0)return toast('Out of stock');const has=cart.find(c=>c.id===id);if(has){if(has.qty+1>it.stock)return toast('Only '+it.stock+' available');has.qty++}else cart.push({id,name:it.name,price:it.price,qty:1});renderCart()}
function setQty(id,d){const db=load(),c=cart.find(x=>x.id===id),it=db.items.find(i=>i.id===id);if(!c)return;c.qty+=d;if(c.qty<=0)cart=cart.filter(x=>x.id!==id);else if(it&&c.qty>it.stock){c.qty=it.stock;toast('Max stock: '+it.stock)}renderCart()}
function rmCart(id){cart=cart.filter(x=>x.id!==id);renderCart()}
function clearCart(){cart=[];cartDiscount=0;cartCustomer='';renderCart()}
function renderCart(){
  const body=$('#cartBody'),foot=$('#cartFoot');if(!body)return;
  const db=load();
  if(!cart.length){body.innerHTML=`<div class="cart-empty"><b>Cart is empty</b>Tap a menu item to start</div>`}else{
    body.innerHTML=cart.map(c=>`<div class="cline"><div class="info"><b>${esc(c.name)}</b><span>PHP ${money0(c.price)} each</span></div><div class="amt">PHP ${money0(c.price*c.qty)}</div><div class="qty"><button onclick="setQty('${c.id}',-1)">&minus;</button><b>${c.qty}</b><button onclick="setQty('${c.id}',1)">+</button></div><button class="rm" onclick="rmCart('${c.id}')"><svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg></button></div>`).join('')}
  const t=cartTotals(),discPct=t.sub?t.disc/t.sub*100:0;
  foot.innerHTML=`
    <div class="ot-row">${['Dine-in','Take-out','Delivery'].map(ot=>`<div class="ot-btn ${orderType===ot?'active':''}" onclick="orderType='${ot}';renderCart()">${ot}</div>`).join('')}</div>
    <div class="cust-row"><span class="clbl">Customer</span><select id="custSel" onchange="cartCustomer=this.value"><option value="">Walk-in</option>${db.customers.map(c=>`<option value="${c.id}" ${cartCustomer===c.id?'selected':''}>${esc(c.name)}${c.phone?' \u00b7 '+esc(c.phone):''}</option>`).join('')}</select></div>
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
function checkout(){
  if(!CAN.usePOS(me().role))return toast('No POS access');
  if(!cart.length)return;const db=load(),t=cartTotals(),paid=parseFloat($('#cashInput')?.value)||0;
  const custSel=$('#custSel')?.value;let customer=null;
  if(custSel)customer=db.customers.find(c=>c.id===custSel);
  if(paid<t.total)return toast('Insufficient cash amount');
  for(const c of cart){
    const it=db.items.find(i=>i.id===c.id);
    for(const r of (it&&it.recipe)||[]){
      const batches=ingBatches(db,r.name),need=r.qty*c.qty;
      const avail=batches.reduce((s,g)=>s+Number(g.stock||0),0);
      if(avail<need)return toast('Not enough '+r.name+' ('+qty(avail)+' '+(batches[0]?.unit||'')+' left)');
    }
  }
  const trx={id:uid(),ref:refNo(),date:new Date().toISOString(),items:cart.map(c=>({name:c.name,qty:c.qty,price:c.price,line:0})),subtotal:t.sub,discount:t.disc,total:t.total,payment:paid,change:paid-t.total,cashier:me().name,cashierId:me().id,customer:customer?.name,customerId:customer?.id,orderType,status:'completed'};
  cart.forEach(c=>{const it=db.items.find(i=>i.id===c.id);if(it)it.stock=Math.max(0,it.stock-c.qty);for(const r of (it&&it.recipe)||[])deductIngredient(db,r.name,r.qty*c.qty)});
  db.transactions.push(trx);save(db);logAction('add','transaction',trx.id,trx.ref+' · PHP '+money0(trx.total),null,{ref:trx.ref,total:trx.total,items:trx.items});cart=[];cartDiscount=0;cartCustomer='';renderCart();renderNav();showReceiptModal(trx);toast('Order completed — '+trx.ref);
}

/* --- receipt --- */
function showReceiptModal(t){
  const db=load(),rows=t.items.map(i=>`<tr><td>${esc(i.name)}</td><td class="num">${i.qty}</td><td class="num" style="text-align:right">${money0(i.price)}</td><td class="num" style="text-align:right">${money0(i.qty*i.price)}</td></tr>`).join('');
  openModal(`<h3>${t.status==='cancelled'?'Voided Order':'Order Receipt'}</h3><div class="msub">${t.ref}</div>
    <div class="receipt" id="rcArea">
      <div class="rc"><b>DANIEL'S BARBECUE & RESTAURANT</b><div>Fast Food Restaurant &middot; Cabitehan Road, Cabuyao, Laguna</div><div>Tel: 0916 989 583</div></div>
      <div style="font-size:10.5px;margin-bottom:6px"><div>Ref: <b>${t.ref}</b> &nbsp; ${fmtDT(t.date)}</div><div>Cashier: ${esc(cashierName(t,db))}</div><div>Order: ${esc(t.orderType||'Dine-in')}</div>${t.customer?`<div>Customer: ${esc(t.customer)}</div>`:''}${t.status==='cancelled'?'<div style="color:#DC2626;font-weight:bold">VOIDED</div>':''}</div>
      <table><tr><th style="text-align:left">Item</th><th>Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Amount</th></tr>${rows}</table>
      <div class="tot"><div class="trow"><span>Subtotal</span><span>PHP ${money0(t.subtotal)}</span></div>${t.discount?`<div class="trow"><span>Discount</span><span>- PHP ${money0(t.discount)}</span></div>`:''}<div class="trow" style="font-weight:bold;font-size:12px"><span>TOTAL</span><span>PHP ${money0(t.total)}</span></div>${t.status==='completed'?`<div class="trow"><span>Cash</span><span>PHP ${money0(t.payment)}</span></div><div class="trow"><span>Change</span><span>PHP ${money0(t.change)}</span></div>`:''}</div>
      <div class="rc" style="border:none;padding-top:6px;margin-bottom:0"><div style="font-size:9px">Thank you for dining with us!</div></div>
    </div>
    <div class="mfoot"><button class="btn btn-ghost" onclick="closeModal()">Close</button><button class="btn" onclick="printReceipt()">Print</button></div>`,true);
  $('#printArea').innerHTML=$('#rcArea')?.outerHTML||'';
}
function printReceipt(){const a=$('#printArea');a.style.display='block';a.innerHTML=$('#rcArea')?.outerHTML||'';window.print();setTimeout(()=>{a.style.display='none'},200)}

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

/* ============================================================
   ATTENDANCE — time in / out, schedules, late / absent detection
   ============================================================ */
const PUNCH_LABEL={time_in:'TIME IN',lunch_out:'LUNCH OUT',lunch_in:'LUNCH IN',coffee_out:'COFFEE OUT',coffee_in:'COFFEE IN',time_out:'TIME OUT'};
const ATT_STATUS={in:'ON DUTY',lunch:'LUNCH BREAK',back:'BACK FROM LUNCH',coffee:'COFFEE BREAK',back2:'BACK FROM COFFEE',done:'DUTY DONE'};
const DAY_LIST=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
const SCHEDULABLE=r=>r==='cashier'||r==='inventory'||r==='staff';
let attDate=todayStr(),_schedCache={};
function localStamp(){const d=new Date(),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`}
function fmtClock(s){const m=String(s||'').match(/(\d{2}):(\d{2})/);if(!m)return '—';let h=+m[1];const ap=h>=12?'PM':'AM';h=h%12||12;return `${h}:${m[2]} ${ap}`}
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
  if(!sch)return{lb:'NO SCHEDULE',st:'mut',note:'Walang naka-set na schedule'};
  const activeDays=String((week===2?(sch.days2||sch.days):sch.days)||'').split(',');
  if(!activeDays.includes(day))return{lb:'DAY OFF',st:'mut',note:'Hindi naka-schedule ngayong araw (Week '+week+')'};
  const start=minsOfClock(sch.start_time),end=minsOfClock(sch.end_time),grace=Number(sch.grace_min||0);
  if(!row||!row.time_in)return{lb:'ABSENT',st:'bad',note:'Walang TIME IN sa scheduled day'};
  const tin=minsOfStamp(row.time_in),late=(tin==null||start==null)?null:tin-(start+grace);
  const tout=minsOfStamp(row.time_out),under=(tout==null||end==null)?null:end-tout;
  if(late!=null&&late>0)return{lb:'LATE '+late+'m',st:'bad',note:(under>0?'Undertime '+under+'m · ':'')+'Expected '+fmtClock(sch.start_time)};
  if(under!=null&&under>0)return{lb:'UNDERTIME '+under+'m',st:'warn',note:'Time out bago ang '+fmtClock(sch.end_time)};
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
      fetch(API+'?action=attendance&date='+encodeURIComponent(attDate),{cache:'no-store'}),
      fetch(API+'?action=schedules',{cache:'no-store'}),
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
        <b style="color:var(--ink)">LEGEND:</b> ON TIME = pasok ≤ start + grace &middot; LATE = lampas sa start + grace &middot; ABSENT = walang TIME IN kahit scheduled &middot; UNDERTIME = time out bago ang end &middot; DAY OFF = hindi scheduled<br>
        <b style="color:var(--ink)">2-WEEK CYCLE:</b> Week 1 = odd ISO weeks, Week 2 = even ISO weeks. Ang 'Sched' column ay para sa kasalukuyang week.
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
        <div class="tbl-wrap"><table><tr><th>User</th><th>Role</th><th>Sched</th><th>Expected</th><th>Time In</th><th>Lunch Out</th><th>Lunch In</th><th>Coffee Out</th><th>Coffee In</th><th>Time Out</th><th>Lunch</th><th>Coffee</th><th>Net</th><th>Status</th><th>Flag</th></tr>
          ${view.length?view.map(v=>{const r=v.r,b=attBreaks(r),net=r?.time_in&&r?.time_out?attMins(r.time_in,r.time_out)-(b.lunch||0)-(b.coffee||0):null;return`<tr><td><b>${esc(v.u.name)}</b><small style="display:block;color:var(--mut2);font-size:9px">@${esc(v.u.username)}</small></td><td>${esc(v.u.role)}</td><td style="font-size:9px;white-space:normal">${v.s?esc(String(week===2?(v.s.days2||v.s.days):v.s.days).replace(/,/g,' ')):'<span style="color:var(--mut2)">—</span>'}</td><td class="num" style="white-space:nowrap">${v.s?esc(fmtClock(v.s.start_time))+' – '+esc(fmtClock(v.s.end_time)):'—'}</td><td class="num">${esc(fmtClock(r?.time_in))}</td><td class="num">${esc(fmtClock(r?.lunch_out))}</td><td class="num">${esc(fmtClock(r?.lunch_in))}</td><td class="num">${esc(fmtClock(r?.coffee_out))}</td><td class="num">${esc(fmtClock(r?.coffee_in))}</td><td class="num">${esc(fmtClock(r?.time_out))}</td><td class="num">${fmtDur(b.lunch)}</td><td class="num">${fmtDur(b.coffee)}</td><td class="num"><b>${fmtDur(net)}</b></td><td><span class="pill ${r?.status==='done'?'ok':'info'}">${esc(ATT_STATUS[r?.status]||'NOT YET TIME IN')}</span></td><td><span class="pill ${v.f.st}" title="${esc(v.f.note)}">${esc(v.f.lb)}</span></td></tr>`}).join(''):'<tr><td colspan="15" class="card-empty">No users found</td></tr>'}
        </table></div></div>`;
  }catch(e){$('#content').innerHTML=`<div class="card"><div class="card-empty">Cannot load attendance — ${esc(e.message)}</div></div>`}
}
async function punch(type){
  const s=session()||{},u=(DB.users||[]).find(x=>x.id===s.id)||s;
  try{
    const j=await(await fetch(API+'?action=punch',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({type,ts:localStamp(),user_id:u.id,username:u.username||'',name:u.name||'',role:u.role||''})})).json();
    if(!j.ok)return toast(j.error||'Punch failed');
    logAction('punch','attendance',j.row.id,PUNCH_LABEL[type]+' · '+(u.name||''));
    toast(PUNCH_LABEL[type]+' recorded — '+fmtClock(j.row[type]));
    renderAttendance();
  }catch(e){toast('Cannot record punch — '+e.message)}
}
function scheduleList(){
  const me=session()||{};if(!CAN.manageSchedules(me.role))return toast('Superadmin / Client only');
  openModal(`<h3>Employee Schedules</h3><div class="msub">Cashier at Inventory lang ang may schedule. Set expected days and duty hours. LATE = TIME IN after start + grace. ABSENT = no TIME IN on a scheduled day.</div>
    <div class="tbl-wrap"><table><tr><th>User</th><th>Days (W1 / W2)</th><th>Hours</th><th>Grace</th><th></th></tr>
      ${(DB.users||[]).filter(u=>SCHEDULABLE(u.role)).map(u=>{const s=_schedCache[u.id];const d1=s?String(s.days).replace(/,/g,' '):'Not set',d2=s?String(s.days2||s.days).replace(/,/g,' '):'—';return`<tr><td><b>${esc(u.name)}</b><small style="display:block;color:var(--mut2);font-size:9px">@${esc(u.username)} · ${esc(ROLE_LABEL[u.role]||u.role)}</small></td><td style="font-size:9.5px;line-height:1.5"><span style="color:var(--mut2)">W1</span> ${esc(d1)}<br><span style="color:var(--mut2)">W2</span> ${esc(d2)}</td><td class="num">${s?esc(fmtClock(s.start_time))+'–'+esc(fmtClock(s.end_time)):'—'}</td><td class="num">${s?s.grace_min+'m':'—'}</td><td><button class="icon-btn edit" onclick="scheduleForm('${u.id}')" title="Edit schedule"><svg viewBox="0 0 24 24"><path d="M11 4H4v16h16v-7 M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg></button></td></tr>`}).join('')}
    </table></div><div class="mfoot"><button class="btn" onclick="closeModal()">Done</button></div>`,true);
}
function scheduleForm(id){
  const u=(DB.users||[]).find(x=>x.id===id);if(!u)return;
  if(!SCHEDULABLE(u.role))return toast('Cashier / Inventory lang ang may schedule');
  const s=_schedCache[id]||{},days=String(s.days||'Mon,Tue,Wed,Thu,Fri').split(','),days2=String(s.days2||s.days||'Mon,Tue,Wed,Thu,Fri').split(',');
  const dayBox=(prefix,picked)=>`<div style="display:flex;gap:6px;flex-wrap:wrap">${DAY_LIST.map(d=>`<label class="cat-pill day-check ${picked.includes(d)?'active':''}"><input type="checkbox" id="${prefix}_${d}" value="${d}" ${picked.includes(d)?'checked':''} onchange="this.parentElement.classList.toggle('active',this.checked)">${d}</label>`).join('')}</div>`;
  openModal(`<h3>Schedule · ${esc(u.name)}</h3><div class="msub">@${esc(u.username)} · ${esc(ROLE_LABEL[u.role]||u.role)} · 2-week cycle</div>
    <div class="field"><label>Week 1 — odd weeks</label>${dayBox('sch_w1_day',days)}</div>
    <div class="field"><label>Week 2 — even weeks</label>${dayBox('sch_w2_day',days2)}<div style="font-size:9px;color:var(--mut2);margin-top:5px">Kung walang pipiliin, Week 1 ang gagamitin.</div></div>
    <div class="row2"><div class="field"><label>Time In</label><input type="time" id="sch_start" value="${esc(s.start_time||'08:00')}"></div><div class="field"><label>Time Out</label><input type="time" id="sch_end" value="${esc(s.end_time||'17:00')}"></div></div>
    <div class="field"><label>Grace period (minutes)</label><input type="number" id="sch_grace" min="0" max="240" value="${s.grace_min??10}"></div>
    <div class="mfoot"><button class="btn btn-ghost" onclick="scheduleList()">← Back</button><button class="btn" onclick="saveSchedule('${id}')">Save schedule</button></div>`,true);
}
async function saveSchedule(id){
  const u=(DB.users||[]).find(x=>x.id===id);if(!u)return;
  if(!SCHEDULABLE(u.role))return toast('Cashier / Inventory lang ang may schedule');
  const days=DAY_LIST.filter(d=>$('#sch_w1_day_'+d)?.checked);
  const days2=DAY_LIST.filter(d=>$('#sch_w2_day_'+d)?.checked);
  if(!days.length)return toast('Pumili ng kahit isang araw sa Week 1');
  const start=$('#sch_start').value,end=$('#sch_end').value,grace=Number($('#sch_grace').value||0);
  if(!start||!end)return toast('Time in at time out required');
  try{
    const j=await(await fetch(API+'?action=schedule-save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({user_id:id,days,days2,start_time:start,end_time:end,grace_min:grace})})).json();
    if(!j.ok)return toast(j.error||'Cannot save schedule');
    const before=_schedCache[id]?JSON.parse(JSON.stringify(_schedCache[id])):null;
    _schedCache[id]=j.row;
    logAction('edit','schedule',id,u.name+' · W1:'+days.join(',')+' · W2:'+(days2.length?days2.join(','):'same')+' · '+fmtClock(start)+'–'+fmtClock(end),before,j.row);
    closeModal();renderAttendance();toast('Schedule saved — '+u.name);
  }catch(e){toast('Cannot save schedule — '+e.message)}
}

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

/* ============================================================
   USERS
   ============================================================ */
function renderUsers(){
  const db=load(),meU=session();
  $('#content').innerHTML=`
    <div class="toolrow"><span class="pill info">Superadmin only</span><div class="spacer"></div><button class="btn btn-sm" onclick="userForm()">+ Add User</button></div>
    <div class="tbl-wrap"><table><tr><th>User</th><th>Username</th><th>Role</th><th>Access</th><th style="text-align:right">Actions</th></tr>
      ${db.users.map(u=>{const access=u.role==='superadmin'?'Full access':u.role==='client'?'Sales, Inventory, Customers, Reports':u.role==='inventory'?'Add/edit inventory (no delete, no POS)':'POS only, inventory view';
        return`<tr><td><b>${esc(u.name)}</b> ${u.id===meU?.id?'<span class="pill info">YOU</span>':''}</td><td class="num">${esc(u.username)}</td><td><span class="pill ${u.role==='superadmin'?'mut':u.role==='client'?'info':'warn'}">${ROLE_LABEL[u.role]}</span></td><td style="color:var(--mut)">${access}</td><td><div class="act"><button class="icon-btn edit" onclick="userForm('${u.id}')"><svg viewBox="0 0 24 24"><path d="M11 4H4v16h16v-7 M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg></button>${u.id!==meU?.id?`<button class="icon-btn del" onclick="delUser('${u.id}')"><svg viewBox="0 0 24 24"><path d="M3 6h18 M8 6V4h8v2 M6 6l1 14h10l1-14"/></svg></button>`:''}</div></td></tr>`}).join('')}
    </table></div>`;
}
function userForm(id){const db=load(),u=id?db.users.find(x=>x.id===id):null;
  openModal(`<h3>${u?'Edit':'Add'} User</h3><div class="msub">${u?'Update account':'Create user account'}</div>
    <div class="field"><label>Name *</label><input id="u_name" value="${esc(u?.name||'')}"></div>
    <div class="row2"><div class="field"><label>Username *</label><input id="u_user" value="${esc(u?.username||'')}"></div><div class="field"><label>Password ${u?'(blank to keep)':'*'}</label><input id="u_pass" type="text"></div></div>
    <div class="field"><label>Role</label><select id="u_role" style="width:100%;padding:11px;border:1.5px solid var(--border);border-radius:11px;background:var(--surface);font-weight:700"><option value="superadmin" ${u?.role==='superadmin'?'selected':''}>Superadmin</option><option value="client" ${u?.role==='client'?'selected':''}>Client</option><option value="cashier" ${u?.role==='cashier'||u?.role==='staff'?'selected':''}>Cashier</option><option value="inventory" ${u?.role==='inventory'?'selected':''}>Inventory</option></select></div>
    <div class="mfoot"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn" onclick="saveUser('${u?u.id:''}')">${u?'Save':'Add'}</button></div>`);
}
function saveUser(id){const name=$('#u_name').value.trim(),usr=$('#u_user').value.trim(),pass=$('#u_pass').value,role=$('#u_role').value;if(!name||!usr)return toast('Name and username required');const db=load(),before=id?JSON.parse(JSON.stringify(db.users.find(x=>x.id===id)||{})):null;const clean=u=>u?Object.assign({},u,{password:'***'}):u;let uid2;
  if(id){const u=db.users.find(x=>x.id===id);if(db.users.some(x=>x.username.toLowerCase()===usr.toLowerCase()&&x.id!==id))return toast('Username taken');u.name=name;u.username=usr;u.role=role;if(pass)u.password=pass;uid2=u.id;
    if(u.id===session()?.id){const s=session();s.role=role;s.name=name;localStorage.setItem(SESSION_KEY,JSON.stringify(s))}toast('User updated')}
  else{if(!pass)return toast('Password required');if(db.users.some(x=>x.username.toLowerCase()===usr.toLowerCase()))return toast('Username taken');const u={id:uid(),username:usr,password:pass,name,role};db.users.push(u);uid2=u.id;toast('User added')}
  save(db);logAction(id?'edit':'add','user',uid2,usr+' · '+ROLE_LABEL[role],clean(before),clean(db.users.find(u=>u.id===uid2)));closeModal();renderUsers()}
function delUser(id){const db=load(),u=db.users.find(x=>x.id===id);if(u.role==='superadmin'&&db.users.filter(x=>x.role==='superadmin').length<=1)return toast("Can't delete only superadmin");
  openModal(`<h3>Delete User?</h3><div class="msub">"${esc(u.name)}" will lose access.</div><div class="mfoot"><button class="btn btn-ghost" onclick="closeModal()">Cancel</button><button class="btn btn-danger" onclick="confirmDelUser('${id}')">Delete</button></div>`)}
function confirmDelUser(id){const db=load(),u=db.users.find(x=>x.id===id),before=u?Object.assign({},u,{password:'***'}):null;db.users=db.users.filter(x=>x.id!==id);save(db);logAction('delete','user',id,u?.username||id,before);closeModal();renderUsers();toast('User deleted')}

/* ============================================================
   MODAL
   ============================================================ */
function openModal(html,wide){$('#modalBox').className='modal'+(wide?' wide':'');$('#modalBox').innerHTML=html;$('#overlay').classList.add('show')}
function closeModal(){$('#overlay').classList.remove('show')}
document.querySelectorAll('.overlay').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)closeModal()}));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});

/* ============================================================
   INIT
   ============================================================ */
function localData(){try{const r=JSON.parse(localStorage.getItem(DB_KEY));return r&&r.items?r:null}catch(e){return null}}
async function boot(){
  dbStatus('saving','Connecting…');
  try{
    const r=await fetch(API+'?action=bootstrap',{cache:'no-store'});
    const j=await r.json();
    if(!j.ok)throw new Error(j.error||'Database error');
    if(await pushQueued()){
      const fresh=await (await fetch(API+'?action=bootstrap',{cache:'no-store'})).json();
      DB=fresh.db;dbStatus('ok','MySQL connected');
      toast('Queued changes synced to MySQL');
    }else if(j.empty){
      DB=j.db;
      dbStatus('err','Database empty');
      const err=$('#loginErr');if(err){err.style.display='block';err.textContent='Database walang users — i-import ang app\\database.sql sa phpMyAdmin.'}
      toast('Database empty — import database.sql');
    }else{DB=j.db;dbStatus('ok','MySQL connected')}
  }catch(e){
    console.error('[POS] MySQL bootstrap failed:',e);
    OFFLINE=true;
    let old=null;try{const q=localStorage.getItem(OFFLINE_KEY);if(q)old=JSON.parse(q)}catch(e){}
    if(!old)old=localData();
    DB=old?migrate(old):emptyDB();
    dbStatus('err','DB offline — queued');
    if(!old){const err=$('#loginErr');if(err){err.style.display='block';err.textContent='DB offline at walang local data — i-import ang database.sql.'}}
  }
  const s=session();
  if(s){const db=load();if(db.users.find(u=>u.id===s.id)){syncDbTools();$('#login').style.display='none';$('#app').style.display='block';$('#userName').textContent=s.name;$('#userRole').textContent=ROLE_LABEL[s.role];$('#userAvatar').textContent=(s.name||'?').trim().charAt(0).toUpperCase();go('dashboard');return}localStorage.removeItem(SESSION_KEY)}
  syncDbTools();$('#login').style.display='flex';$('#logUser').focus();
}
setInterval(()=>{const el=$('#clock');if(el){const d=new Date();el.innerHTML=d.toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'})+'<em>'+d.toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})+'</em>'}},1000);
boot();
