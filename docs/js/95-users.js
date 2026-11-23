/* ============================================================
   MODULE: 95-users.js
   user management
   ============================================================ */
/* ============================================================
   USERS
   ============================================================ */
function renderUsers(){
  const db=load(),meU=session();
  $('#content').innerHTML=`
    <div class="toolrow"><span class="pill info">Superadmin only</span><div class="spacer"></div><button class="btn btn-sm" onclick="userForm()">+ Add User</button></div>
    <div class="tbl-wrap tbl-compact"><table><tr><th>User</th><th>Username</th><th>Role</th><th>Access</th><th style="text-align:right">Actions</th></tr>
      ${db.users.map(u=>{const access=u.role==='superadmin'?'Full access':u.role==='client'?'Sales, Inventory, Customers, Reports':u.role==='inventory'?'Add/edit inventory (no delete, no POS)':'POS only, inventory view';
        return`<tr><td><b>${esc(u.name)}</b> ${u.id===meU?.id?'<span class="pill info">YOU</span>':''}</td><td class="num">${esc(u.username)}</td><td><span class="pill ${u.role==='superadmin'?'mut':u.role==='client'?'info':'warn'}">${ROLE_LABEL[u.role]}</span></td><td style="color:var(--mut)">${access}</td><td><div class="act"><button class="icon-btn edit" onclick="userForm('${u.id}')"><svg viewBox="0 0 24 24"><path d="M11 4H4v16h16v-7 M18.5 2.5a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z"/></svg></button>${u.id!==meU?.id?`<button class="icon-btn del" onclick="delUser('${u.id}')"><svg viewBox="0 0 24 24"><path d="M3 6h18 M8 6V4h8v2 M6 6l1 14h10l1-14"/></svg></button>`:''}</div></td></tr>`}).join('')}
    </table></div>`;
}
function userForm(id){const db=load(),u=id?db.users.find(x=>x.id===id):null;
  openModal(`<h3>${u?'Edit':'Add'} User</h3><div class="msub">${u?'Update account':'Create user account'}</div>
    <div class="field"><label>Name *</label><input id="u_name" value="${esc(u?.name||'')}"></div>
    <div class="row2"><div class="field"><label>Username *</label><input id="u_user" value="${esc(u?.username||'')}"></div><div class="field"><label>Password ${u?'(blank to keep)':'*'}</label><input id="u_pass" type="text"></div></div>
    <div class="field"><label>Role</label><select id="u_role" style="width:100%;padding:11px;border:1.5px solid var(--border);border-radius:11px;background:var(--surface);font-weight:700"><option value="superadmin" ${u?.role==='superadmin'?'selected':''}>Superadmin</option><option value="client" ${u?.role==='client'?'selected':''}>Client</option><option value="cashier" ${u?.role==='cashier'?'selected':''}>Cashier</option><option value="inventory" ${u?.role==='inventory'?'selected':''}>Inventory</option></select></div>
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

