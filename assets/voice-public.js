const $ = s => document.querySelector(s);
const listEl = $("#surveyList");
const modal = $("#surveyModal");
let activeSurvey = null;

const params = new URLSearchParams(location.search);
let directSurveyId = params.get("s") || "";
let directKey = params.get("k") || "";
let directCode = "";

function esc(v){
  return String(v ?? "").replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
}

function apiReady(){
  return window.BeingAPI && BeingAPI.configured();
}

function showConfigError(){
  listEl.innerHTML = `
    <div class="empty-state">
      <b>BEING Voice belum terhubung ke database.</b>
      <p>Periksa <code>assets/config.js</code> dan pastikan URL Apps Script berakhir dengan <code>/exec</code>.</p>
    </div>`;
}

async function loadSurveys(){
  if(!apiReady()){
    showConfigError();
    return;
  }

  if(directSurveyId){
    await loadDirectSurvey();
    return;
  }

  try{
    const surveys = await BeingAPI.request("public.listSurveys");
    renderSurveys(surveys || []);
  }catch(err){
    listEl.innerHTML = `
      <div class="empty-state">
        <b>Daftar survei belum dapat dimuat.</b>
        <p>${esc(err.message)}</p>
      </div>`;
  }
}

async function loadDirectSurvey(){
  try{
    activeSurvey = await BeingAPI.request("public.getSurvey", {
      surveyId: directSurveyId,
      accessKey: directKey,
      accessCode: directCode
    });
    openLoadedSurvey();
  }catch(err){
    const msg = String(err.message || "");
    if(msg.includes("KODE_AKSES_DIPERLUKAN") || msg.toLowerCase().includes("kode akses")){
      showCodeGate();
    }else{
      listEl.innerHTML = `
        <div class="empty-state">
          <b>Survei tidak dapat dibuka.</b>
          <p>${esc(msg)}</p>
          <a class="voice-btn secondary" href="suara-anda.html">Lihat survei publik</a>
        </div>`;
    }
  }
}

function showCodeGate(){
  listEl.innerHTML = `
    <div class="access-gate">
      <span class="voice-kicker">SURVEI KHUSUS BEING</span>
      <h2>Masukkan kode akses</h2>
      <p>Survei ini hanya dapat diisi oleh peserta yang memperoleh kode dari admin BEING.</p>
      <form id="accessCodeForm">
        <div class="form-field">
          <label>Kode akses</label>
          <input id="accessCodeInput" class="form-control" required autocomplete="one-time-code">
        </div>
        <div id="codeNotice"></div>
        <button class="voice-btn primary" style="width:100%" type="submit">Buka Survei</button>
      </form>
    </div>`;

  $("#accessCodeForm").onsubmit = async e => {
    e.preventDefault();
    directCode = $("#accessCodeInput").value.trim();
    $("#codeNotice").innerHTML = "";

    try{
      activeSurvey = await BeingAPI.request("public.getSurvey", {
        surveyId: directSurveyId,
        accessCode: directCode
      });
      openLoadedSurvey();
    }catch(err){
      $("#codeNotice").innerHTML =
        `<div class="notice error">${esc(err.message)}</div>`;
    }
  };
}

function renderSurveys(items){
  if(!items.length){
    listEl.innerHTML = `
      <div class="empty-state">
        Belum ada jajak pendapat publik yang aktif saat ini.
      </div>`;
    return;
  }

  listEl.innerHTML = items.map(s => `
    <article class="survey-card">
      <span class="badge">${esc(s.category || "SUARA ANDA")}</span>
      <h3>${esc(s.title)}</h3>
      <p>${esc(s.description || "Sampaikan pendapat Anda kepada BEING.")}</p>
      <div class="survey-meta">
        <span>${Number(s.questionCount || 0)} pertanyaan</span>
        <span>${Number(s.responseCount || 0)} respon</span>
      </div>
      <button class="voice-btn primary" data-open="${esc(s.id)}">
        Isi Jajak Pendapat
      </button>
    </article>`).join("");

  document.querySelectorAll("[data-open]").forEach(btn => {
    btn.onclick = () => openSurvey(btn.dataset.open);
  });
}

async function openSurvey(id){
  try{
    activeSurvey = await BeingAPI.request("public.getSurvey", {
      surveyId: id
    });
    openLoadedSurvey();
  }catch(err){
    alert(err.message);
  }
}

