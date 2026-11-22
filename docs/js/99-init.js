/* ============================================================
   MODULE: 99-init.js
   bootstrap / init
   ============================================================ */
/* ============================================================
   INIT
   ============================================================ */
function localData(){try{const r=JSON.parse(localStorage.getItem(DB_KEY));return r&&r.items?r:null}catch(e){return null}}
async function boot(){
  applySidebar();
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
      const err=$('#loginErr');if(err){err.style.display='block';err.textContent='Database has no users — import app\\database.sql in phpMyAdmin.'}
      toast('Database empty — import database.sql');
    }else{DB=j.db;dbStatus('ok','MySQL connected')}
  }catch(e){
    console.error('[POS] MySQL bootstrap failed:',e);
    OFFLINE=true;
    let old=null;try{const q=localStorage.getItem(OFFLINE_KEY);if(q)old=JSON.parse(q)}catch(e){}
    if(!old)old=localData();
    DB=old?migrate(old):emptyDB();
    dbStatus('err','DB offline — queued');
    if(!old){const err=$('#loginErr');if(err){err.style.display='block';err.textContent='Database offline with no local data — import database.sql, or open this page with a ?api=<tunnel URL> parameter.'}}
  }
  const s=session();
  if(s){const db=load();if(db.users.find(u=>u.id===s.id)){syncDbTools();$('#login').style.display='none';$('#app').style.display='block';$('#userName').textContent=s.name;$('#userRole').textContent=ROLE_LABEL[s.role];$('#userAvatar').textContent=(s.name||'?').trim().charAt(0).toUpperCase();go('dashboard');return}localStorage.removeItem(SESSION_KEY)}
  syncDbTools();$('#login').style.display='flex';$('#logUser').focus();
}
setInterval(()=>{const el=$('#clock');if(el){const d=new Date();el.innerHTML=d.toLocaleTimeString('en-PH',{hour:'2-digit',minute:'2-digit'})+'<em>'+d.toLocaleDateString('en-PH',{month:'short',day:'numeric',year:'numeric'})+'</em>'}},1000);
boot();
