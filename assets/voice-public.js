const $ = s => document.querySelector(s);
const listEl = $("#surveyList");
const modal = $("#surveyModal");
let activeSurvey = null;
let directSurveyId = new URLSearchParams(location.search).get("s") || "";
let directKey = new URLSearchParams(location.search).get("k") || "";
let directCode = "";

const demoSurveys = [{
  id:"DEMO-1", title:"Tema Human Development Series Berikutnya",
  description:"Bantu BEING menentukan topik pembelajaran yang paling dibutuhkan.",
  category:"Human Development", identityMode:"optional", responseCount:0, accessMode:"public",
  questions:[
    {id:"Q1",text:"Tema apa yang paling Anda butuhkan?",type:"checkbox",required:true,options:["Kepemimpinan","Komunikasi Efektif","Kesehatan Mental","Konseling Dasar","Pemberdayaan Masyarakat"]},
    {id:"Q2",text:"Waktu pelaksanaan yang paling sesuai?",type:"radio",required:true,options:["Pagi","Siang","Malam","Akhir pekan"]},
    {id:"Q3",text:"Masukan untuk BEING",type:"textarea",required:false,options:[]}
  ]
}];

function esc(v){return String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));}

async function loadSurveys(){
  if(directSurveyId){
    await loadDirectSurvey();
    return;
  }
  try{
    const surveys = BeingAPI.configured() ? await BeingAPI.request("public.listSurveys") : demoSurveys;
    renderSurveys(surveys);
  }catch(err){
    listEl.innerHTML = `<div class="empty-state"><b>Survei belum dapat dimuat.</b><p>${esc(err.message)}</p></div>`;
  }
}

