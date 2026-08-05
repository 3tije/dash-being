const btn=document.getElementById('menuBtn');const nav=document.getElementById('navMenu');btn.addEventListener('click',()=>nav.classList.toggle('open'));document.querySelectorAll('#navMenu a').forEach(a=>a.addEventListener('click',()=>nav.classList.remove('open')));
document.addEventListener("DOMContentLoaded",()=>{
 const c=window.BEING_CONFIG||{};
 const set=(id,url)=>{const el=document.getElementById(id);if(el&&url)el.href=url};
 set("dashboardConsultation",c.CONSULTATION_URL);
 set("dashboardHds",c.LMS_URL);
 set("dashboardVoice",c.VOICE_URL);
});