function openLoadedSurvey(){
  $("#surveyId").value = activeSurvey.id;
  $("#modalCategory").textContent = activeSurvey.category || "SURVEI BEING";
  $("#modalTitle").textContent = activeSurvey.title;
  $("#modalDescription").textContent = activeSurvey.description || "";
  renderIdentity(activeSurvey.identityMode);
  renderQuestions(activeSurvey.questions || []);
  $("#submitNotice").innerHTML = "";
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
}

function renderIdentity(mode){
  const el = $("#identityFields");
  if(mode === "anonymous"){
    el.innerHTML = "";
    return;
  }

  const required = mode === "required";

  el.innerHTML = `
    <div class="form-field">
      <label>Nama ${required ? '<span class="required">*</span>' : '(opsional)'}</label>
      <input class="form-control" name="respondentName"
        ${required ? "required" : ""} maxlength="100">
    </div>
    <div class="form-field">
      <label>Email/WhatsApp (opsional)</label>
      <input class="form-control" name="respondentContact" maxlength="120">
    </div>`;
}

function renderQuestions(questions){
  $("#questionFields").innerHTML =
    questions.map((q, i) => questionHTML(q, i)).join("");
}

function questionHTML(q, index){
  const name = `q_${q.id}`;
  const required = q.required ? "required" : "";
  let input = "";

  if(q.type === "text"){
    input = `<input class="form-control" name="${name}" ${required}>`;
  }else if(q.type === "textarea"){
    input = `<textarea class="form-control" name="${name}" ${required}></textarea>`;
  }else if(q.type === "yesno" || q.type === "radio"){
    const options = q.type === "yesno" ? ["Ya", "Tidak"] : (q.options || []);
    input = `<div class="option-list">${
      options.map((option, i) => `
        <label class="option">
          <input type="radio" name="${name}" value="${esc(option)}"
            ${q.required && i === 0 ? "required" : ""}>
          <span>${esc(option)}</span>
        </label>`).join("")
    }</div>`;
  }else if(q.type === "checkbox"){
    input = `<div class="option-list">${
      (q.options || []).map(option => `
        <label class="option">
          <input type="checkbox" name="${name}" value="${esc(option)}">
          <span>${esc(option)}</span>
        </label>`).join("")
    }</div>`;
  }else if(q.type === "scale5" || q.type === "scale10"){
    const max = q.type === "scale5" ? 5 : 10;
    input = `<div class="scale-row">${
      Array.from({length:max}, (_, i) => i + 1).map(value => `
        <span class="scale-item">
          <input id="${name}_${value}" type="radio" name="${name}"
            value="${value}" ${q.required && value === 1 ? "required" : ""}>
          <label for="${name}_${value}">${value}</label>
        </span>`).join("")
    }</div>`;
  }else{
    input = `<input class="form-control" name="${name}">`;
  }

  return `
    <div class="form-field">
      <label class="question-label">
        ${index + 1}. ${esc(q.text)}
        ${q.required ? '<span class="required">*</span>' : ''}
      </label>
      ${input}
    </div>`;
}

function closeModal(){
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  $("#surveyForm").reset();
}

$("#closeModal").onclick = closeModal;
$("#cancelSurvey").onclick = closeModal;
modal.addEventListener("click", e => {
  if(e.target === modal) closeModal();
});

$("#surveyForm").addEventListener("submit", async e => {
  e.preventDefault();

  const button = $("#submitSurvey");
  button.disabled = true;
  button.textContent = "Mengirim…";

  try{
    const formData = new FormData(e.target);
    const answers = {};

    (activeSurvey.questions || []).forEach(q => {
      const values = formData.getAll(`q_${q.id}`);
      answers[q.id] = q.type === "checkbox" ? values : (values[0] || "");

      const empty = Array.isArray(answers[q.id])
        ? answers[q.id].length === 0
        : !answers[q.id];

      if(q.required && empty){
        throw new Error(`Pertanyaan "${q.text}" wajib dijawab.`);
      }
    });

    await BeingAPI.request("public.submitResponse", {
      surveyId: activeSurvey.id,
      accessKey: directKey,
      accessCode: directCode,
      respondentName: formData.get("respondentName") || "",
      respondentContact: formData.get("respondentContact") || "",
      answers,
      userAgent: navigator.userAgent
    });

    $("#submitNotice").innerHTML = `
      <div class="notice success">
        <b>Terima kasih.</b><br>
        Suara Anda telah diterima oleh BEING.
      </div>`;

    setTimeout(closeModal, 1800);
  }catch(err){
    $("#submitNotice").innerHTML =
      `<div class="notice error">${esc(err.message)}</div>`;
  }finally{
    button.disabled = false;
    button.textContent = "Kirim Suara Anda";
  }
});

loadSurveys();
