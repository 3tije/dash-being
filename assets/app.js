const btn=document.getElementById('menuBtn');
const nav=document.getElementById('navMenu');
if(btn&&nav){
  btn.addEventListener('click',()=>nav.classList.toggle('open'));
  document.querySelectorAll('#navMenu a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));
}

document.addEventListener("DOMContentLoaded",()=>{
  const cfg=window.BEING_CONFIG||{};
  document.querySelectorAll("[data-config-link]").forEach(el=>{
    const key=el.dataset.configLink;
    const url=(cfg[key]||"").trim();
    if(url) el.href=url;
    if(/^https?:\/\//i.test(url)){
      el.target="_blank";
      el.rel="noopener noreferrer";
    }
  });
});
