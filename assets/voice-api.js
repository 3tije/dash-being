window.BeingAPI = (() => {
  const cfg = window.BEING_CONFIG || {};
  const base = () => (cfg.API_URL || "").trim();

  function configured(){
    return base() && !base().includes("PASTE_APPS_SCRIPT");
  }

  async function request(action, payload = {}, token = ""){
    if(!configured()) throw new Error("API Apps Script belum dikonfigurasi pada assets/config.js");
    const body = { action, payload, token };
    const res = await fetch(base(), {
      method:"POST",
      redirect:"follow",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify(body)
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch(e) { throw new Error("Respons server tidak valid."); }
    if(!data.ok) throw new Error(data.message || "Permintaan gagal.");
    return data.data;
  }

  return {request, configured};
})();
