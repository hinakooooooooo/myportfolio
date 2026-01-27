document.addEventListener('DOMContentLoaded', () => {
  // --- Brand modal (index.ejs の既存文言を変えずに挙動だけ追加) ---
  const modal = document.getElementById('brandModal');
  const titleEl = document.getElementById('brandModalTitle');
  const descEl = document.getElementById('brandModalDesc');
  const processEl = document.getElementById('brandModalProcess');
  if (modal && titleEl && descEl && processEl) {
    const openModal = (data) => {
      titleEl.textContent = data.title || '';
      descEl.textContent = data.emotion || data.desc || '';
      processEl.textContent = data.process || '';
      modal.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
    };
    const closeModal = () => {
      modal.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
    };
    modal.addEventListener('click', (e) => {
      if (e.target.dataset.close !== undefined) closeModal();
    });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
    document.querySelectorAll('.brand-go').forEach((btn) => {
      btn.addEventListener('click', () => openModal(btn.dataset));
    });
  }

  // --- Filters ---
  const grid = document.getElementById('brandGrid');
  const tagSel = document.getElementById('filterTag');
  const yearSel = document.getElementById('filterYear');
  const keywordInp = document.getElementById('filterKeyword');

  const applyFilter = () => {
    const tag = tagSel?.value || '';
    const year = yearSel?.value || '';
    const kw = (keywordInp?.value || '').toLowerCase();

    grid?.querySelectorAll('.brand-card').forEach(card => {
      const matchTag = tag ? card.dataset.tag === tag : true;
      const matchYear = year ? card.dataset.year === year : true;
      const matchKw = kw
        ? (card.dataset.title || '').toLowerCase().includes(kw) ||
          (card.dataset.desc || '').toLowerCase().includes(kw)
        : true;
      card.style.display = matchTag && matchYear && matchKw ? '' : 'none';
    });
  };

  [tagSel, yearSel, keywordInp].forEach(el => el && el.addEventListener('input', applyFilter));
  applyFilter();

  // --- Contact ---
  const form = document.getElementById('contactForm');
  const status = document.getElementById('contactStatus');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (status) status.textContent = '送信中...';
      const payload = Object.fromEntries(new FormData(form).entries());
      try {
        const res = await fetch('/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
        const json = await res.json();
        if (json.ok) {
          if (status) status.textContent = '送信しました。ありがとうございます。';
          form.reset();
        } else {
          if (status) status.textContent = '送信に失敗しました。時間をおいて再度お試しください。';
        }
      } catch (err) {
        if (status) status.textContent = '通信エラーが発生しました。';
      }
    });
  }

  // --- Theme palette ---
  const applyTheme = (cls) => {
    document.body.classList.remove('theme-night','theme-peach','theme-mirror');
    if (cls) document.body.classList.add(cls);
    localStorage.setItem('theme', cls || '');
  };
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) applyTheme(savedTheme);
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => applyTheme(btn.dataset.theme || ''));
  });

  // --- Simple CMS modal (add project) ---
  const cmsModal = document.getElementById('cmsModal');
  const cmsOpen = document.getElementById('cmsOpenBtn');
  const cmsForm = document.getElementById('cmsForm');
  const cmsStatus = document.getElementById('cmsStatus');
  if (cmsModal && cmsOpen && cmsForm) {
    const closeCms = () => {
      cmsModal.setAttribute('aria-hidden','true');
      document.body.style.overflow = '';
    };
    const openCms = () => {
      cmsModal.setAttribute('aria-hidden','false');
      document.body.style.overflow = 'hidden';
      cmsStatus.textContent = '';
    };
    cmsOpen.addEventListener('click', openCms);
    cmsModal.addEventListener('click', (e) => { if (e.target.dataset.close !== undefined) closeCms(); });
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeCms(); });

    cmsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      cmsStatus.textContent = '送信中...';
      const payload = Object.fromEntries(new FormData(cmsForm).entries());
      try {
        const res = await fetch('/api/projects', {
          method:'POST',
          headers:{ 'Content-Type':'application/json', 'Accept':'application/json' },
          body: JSON.stringify(payload)
        });
        const json = await res.json();
        if (json && json.ok) {
          cmsStatus.textContent = '追加しました。リロードします。';
          setTimeout(() => location.reload(), 800);
        } else {
          cmsStatus.textContent = '追加に失敗しました。';
        }
      } catch (err) {
        cmsStatus.textContent = '通信エラーが発生しました。';
      }
    });
  }
});
