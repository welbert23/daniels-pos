/* ============================================================
   MODULE: 00-core.js
   core - constants, helpers, categories, MySQL layer, audit, migration
   ============================================================ */

/* ============================================================
   SALES & INVENTORY POS - Point of Sales & Inventory Management System
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
let _catColorCache={key:'',map:{}};
function hslHex(h,s,l){
  s/=100;l/=100;
  const k=n=>(n+h/30)%12;
  const a=s*Math.min(l,1-l);
  const f=n=>l-a*Math.max(-1,Math.min(k(n)-3,9-k(n),1));
  const v=n=>Math.round(255*f(n)).toString(16).padStart(2,'0');
  return '#'+v(0)+v(8)+v(4);
}
function catColorAt(i){
  const hue=(i*137.508)%360,tier=Math.floor(i/360);
  return hslHex(hue,68-(tier%3)*8,38+(Math.floor(tier/3)%2)*12);
}
function catColorMap(){
  const db=load(),cats=[];
  const push=c=>{if(c&&!cats.some(x=>x.toLowerCase()===String(c).toLowerCase()))cats.push(c)};
  (db.itemCats||[]).forEach(push);
  (db.items||[]).forEach(i=>push(i.category));
  (db.ingCats||[]).forEach(push);
  (db.ingredients||[]).forEach(g=>push(g.category));
  const key=cats.join('\u0001');
  if(_catColorCache.key===key)return _catColorCache.map;
  const map={};cats.forEach((c,i)=>map[c]=catColorAt(i));
  _catColorCache={key,map};
  return map;
}
function catColor(c){return catColorMap()[c]||'#6B7280'}
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
const IS_GH_PAGES = /\.github\.io$/i.test(location.hostname);
const IS_LOCAL = location.protocol === 'file:' || /^(localhost|127\.0\.0\.1)$/i.test(location.hostname);
const IS_TUNNEL = /\.trycloudflare\.com$/i.test(location.hostname);
const API_QUERY = new URLSearchParams(location.search).get('api');
if (API_QUERY) localStorage.setItem('sipos_api_url', API_QUERY);
if (IS_GH_PAGES) history.replaceState(null, '', location.pathname);
const API = IS_GH_PAGES
  ? (API_QUERY || window.POS_API_URL || localStorage.getItem('sipos_api_url') || 'api.php')
  : IS_LOCAL
    ? 'http://localhost/pos-server/api.php'
    : IS_TUNNEL
      ? '/pos-server/api.php'
      : 'api.php';
const TOKEN_KEY = 'sipos_token_v1';
function authToken(){return localStorage.getItem(TOKEN_KEY)||''}
function authHeaders(extra={}){return Object.assign({'Content-Type':'application/json','X-POS-Token':authToken()},extra||{})}
async function apiFetch(action,opts={}){
  const r=await fetch(API+'?action='+action,Object.assign({cache:'no-store'},opts,{headers:authHeaders(opts.headers||{})}));
  if(r.status===401){
    localStorage.removeItem(TOKEN_KEY);localStorage.removeItem(SESSION_KEY);
    const e=new Error('Session expired');e.name='SessionExpired';throw e;
  }
  return r;
}
const OFFLINE_KEY='sipos_offline_queue_v1';
let DB=null, OFFLINE=false, _syncTimer=null, _syncing=false, _dirty=false;

function emptyDB(){return{meta:{seq:0,seed:''},itemCats:[],ingCats:[],items:[],ingredients:[],transactions:[],customers:[],users:[]}}
function load(){if(!DB)DB=emptyDB();return DB}
function session(){try{return JSON.parse(localStorage.getItem(SESSION_KEY))}catch(e){return null}}
const SIDE_HIDDEN_KEY='sipos_side_hidden_v1';
function applySidebar(){
  const hidden=localStorage.getItem(SIDE_HIDDEN_KEY)==='1';
  const app=$('#app');if(app)app.classList.toggle('sidebar-hidden',hidden);
  const btn=$('#sideToggle');
  if(btn){btn.setAttribute('aria-expanded',hidden?'false':'true');btn.title=hidden?'Show menu':'Hide menu';btn.setAttribute('aria-label',hidden?'Show menu':'Hide menu')}
}
function toggleSidebar(){
  const hidden=localStorage.getItem(SIDE_HIDDEN_KEY)!=='1';
  localStorage.setItem(SIDE_HIDDEN_KEY,hidden?'1':'0');
  applySidebar();
}

function dbStatus(kind,txt){const el=$('#dbChip');if(!el)return;el.className='dbchip '+kind;el.innerHTML='<i></i><span>'+txt+'</span>'}
function syncDbTools(){const el=$('#dbTools');if(!el)return;const s=session();el.style.display=s&&s.role==='superadmin'?'flex':'none'}
function requireSuper(){const s=session();if(!s||s.role!=='superadmin'){toast('Superadmin only');return false}return true}
function logAction(action,entity,entityId,summary,before,after){
  const s=session()||{},u=(DB?.users||[]).find(x=>x.id===s.id)||s;
  const payload={ts:new Date().toISOString(),actor_id:u.id||'',actor_name:u.name||'',actor_username:u.username||'',actor_role:u.role||'',action,entity,entity_id:String(entityId||''),summary:summary||'',before:before?JSON.stringify(before):null,after:after?JSON.stringify(after):null};
  apiFetch('audit',{method:'POST',body:JSON.stringify(payload),keepalive:true}).catch(e=>console.error('[POS] audit log failed:',e));
}
function save(db){DB=db;if(OFFLINE){localStorage.setItem(OFFLINE_KEY,JSON.stringify(db));dbStatus('err','DB offline — queued');return}_dirty=true;dbStatus('pending','Saving…');clearTimeout(_syncTimer);_syncTimer=setTimeout(()=>flushDB(),100)}
async function flushDB(force){
  if(OFFLINE||!DB||_syncing||(!_dirty&&!force))return;
  _syncing=true;_dirty=false;
  const snapshot=JSON.stringify(DB);
  dbStatus('saving','Saving…');
  try{
    const r=await apiFetch('save',{method:'POST',body:snapshot});
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
    const r=await apiFetch('save',{method:'POST',body:q});
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
    const r=await apiFetch('bootstrap');
    const j=await r.json();
    if(!j.ok)throw new Error(j.error||'Database error');
    OFFLINE=false;_dirty=false;clearTimeout(_syncTimer);
    if(await pushQueued())toast('Queued changes synced to MySQL');
    const fresh=await (await apiFetch('bootstrap')).json();
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

