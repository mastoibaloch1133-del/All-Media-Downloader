(function(){
  'use strict';

  const $ = (id) => document.getElementById(id);
  const API_BASE = 'https://fak-media-downloaders.jokerkeep057.workers.dev/dl/?url=';
  const PROXY = 'https://fak.jokerkeep057.workers.dev/dl/?url=';
  const MAX_RECENTS = 5;
  const STORAGE_KEY = 'nzk_recents_v1';

  let currentData = null;
  let toastTimer = null;

  /* ---------- THEME ---------- */
  const THEME_KEY = 'nzk_theme';
  const html = document.documentElement;

  function setTheme(theme){
    html.setAttribute('data-theme', theme);
    try{ localStorage.setItem(THEME_KEY, theme); }catch(e){}
    const meta = document.querySelector('meta[name="theme-color"]');
    if(meta) meta.setAttribute('content', theme === 'dark' ? '#0a0a0a' : '#f7f7f5');
  }

  function initTheme(){
    let saved = null;
    try{ saved = localStorage.getItem(THEME_KEY); }catch(e){}
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(saved || (prefersDark ? 'dark' : 'light'));
  }

  initTheme();

  $('themeBtn').addEventListener('click', () => {
    const current = html.getAttribute('data-theme');
    setTheme(current === 'dark' ? 'light' : 'dark');
  });

  /* ---------- MOBILE MENU ---------- */
  const mobileNav = $('mobileNav');
  const menuIcon = $('menuIcon');

  $('menuBtn').addEventListener('click', () => {
    const open = mobileNav.classList.toggle('open');
    menuIcon.className = open ? 'bi bi-x-lg' : 'bi bi-list';
    document.body.style.overflow = open ? 'hidden' : '';
  });

  window.scrollToId = (id) => {
    const el = $(id);
    if(!el){ window.location.href = '/#' + id; return; }
    const y = el.getBoundingClientRect().top + window.pageYOffset - 80;
    window.scrollTo({ top: y, behavior: 'smooth' });
    mobileNav.classList.remove('open');
    menuIcon.className = 'bi bi-list';
    document.body.style.overflow = '';
  };

  /* ---------- TOAST ---------- */
  function showToast(msg, type = 'info'){
    const toast = $('toast');
    const icon = type === 'success' ? 'check-circle-fill'
      : type === 'error' ? 'exclamation-circle-fill'
      : 'info-circle-fill';
    toast.innerHTML = `<i class="bi bi-${icon}"></i><span>${escapeHtml(msg)}</span>`;
    toast.className = 'toast show ' + type;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2600);
  }

  /* ---------- HELPERS ---------- */
  function escapeHtml(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, m => ({
      '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
    }[m]));
  }

  function formatDuration(sec){
    if(!sec) return '—';
    const s = parseInt(sec, 10);
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const ss = s % 60;
    const pad = n => String(n).padStart(2, '0');
    return h > 0 ? `${h}:${pad(m)}:${pad(ss)}` : `${m}:${pad(ss)}`;
  }

  function formatSize(bytes){
    if(!bytes) return '';
    const mb = bytes / 1048576;
    return mb >= 1024 ? (mb / 1024).toFixed(2) + ' GB' : mb.toFixed(1) + ' MB';
  }

  function cleanFilename(name){
    return (name || 'video')
      .replace(/#\w+/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60)
      .replace(/[<>:"/\\|?*]/g, '_') || 'video';
  }

  /* ---------- FORM SUBMIT ---------- */
  const form = $('download-form');
  const urlInput = $('media-url');
  const mainBtn = $('main-download-btn');
  const resultsSection = $('results-section');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    let url = urlInput.value.trim();
    if(!url){ showToast('Please paste a video link first', 'error'); return; }
    if(!/^https?:\/\//i.test(url)) url = 'https://' + url;
    try{ new URL(url); }catch(err){ showToast('That does not look like a valid link', 'error'); return; }

    setLoading(true);
    resultsSection.classList.add('hidden');
    resultsSection.innerHTML = '';

    try{
      const res = await fetch(API_BASE + encodeURIComponent(url));
      if(!res.ok) throw new Error(`Server returned ${res.status}`);
      const data = await res.json();

      if(data.statusCode !== 200 || !Array.isArray(data.medias) || data.medias.length === 0){
        throw new Error(data.message || 'No downloadable media found for this link.');
      }

      currentData = data;
      renderResults(data);
      showToast('Video parsed successfully', 'success');
    }catch(err){
      console.error(err);
      renderError(err.message || 'Something went wrong. Please try again.');
      showToast('Failed to parse link', 'error');
    }finally{
      setLoading(false);
    }
  });

  function setLoading(on){
    mainBtn.disabled = on;
    const span = mainBtn.querySelector('.btn-text');
    if(on){
      span.innerHTML = '<span class="btn-spinner"></span>';
    }else{
      span.textContent = 'Download';
    }
  }

  /* ---------- RENDER RESULTS ---------- */
  function renderResults(data){
    const title = cleanFilename(data.title);
    const thumb = data.thumbnail;
    const duration = formatDuration(data.duration);

    const hashtags = (data.title || '').match(/#\w+/g) || [];
    let hashtagsHTML = '';
    if(hashtags.length){
      hashtagsHTML = `
        <div style="margin-top:20px;padding-top:20px;border-top:1px solid var(--border)">
          <div class="formats-header"><span>Detected Hashtags</span><span>${hashtags.length}</span></div>
          <textarea readonly onclick="this.select()"
            style="width:100%;min-height:70px;padding:12px 14px;border:1px solid var(--border);border-radius:12px;background:var(--surface-2);color:var(--text);font-family:var(--font-mono);font-size:12.5px;line-height:1.7;resize:vertical;outline:none;cursor:pointer"
          >${escapeHtml(hashtags.join(' '))}</textarea>
        </div>`;
    }

    const sorted = [...data.medias].sort((a, b) => {
      const t = (a.type || 'z').localeCompare(b.type || 'z');
      if(t !== 0) return t;
      return (b.data_size || 0) - (a.data_size || 0);
    });

    const formatsHTML = sorted.map((m, i) => {
      const type = m.type || 'video';
      const ext = (m.ext || m.extension || 'mp4').toUpperCase();
      const quality = m.label || m.quality || 'Standard';
      const size = formatSize(m.data_size);
      const icon = type === 'video' ? 'bi-camera-video-fill' : 'bi-music-note-beamed';
      const sub = [ext, size].filter(Boolean).join(' · ');
      return `
        <div class="format-item">
          <div class="format-icon"><i class="bi ${icon}"></i></div>
          <div class="format-details">
            <div class="format-name">${escapeHtml(quality)}</div>
            <div class="format-sub">${escapeHtml(sub)}</div>
          </div>
          <div class="format-action" id="fmt-action-${i}">
            <button class="dl-format-btn" data-idx="${i}" type="button">
              <i class="bi bi-download"></i> Download
            </button>
          </div>
        </div>`;
    }).join('');

    const thumbHTML = thumb
      ? `<img src="${escapeHtml(thumb)}" alt="" class="result-thumb"
            onerror="this.outerHTML='<div class=&quot;result-thumb result-thumb-placeholder&quot;><i class=&quot;bi bi-image&quot;></i></div>'">`
      : `<div class="result-thumb result-thumb-placeholder"><i class="bi bi-image"></i></div>`;

    resultsSection.innerHTML = `
      <div class="container">
        <div class="result-card">
          <div class="result-header">
            ${thumbHTML}
            <div class="result-info">
              <div class="result-tag"><i class="bi bi-check-circle-fill"></i> Ready to download</div>
              <div class="result-title">${escapeHtml(title)}</div>
              <div class="result-meta">
                <span class="meta-chip"><i class="bi bi-clock"></i> ${duration}</span>
                <span class="meta-chip"><i class="bi bi-collection"></i> ${data.medias.length} format${data.medias.length > 1 ? 's' : ''}</span>
              </div>
            </div>
          </div>

          <div class="formats-header">
            <span>Available Formats</span>
            <span>${sorted.length}</span>
          </div>
          <div class="formats-list">${formatsHTML}</div>
          ${hashtagsHTML}
        </div>
      </div>`;

    resultsSection.classList.remove('hidden');
    currentData._sorted = sorted;

    setTimeout(() => {
      const y = resultsSection.getBoundingClientRect().top + window.pageYOffset - 80;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }, 80);
  }

  function renderError(msg){
    resultsSection.innerHTML = `
      <div class="container">
        <div class="error-card">
          <div class="error-icon"><i class="bi bi-exclamation-triangle-fill"></i></div>
          <div class="error-content">
            <h4>Couldn't process this link</h4>
            <p>${escapeHtml(msg)}</p>
          </div>
        </div>
      </div>`;
    resultsSection.classList.remove('hidden');
  }

  /* ---------- DOWNLOAD CLICK ---------- */
  resultsSection.addEventListener('click', (e) => {
    const btn = e.target.closest('.dl-format-btn');
    if(!btn) return;
    const idx = parseInt(btn.dataset.idx, 10);
    const media = currentData._sorted[idx];
    if(!media) return;

    const ext = media.ext || media.extension || 'mp4';
    const filename = `${cleanFilename(currentData.title)}.${ext}`;

    downloadFile(media.url, filename, idx);

    addRecent({
      title: cleanFilename(currentData.title),
      thumbnail: currentData.thumbnail || '',
      url: media.url,
      filename
    });
  });

  async function downloadFile(url, filename, idx){
    const action = $(`fmt-action-${idx}`);
    if(action) action.innerHTML = `<div class="progress-text">Starting…</div>`;

    try{
      const res = await fetch(PROXY + encodeURIComponent(url));
      if(!res.ok) throw new Error('Network error');

      const len = parseInt(res.headers.get('content-length') || '0', 10);
      let loaded = 0;
      const reader = res.body.getReader();
      const chunks = [];

      while(true){
        const { done, value } = await reader.read();
        if(done) break;
        chunks.push(value);
        loaded += value.length;
        if(action){
          const label = len
            ? Math.round((loaded / len) * 100) + '%'
            : (loaded / 1048576).toFixed(1) + ' MB';
          action.innerHTML = `<div class="progress-text">${label}</div>`;
        }
      }

      if(action) action.innerHTML = `<div class="progress-text">Saving…</div>`;

      const blob = new Blob(chunks);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        URL.revokeObjectURL(a.href);
        a.remove();
      }, 1000);

      if(action){
        action.innerHTML = `<div class="progress-text" style="color:var(--success)"><i class="bi bi-check-circle-fill"></i> Done</div>`;
      }
      showToast('Download complete', 'success');
    }catch(err){
      console.error(err);
      if(action){
        action.innerHTML = `<button class="dl-format-btn" data-idx="${idx}" type="button"><i class="bi bi-arrow-clockwise"></i> Retry</button>`;
      }
      showToast('Download failed', 'error');
    }
  }

  /* ---------- RECENT ---------- */
  const recentSection = $('recent-section');

  function loadRecents(){
    try{
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    }catch(e){ return []; }
  }

  function saveRecents(list){
    try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_RECENTS))); }catch(e){}
  }

  function addRecent(item){
    let list = loadRecents();
    list = list.filter(r => r.url !== item.url);
    list.unshift(item);
    saveRecents(list);
    renderRecents();
  }

  function renderRecents(){
    const list = loadRecents();
    if(list.length === 0){
      recentSection.classList.add('hidden');
      recentSection.innerHTML = '';
      return;
    }

    const items = list.map((item, i) => {
      const thumb = item.thumbnail
        ? `<img src="${escapeHtml(item.thumbnail)}" alt="" class="recent-thumb"
              onerror="this.outerHTML='<div class=&quot;recent-thumb&quot;><i class=&quot;bi bi-image&quot;></i></div>'">`
        : `<div class="recent-thumb"><i class="bi bi-image"></i></div>`;
      return `
        <div class="recent-item" data-idx="${i}">
          ${thumb}
          <div class="recent-info">
            <div class="recent-title">${escapeHtml(item.title)}</div>
            <div class="recent-sub">Tap to re-download</div>
          </div>
          <i class="bi bi-arrow-clockwise recent-arrow"></i>
        </div>`;
    }).join('');

    recentSection.innerHTML = `
      <div class="container">
        <div class="recent-box">
          <div class="recent-header">
            <h3><i class="bi bi-clock-history"></i> Recent Downloads</h3>
            <button class="recent-clear" id="clearRecents" type="button">Clear all</button>
          </div>
          <div class="recent-list">${items}</div>
        </div>
      </div>`;

    recentSection.classList.remove('hidden');

    $('clearRecents').addEventListener('click', () => {
      try{ localStorage.removeItem(STORAGE_KEY); }catch(e){}
      renderRecents();
      showToast('History cleared', 'success');
    });
  }

  recentSection.addEventListener('click', (e) => {
    const item = e.target.closest('.recent-item');
    if(!item) return;
    const idx = parseInt(item.dataset.idx, 10);
    const list = loadRecents();
    const data = list[idx];
    if(!data) return;
    downloadFile(data.url, data.filename, null);
    showToast('Re-downloading…', 'info');
  });

  renderRecents();

  /* ---------- YEAR ---------- */
  $('year').textContent = new Date().getFullYear();

  /* ---------- KEYBOARD ---------- */
  document.addEventListener('keydown', (e) => {
    if(e.key === 'Escape' && mobileNav.classList.contains('open')){
      mobileNav.classList.remove('open');
      menuIcon.className = 'bi bi-list';
      document.body.style.overflow = '';
    }
    const tag = (document.activeElement && document.activeElement.tagName) || '';
    if(e.key === '/' && !['INPUT','TEXTAREA','SELECT'].includes(tag) && !e.ctrlKey && !e.metaKey && !e.altKey){
      e.preventDefault();
      urlInput.focus();
    }
  });

})();
