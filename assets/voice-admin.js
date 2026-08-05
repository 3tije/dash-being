const A=s=>document.querySelector(s);
let token=sessionStorage.getItem("beingAdminToken")||"",surveys=[],currentQuestions=[],currentResponses=[];
const esc=v=>String(v??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]));
const api=(action,payload={})=>BeingAPI.request(action,payload,token);

function setView(loggedIn){
 A("#loginView").hidden=loggedIn;
 A("#adminView").hidden=!loggedIn;
 document.body.scrollTop=0;document.documentElement.scrollTop=0;
}
setView(false);

A("#loginForm").onsubmit=async e=>{
 e.preventDefault();A("#loginNotice").innerHTML="";
 try{
  const data=await BeingAPI.request("admin.login",{pin:A("#adminPin").value});
  token=data.token;sessionStorage.setItem("beingAdminToken",token);setView(true);await refreshAll();
 }catch(err){A("#loginNotice").innerHTML=`<div class="notice error">${esc(err.message)}</div>`}
};
A("#logoutBtn").onclick=()=>{sessionStorage.removeItem("beingAdminToken");token="";setView(false);A("#adminPin").value=""};

document.querySelectorAll("[data-panel]").forEach(btn=>btn.onclick=()=>{
 document.querySelectorAll("[data-panel]").forEach(b=>b.classList.remove("active"));btn.classList.add("active");
 document.querySelectorAll(".admin-panel").forEach(p=>p.classList.remove("active"));
 A("#panel-"+btn.dataset.panel).classList.add("active");A("#panelTitle").textContent=btn.textContent;
});

async function refreshAll(){surveys=await api("admin.listSurveys");renderOverview();renderSurveyTable();fillSurveySelects()}
function renderOverview(){
 const total=surveys.length,active=surveys.filter(x=>x.status==="active").length,responses=surveys.reduce((n,x)=>n+Number(x.responseCount||0),0),questions=surveys.reduce((n,x)=>n+Number(x.questionCount||0),0);
 A("#statsGrid").innerHTML=[["Total Survei",total],["Aktif",active],["Pertanyaan",questions],["Total Respon",responses]].map(x=>`<article class="stat-card"><small>${x[0]}</small><strong>${x[1]}</strong></article>`).join("");
 A("#recentSurveys").innerHTML=surveys.slice(0,5).map(s=>`<div class="question-item"><b>${esc(s.title)}</b><small>${esc(s.category||"-")} • ${s.responseCount||0} respon • ${labelAccess(s.accessMode)}</small></div>`).join("")||'<div class="empty-state">Belum ada survei.</div>';
}
function chip(status){return `<span class="status-chip ${status}">${status==="active"?"AKTIF":status==="draft"?"DRAF":"DITUTUP"}</span>`}
function labelAccess(m){return m==="link"?"Link Khusus":m==="code"?"Kode Akses":"Publik"}
function renderSurveyTable(){
 A("#surveyTable").innerHTML=surveys.map(s=>`<tr>
 <td><b>${esc(s.title)}</b><br><small>${esc(s.description||"")}</small></td>
 <td>${esc(s.category||"-")}<br><small>${labelAccess(s.accessMode)}</small></td><td>${chip(s.status)}</td>
 <td>${s.questionCount||0}</td><td>${s.responseCount||0}</td>
 <td><div class="inline-actions">
 <button class="voice-btn secondary small" onclick="editSurvey('${s.id}')">Edit</button>
 <button class="voice-btn secondary small" onclick="manageQuestions('${s.id}')">Pertanyaan</button>
 <button class="voice-btn primary small" onclick="shareSurvey('${s.id}')">WhatsApp</button>
 <button class="voice-btn secondary small" onclick="copySurveyLink('${s.id}')">Salin Link</button>
 <button class="voice-btn danger small" onclick="deleteSurvey('${s.id}')">Hapus</button>
 </div></td></tr>`).join("");
}
function fillSurveySelects(){
 const opts=surveys.map(s=>`<option value="${s.id}">${esc(s.title)}</option>`).join("");
 A("#builderSurvey").innerHTML=opts;A("#resultSurvey").innerHTML=opts;
 if(surveys.length){loadQuestions(A("#builderSurvey").value);loadResults(A("#resultSurvey").value)}
 else{A("#questionList").innerHTML='<div class="empty-state">Buat survei terlebih dahulu.</div>';A("#resultSummary").innerHTML='<div class="empty-state">Belum ada hasil.</div>'}
}
function openEditor(s=null){
 A("#surveyEditor").classList.add("open");A("#editorTitle").textContent=s?"Edit Survei":"Buat Survei";
 A("#editSurveyId").value=s?.id||"";A("#editTitle").value=s?.title||"";A("#editDescription").value=s?.description||"";
 A("#editCategory").value=s?.category||"";A("#editIdentity").value=s?.identityMode||"anonymous";
 A("#editStatus").value=s?.status||"draft";A("#editEndDate").value=s?.endDate||"";
 A("#editAccessMode").value=s?.accessMode||"public";A("#editAccessCode").value=s?.accessCode||"";
 toggleCodeField();
}
function closeEditor(){A("#surveyEditor").classList.remove("open")}
A("#newSurveyBtn").onclick=()=>openEditor();A("#newSurveyBtn2").onclick=()=>openEditor();A("#closeEditor").onclick=closeEditor;A("#cancelEditor").onclick=closeEditor;
A("#editAccessMode").onchange=toggleCodeField;
function toggleCodeField(){A("#accessCodeWrap").style.display=A("#editAccessMode").value==="code"?"block":"none"}
A("#generateCodeBtn").onclick=()=>A("#editAccessCode").value="BEING"+Math.floor(1000+Math.random()*9000);
window.editSurvey=id=>openEditor(surveys.find(x=>x.id===id));
A("#surveyEditorForm").onsubmit=async e=>{
 e.preventDefault();
 const payload={id:A("#editSurveyId").value,title:A("#editTitle").value,description:A("#editDescription").value,category:A("#editCategory").value,identityMode:A("#editIdentity").value,status:A("#editStatus").value,endDate:A("#editEndDate").value,accessMode:A("#editAccessMode").value,accessCode:A("#editAccessCode").value};
 try{await api("admin.saveSurvey",payload);closeEditor();await refreshAll()}catch(err){alert(err.message)}
};
window.deleteSurvey=async id=>{if(confirm("Hapus survei beserta seluruh pertanyaan dan responsnya?")){await api("admin.deleteSurvey",{surveyId:id});await refreshAll()}};
window.manageQuestions=id=>{document.querySelector('[data-panel="builder"]').click();A("#builderSurvey").value=id;loadQuestions(id)};

