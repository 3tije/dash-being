/**
 * BEING Voice Backend — Google Apps Script
 * Database: Google Sheets
 *
 * Jalankan setupBeingVoice() satu kali dari editor Apps Script.
 * Setelah itu Deploy > New deployment > Web app:
 * Execute as: Me
 * Who has access: Anyone
 */

const BV = {
  sheets: {
    SURVEYS: "SURVEYS",
    QUESTIONS: "QUESTIONS",
    RESPONSES: "RESPONSES"
  },
  headers: {
    SURVEYS: ["id","title","description","category","identityMode","status","startDate","endDate","createdAt","updatedAt"],
    QUESTIONS: ["id","surveyId","text","type","required","optionsJson","sortOrder","createdAt","updatedAt"],
    RESPONSES: ["id","surveyId","timestamp","respondentName","respondentContact","answersJson","userAgent"]
  }
};

function setupBeingVoice(){
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  Object.keys(BV.sheets).forEach(k=>{
    const name=BV.sheets[k];
    let sh=ss.getSheetByName(name);
    if(!sh) sh=ss.insertSheet(name);
    const headers=BV.headers[k];
    sh.clear();
    sh.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight("bold").setBackground("#164f43").setFontColor("#ffffff");
    sh.setFrozenRows(1);
  });
  const props=PropertiesService.getScriptProperties();
  if(!props.getProperty("ADMIN_PIN")) props.setProperty("ADMIN_PIN","being123");
  props.setProperty("SPREADSHEET_ID",ss.getId());
  return "BEING Voice siap. PIN awal: being123";
}

function doGet(){
  return output_({ok:true,data:{service:"BEING Voice API",status:"ready"}});
}

function doPost(e){
  try{
    const req=JSON.parse((e.postData&&e.postData.contents)||"{}");
    const action=req.action||"", payload=req.payload||{}, token=req.token||"";
    const publicActions=["public.listSurveys","public.getSurvey","public.submitResponse"];
    if(publicActions.indexOf(action)<0) requireAdmin_(token);

    let data;
    switch(action){
      case "public.listSurveys": data=publicListSurveys_();break;
      case "public.getSurvey": data=publicGetSurvey_(payload.surveyId);break;
      case "public.submitResponse": data=publicSubmitResponse_(payload);break;
      case "admin.login": data=adminLogin_(payload.pin);break;
      case "admin.verify": data={valid:true};break;
      case "admin.listSurveys": data=adminListSurveys_();break;
      case "admin.saveSurvey": data=adminSaveSurvey_(payload);break;
      case "admin.deleteSurvey": data=adminDeleteSurvey_(payload.surveyId);break;
      case "admin.listQuestions": data=adminListQuestions_(payload.surveyId);break;
      case "admin.saveQuestion": data=adminSaveQuestion_(payload);break;
      case "admin.deleteQuestion": data=adminDeleteQuestion_(payload.questionId);break;
      case "admin.getResults": data=adminGetResults_(payload.surveyId);break;
      case "admin.changePin": data=adminChangePin_(payload.newPin);break;
      default: throw new Error("Aksi API tidak dikenal.");
    }
    return output_({ok:true,data:data});
  }catch(err){
    return output_({ok:false,message:err.message||String(err)});
  }
}

