(function(){
  const cfg=window.BEING_CONFIG||window.CONFIG||{};
  const API_URL=cfg.VOICE_API_URL||cfg.API_URL||cfg.VOICE_URL||window.VOICE_API_URL||"";
  async function call(action,payload,token){
    if(!API_URL) throw new Error("VOICE_API_URL belum diatur di assets/config.js");
    const r=await fetch(API_URL,{
      method:"POST",
      headers:{"Content-Type":"text/plain;charset=utf-8"},
      body:JSON.stringify({action:action,payload:payload||{},token:token||""})
    });
    const j=await r.json();
    if(!j.ok) throw new Error(j.message||"Permintaan gagal.");
    return j.data;
  }
  window.BVAPI={call};
})();