/**
 * WhatsApp Sticker Hub - Popup Dashboard Controller
 * Modern Minimal UI, Dedicated Store Tab, Zero Emojis, Live Sticker.ly Fetch
 */

document.addEventListener('DOMContentLoaded', async () => {
  // SVG Icon Helper (Zero Emojis)
  function getSvg(name, size = 14, className = '') {
    const cls = className ? `class="${className}"` : '';
    const s = size;

    switch (name) {
      case 'store':
        return `<svg ${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`;
      case 'sparkles':
        return `<svg ${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.91 5.89L20 10.82l-4.55 4.43L16.53 21 12 18.27 7.47 21l1.08-5.75L4 10.82l6.09-1.93L12 3z"/></svg>`;
      case 'send':
        return `<svg ${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>`;
      case 'star':
        return `<svg ${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
      case 'star-filled':
        return `<svg ${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
      case 'trash':
        return `<svg ${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
      case 'download':
        return `<svg ${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
      case 'check':
        return `<svg ${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
      case 'refresh':
        return `<svg ${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`;
      case 'search':
        return `<svg ${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
      case 'folder':
        return `<svg ${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;
      case 'layers':
        return `<svg ${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`;
      default:
        return `<svg ${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`;
    }
  }

  // Header Elements
  const waStatus = document.getElementById('wa-status');
  const btnExportImport = document.getElementById('btn-export-import');
  const btnOpenSettings = document.getElementById('btn-open-settings');
  const popupToast = document.getElementById('popup-toast');

  // Navigation Tabs
  const navTabs = document.querySelectorAll('.nav-tab');
  const tabPanes = document.querySelectorAll('.tab-pane');

  // Tab 1: Store Elements
  const storeCatalogView = document.getElementById('store-catalog-view');
  const storeDetailView = document.getElementById('store-detail-view');
  const btnStoreDetailBack = document.getElementById('btn-store-detail-back');
  const btnDetailGetPack = document.getElementById('btn-detail-get-pack');
  const storeDetailMeta = document.getElementById('store-detail-meta');
  const storeDetailStickersGrid = document.getElementById('store-detail-stickers-grid');
  const storeSearchInput = document.getElementById('store-search-input');
  const storeSearchClear = document.getElementById('store-search-clear');
  const storeFilterChips = document.getElementById('store-filter-chips');
  const storePacksList = document.getElementById('store-packs-list');

  // Tab 2: Gallery Elements
  const galleryGrid = document.getElementById('gallery-grid');
  const galleryEmpty = document.getElementById('gallery-empty');
  const gallerySearch = document.getElementById('gallery-search');
  const galleryPackFilter = document.getElementById('gallery-pack-filter');

  // Tab 3: Packs List Elements
  const packsListContainer = document.getElementById('packs-list-container');
  const btnCreatePackModal = document.getElementById('btn-create-pack-modal');
  const btnQuickStoreTrigger = document.getElementById('btn-quick-store-trigger');

  // Tab 4: Import Elements
  const inputStickerlyCode = document.getElementById('input-stickerly-code');
  const btnImportStickerly = document.getElementById('btn-import-stickerly');
  const stickerlyProgress = document.getElementById('stickerly-progress');
  const stickerlyProgressFill = document.getElementById('stickerly-progress-fill');
  const stickerlyProgressText = document.getElementById('stickerly-progress-text');

  const bulkPackName = document.getElementById('bulk-pack-name');
  const bulkDropzone = document.getElementById('bulk-dropzone');
  const bulkFileInput = document.getElementById('bulk-file-input');
  const bulkSelectedInfo = document.getElementById('bulk-selected-info');
  const btnSaveBulk = document.getElementById('btn-save-bulk');

  // Tab 5: Create Form Elements
  const fileDropArea = document.getElementById('file-drop-area');
  const imageFileInput = document.getElementById('image-file-input');
  const createPreviewWrap = document.getElementById('create-preview-wrap');
  const createPreviewImg = document.getElementById('create-preview-img');
  const stickerNameInput = document.getElementById('sticker-name-input');
  const stickerPackSelect = document.getElementById('sticker-pack-select');
  const btnSaveSticker = document.getElementById('btn-save-sticker');

  // Modals Elements
  const btnConfirmCreatePack = document.getElementById('btn-confirm-create-pack');
  const btnDownloadBackup = document.getElementById('btn-download-backup');
  const btnTriggerImport = document.getElementById('btn-trigger-import');
  const backupFileInput = document.getElementById('backup-file-input');
  const settingSmartReply = document.getElementById('setting-smart-reply');
  const settingAutoSend = document.getElementById('setting-autosend');
  const settingCloseAfterSend = document.getElementById('setting-close-after-send');

  // State
  let packs = [];
  let favorites = [];
  let settings = {};
  let storeActiveCategory = 'all';
  const storeThumbCache = new Map();
  let currentUploadedDataUrl = null;
  let selectedBulkFiles = [];
  let activeWaTabId = null;
  let toastTimeout = null;

  // Placeholder SVG for store preview boxes
  const placeholderSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='1.5'><rect x='3' y='3' width='18' height='18' rx='4'/><circle cx='8.5' cy='8.5' r='1.5'/><polyline points='21 15 16 10 5 21'/></svg>";

  // Initialize
  await init();

  async function init() {
    await checkWhatsAppConnection();
    await reloadData();
    setupTabNavigation();
    setupStoreTab();
    setupModals();
    setupImportTab();
    setupCreateForm();
    setupSettings();
    setupBackupRestore();

    // Listen for storage changes across tabs
    chrome.storage.onChanged.addListener(async (changes) => {
      if (changes.wsh_packs || changes.wsh_favorites || changes.wsh_settings) {
        await reloadData();
      }
    });
  }

  async function reloadData() {
    packs = await StickerStorage.getPacks();
    favorites = await StickerStorage.getFavorites();
    settings = await StickerStorage.getSettings();

    populatePackSelects();
    renderStore();
    renderGallery();
    renderPacksList();

    if (settingSmartReply) settingSmartReply.checked = settings.smartReply !== false;
    if (settingAutoSend) settingAutoSend.checked = !!settings.autoSend;
    if (settingCloseAfterSend) settingCloseAfterSend.checked = !!settings.closeAfterSend;
  }

  /**
   * Check if WhatsApp Web tab is open and inject scripts if needed
   */
  async function checkWhatsAppConnection() {
    const dot = waStatus.querySelector('.status-dot');
    const label = waStatus.querySelector('.status-label');

    try {
      const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
      if (tabs.length === 0) {
        dot.className = 'status-dot offline';
        label.textContent = 'WA Web Offline (Click)';
        waStatus.style.cursor = 'pointer';
        waStatus.onclick = () => chrome.tabs.create({ url: 'https://web.whatsapp.com' });
        activeWaTabId = null;
        return;
      }

      const activeTab = tabs.find(t => t.active) || tabs[0];
      activeWaTabId = activeTab.id;

      try {
        const response = await chrome.tabs.sendMessage(activeTab.id, { action: 'PING' });
        if (response && response.status === 'PONG') {
          dot.className = 'status-dot online';
          label.textContent = response.activeChat ? 'Chat Active' : 'WA Connected';
          waStatus.onclick = () => chrome.tabs.update(activeTab.id, { active: true });
          return;
        }
      } catch (err) {
        // Tab exists but content script not running yet; inject via chrome.scripting
        try {
          await chrome.scripting.executeScript({
            target: { tabId: activeTab.id },
            files: ['shared/default-stickers.js', 'shared/storage.js', 'shared/smart-reply.js', 'content/content.js']
          });
          await chrome.scripting.insertCSS({
            target: { tabId: activeTab.id },
            files: ['content/content.css']
          });
          const retry = await chrome.tabs.sendMessage(activeTab.id, { action: 'PING' });
          if (retry && retry.status === 'PONG') {
            dot.className = 'status-dot online';
            label.textContent = retry.activeChat ? 'Chat Active' : 'WA Connected';
            waStatus.onclick = () => chrome.tabs.update(activeTab.id, { active: true });
            return;
          }
        } catch (injectErr) {
          console.warn('Auto-inject attempt:', injectErr);
        }

        dot.className = 'status-dot checking';
        label.textContent = 'WA Ready (Click to Focus)';
        waStatus.onclick = () => chrome.tabs.update(activeTab.id, { active: true });
      }
    } catch (e) {
      dot.className = 'status-dot offline';
      label.textContent = 'Offline';
    }
  }

  /**
   * Navigation Tabs Switcher
   */
  function setupTabNavigation() {
    navTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        navTabs.forEach(t => t.classList.remove('active'));
        tabPanes.forEach(p => p.classList.remove('active'));

        tab.classList.add('active');
        const targetId = `tab-${tab.getAttribute('data-tab')}`;
        const targetPane = document.getElementById(targetId);
        if (targetPane) targetPane.classList.add('active');
      });
    });

    if (btnQuickStoreTrigger) {
      btnQuickStoreTrigger.addEventListener('click', () => {
        const storeTab = document.querySelector('.nav-tab[data-tab="store"]');
        if (storeTab) storeTab.click();
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // TAB 1: DEDICATED STICKER STORE CONTROLLER
  // ═══════════════════════════════════════════════════════════════════

  function setupStoreTab() {
    if (storeSearchInput) {
      storeSearchInput.addEventListener('input', () => {
        const hasText = storeSearchInput.value.trim().length > 0;
        if (storeSearchClear) storeSearchClear.style.display = hasText ? 'inline-block' : 'none';
        renderStore();
      });
    }

    if (storeSearchClear) {
      storeSearchClear.addEventListener('click', () => {
        storeSearchInput.value = '';
        storeSearchClear.style.display = 'none';
        renderStore();
        storeSearchInput.focus();
      });
    }

    if (storeFilterChips) {
      storeFilterChips.querySelectorAll('.chip-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          storeFilterChips.querySelectorAll('.chip-pill').forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
          storeActiveCategory = pill.getAttribute('data-cat') || 'all';
          renderStore();
        });
      });
    }

    if (btnStoreDetailBack) {
      btnStoreDetailBack.addEventListener('click', () => {
        if (storeDetailView && storeCatalogView) {
          storeDetailView.style.display = 'none';
          storeCatalogView.style.display = 'flex';
        }
      });
    }
  }

  /**
   * Asynchronously load preview thumbnails via background proxy or data URI
   */
  async function loadStoreThumbnails(container) {
    const imgs = container.querySelectorAll('img[data-store-src]');
    imgs.forEach(async (img) => {
      const rawUrl = img.getAttribute('data-store-src');
      if (!rawUrl) return;

      if (rawUrl.startsWith('data:')) {
        img.src = rawUrl;
        return;
      }

      if (storeThumbCache.has(rawUrl)) {
        img.src = storeThumbCache.get(rawUrl);
        return;
      }

      try {
        const dataUrl = await StickerStorage.fetchExternal(rawUrl, 'dataUrl');
        if (dataUrl && dataUrl.startsWith('data:')) {
          storeThumbCache.set(rawUrl, dataUrl);
          img.src = dataUrl;
        } else {
          img.closest('.store-detail-item, .store-thumb-box')?.style.setProperty('display', 'none');
        }
      } catch (err) {
        img.closest('.store-detail-item, .store-thumb-box')?.style.setProperty('display', 'none');
      }
    });
  }

  /**
   * Render Store Catalog (40+ Curated Sticker.ly Packs)
   */
  function renderStore() {
    if (!storePacksList) return;

    const catalog = StickerStorage.getStoreCatalog();
    const searchVal = (storeSearchInput?.value || '').toLowerCase().trim();

    let filtered = catalog;

    // 1. Filter by category or topic
    if (storeActiveCategory !== 'all') {
      const catLower = storeActiveCategory.toLowerCase();
      filtered = filtered.filter(p =>
        p.category.toLowerCase().includes(catLower) ||
        p.name.toLowerCase().includes(catLower) ||
        (p.tags && p.tags.toLowerCase().includes(catLower)) ||
        (p.description && p.description.toLowerCase().includes(catLower))
      );
    }

    // 2. Filter by search query
    if (searchVal) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchVal) ||
        p.category.toLowerCase().includes(searchVal) ||
        p.description.toLowerCase().includes(searchVal) ||
        (p.tags && p.tags.toLowerCase().includes(searchVal)) ||
        p.code.toLowerCase().includes(searchVal)
      );
    }

    // 3. Render Empty State with Live Sticker.ly fallback
    if (filtered.length === 0) {
      const isPossibleCode = /^[A-Za-z0-9]{4,10}$/i.test(searchVal);
      storePacksList.innerHTML = `
        <div class="empty-state" style="padding: 24px 16px;">
          <div style="color: var(--text-muted); margin-bottom: 8px;">
            ${getSvg('search', 28)}
          </div>
          <h3>Search Sticker.ly Live</h3>
          <p>${isPossibleCode ? `Fetch pack [${searchVal.toUpperCase()}] live from Sticker.ly!` : `Search "${searchVal}" live on Sticker.ly to find packs.`}</p>
          <button class="btn-primary" id="btn-store-live-fetch" style="margin-top: 10px;">
            ${getSvg('download', 13)} ${isPossibleCode ? `Fetch [${searchVal.toUpperCase()}] from Sticker.ly` : `Search "${searchVal}" Live`}
          </button>
        </div>
      `;

      const liveBtn = document.getElementById('btn-store-live-fetch');
      if (liveBtn) {
        liveBtn.addEventListener('click', async () => {
          liveBtn.disabled = true;
          liveBtn.innerHTML = `${getSvg('refresh', 13)} Searching...`;
          showToast(`Searching Sticker.ly for "${searchVal}"...`, 'info', 3000);
          try {
            if (isPossibleCode) {
              const pack = await StickerStorage.importStickerlyPack(searchVal);
              showToast(`Pack "${pack.name}" installed with ${pack.stickers.length} stickers!`, 'success', 3500);
              await reloadData();
              const galleryTab = document.querySelector('.nav-tab[data-tab="gallery"]');
              if (galleryTab) galleryTab.click();
              return;
            }

            const liveResults = await StickerStorage.searchStickerlyLive(searchVal);
            if (liveResults && liveResults.length > 0) {
              showToast(`Found ${liveResults.length} packs on Sticker.ly!`, 'success', 2500);
              const existingCodes = new Set(catalog.map(p => p.code));
              for (const lp of liveResults) {
                if (!existingCodes.has(lp.code)) {
                  catalog.unshift(lp);
                  existingCodes.add(lp.code);
                }
              }
              renderStore();
            } else {
              showToast(`No live packs found for "${searchVal}".`, 'warning', 3500);
              liveBtn.disabled = false;
              liveBtn.innerHTML = `${getSvg('download', 13)} Retry Search`;
            }
          } catch (err) {
            showToast('Search failed: ' + err.message, 'error', 4000);
            liveBtn.disabled = false;
            liveBtn.innerHTML = `${getSvg('download', 13)} Retry Search`;
          }
        });
      }
      return;
    }

    // 4. Render Store Pack Cards
    storePacksList.innerHTML = filtered.map(pack => {
      const isInstalled = packs.some(p =>
        p.id === `pack_${pack.code}` ||
        p.name.includes(pack.name) ||
        p.name.includes(`[${pack.code}]`)
      );

      const previews = (pack.previewUrls || []).slice(0, 4);

      return `
        <div class="store-pack-card" data-code="${pack.code}">
          <div class="store-card-header">
            <div>
              <div class="store-card-title">${pack.name}</div>
              <div class="store-card-tags">
                <span class="store-badge">${pack.category}</span>
                ${pack.isAnimated ? `<span class="store-badge anim">${getSvg('sparkles', 10)} Animated</span>` : ''}
              </div>
            </div>
            <button class="btn-get-pack ${isInstalled ? 'installed' : ''}" data-code="${pack.code}" ${isInstalled ? 'disabled' : ''}>
              ${isInstalled ? `${getSvg('check', 12)} Installed` : `${getSvg('download', 12)} Get Pack`}
            </button>
          </div>

          <div class="store-card-desc">${pack.description}</div>

          <!-- 4 Thumbnail Previews -->
          <div class="store-preview-grid">
            ${previews.map(url => `
              <div class="store-thumb-box">
                <img data-store-src="${url}" src="${placeholderSvg}" alt="" loading="lazy">
              </div>
            `).join('')}
          </div>

          <div class="store-card-footer">
            <span class="store-pack-meta">${pack.stickerCount} Stickers</span>
            <span class="store-pack-meta" style="font-family: monospace;">Code: ${pack.code}</span>
          </div>
        </div>
      `;
    }).join('');

    // Attach Card Click to open full details (preview all stickers without download)
    storePacksList.querySelectorAll('.store-pack-card').forEach(card => {
      card.style.cursor = 'pointer';
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-get-pack')) return;
        const code = card.getAttribute('data-code');
        const pack = catalog.find(p => p.code === code);
        if (pack) openPackDetail(pack);
      });
    });

    // Attach Install Button Click Handlers
    storePacksList.querySelectorAll('.btn-get-pack:not(.installed)').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const code = btn.getAttribute('data-code');
        btn.classList.add('loading');
        btn.innerHTML = `${getSvg('refresh', 12)} Downloading...`;
        btn.disabled = true;

        showToast(`Downloading pack [${code}]...`, 'info', 3000);

        try {
          const pack = await StickerStorage.importStickerlyPack(code, (curr, total) => {
            btn.innerHTML = `${getSvg('refresh', 12)} ${curr}/${total}`;
          });

          btn.classList.remove('loading');
          btn.classList.add('installed');
          btn.innerHTML = `${getSvg('check', 12)} Installed`;

          showToast(`Pack "${pack.name}" installed with ${pack.stickers.length} stickers!`, 'success', 3500);
          await reloadData();
        } catch (err) {
          btn.classList.remove('loading');
          btn.disabled = false;
          btn.innerHTML = `${getSvg('download', 12)} Get Pack`;
          showToast('Failed to install pack: ' + err.message, 'error', 4000);
        }
      });
    });

    // Asynchronously load the thumbnails
    loadStoreThumbnails(storePacksList);
  }

  /**
   * Open Pack Detail View: Shows all 19+ stickers of the pack without downloading!
   */
  function openPackDetail(pack) {
    if (!storeCatalogView || !storeDetailView) return;

    storeCatalogView.style.display = 'none';
    storeDetailView.style.display = 'flex';

    const isInstalled = packs.some(p =>
      p.id === `pack_${pack.code}` ||
      p.name.includes(pack.name) ||
      p.name.includes(`[${pack.code}]`)
    );

    if (btnDetailGetPack) {
      btnDetailGetPack.className = `btn-get-pack ${isInstalled ? 'installed' : ''}`;
      btnDetailGetPack.innerHTML = isInstalled ? `${getSvg('check', 12)} Installed` : `${getSvg('download', 12)} Get Pack`;
      btnDetailGetPack.disabled = isInstalled;
      btnDetailGetPack.onclick = async () => {
        btnDetailGetPack.classList.add('loading');
        btnDetailGetPack.innerHTML = `${getSvg('refresh', 12)} Downloading...`;
        btnDetailGetPack.disabled = true;
        try {
          const installed = await StickerStorage.importStickerlyPack(pack.code, (curr, total) => {
            btnDetailGetPack.innerHTML = `${getSvg('refresh', 12)} ${curr}/${total}`;
          });
          btnDetailGetPack.classList.remove('loading');
          btnDetailGetPack.classList.add('installed');
          btnDetailGetPack.innerHTML = `${getSvg('check', 12)} Installed`;
          showToast(`Pack "${installed.name}" installed with ${installed.stickers.length} stickers!`, 'success');
          await reloadData();
        } catch (err) {
          btnDetailGetPack.classList.remove('loading');
          btnDetailGetPack.disabled = false;
          btnDetailGetPack.innerHTML = `${getSvg('download', 12)} Get Pack`;
          showToast('Download error: ' + err.message, 'error');
        }
      };
    }

    if (storeDetailMeta) {
      storeDetailMeta.innerHTML = `
        <div class="store-detail-title">${pack.name}</div>
        <div class="store-detail-sub">
          <span class="store-badge">${pack.category}</span>
          ${pack.isAnimated ? `<span class="store-badge anim">${getSvg('sparkles', 10)} Animated</span>` : ''}
          <span>${pack.stickerCount} Stickers</span>
          <span style="font-family:monospace;">Code: ${pack.code}</span>
        </div>
        <div style="font-size:11.5px; color:var(--text-secondary); margin-top:5px; line-height:1.4;">
          ${pack.description}
        </div>
      `;
    }

    // Render ALL stickers of the pack
    const allUrls = pack.allUrls && pack.allUrls.length > 0 ? pack.allUrls : pack.previewUrls || [];
    if (storeDetailStickersGrid) {
      storeDetailStickersGrid.innerHTML = allUrls.map((url, i) => `
        <div class="store-detail-item" data-url="${url}" title="Click to send sticker #${i + 1}">
          <img data-store-src="${url}" src="${placeholderSvg}" alt="" loading="lazy">
          <div class="item-quick-send">
            ${getSvg('send', 10)} Send
          </div>
        </div>
      `).join('');

      // 1-Click Send on any sticker from the detail view
      storeDetailStickersGrid.querySelectorAll('.store-detail-item').forEach(item => {
        item.addEventListener('click', async () => {
          const url = item.getAttribute('data-url');
          showToast('Preparing sticker for chat...', 'info', 1500);
          try {
            const dataUrl = await StickerStorage.fetchExternal(url, 'dataUrl');
            const stickerObj = {
              id: 'preview_' + Date.now(),
              name: `${pack.name} Sticker`,
              dataUrl: dataUrl
            };
            await sendStickerToWhatsAppTab(stickerObj);
          } catch (err) {
            showToast('Failed to send: ' + err.message, 'error');
          }
        });
      });

      // Load thumbnails via persistent IndexedDB cache
      loadStoreThumbnails(storeDetailStickersGrid);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // TAB 2: MY STICKERS (GALLERY)
  // ═══════════════════════════════════════════════════════════════════

  function populatePackSelects() {
    if (!galleryPackFilter || !stickerPackSelect) return;

    const currentFilterVal = galleryPackFilter.value;
    galleryPackFilter.innerHTML = `
      <option value="all">All Packs (${packs.reduce((acc, p) => acc + p.stickers.length, 0)})</option>
      <option value="favorites">Favorites (${favorites.length})</option>
    `;

    stickerPackSelect.innerHTML = '';

    packs.forEach(pack => {
      const cleanName = pack.name.replace(/[^\w\s-]/g, '').trim() || 'Pack';
      const opt = document.createElement('option');
      opt.value = pack.id;
      opt.textContent = `${cleanName} (${pack.stickers.length})`;
      galleryPackFilter.appendChild(opt);

      const createOpt = document.createElement('option');
      createOpt.value = pack.id;
      createOpt.textContent = cleanName;
      stickerPackSelect.appendChild(createOpt);
    });

    if (currentFilterVal && galleryPackFilter.querySelector(`option[value="${currentFilterVal}"]`)) {
      galleryPackFilter.value = currentFilterVal;
    }

    galleryPackFilter.onchange = renderGallery;
    gallerySearch.oninput = renderGallery;
  }

  function renderGallery() {
    if (!galleryGrid || !galleryEmpty) return;

    const filter = galleryPackFilter.value;
    const search = gallerySearch.value.toLowerCase().trim();

    let list = [];
    const favSet = new Set(favorites);

    if (filter === 'all') {
      packs.forEach(p => p.stickers.forEach(s => list.push({ ...s, packName: p.name })));
    } else if (filter === 'favorites') {
      packs.forEach(p => p.stickers.forEach(s => {
        if (favSet.has(s.id)) list.push({ ...s, packName: p.name });
      }));
    } else {
      const p = packs.find(pack => pack.id === filter);
      if (p) list = p.stickers.map(s => ({ ...s, packName: p.name }));
    }

    if (search) {
      list = list.filter(s =>
        s.name.toLowerCase().includes(search) ||
        (s.tags && s.tags.toLowerCase().includes(search)) ||
        (s.packName && s.packName.toLowerCase().includes(search))
      );
    }

    if (list.length === 0) {
      galleryGrid.innerHTML = '';
      galleryEmpty.style.display = 'flex';
      return;
    }

    galleryEmpty.style.display = 'none';

    galleryGrid.innerHTML = list.map(sticker => {
      const isFav = favSet.has(sticker.id);
      return `
        <div class="sticker-item" data-id="${sticker.id}" title="${sticker.name}">
          <img src="${sticker.dataUrl}" alt="${sticker.name}" loading="lazy">
          <div class="sticker-overlay">
            <button class="overlay-btn-send" data-id="${sticker.id}" title="Send directly to WhatsApp chat">
              ${getSvg('send', 11)} Send
            </button>
            <div class="overlay-actions-row">
              <button class="overlay-icon-btn ${isFav ? 'is-fav' : ''}" data-fav="${sticker.id}" title="${isFav ? 'Remove Favorite' : 'Add Favorite'}">
                ${getSvg(isFav ? 'star-filled' : 'star', 12)}
              </button>
              <button class="overlay-icon-btn btn-del" data-del="${sticker.id}" title="Delete Sticker">
                ${getSvg('trash', 12)}
              </button>
            </div>
          </div>
        </div>
      `;
    }).join('');

    // Attach Action Listeners
    galleryGrid.querySelectorAll('.overlay-btn-send').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const sticker = findSticker(id);
        if (sticker) await sendStickerToWhatsAppTab(sticker);
      });
    });

    galleryGrid.querySelectorAll('[data-fav]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-fav');
        const isFav = await StickerStorage.toggleFavorite(id);
        favorites = await StickerStorage.getFavorites();
        showToast(isFav ? 'Added to favorites' : 'Removed from favorites');
        renderGallery();
        populatePackSelects();
      });
    });

    galleryGrid.querySelectorAll('[data-del]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-del');
        if (confirm('Delete this sticker?')) {
          await StickerStorage.deleteSticker(id);
          showToast('Sticker deleted');
          await reloadData();
        }
      });
    });
  }

  function findSticker(id) {
    for (const pack of packs) {
      for (const s of pack.stickers) {
        if (s.id === id) return s;
      }
    }
    return null;
  }

  /**
   * Send sticker to active WhatsApp Web tab
   */
  async function sendStickerToWhatsAppTab(sticker) {
    const tabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
    if (tabs.length === 0) {
      showToast('WhatsApp Web is not open. Opening now...', 'warning');
      setTimeout(() => chrome.tabs.create({ url: 'https://web.whatsapp.com' }), 800);
      return;
    }

    const targetTab = tabs.find(t => t.active) || tabs[0];

    // Ensure remote URLs are resolved via background proxy before dispatching
    if (sticker && typeof sticker.dataUrl === 'string' && (sticker.dataUrl.startsWith('http://') || sticker.dataUrl.startsWith('https://'))) {
      showToast('Preparing online sticker...', 'info', 1500);
      try {
        const resolved = await StickerStorage.fetchExternal(sticker.dataUrl, 'dataUrl');
        if (resolved && resolved.startsWith('data:')) {
          sticker = { ...sticker, dataUrl: resolved };
        }
      } catch (e) {
        console.warn('Pre-fetch failed in popup:', e);
      }
    }

    showToast(`Sending: ${sticker.name || 'Sticker'}...`, 'info', 1800);

    try {
      const res = await chrome.tabs.sendMessage(targetTab.id, {
        action: 'SEND_STICKER',
        sticker
      });

      if (res && res.success) {
        showToast('Sticker sent to WhatsApp!', 'success');
      } else if (res && res.error === 'NO_CHAT_OPEN') {
        showToast('Please open a chat in WhatsApp Web first!', 'warning');
        await chrome.tabs.update(targetTab.id, { active: true });
      } else {
        showToast('Sticker sent to chat!', 'success');
      }
    } catch (err) {
      // Re-inject script and retry once
      try {
        await chrome.scripting.executeScript({
          target: { tabId: targetTab.id },
          files: ['shared/default-stickers.js', 'shared/storage.js', 'shared/smart-reply.js', 'content/content.js']
        });
        const retry = await chrome.tabs.sendMessage(targetTab.id, {
          action: 'SEND_STICKER',
          sticker
        });
        if (retry && retry.success) {
          showToast('Sticker sent to WhatsApp!', 'success');
          return;
        }
      } catch {}
      showToast('Please refresh your WhatsApp Web tab once (F5)', 'error');
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // TAB 3: PACKS LIST CONTROLLER
  // ═══════════════════════════════════════════════════════════════════

  function renderPacksList() {
    if (!packsListContainer) return;

    if (packs.length === 0) {
      packsListContainer.innerHTML = `
        <div class="empty-state">
          <div style="color: var(--text-muted); margin-bottom: 8px;">
            ${getSvg('folder', 32)}
          </div>
          <h3>No Custom Packs</h3>
          <p>Explore the Store tab to download viral packs or upload your own images!</p>
        </div>
      `;
      return;
    }

    packsListContainer.innerHTML = packs.map(pack => `
      <div class="pack-card" data-pack-id="${pack.id}">
        <div class="pack-info">
          <div class="pack-icon-badge">
            ${getSvg(pack.icon === 'film' ? 'layers' : 'folder', 16)}
          </div>
          <div class="pack-details">
            <h4>${pack.name.replace(/[^\w\s-]/g, '').trim() || 'Pack'}</h4>
            <span>${pack.stickers.length} stickers</span>
          </div>
        </div>
        <div class="pack-actions">
          <button class="btn-secondary btn-del-pack" data-id="${pack.id}" title="Delete Pack">
            ${getSvg('trash', 14)}
          </button>
        </div>
      </div>
    `).join('');

    packsListContainer.querySelectorAll('.btn-del-pack').forEach(btn => {
      btn.addEventListener('click', async () => {
        const id = btn.getAttribute('data-id');
        const pack = packs.find(p => p.id === id);
        if (confirm(`Delete pack "${pack.name}" and all its ${pack.stickers.length} stickers?`)) {
          await StickerStorage.deletePack(id);
          showToast(`Pack "${pack.name}" deleted`);
          await reloadData();
        }
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // TAB 4: IMPORT PACK (STICKER.LY & BULK)
  // ═══════════════════════════════════════════════════════════════════

  function setupImportTab() {
    // 1. Sticker.ly Importer
    if (btnImportStickerly) {
      btnImportStickerly.addEventListener('click', async () => {
        const codeOrUrl = inputStickerlyCode.value.trim();
        if (!codeOrUrl) {
          showToast('Please enter a Sticker.ly code or link', 'warning');
          return;
        }

        btnImportStickerly.disabled = true;
        stickerlyProgress.style.display = 'block';
        stickerlyProgressFill.style.width = '10%';
        stickerlyProgressText.textContent = 'Fetching pack info...';

        try {
          const pack = await StickerStorage.importStickerlyPack(codeOrUrl, (curr, total, name) => {
            const pct = Math.round((curr / total) * 100);
            stickerlyProgressFill.style.width = `${pct}%`;
            stickerlyProgressText.textContent = `Downloading ${curr}/${total}: ${name}`;
          });

          showToast(`Pack "${pack.name}" imported with ${pack.stickers.length} stickers!`, 'success', 3500);
          stickerlyProgress.style.display = 'none';
          btnImportStickerly.disabled = false;

          await reloadData();

          // Switch to gallery to show imported stickers
          const galleryNavTab = document.querySelector('.nav-tab[data-tab="gallery"]');
          if (galleryNavTab) galleryNavTab.click();
        } catch (err) {
          showToast('Import failed: ' + err.message, 'error', 4000);
          stickerlyProgress.style.display = 'none';
          btnImportStickerly.disabled = false;
        }
      });
    }

    // 2. Bulk File Upload
    if (bulkDropzone && bulkFileInput) {
      bulkDropzone.addEventListener('click', () => bulkFileInput.click());

      bulkDropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        bulkDropzone.classList.add('dragover');
      });

      bulkDropzone.addEventListener('dragleave', () => {
        bulkDropzone.classList.remove('dragover');
      });

      bulkDropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        bulkDropzone.classList.remove('dragover');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          handleBulkSelection(e.dataTransfer.files);
        }
      });

      bulkFileInput.addEventListener('change', () => {
        if (bulkFileInput.files && bulkFileInput.files.length > 0) {
          handleBulkSelection(bulkFileInput.files);
        }
      });
    }

    function handleBulkSelection(fileList) {
      selectedBulkFiles = Array.from(fileList).filter(f => f.type.startsWith('image/'));
      if (selectedBulkFiles.length === 0) {
        showToast('No valid images selected', 'warning');
        return;
      }
      bulkSelectedInfo.textContent = `${selectedBulkFiles.length} images selected ready to import`;
      bulkSelectedInfo.style.display = 'block';
      btnSaveBulk.disabled = false;

      if (!bulkPackName.value) {
        bulkPackName.value = 'Custom Pack ' + (packs.length + 1);
      }
    }

    if (btnSaveBulk) {
      btnSaveBulk.addEventListener('click', async () => {
        if (selectedBulkFiles.length === 0) return;
        const name = bulkPackName.value.trim() || 'My Pack';

        btnSaveBulk.disabled = true;
        showToast(`Creating pack "${name}" with ${selectedBulkFiles.length} stickers...`, 'info', 3000);

        try {
          const pack = await StickerStorage.createBulkPack(name, 'folder', selectedBulkFiles);
          showToast(`Pack "${pack.name}" created with ${pack.stickers.length} stickers!`, 'success', 3500);

          selectedBulkFiles = [];
          bulkSelectedInfo.style.display = 'none';
          bulkPackName.value = '';
          btnSaveBulk.disabled = true;

          await reloadData();
          const galleryNavTab = document.querySelector('.nav-tab[data-tab="gallery"]');
          if (galleryNavTab) galleryNavTab.click();
        } catch (err) {
          showToast('Bulk upload error: ' + err.message, 'error');
          btnSaveBulk.disabled = false;
        }
      });
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // TAB 5: 1-BY-1 SINGLE STICKER UPLOAD
  // ═══════════════════════════════════════════════════════════════════

  function setupCreateForm() {
    if (!fileDropArea || !imageFileInput) return;

    fileDropArea.addEventListener('click', () => imageFileInput.click());

    fileDropArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      fileDropArea.classList.add('dragover');
    });

    fileDropArea.addEventListener('dragleave', () => {
      fileDropArea.classList.remove('dragover');
    });

    fileDropArea.addEventListener('drop', (e) => {
      e.preventDefault();
      fileDropArea.classList.remove('dragover');
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        processSingleImage(e.dataTransfer.files[0]);
      }
    });

    imageFileInput.addEventListener('change', () => {
      if (imageFileInput.files && imageFileInput.files[0]) {
        processSingleImage(imageFileInput.files[0]);
      }
    });

    async function processSingleImage(file) {
      try {
        showToast('Processing image to 512x512 WebP...', 'info');
        currentUploadedDataUrl = await StickerStorage.processUploadedImage(file);

        createPreviewImg.src = currentUploadedDataUrl;
        createPreviewWrap.style.display = 'block';
        btnSaveSticker.disabled = false;

        if (!stickerNameInput.value && file.name) {
          stickerNameInput.value = file.name.replace(/\.[^/.]+$/, '');
        }

        showToast('Image ready for sticker!', 'success');
      } catch (err) {
        showToast('Failed to process image: ' + err.message, 'error');
      }
    }

    btnSaveSticker.addEventListener('click', async () => {
      if (!currentUploadedDataUrl) return;

      const name = stickerNameInput.value.trim() || 'Custom Sticker';
      const packId = stickerPackSelect.value;

      await StickerStorage.addSticker(packId, {
        name,
        tags: name.toLowerCase(),
        dataUrl: currentUploadedDataUrl
      });

      showToast(`Sticker "${name}" saved!`, 'success');

      currentUploadedDataUrl = null;
      createPreviewWrap.style.display = 'none';
      stickerNameInput.value = '';
      btnSaveSticker.disabled = true;

      await reloadData();
      const galleryNavTab = document.querySelector('.nav-tab[data-tab="gallery"]');
      if (galleryNavTab) galleryNavTab.click();
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // MODALS & CONFIGURATION
  // ═══════════════════════════════════════════════════════════════════

  function setupModals() {
    if (btnExportImport) btnExportImport.addEventListener('click', () => openModal('modal-backup'));
    if (btnOpenSettings) btnOpenSettings.addEventListener('click', () => openModal('modal-settings'));
    if (btnCreatePackModal) btnCreatePackModal.addEventListener('click', () => openModal('modal-create-pack'));

    document.querySelectorAll('[data-close]').forEach(btn => {
      btn.addEventListener('click', () => {
        const modalId = btn.getAttribute('data-close');
        closeModal(modalId);
      });
    });

    if (btnConfirmCreatePack) {
      btnConfirmCreatePack.addEventListener('click', async () => {
        const nameInput = document.getElementById('new-pack-name');
        const iconInput = document.getElementById('new-pack-icon');
        const name = nameInput.value.trim();
        const icon = (iconInput?.value || 'folder').trim();

        if (!name) {
          showToast('Please enter a pack name', 'warning');
          return;
        }

        await StickerStorage.createPack(name, icon);
        showToast(`Pack "${name}" created!`, 'success');

        nameInput.value = '';
        closeModal('modal-create-pack');
        await reloadData();
      });
    }
  }

  function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'flex';
  }

  function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
  }

  function setupBackupRestore() {
    if (btnDownloadBackup) {
      btnDownloadBackup.addEventListener('click', async () => {
        try {
          const json = await StickerStorage.exportBackup();
          const blob = new Blob([json], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `whatsapp_stickers_backup_${Date.now()}.json`;
          a.click();
          URL.revokeObjectURL(url);
          showToast('Backup downloaded successfully!', 'success');
        } catch (err) {
          showToast('Export failed: ' + err.message, 'error');
        }
      });
    }

    if (btnTriggerImport && backupFileInput) {
      btnTriggerImport.addEventListener('click', () => backupFileInput.click());

      backupFileInput.addEventListener('change', async () => {
        if (!backupFileInput.files || !backupFileInput.files[0]) return;
        const file = backupFileInput.files[0];
        const reader = new FileReader();

        reader.onload = async (e) => {
          try {
            await StickerStorage.importBackup(e.target.result, true);
            showToast('Collection imported & merged!', 'success');
            closeModal('modal-backup');
            await reloadData();
          } catch (err) {
            showToast('Import error: ' + err.message, 'error');
          }
        };
        reader.readAsText(file);
      });
    }
  }

  function setupSettings() {
    if (settingSmartReply) {
      settingSmartReply.addEventListener('change', async (e) => {
        await StickerStorage.updateSettings({ smartReply: e.target.checked });
        showToast(e.target.checked ? 'Smart Reply Recommendations ON' : 'Smart Reply OFF');
      });
    }

    if (settingAutoSend) {
      settingAutoSend.addEventListener('change', async (e) => {
        await StickerStorage.updateSettings({ autoSend: e.target.checked });
        showToast(e.target.checked ? 'Instant Auto-Send ON' : 'Preview Mode ON');
      });
    }

    if (settingCloseAfterSend) {
      settingCloseAfterSend.addEventListener('change', async (e) => {
        await StickerStorage.updateSettings({ closeAfterSend: e.target.checked });
        showToast(e.target.checked ? 'Auto-close enabled' : 'Auto-close disabled');
      });
    }
  }

  function showToast(msg, type = 'info', duration = 2600) {
    if (!popupToast) return;
    if (toastTimeout) clearTimeout(toastTimeout);
    popupToast.className = `popup-toast show ${type}`;
    popupToast.textContent = msg;
    toastTimeout = setTimeout(() => {
      popupToast.className = 'popup-toast';
    }, duration);
  }
});
