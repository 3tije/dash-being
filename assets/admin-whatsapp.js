(() => {
  const ADMIN_NUMBER = '6287775087431';
  const MESSAGE = `Halo Admin Being Biro Psikologi.\n\nSaya menghubungi melalui website resmi Being.\n\nNama:\nInstansi:\nEmail:\nNo. HP:\n\nSaya ingin memperoleh informasi mengenai:\n\n□ Konsultasi Psikologi\n□ Assessment Psikologi\n□ Human Development Series\n□ Pelatihan / Training\n□ Kerja Sama Institusi\n□ Layanan Lainnya\n\nPesan:\n........................................\n\nTerima kasih.`;

  const waUrl = `https://wa.me/${ADMIN_NUMBER}?text=${encodeURIComponent(MESSAGE)}`;

  function buildModal() {
    if (document.getElementById('beingWaModal')) return;
    const modal = document.createElement('div');
    modal.id = 'beingWaModal';
    modal.className = 'being-wa-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <div class="being-wa-backdrop" data-wa-close></div>
      <section class="being-wa-dialog" role="dialog" aria-modal="true" aria-labelledby="beingWaTitle">
        <button class="being-wa-close" type="button" aria-label="Tutup" data-wa-close>×</button>
        <div class="being-wa-mark" aria-hidden="true">✆</div>
        <span class="being-wa-kicker">LAYANAN BEING</span>
        <h2 id="beingWaTitle">Hubungi Admin</h2>
        <p>Anda akan diarahkan ke WhatsApp Admin Being Biro Psikologi. Format pesan telah disiapkan agar kebutuhan Anda dapat kami pahami lebih cepat.</p>
        <div class="being-wa-actions">
          <button class="btn secondary" type="button" data-wa-close>Batal</button>
          <a class="btn primary" id="beingWaContinue" href="${waUrl}" target="_blank" rel="noopener">Lanjut ke WhatsApp</a>
        </div>
      </section>`;
    document.body.appendChild(modal);

    modal.querySelectorAll('[data-wa-close]').forEach(el => el.addEventListener('click', closeModal));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
    modal.querySelector('#beingWaContinue').addEventListener('click', () => setTimeout(closeModal, 250));
  }

  function openModal(event) {
    if (event) event.preventDefault();
    buildModal();
    const modal = document.getElementById('beingWaModal');
    modal.classList.add('is-open');
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('wa-modal-open');
    setTimeout(() => modal.querySelector('#beingWaContinue')?.focus(), 30);
  }

  function closeModal() {
    const modal = document.getElementById('beingWaModal');
    if (!modal) return;
    modal.classList.remove('is-open');
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('wa-modal-open');
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('a[href^="https://wa.me/6287775087431"], .wa-admin-link').forEach(link => {
      link.setAttribute('href', waUrl);
      link.classList.add('wa-admin-link');
      link.addEventListener('click', openModal);
    });
  });
})();
