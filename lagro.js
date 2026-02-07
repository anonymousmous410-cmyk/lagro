function goHome(){ window.scrollTo({top:0,behavior:'smooth'}); }
function openSubjects(){ console.log('open subjects'); }
function openProfilePage(){ console.log('open profile'); }
function toggleProfileMenu(e){ e.stopPropagation(); const m=document.getElementById('profile-menu'); if(m) m.classList.toggle('hidden'); }
document.addEventListener('click', ()=>{ const m=document.getElementById('profile-menu'); if(m) m.classList.add('hidden'); });