function shareUrl(s){
 const base=new URL("suara-anda.html",location.href);
 base.searchParams.set("s",s.id);
 if(s.accessMode==="link")base.searchParams.set("k",s.shareKey);
 return base.toString();
}
window.copySurveyLink=async id=>{
 const s=surveys.find(x=>x.id===id),url=shareUrl(s);
 await navigator.clipboard.writeText(url);alert("Link survei telah disalin.");
};
window.shareSurvey=id=>{
 const s=surveys.find(x=>x.id===id),url=shareUrl(s);
 let text=`*BEING Voice*\n\n${s.title}\n${s.description||""}\n\nSilakan isi melalui:\n${url}`;
 if(s.accessMode==="code")text+=`\n\nKode akses: *${s.accessCode}*`;
 text+=`\n\nTerima kasih telah menyampaikan suara Anda.`;
 window.open("https://wa.me/?text="+encodeURIComponent(text),"_blank","noopener");
};

A("#builderSurvey").onchange=e=>loadQuestions(e.target.value);
async function loadQuestions(surveyId){
 if(!surveyId)return;currentQuestions=await api("admin.listQuestions",{surveyId});
 A("#questionCount").textContent=`${currentQuestions.length} pertanyaan`;
 A("#questionList").innerHTML=currentQuestions.map((q,i)=>`<div class="question-item"><b>${i+1}. ${esc(q.text)}</b><small>${esc(q.type)} • ${q.required?"wajib":"opsional"}</small><div class="inline-actions" style="margin-top:10px"><button class="voice-btn secondary small" onclick="editQuestion('${q.id}')">Edit</button><button class="voice-btn danger small" onclick="deleteQuestion('${q.id}')">Hapus</button></div></div>`).join("")||'<div class="empty-state">Belum ada pertanyaan.</div>';
}
A("#questionType").onchange=()=>A("#optionsWrap").style.display=["radio","checkbox"].includes(A("#questionType").value)?"block":"none";
A("#questionForm").onsubmit=async e=>{
 e.preventDefault();const surveyId=A("#builderSurvey").value;if(!surveyId)return alert("Pilih survei.");
 const payload={id:A("#questionId").value,surveyId,text:A("#questionText").value,type:A("#questionType").value,required:A("#questionRequired").checked,options:A("#questionOptions").value.split("\n").map(x=>x.trim()).filter(Boolean)};
 try{await api("admin.saveQuestion",payload);e.target.reset();A("#questionId").value="";A("#questionType").dispatchEvent(new Event("change"));await loadQuestions(surveyId);await refreshAll()}catch(err){alert(err.message)}
};
window.editQuestion=id=>{const q=currentQuestions.find(x=>x.id===id);A("#questionId").value=q.id;A("#questionText").value=q.text;A("#questionType").value=q.type;A("#questionRequired").checked=q.required;A("#questionOptions").value=(q.options||[]).join("\n");A("#questionType").dispatchEvent(new Event("change"));scrollTo({top:0,behavior:"smooth"})};
window.deleteQuestion=async id=>{if(confirm("Hapus pertanyaan ini?")){await api("admin.deleteQuestion",{questionId:id});await loadQuestions(A("#builderSurvey").value);await refreshAll()}};

