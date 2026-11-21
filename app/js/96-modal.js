/* ============================================================
   MODULE: 96-modal.js
   modal helpers
   ============================================================ */
/* ============================================================
   MODAL
   ============================================================ */
function openModal(html,wide){$('#modalBox').className='modal'+(wide?' wide':'');$('#modalBox').innerHTML=html;$('#overlay').classList.add('show')}
function closeModal(){$('#overlay').classList.remove('show')}
document.querySelectorAll('.overlay').forEach(o=>o.addEventListener('click',e=>{if(e.target===o)closeModal()}));
document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});