async function loadDirectSurvey(){
  if(!BeingAPI.configured()){
    activeSurvey=demoSurveys[0]; openLoadedSurvey(); return;
  }
  try{
    activeSurvey=await BeingAPI.request("public.getSurvey",{surveyId:directSurveyId,accessKey:directKey,accessCode:directCode});
    openLoadedSurvey();
  }catch(err){
    const msg=String(err.message||"");
    if(msg.includes("KODE_AKSES_DIPERLUKAN") || msg.includes("kode akses")){
      showCodeGate();
    }else{
      listEl.innerHTML=`<div class="empty-state"><b>Survei tidak dapat dibuka.</b><p>${esc(msg)}</p><a class="voice-btn secondary" href="suara-anda.html">Lihat survei publik</a></div>`;
    }
  }
}
function showCodeGate(){
  listEl.innerHTML=`<div class="access-gate">
    <span class="voice-kicker">SURVEI KHUSUS BEING</span>
    <h2>Masukkan kode akses</h2>
    <p>Survei ini hanya dapat diisi oleh peserta yang memperoleh kode dari admin BEING.</p>
    <form id="accessCodeForm">
      <div class="form-field"><label>Kode akses</label><input id="accessCodeInput" class="form-control" required autocomplete="one-time-code"></div>
      <div id="codeNotice"></div>
      <button class="voice-btn primary" style="width:100%" type="submit">Buka Survei</button>
    </form>
  </div>`;
  $("#accessCodeForm").onsubmit=async e=>{
    e.preventDefault();
    directCode=$("#accessCodeInput").value.trim();
    $("#codeNotice").innerHTML="";
    try{
      activeSurvey=await BeingAPI.request("public.getSurvey",{surveyId:directSurveyId,accessCode:directCode});
      openLoadedSurvey();
    }catch(err){
      $("#codeNotice").innerHTML=`<div class="notice error">${esc(err.message)}</div>`;
    }
  };
}
function renderSurveys(items){
  if(!items.length){listEl.innerHTML=`<div class="empty-state">Belum ada jajak pendapat publik yang aktif saat ini.</div>`;return;}
  listEl.innerHTML=items.map(s=>`
    <article class="survey-card">
      <span class="badge">${esc(s.category||"SUARA ANDA")}</span>
      <h3>${esc(s.title)}</h3>
      <p>${esc(s.description||"Sampaikan pendapat Anda kepada BEING.")}</p>
      <div class="survey-meta"><span>${Number(s.questionCount||0)} pertanyaan</span><span>${Number(s.responseCount||0)} respon</span></div>
      <button class="voice-btn primary" data-open="${esc(s.id)}">Isi Jajak Pendapat</button>
    </article>`).join("");
  document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>openSurvey(b.dataset.open));
}
async function openSurvey(id){
  try{
    activeSurvey = BeingAPI.configured()
      ? await BeingAPI.request("public.getSurvey",{surveyId:id})
      : demoSurveys.find(x=>x.id===id);
    openLoadedSurvey();
  }catch(err){alert(err.message)}
}
function openLoadedSurvey(){
  $("#surveyId").value=activeSurvey.id;
  $("#modalCategory").textContent=activeSurvey.category||"SURVEI BEING";
  $("#modalTitle").textContent=activeSurvey.title;
  $("#modalDescription").textContent=activeSurvey.description||"";
  renderIdentity(activeSurvey.identityMode);
  renderQuestions(activeSurvey.questions||[]);
  $("#submitNotice").innerHTML="";
  modal.classList.add("open");modal.setAttribute("aria-hidden","false");
}
function renderIdentity(mode){
  const el=$("#identityFields");
  if(mode==="anonymous"){el.innerHTML="";return}
  const req=mode==="required";
  el.innerHTML=`
    <div class="form-field"><label>Nama ${req?'<span class="required">*</span>':'(opsional)'}</label>
      <input class="form-control" name="respondentName" ${req?"required":""} maxlength="100"></div>
    <div class="form-field"><label>Email/WhatsApp (opsional)</label>
      <input class="form-control" name="respondentContact" maxlength="120"></div>`;
}
function renderQuestions(qs){$("#questionFields").innerHTML=qs.map((q,i)=>questionHTML(q,i)).join("");}
function questionHTML(q,i){
  const name=`q_${q.id}`, req=q.required?"required":"";
  let input="";
  if(q.type==="text") input=`<input class="form-control" name="${name}" ${req}>`;
  else if(q.type==="textarea") input=`<textarea class="form-control" name="${name}" ${req}></textarea>`;
  else if(q.type==="yesno"||q.type==="radio") input=`<div class="option-list">${(q.type==="yesno"?["Ya","Tidak"]:q.options||[]).map((o,j)=>`<label class="option"><input type="radio" name="${name}" value="${esc(o)}" ${req&&j===0?req:""}><span>${esc(o)}</span></label>`).join("")}</div>`;
  else if(q.type==="checkbox") input=`<div class="option-list">${(q.options||[]).map(o=>`<label class="option"><input type="checkbox" name="${name}" value="${esc(o)}"><span>${esc(o)}</span></label>`).join("")}</div>`;
  else if(q.type==="scale5"||q.type==="scale10"){
    const n=q.type==="scale5"?5:10;
    input=`<div class="scale-row">${Array.from({length:n},(_,x)=>x+1).map(x=>`<span class="scale-item"><input id="${name}_${x}" type="radio" name="${name}" value="${x}" ${req&&x===1?req:""}><label for="${name}_${x}">${x}</label></span>`).join("")}</div>`;
  } else input=`<input class="form-control" name="${name}">`;
  return `<div class="form-field"><label class="question-label">${i+1}. ${esc(q.text)} ${q.required?'<span class="required">*</span>':''}</label>${input}</div>`;
}
function closeModal(){modal.classList.remove("open");modal.setAttribute("aria-hidden","true");$("#surveyForm").reset()}
$("#closeModal").onclick=closeModal;$("#cancelSurvey").onclick=closeModal;
modal.addEventListener("click",e=>{if(e.target===modal)closeModal()});

$("#surveyForm").addEventListener("submit",async e=>{
  e.preventDefault();const btn=$("#submitSurvey");btn.disabled=true;btn.textContent="Mengirim…";
  try{
    const fd=new FormData(e.target),answers={};
    (activeSurvey.questions||[]).forEach(q=>{
      const vals=fd.getAll(`q_${q.id}`);
      answers[q.id]=q.type==="checkbox"?vals:(vals[0]||"");
      if(q.required&&(Array.isArray(answers[q.id])?answers[q.id].length===0:!answers[q.id]))throw new Error(`Pertanyaan "${q.text}" wajib dijawab.`);
    });
    const payload={surveyId:activeSurvey.id,accessKey:directKey,accessCode:directCode,respondentName:fd.get("respondentName")||"",respondentContact:fd.get("respondentContact")||"",answers,userAgent:navigator.userAgent};
    if(BeingAPI.configured())await BeingAPI.request("public.submitResponse",payload);
    $("#submitNotice").innerHTML=`<div class="notice success"><b>Terima kasih.</b><br>Suara Anda telah diterima oleh BEING.</div>`;
    setTimeout(closeModal,1800);
  }catch(err){$("#submitNotice").innerHTML=`<div class="notice error">${esc(err.message)}</div>`}
  finally{btn.disabled=false;btn.textContent="Kirim Suara Anda"}
});
loadSurveys();