function output_(obj){
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function ss_(){
  const id=PropertiesService.getScriptProperties().getProperty("SPREADSHEET_ID");
  return id?SpreadsheetApp.openById(id):SpreadsheetApp.getActiveSpreadsheet();
}
function sh_(name){const sh=ss_().getSheetByName(name);if(!sh)throw new Error("Sheet "+name+" belum dibuat. Jalankan setupBeingVoice().");return sh}
function rows_(name){
  const sh=sh_(name), values=sh.getDataRange().getValues();
  if(values.length<2)return [];
  const headers=values.shift().map(String);
  return values.filter(r=>r.some(v=>v!=="")).map((r,i)=>{const o={_row:i+2};headers.forEach((h,j)=>o[h]=r[j]);return o});
}
function append_(name,obj){
  const headers=BV.headers[name], sh=sh_(name);
  sh.appendRow(headers.map(h=>obj[h]===undefined?"":obj[h]));
}
function updateRow_(name,row,obj){
  const headers=BV.headers[name],sh=sh_(name);
  sh.getRange(row,1,1,headers.length).setValues([headers.map(h=>obj[h]===undefined?"":obj[h])]);
}
function uid_(prefix){return prefix+"-"+Utilities.getUuid().split("-")[0].toUpperCase()}
function now_(){return new Date().toISOString()}
function clean_(o){const c=Object.assign({},o);delete c._row;return c}
function parseJson_(v,fallback){try{return JSON.parse(v||"")}catch(e){return fallback}}

function adminLogin_(pin){
  const stored=PropertiesService.getScriptProperties().getProperty("ADMIN_PIN")||"being123";
  if(String(pin)!==String(stored))throw new Error("PIN admin tidak sesuai.");
  const token=Utilities.getUuid();
  CacheService.getScriptCache().put("TOKEN_"+token,"1",21600);
  return {token:token};
}
function requireAdmin_(token){
  if(!token||!CacheService.getScriptCache().get("TOKEN_"+token))throw new Error("Sesi admin berakhir. Silakan masuk kembali.");
}
function adminChangePin_(pin){
  if(!pin||String(pin).length<6)throw new Error("PIN minimal 6 karakter.");
  PropertiesService.getScriptProperties().setProperty("ADMIN_PIN",String(pin));
  return {changed:true};
}

function countMap_(){
  const q=rows_("QUESTIONS"),r=rows_("RESPONSES"),map={};
  q.forEach(x=>{map[x.surveyId]=map[x.surveyId]||{q:0,r:0};map[x.surveyId].q++});
  r.forEach(x=>{map[x.surveyId]=map[x.surveyId]||{q:0,r:0};map[x.surveyId].r++});
  return map;
}
function surveyView_(s,map){
  return Object.assign(clean_(s),{questionCount:(map[s.id]||{}).q||0,responseCount:(map[s.id]||{}).r||0});
}
function publicListSurveys_(){
  const map=countMap_(),today=new Date();
  return rows_("SURVEYS").filter(s=>{
    if(s.status!=="active")return false;
    if(s.endDate&&new Date(s.endDate)<today)return false;
    return true;
  }).map(s=>surveyView_(s,map));
}
function publicGetSurvey_(id){
  const s=rows_("SURVEYS").find(x=>x.id===id&&x.status==="active");
  if(!s)throw new Error("Survei tidak tersedia atau sudah ditutup.");
  const qs=adminListQuestions_(id);
  return Object.assign(clean_(s),{questions:qs});
}
function publicSubmitResponse_(p){
  const s=rows_("SURVEYS").find(x=>x.id===p.surveyId&&x.status==="active");
  if(!s)throw new Error("Survei tidak aktif.");
  const qs=adminListQuestions_(p.surveyId),ans=p.answers||{};
  qs.forEach(q=>{
    const v=ans[q.id];
    if(q.required&&((Array.isArray(v)&&!v.length)||(!Array.isArray(v)&&!String(v||"").trim())))throw new Error("Masih ada pertanyaan wajib yang belum dijawab.");
  });
  append_("RESPONSES",{id:uid_("R"),surveyId:p.surveyId,timestamp:now_(),respondentName:p.respondentName||"",respondentContact:p.respondentContact||"",answersJson:JSON.stringify(ans),userAgent:p.userAgent||""});
  return {saved:true};
}

function adminListSurveys_(){
  const map=countMap_();
  return rows_("SURVEYS").sort((a,b)=>String(b.updatedAt).localeCompare(String(a.updatedAt))).map(s=>surveyView_(s,map));
}
function adminSaveSurvey_(p){
  if(!String(p.title||"").trim())throw new Error("Judul survei wajib diisi.");
  const all=rows_("SURVEYS"),old=p.id?all.find(x=>x.id===p.id):null,now=now_();
  const obj={id:old?old.id:uid_("S"),title:String(p.title).trim(),description:p.description||"",category:p.category||"",identityMode:p.identityMode||"anonymous",status:p.status||"draft",startDate:p.startDate||"",endDate:p.endDate||"",createdAt:old?old.createdAt:now,updatedAt:now};
  if(old)updateRow_("SURVEYS",old._row,obj);else append_("SURVEYS",obj);
  return clean_(obj);
}
function adminDeleteSurvey_(id){
  ["RESPONSES","QUESTIONS"].forEach(name=>{const sh=sh_(name);rows_(name).filter(x=>x.surveyId===id).sort((a,b)=>b._row-a._row).forEach(x=>sh.deleteRow(x._row))});
  const s=rows_("SURVEYS").find(x=>x.id===id);if(s)sh_("SURVEYS").deleteRow(s._row);
  return {deleted:true};
}
function adminListQuestions_(surveyId){
  return rows_("QUESTIONS").filter(x=>x.surveyId===surveyId).sort((a,b)=>Number(a.sortOrder)-Number(b.sortOrder)).map(x=>Object.assign(clean_(x),{required:String(x.required)==="true"||x.required===true,options:parseJson_(x.optionsJson,[])}));
}
function adminSaveQuestion_(p){
  if(!p.surveyId||!String(p.text||"").trim())throw new Error("Survei dan pertanyaan wajib diisi.");
  const all=rows_("QUESTIONS"),old=p.id?all.find(x=>x.id===p.id):null,now=now_(),order=old?old.sortOrder:all.filter(x=>x.surveyId===p.surveyId).length+1;
  const obj={id:old?old.id:uid_("Q"),surveyId:p.surveyId,text:String(p.text).trim(),type:p.type||"text",required:!!p.required,optionsJson:JSON.stringify(p.options||[]),sortOrder:order,createdAt:old?old.createdAt:now,updatedAt:now};
  if(old)updateRow_("QUESTIONS",old._row,obj);else append_("QUESTIONS",obj);
  return clean_(obj);
}
function adminDeleteQuestion_(id){const q=rows_("QUESTIONS").find(x=>x.id===id);if(q)sh_("QUESTIONS").deleteRow(q._row);return {deleted:true}}

function adminGetResults_(surveyId){
  const questions=adminListQuestions_(surveyId);
  const responses=rows_("RESPONSES").filter(x=>x.surveyId===surveyId).map(r=>({id:r.id,timestamp:r.timestamp,respondentName:r.respondentName,respondentContact:r.respondentContact,answers:parseJson_(r.answersJson,{})}));
  const summary=questions.map(q=>{
    const vals=responses.map(r=>r.answers[q.id]).filter(v=>v!==undefined&&v!==null&&v!=="");
    if(q.type==="text"||q.type==="textarea")return {question:q.text,type:q.type,answerCount:vals.length};
    const labels=(q.type==="yesno"?["Ya","Tidak"]:q.type==="scale5"?["1","2","3","4","5"]:q.type==="scale10"?["1","2","3","4","5","6","7","8","9","10"]:q.options||[]);
    const counts={};labels.forEach(x=>counts[String(x)]=0);
    vals.forEach(v=>(Array.isArray(v)?v:[v]).forEach(x=>{x=String(x);counts[x]=(counts[x]||0)+1}));
    return {question:q.text,type:q.type,options:Object.keys(counts).map(k=>({label:k,count:counts[k]}))};
  });
  return {questions:questions,responses:responses,summary:summary};
}