A("#resultSurvey").onchange=e=>loadResults(e.target.value);
async function loadResults(surveyId){
 if(!surveyId)return;const data=await api("admin.getResults",{surveyId});currentResponses=data.responses||[];
 A("#resultSummary").innerHTML=(data.summary||[]).map(item=>{
  if(item.type==="text"||item.type==="textarea")return `<div class="chart-block"><h3>${esc(item.question)}</h3><p>${item.answerCount} jawaban teks</p></div>`;
  const max=Math.max(1,...item.options.map(x=>x.count));
  return `<div class="chart-block"><h3>${esc(item.question)}</h3>${item.options.map(o=>`<div class="bar-row"><span>${esc(o.label)}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.round(o.count/max*100)}%"></div></div><b>${o.count}</b></div>`).join("")}</div>`;
 }).join("")||'<div class="empty-state">Belum ada respons untuk survei ini.</div>';
 renderResponses(data);
}
function renderResponses(data){
 const qs=data.questions||[],rows=data.responses||[];
 A("#responsesTable").innerHTML=rows.length?`<table class="admin-table"><thead><tr><th>Waktu</th><th>Nama</th>${qs.map(q=>`<th>${esc(q.text)}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr><td>${esc(r.timestamp)}</td><td>${esc(r.respondentName||"Anonim")}</td>${qs.map(q=>`<td>${esc(Array.isArray(r.answers[q.id])?r.answers[q.id].join(", "):r.answers[q.id]||"")}</td>`).join("")}</tr>`).join("")}</tbody></table>`:'<div class="empty-state">Belum ada respons.</div>';
}
A("#exportCsvBtn").onclick=()=>{
 if(!currentResponses.length)return alert("Belum ada data.");
 const allQ=[...new Set(currentResponses.flatMap(r=>Object.keys(r.answers||{})))];
 const rows=[["Waktu","Nama","Kontak",...allQ],...currentResponses.map(r=>[r.timestamp,r.respondentName,r.respondentContact,...allQ.map(q=>Array.isArray(r.answers[q])?r.answers[q].join("|"):r.answers[q]||"")])];
 const csv=rows.map(row=>row.map(v=>`"${String(v??"").replace(/"/g,'""')}"`).join(",")).join("\n");
 const a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download="being-voice-respons.csv";a.click();
};

(async()=>{
 if(token&&BeingAPI.configured()){
  try{await api("admin.verify");setView(true);await refreshAll()}
  catch(e){sessionStorage.removeItem("beingAdminToken");token="";setView(false)}
 }
 A("#questionType").dispatchEvent(new Event("change"));
})();
