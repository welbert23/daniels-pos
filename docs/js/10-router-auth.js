/* ============================================================
   MODULE: 10-router-auth.js
   routing + login / logout
   ============================================================ */
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

