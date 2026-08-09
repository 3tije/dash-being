(function(){
 const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
 let token=sessionStorage.getItem("bv_token")||"", surveys=[], questions=[];
 const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
 const api=(a,p={})=>BVAPI.call(a,p,token);

 function showPanel(name){
   $$(".admin-panel").forEach(x=>x.classList.toggle("active",x.id==="panel-"+name));
   $$(".admin-menu [data-panel]").forEach(x=>x.classList.toggle("active",x.dataset.panel===name));
   const map={overview:"Ringkasan",surveys:"Kelola formulir",builder:"Pertanyaan",results:"Hasil & Grafik"};
   $("#panelTitle").textContent=map[name]||"BEING Voice";
   if(name==="results")loadResults();
 }
 async function verify(){
   if(!token)return;
   try{await api("admin.verify"); $("#loginView").hidden=true;$("#adminView").hidden=false;await refresh()}
   catch(e){token="";sessionStorage.removeItem("bv_token")}
 }
 async function login(e){
   e.preventDefault();
   try{
     const d=await BVAPI.call("admin.login",{pin:$("#adminPin").value}); token=d.token;sessionStorage.setItem("bv_token",token);
     $("#loginView").hidden=true;$("#adminView").hidden=false;await refresh();
   }catch(err){$("#loginNotice").innerHTML='<div class="notice error">'+esc(err.message)+'</div>'}
 }
 async function refresh(){
   surveys=await api("admin.listSurveys");
   renderOverview();renderSurveys();fillSelects();
 }
 function renderOverview(){
   const active=surveys.filter(s=>s.status==="active").length, responses=surveys.reduce((a,s)=>a+Number(s.responseCount||0),0);
   $("#statsGrid").innerHTML=`<div class="stat-card"><b>${surveys.length}</b><span>Total formulir</span></div><div class="stat-card"><b>${active}</b><span>Aktif</span></div><div class="stat-card"><b>${responses}</b><span>Total respons</span></div>`;
   $("#recentSurveys").innerHTML=surveys.slice(0,5).map(s=>`<div class="result-row"><b>${esc(s.title)}</b><span>${esc(s.status)} · ${s.responseCount||0} respons</span></div>`).join("")||"Belum ada formulir.";
 }
 function renderSurveys(){
   $("#surveyTable").innerHTML=surveys.map(s=>`<tr><td>${esc(s.title)}</td><td>${esc(s.category||"-")}</td><td>${esc(s.status)}</td><td>${s.questionCount||0}</td><td>${s.responseCount||0}</td><td><button class="voice-btn primary small" data-share-survey="${s.id}">Bagikan</button> <button class="voice-btn secondary small" data-edit-survey="${s.id}">Edit</button> <button class="voice-btn secondary small" data-del-survey="${s.id}">Hapus</button></td></tr>`).join("");
 }
 function fillSelects(){
   const opt=surveys.map(s=>`<option value="${s.id}">${esc(s.title)}</option>`).join("");
   $("#builderSurvey").innerHTML=opt;$("#resultSurvey").innerHTML=opt;
   if(surveys.length)loadQuestions();
 }
 function openEditor(s){
   $("#surveyEditor").classList.add("open"); $("#editorTitle").textContent=s?"Edit formulir":"Buat formulir";
   $("#editSurveyId").value=s?.id||"";$("#editTitle").value=s?.title||"";$("#editDescription").value=s?.description||"";$("#editCategory").value=s?.category||"";
   $("#editAccessMode").value=s?.accessMode||"public";$("#editAccessCode").value=s?.accessCode||"";$("#editIdentity").value=s?.identityMode||"anonymous";$("#editStatus").value=s?.status||"draft";$("#editEndDate").value=s?.endDate||"";
   accessMode();
 }
 function closeEditor(){ $("#surveyEditor").classList.remove("open");}
 function accessMode(){ $("#accessCodeWrap").style.display=$("#editAccessMode").value==="code"?"block":"none"; }
 async function saveSurvey(e){
   e.preventDefault();
   await api("admin.saveSurvey",{id:$("#editSurveyId").value,title:$("#editTitle").value,description:$("#editDescription").value,category:$("#editCategory").value,accessMode:$("#editAccessMode").value,accessCode:$("#editAccessCode").value,identityMode:$("#editIdentity").value,status:$("#editStatus").value,endDate:$("#editEndDate").value});
   closeEditor();await refresh();
 }
 async function loadQuestions(){
   const sid=$("#builderSurvey").value;if(!sid)return;
   questions=await api("admin.listQuestions",{surveyId:sid});
   $("#questionCount").textContent=questions.length+" pertanyaan";
   $("#questionList").innerHTML=questions.map((q,i)=>`<div class="question-builder-item"><b>${i+1}. ${esc(q.text)}</b><small>${esc(q.type)}${q.required?" · wajib":""}</small><div><button class="voice-btn secondary small" data-edit-q="${q.id}">Edit</button> <button class="voice-btn secondary small" data-del-q="${q.id}">Hapus</button></div></div>`).join("")||"Belum ada pertanyaan.";
 }
 function typeChanged(){
   const t=$("#questionType").value;
   $("#optionsWrap").hidden=!["radio","checkbox"].includes(t);
   $("#fileSettingsWrap").hidden=t!=="file";
 }
 function resetQuestion(){
   $("#questionForm").reset();$("#questionId").value="";typeChanged();
 }
 async function saveQuestion(e){
   e.preventDefault();
   const t=$("#questionType").value;
   let options=[];
   if(["radio","checkbox"].includes(t))options=$("#questionOptions").value.split(/\n/).map(x=>x.trim()).filter(Boolean);
   if(t==="file")options=[{accept:$("#fileAccept").value,maxMb:Number($("#fileMaxMb").value||5)}];
   await api("admin.saveQuestion",{id:$("#questionId").value,surveyId:$("#builderSurvey").value,text:$("#questionText").value,type:t,required:$("#questionRequired").checked,options});
   resetQuestion();await loadQuestions();await refresh();
 }
 async function loadResults(){
   const sid=$("#resultSurvey").value;if(!sid){$("#resultSummary").innerHTML="";$("#responsesTable").innerHTML="";return}
   const d=await api("admin.getResults",{surveyId:sid});
   $("#resultSummary").innerHTML=(d.summary||[]).map(s=>`<div class="chart-card"><b>${esc(s.question)}</b><span>${s.options?s.options.map(o=>esc(o.label)+": "+o.count).join(" · "):(s.answerCount||0)+" jawaban"}</span></div>`).join("");
   const qmap={};(d.questions||[]).forEach(q=>qmap[q.id]=q.text);
   const rows=(d.responses||[]).map(r=>{
     const ans=Object.entries(r.answers||{}).map(([qid,v])=>{
       let show=v;
       if(v&&typeof v==="object"&&!Array.isArray(v)&&v.url) show=`<a href="${esc(v.url)}" target="_blank" rel="noopener">📎 ${esc(v.name||"Buka berkas")}</a>`;
       else if(Array.isArray(v)) show=esc(v.join(", "));
       else show=esc(v);
       return `<div><b>${esc(qmap[qid]||qid)}:</b> ${show}</div>`;
     }).join("");
     return `<tr><td>${esc(r.timestamp)}</td><td>${esc(r.respondentName||"Anonim")}</td><td>${esc(r.respondentContact||"-")}</td><td>${ans}</td></tr>`;
   }).join("");
   $("#responsesTable").innerHTML=`<table class="admin-table"><thead><tr><th>Waktu</th><th>Nama</th><th>Kontak</th><th>Jawaban / Berkas</th></tr></thead><tbody>${rows}</tbody></table>`;
 }
 function exportCsv(){
   const sid=$("#resultSurvey").value;if(!sid)return;
   api("admin.getResults",{surveyId:sid}).then(d=>{
     const qs=d.questions||[], head=["timestamp","respondentName","respondentContact",...qs.map(q=>q.text)];
     const lines=[head,...(d.responses||[]).map(r=>[r.timestamp,r.respondentName,r.respondentContact,...qs.map(q=>{const v=r.answers?.[q.id];return v&&v.url?v.url:Array.isArray(v)?v.join(" | "):(v??"")})])];
     const csv=lines.map(row=>row.map(v=>'"'+String(v??"").replace(/"/g,'""')+'"').join(",")).join("\n");
     const a=document.createElement("a");a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv"}));a.download="being-voice.csv";a.click();URL.revokeObjectURL(a.href);
   });
 }

 function surveyShareData(s){
   const u=new URL("suara-anda.html",location.href);
   u.searchParams.set("survey",s.id);
   const mode=s.accessMode||"public";
   if(mode==="link" && s.shareKey) u.searchParams.set("key",s.shareKey);

   let text=`${s.title}\n\nSilakan isi formulir BEING melalui link berikut:\n${u.toString()}`;
   if(mode==="code" && s.accessCode){
     text+=`\n\nKode akses: ${s.accessCode}`;
   }
   return {url:u.toString(),text};
 }

 async function shareSurvey(s){
   const d=surveyShareData(s);
   if(navigator.share){
     try{
       await navigator.share({title:s.title,text:d.text});
       return;
     }catch(err){
       if(err && err.name==="AbortError") return;
     }
   }
   try{
     await navigator.clipboard.writeText(d.text);
     alert("Link formulir sudah disalin. Silakan tempel ke WhatsApp, email, atau media lainnya.");
   }catch(err){
     prompt("Salin link formulir berikut:",d.text);
   }
 }
 document.addEventListener("click",async e=>{
   const p=e.target.closest("[data-panel]");if(p)showPanel(p.dataset.panel);
   if(e.target.matches("[data-share-survey]")){
     const s=surveys.find(x=>x.id===e.target.dataset.shareSurvey);
     if(s)await shareSurvey(s);
   }
   if(e.target.matches("[data-edit-survey]"))openEditor(surveys.find(s=>s.id===e.target.dataset.editSurvey));
   if(e.target.matches("[data-del-survey]")&&confirm("Hapus formulir dan seluruh responsnya?")){await api("admin.deleteSurvey",{surveyId:e.target.dataset.delSurvey});await refresh()}
   if(e.target.matches("[data-edit-q]")){
     const q=questions.find(x=>x.id===e.target.dataset.editQ);if(!q)return;
     $("#questionId").value=q.id;$("#questionText").value=q.text;$("#questionType").value=q.type;$("#questionRequired").checked=!!q.required;
     if(["radio","checkbox"].includes(q.type))$("#questionOptions").value=(q.options||[]).join("\n");
     if(q.type==="file"){const c=(q.options&&q.options[0])||{};$("#fileAccept").value=c.accept||".pdf,.jpg,.jpeg,.png,.doc,.docx";$("#fileMaxMb").value=String(c.maxMb||5)}
     typeChanged();
   }
   if(e.target.matches("[data-del-q]")&&confirm("Hapus pertanyaan ini?")){await api("admin.deleteQuestion",{questionId:e.target.dataset.delQ});await loadQuestions();await refresh()}
 });
 $("#loginForm").addEventListener("submit",login);$("#logoutBtn").addEventListener("click",()=>{sessionStorage.removeItem("bv_token");location.reload()});
 $("#newSurveyBtn").addEventListener("click",()=>openEditor(null));$("#newSurveyBtn2").addEventListener("click",()=>openEditor(null));$("#closeEditor").addEventListener("click",closeEditor);$("#cancelEditor").addEventListener("click",closeEditor);
 $("#surveyEditorForm").addEventListener("submit",saveSurvey);$("#editAccessMode").addEventListener("change",accessMode);$("#generateCodeBtn").addEventListener("click",()=>$("#editAccessCode").value="BEING"+Math.floor(1000+Math.random()*9000));
 $("#builderSurvey").addEventListener("change",loadQuestions);$("#questionType").addEventListener("change",typeChanged);$("#questionForm").addEventListener("submit",saveQuestion);
 $("#resultSurvey").addEventListener("change",loadResults);$("#exportCsvBtn").addEventListener("click",exportCsv);
 typeChanged(); verify();
})();
