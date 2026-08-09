(function(){
 const $=s=>document.querySelector(s);
 let surveys=[], current=null, accessCode="", accessKey="";
 const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));

 async function loadSurveys(){
   try{
     surveys=await BVAPI.call("public.listSurveys",{});
     $("#surveyList").innerHTML=surveys.length?surveys.map(s=>`
       <article class="survey-card">
         <span class="voice-kicker">${esc(s.category||"SURVEI BEING")}</span>
         <h3>${esc(s.title)}</h3>
         <p>${esc(s.description||"")}</p>
         <small>${Number(s.questionCount||0)} pertanyaan</small>
         <div style="margin-top:14px"><button class="voice-btn primary small" data-open="${esc(s.id)}">Isi Survei</button></div>
       </article>`).join(""):'<div class="loading-state">Belum ada survei publik yang aktif.</div>';
   }catch(e){$("#surveyList").innerHTML='<div class="loading-state">'+esc(e.message)+'</div>'}
 }
 function identityHtml(mode){
   if(mode==="anonymous")return "";
   const req=mode==="required"?"required":"";
   return `<div class="form-field"><label>Nama ${mode==="optional"?"(opsional)":""}</label><input class="form-control" id="respondentName" ${req}></div>
   <div class="form-field"><label>Kontak / Email (opsional)</label><input class="form-control" id="respondentContact"></div>`;
 }
 function qHtml(q){
   const req=q.required?"required":"", star=q.required?" *":"";
   if(q.type==="text")return `<div class="form-field"><label>${esc(q.text)}${star}</label><input class="form-control" name="${q.id}" ${req}></div>`;
   if(q.type==="textarea")return `<div class="form-field"><label>${esc(q.text)}${star}</label><textarea class="form-control" name="${q.id}" ${req}></textarea></div>`;
   if(q.type==="file"){
     const cfg=(q.options&&q.options[0])||{}, accept=cfg.accept||".pdf,.jpg,.jpeg,.png,.doc,.docx", max=cfg.maxMb||5;
     return `<div class="form-field"><label>${esc(q.text)}${star}</label>
       <input class="form-control" type="file" name="${q.id}" data-qid="${q.id}" accept="${esc(accept)}" ${req}>
       <small>Format: ${esc(accept)} · Maksimum ${esc(max)} MB</small></div>`;
   }
   let opts=q.options||[];
   if(q.type==="yesno")opts=["Ya","Tidak"];
   if(q.type==="scale5")opts=["1","2","3","4","5"];
   if(q.type==="scale10")opts=["1","2","3","4","5","6","7","8","9","10"];
   const type=q.type==="checkbox"?"checkbox":"radio";
   return `<fieldset class="form-field"><legend>${esc(q.text)}${star}</legend>`+opts.map(o=>`<label class="option"><input type="${type}" name="${q.id}" value="${esc(o)}" ${req}><span>${esc(o)}</span></label>`).join("")+`</fieldset>`;
 }
 async function openSurvey(id){
   try{
     current=await BVAPI.call("public.getSurvey",{surveyId:id,accessCode,accessKey});
   }catch(e){
     if(String(e.message).includes("KODE_AKSES_DIPERLUKAN")){
       const c=prompt("Masukkan kode akses survei:");
       if(!c)return; accessCode=c;
       current=await BVAPI.call("public.getSurvey",{surveyId:id,accessCode});
     }else throw e;
   }
   $("#surveyId").value=current.id;
   $("#modalCategory").textContent=current.category||"SURVEI BEING";
   $("#modalTitle").textContent=current.title;
   $("#modalDescription").textContent=current.description||"";
   $("#identityFields").innerHTML=identityHtml(current.identityMode);
   $("#questionFields").innerHTML=(current.questions||[]).map(qHtml).join("");
   $("#submitNotice").innerHTML="";
   $("#surveyModal").classList.add("open"); $("#surveyModal").setAttribute("aria-hidden","false");
 }
 function close(){ $("#surveyModal").classList.remove("open"); $("#surveyModal").setAttribute("aria-hidden","true"); $("#surveyForm").reset(); current=null; }
 function fileToBase64(file){
   return new Promise((resolve,reject)=>{
     const r=new FileReader();
     r.onload=()=>resolve(String(r.result).split(",")[1]||"");
     r.onerror=reject; r.readAsDataURL(file);
   });
 }
 async function submit(e){
   e.preventDefault(); if(!current)return;
   const btn=$("#submitSurvey"); btn.disabled=true; btn.textContent="Mengirim…";
   try{
     const answers={};
     for(const q of current.questions||[]){
       if(q.type==="checkbox"){
         answers[q.id]=[...document.querySelectorAll(`[name="${q.id}"]:checked`)].map(x=>x.value);
       }else if(q.type==="radio"||q.type==="yesno"||q.type==="scale5"||q.type==="scale10"){
         const x=document.querySelector(`[name="${q.id}"]:checked`); answers[q.id]=x?x.value:"";
       }else if(q.type==="file"){
         const input=document.querySelector(`[name="${q.id}"]`), file=input&&input.files&&input.files[0];
         if(file){
           const cfg=(q.options&&q.options[0])||{}, max=Number(cfg.maxMb||5);
           if(file.size>max*1024*1024)throw new Error(`Berkas "${q.text}" melebihi ${max} MB.`);
           const base64=await fileToBase64(file);
           const meta=await BVAPI.call("public.uploadFile",{surveyId:current.id,questionId:q.id,fileName:file.name,mimeType:file.type,base64,accessCode,accessKey});
           answers[q.id]=meta;
         }else answers[q.id]="";
       }else{
         const x=document.querySelector(`[name="${q.id}"]`); answers[q.id]=x?x.value:"";
       }
     }
     await BVAPI.call("public.submitResponse",{surveyId:current.id,respondentName:$("#respondentName")?.value||"",respondentContact:$("#respondentContact")?.value||"",answers,userAgent:navigator.userAgent,accessCode,accessKey});
     $("#submitNotice").innerHTML='<div class="notice success">Terima kasih. Jawaban dan berkas Anda sudah diterima.</div>';
     setTimeout(close,1200);
   }catch(err){$("#submitNotice").innerHTML='<div class="notice error">'+esc(err.message)+'</div>'}
   finally{btn.disabled=false;btn.textContent="Kirim Suara Anda"}
 }
 document.addEventListener("click",e=>{
   const b=e.target.closest("[data-open]"); if(b)openSurvey(b.dataset.open).catch(err=>alert(err.message));
 });
 $("#closeModal")?.addEventListener("click",close); $("#cancelSurvey")?.addEventListener("click",close);
 $("#surveyForm")?.addEventListener("submit",submit);
 const qs=new URLSearchParams(location.search); accessKey=qs.get("key")||""; accessCode=qs.get("code")||"";
 loadSurveys();
})();