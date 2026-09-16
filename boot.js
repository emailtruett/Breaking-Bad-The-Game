// Show a usable message if graphics initialization fails, including when offline.
window.addEventListener('error',()=>{
 const loading=document.getElementById('loading');
 if(loading){const p=document.getElementById('loadtext');if(p)p.textContent='Nie udało się uruchomić grafiki. Otwórz mapę w aktualnej wersji Chrome lub Edge z włączoną akceleracją grafiki.';const line=loading.querySelector('.loader');if(line)line.style.display='none';}
});
