/**
 * WhatsApp Sticker Hub — Content Script (v2.0)
 * 
 * Features:
 * - Zero Emojis (Clean bespoke vector SVGs)
 * - Magnetic Draggable Launcher (Snaps to left & right edges, position remembered)
 * - Recents Tab default on drawer open
 * - Individual sticker removal from Recents
 * - Multi-Select Mode to create custom sticker packs
 * - Built-in Curated Sticker Store with 1-click install
 * - Deep WhatsApp Web Starred/Saved sticker extraction & sync
 * - True Native WhatsApp Sticker sending (never photo attachments)
 */

(function () {
  'use strict';
  // Aggressively remove any floating bar if present
  try {
    document.querySelectorAll('#wsh-smart-reply-bar, .wsh-smart-reply-bar, [id*="smart-reply"]').forEach(b => b.remove());
  } catch {}

  if (typeof window !== 'undefined' && window.__WSH_CONTENT_LOADED) return;
  if (typeof window !== 'undefined') window.__WSH_CONTENT_LOADED = true;

  // ═══════════════════════════════════════════════════════════════════
  // 1. STATE & CONSTANTS
  // ═══════════════════════════════════════════════════════════════════

  let currentActiveTab = 'recents'; // Default to Recents
  let allPacks = [];
  let favorites = [];
  let recents = [];
  let settings = {
    autoSend: true,
    closeAfterSend: false,
    autoSaveIncoming: true,
    smartReply: true,
    dockSide: 'right', // 'right' | 'left'
    tabTopPercent: 50,
    defaultTab: 'recents'
  };

  let currentSmartRecommendations = null;
  let lastAnalyzedMsgKey = '';
  let isSmartReplyDismissed = false;

  let isDrawerOpen = false;
  let isSelectionMode = false;
  let selectedStickerIds = new Set();
  let toastTimer = null;
  let waApiConnected = false;
  let storeCategoryFilter = 'all';
  let liveStorePacks = [];
  let lastLiveStoreQuery = '';
  let liveSearchDebounceTimer = null;
  let isLiveSearching = false;
  let lastChatTitle = '';

  const pendingStickerPromises = new Map();

  // ═══════════════════════════════════════════════════════════════════
  // 2. VECTOR SVG ICON SYSTEM (ZERO EMOJIS)
  // ═══════════════════════════════════════════════════════════════════

  function getSvg(name, size = 16, className = '') {
    const cls = className ? `class="${className}"` : '';
    const s = size;

    switch (name) {
      case 'clock':
        return `<svg ${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
      case 'grid':
        return `<svg ${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/></svg>`;
      case 'star':
        return `<svg ${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
      case 'star-filled':
        return `<svg ${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;
      case 'bookmark':
        return `<svg ${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>`;
      case 'store':
        return `<svg ${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`;
      case 'folder':
        return `<svg ${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>`;
      case 'folder-plus':
        return `<svg ${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>`;
      case 'plus':
        return `<svg ${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="14" x2="19" y2="14"/></svg>`;
      case 'plus-circle':
        return `<svg ${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`;
      case 'check':
        return `<svg ${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;
      case 'check-square':
        return `<svg ${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>`;
      case 'search':
        return `<svg ${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>`;
      case 'x':
        return `<svg ${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
      case 'trash':
        return `<svg ${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;
      case 'download':
        return `<svg ${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`;
      case 'refresh':
        return `<svg ${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>`;
      case 'sparkles':
        return `<svg ${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.91 5.89L20 10.82l-4.55 4.43L16.53 21 12 18.27 7.47 21l1.08-5.75L4 10.82l6.09-1.93L12 3z"/></svg>`;
      case 'layers':
        return `<svg ${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg>`;
      case 'grip':
        return `<svg ${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="7" r="1.5"/><circle cx="15" cy="7" r="1.5"/><circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/><circle cx="9" cy="17" r="1.5"/><circle cx="15" cy="17" r="1.5"/></svg>`;
      case 'arrow-left':
        return `<svg ${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`;
      default:
        return `<svg ${cls} width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/></svg>`;
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 3. INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════

  function initWhenReady() {
    if (document.querySelector('#app') || document.body) {
      setTimeout(() => {
        buildUI();
        setupMessageBridge();
        observeChatPresence();
        observeStickerPackModal();
        observeIncomingChatStickers();
        observeSmartReplies();
        window.postMessage({ type: 'WSH_GET_WA_STICKERS' }, '*');
      }, 900);
    } else {
      setTimeout(initWhenReady, 400);
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 4. MESSAGE BRIDGE (With Page Context Script)
  // ═══════════════════════════════════════════════════════════════════

  function setupMessageBridge() {
    window.addEventListener('message', async (event) => {
      if (event.source !== window) return;
      const data = event.data;
      if (!data || typeof data.type !== 'string') return;

      switch (data.type) {
        case 'WSH_API_READY':
        case 'WSH_PONG':
          waApiConnected = Boolean(data.ready);
          updateApiBadge();
          break;

        case 'WSH_WA_STICKERS_DATA':
          if (data.stickers && Array.isArray(data.stickers) && data.stickers.length > 0) {
            const syncRes = await StickerStorage.syncWaStickers(data.stickers);
            if (syncRes && syncRes.addedCount > 0) {
              await loadData();
              renderTabs();
              renderStickers();
              showToast(`Synced ${syncRes.addedCount} WhatsApp Starred stickers!`, 'success', 2400);
            }
          }
          break;

        case 'WSH_STICKER_RESULT': {
          const item = pendingStickerPromises.get(data.id);
          if (item) {
            clearTimeout(item.timer);
            pendingStickerPromises.delete(data.id);
            if (data.success) {
              item.resolve({ success: true, method: data.method });
            } else {
              item.reject(new Error(data.error || 'Failed to send sticker'));
            }
          }
          break;
        }
      }
    });

    window.postMessage({ type: 'WSH_PING' }, '*');
  }

  function updateApiBadge() {
    const badge = document.getElementById('wsh-mode-badge');
    if (!badge) return;
    if (waApiConnected) {
      badge.className = 'wsh-mode-badge';
      badge.innerHTML = `<span class="wsh-badge-dot"></span><span>STICKER</span>`;
      badge.title = 'Native WhatsApp Sticker Engine Connected — stickers send as real animated/static stickers!';
    } else {
      badge.className = 'wsh-mode-badge wsh-connecting';
      badge.innerHTML = `<span class="wsh-badge-dot"></span><span>CONNECTING</span>`;
      badge.title = 'Connecting to WhatsApp internal sticker engine...';
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 5. DATA LOADING & DOCKING HELPERS
  // ═══════════════════════════════════════════════════════════════════

  async function loadData() {
    allPacks = await StickerStorage.getPacks();
    favorites = await StickerStorage.getFavorites();
    recents = await StickerStorage.getRecents();
    settings = await StickerStorage.getSettings();
  }

  function applyDockPosition() {
    const edgeTab = document.getElementById('wsh-edge-tab');
    const drawer = document.getElementById('wsh-drawer');
    const dockSide = settings.dockSide || 'right';
    const topPct = settings.tabTopPercent !== undefined ? settings.tabTopPercent : 50;

    if (edgeTab) {
      edgeTab.classList.toggle('wsh-docked-right', dockSide === 'right');
      edgeTab.classList.toggle('wsh-docked-left', dockSide === 'left');
      edgeTab.style.top = topPct + '%';
      edgeTab.style.left = '';
      edgeTab.style.right = '';
    }

    if (drawer) {
      drawer.classList.toggle('wsh-docked-right', dockSide === 'right');
      drawer.classList.toggle('wsh-docked-left', dockSide === 'left');
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 6. UI CONSTRUCTION
  // ═══════════════════════════════════════════════════════════════════

  async function buildUI() {
    if (document.getElementById('wsh-edge-tab')) return;

    await loadData();

    // 1. Magnetic Draggable Launcher Pill
    const edgeTab = document.createElement('div');
    edgeTab.id = 'wsh-edge-tab';
    edgeTab.className = `wsh-docked-${settings.dockSide || 'right'}`;
    edgeTab.style.top = (settings.tabTopPercent || 50) + '%';
    edgeTab.innerHTML = `
      ${getSvg('grip', 15)}
      <span class="wsh-edge-tooltip">Sticker Hub (Alt+S)</span>
    `;
    document.body.appendChild(edgeTab);

    setupDraggableEdgeTab(edgeTab);

    // 2. Sticker Drawer Container
    const drawer = document.createElement('div');
    drawer.id = 'wsh-drawer';
    drawer.className = `wsh-hidden wsh-docked-${settings.dockSide || 'right'}`;
    drawer.innerHTML = `
      <!-- Header -->
      <div class="wsh-header">
        <div class="wsh-title-group">
          <span class="wsh-title-icon">${getSvg('layers', 17)}</span>
          <span class="wsh-title-text">Sticker Hub</span>
        </div>
        <div class="wsh-header-actions">
          <button class="wsh-icon-btn" id="wsh-select-toggle-btn" title="Select multiple to create pack">
            ${getSvg('check-square', 16)}
          </button>
          <button class="wsh-icon-btn" id="wsh-close-btn" title="Close (Esc)">
            ${getSvg('x', 16)}
          </button>
        </div>
      </div>

      <!-- Search Box -->
      <div class="wsh-search-container">
        <div class="wsh-search-box">
          ${getSvg('search', 14)}
          <input type="text" class="wsh-search-input" id="wsh-search-input" placeholder="Search stickers or memes..." autocomplete="off"/>
          <button class="wsh-search-clear" id="wsh-search-clear" style="display:none;" title="Clear">
            ${getSvg('x', 12)}
          </button>
        </div>
      </div>

      <!-- Tabs Bar -->
      <div class="wsh-tabs-bar" id="wsh-tabs-bar">
        <!-- Rendered dynamically -->
      </div>

      <!-- Content Area -->
      <div class="wsh-content-body" id="wsh-content-body">
        <!-- Grid or Views rendered dynamically -->
      </div>

      <!-- Floating Selection Bar (Active during multi-select) -->
      <div class="wsh-selection-bar" id="wsh-selection-bar" style="display:none;">
        <span class="wsh-sel-count" id="wsh-sel-count">0 Selected</span>
        <div class="wsh-sel-actions">
          <button class="wsh-btn-create-pack" id="wsh-btn-create-pack">
            ${getSvg('folder-plus', 14)} Create Pack
          </button>
          <button class="wsh-btn-delete-selected" id="wsh-btn-delete-selected" title="Delete selected stickers">
            ${getSvg('trash', 14)} Delete
          </button>
          <button class="wsh-btn-cancel-sel" id="wsh-btn-cancel-sel">
            Cancel
          </button>
        </div>
      </div>

      <!-- Modal Container -->
      <div id="wsh-modal-container" style="display:none;"></div>
    `;
    document.body.appendChild(drawer);

    // 3. Toast Element
    const toast = document.createElement('div');
    toast.id = 'wsh-toast';
    toast.className = 'wsh-toast';
    drawer.appendChild(toast);

    // Event Listeners
    document.getElementById('wsh-close-btn').addEventListener('click', closeDrawer);

    const searchInput = document.getElementById('wsh-search-input');
    const searchClear = document.getElementById('wsh-search-clear');

    searchInput.addEventListener('input', () => {
      searchClear.style.display = searchInput.value ? 'flex' : 'none';
      handleSearch();
    });

    searchClear.addEventListener('click', () => {
      searchInput.value = '';
      searchClear.style.display = 'none';
      handleSearch();
      searchInput.focus();
    });

    document.getElementById('wsh-select-toggle-btn').addEventListener('click', toggleSelectionMode);
    document.getElementById('wsh-btn-create-pack').addEventListener('click', openCreatePackModal);
    document.getElementById('wsh-btn-delete-selected')?.addEventListener('click', async () => {
      if (selectedStickerIds.size === 0) return;
      const count = selectedStickerIds.size;
      if (confirm(`Delete ${count} selected sticker${count > 1 ? 's' : ''}?`)) {
        await StickerStorage.deleteMultipleStickers(Array.from(selectedStickerIds));
        selectedStickerIds.clear();
        isSelectionMode = false;
        updateSelectionUI();
        await loadData();
        renderTabs();
        renderStickers();
        showToast(`${count} sticker${count > 1 ? 's' : ''} deleted!`, 'info', 2200);
      }
    });
    document.getElementById('wsh-btn-cancel-sel').addEventListener('click', () => {
      isSelectionMode = false;
      selectedStickerIds.clear();
      updateSelectionUI();
      renderStickers();
    });

    // Keyboard Shortcuts: Alt+S toggle, Esc close
    window.addEventListener('keydown', (e) => {
      if (e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        toggleDrawer();
      } else if (e.key === 'Escape' && isDrawerOpen) {
        if (isSelectionMode) {
          isSelectionMode = false;
          selectedStickerIds.clear();
          updateSelectionUI();
          renderStickers();
        } else {
          closeDrawer();
        }
      }
    });

    // Close when clicking outside drawer & edgeTab
    document.addEventListener('pointerdown', (e) => {
      if (!isDrawerOpen) return;
      const drawerEl = document.getElementById('wsh-drawer');
      const edgeTabEl = document.getElementById('wsh-edge-tab');
      if (
        drawerEl &&
        !drawerEl.contains(e.target) &&
        edgeTabEl &&
        !edgeTabEl.contains(e.target) &&
        !edgeTabEl.classList.contains('wsh-dragging')
      ) {
        closeDrawer();
      }
    });

    // Storage update listener (cross-tab sync)
    chrome.storage.onChanged.addListener(async (changes) => {
      if (changes.wsh_packs || changes.wsh_favorites || changes.wsh_recents || changes.wsh_settings) {
        await loadData();
        renderTabs();
        renderStickers();
      }
    });

    renderTabs();
    renderStickers();
  }

  // ═══════════════════════════════════════════════════════════════════
  // 7. MAGNETIC DRAGGABLE LOGIC FOR LAUNCHER PILL
  // ═══════════════════════════════════════════════════════════════════

  function setupDraggableEdgeTab(edgeTab) {
    let isDragging = false;
    let dragStartX = 0;
    let dragStartY = 0;
    let dragDistance = 0;

    edgeTab.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return; // Only primary mouse button
      isDragging = true;
      dragDistance = 0;
      dragStartX = e.clientX;
      dragStartY = e.clientY;
      edgeTab.setPointerCapture(e.pointerId);
    });

    edgeTab.addEventListener('pointermove', (e) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStartX;
      const dy = e.clientY - dragStartY;
      dragDistance = Math.hypot(dx, dy);

      if (dragDistance > 6) {
        edgeTab.classList.add('wsh-dragging');
        // Float directly under mouse pointer
        edgeTab.style.left = e.clientX + 'px';
        edgeTab.style.right = 'auto';
        const clampedY = Math.max(45, Math.min(window.innerHeight - 45, e.clientY));
        edgeTab.style.top = clampedY + 'px';
      }
    });

    const finishDrag = (e) => {
      if (!isDragging) return;
      isDragging = false;
      try { edgeTab.releasePointerCapture(e.pointerId); } catch {}

      if (dragDistance > 6) {
        edgeTab.classList.remove('wsh-dragging');

        // Magnetic Snap: Right half -> right edge, Left half -> left edge
        const newDockSide = e.clientX >= window.innerWidth / 2 ? 'right' : 'left';
        const clampedY = Math.max(60, Math.min(window.innerHeight - 80, e.clientY));
        const newTopPercent = Math.round((clampedY / window.innerHeight) * 100);

        settings.dockSide = newDockSide;
        settings.tabTopPercent = newTopPercent;

        applyDockPosition();
        StickerStorage.updateSettings({ dockSide: newDockSide, tabTopPercent: newTopPercent });
      } else {
        // Simple click action: Toggle drawer
        toggleDrawer();
      }
    };

    edgeTab.addEventListener('pointerup', finishDrag);
    edgeTab.addEventListener('pointercancel', finishDrag);
  }

  // ═══════════════════════════════════════════════════════════════════
  // 8. CHAT PRESENCE (Visible only when chat is open)
  // ═══════════════════════════════════════════════════════════════════

  function updateChatVisibility() {
    const hasChat = Boolean(
      document.querySelector('#main footer, #main div[contenteditable="true"], #main header')
    );
    const edgeTab = document.getElementById('wsh-edge-tab');
    if (edgeTab) {
      if (hasChat) {
        edgeTab.classList.add('wsh-visible');
      } else {
        edgeTab.classList.remove('wsh-visible');
        if (isDrawerOpen) closeDrawer();
      }
    }
  }

  function observeChatPresence() {
    updateChatVisibility();
    const observer = new MutationObserver(() => updateChatVisibility());
    const target = document.querySelector('#app') || document.body;
    if (target) {
      observer.observe(target, { childList: true, subtree: true });
    }
    setInterval(updateChatVisibility, 700);
  }

  // ═══════════════════════════════════════════════════════════════════
  // 9. DRAWER TOGGLE (Defaults to Recents on open!)
  // ═══════════════════════════════════════════════════════════════════

  function toggleDrawer() {
    if (isDrawerOpen) {
      closeDrawer();
    } else {
      openDrawer();
    }
  }

  function openDrawer() {
    isDrawerOpen = true;
    const drawer = document.getElementById('wsh-drawer');
    if (!drawer) return;

    applyDockPosition();
    drawer.classList.remove('wsh-hidden');

    // Instantly scan active chat to display fresh Smart Reply recommendations
    scanLatestIncomingMessage();

    // Default to Recents on every open per user request!
    currentActiveTab = 'recents';
    renderTabs();
    renderStickers();

    const searchInput = document.getElementById('wsh-search-input');
    if (searchInput) {
      searchInput.value = '';
      document.getElementById('wsh-search-clear').style.display = 'none';
      setTimeout(() => searchInput.focus(), 140);
    }
  }

  function closeDrawer() {
    isDrawerOpen = false;
    const drawer = document.getElementById('wsh-drawer');
    if (drawer) drawer.classList.add('wsh-hidden');

    if (isSelectionMode) {
      isSelectionMode = false;
      selectedStickerIds.clear();
      updateSelectionUI();
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  // 10. TABS RENDERING (Vector Icons, No Emojis)
  // ═══════════════════════════════════════════════════════════════════

  function renderTabs() {
    const tabsBar = document.getElementById('wsh-tabs-bar');
    if (!tabsBar) return;

    let html = '';

    // 1. Recents Tab (DEFAULT)
    html += `
      <div class="wsh-tab-pill ${currentActiveTab === 'recents' ? 'wsh-active' : ''}" data-tab="recents">
        ${getSvg('clock', 13)}
        <span>Recents</span>
        ${recents.length > 0 ? `<span class="wsh-tab-count">${recents.length}</span>` : ''}
      </div>
    `;

    // 2. All Stickers
    html += `
      <div class="wsh-tab-pill ${currentActiveTab === 'all' ? 'wsh-active' : ''}" data-tab="all">
        ${getSvg('grid', 13)}
        <span>All</span>
      </div>
    `;

    // 3. Favorites
    html += `
      <div class="wsh-tab-pill ${currentActiveTab === 'favorites' ? 'wsh-active' : ''}" data-tab="favorites">
        ${getSvg('star', 13)}
        <span>Favorites</span>
        ${favorites.length > 0 ? `<span class="wsh-tab-count">${favorites.length}</span>` : ''}
      </div>
    `;

    // 4. WhatsApp Starred
    const waPack = allPacks.find(p => p.id === 'pack_wa_saved');
    const waCount = waPack ? waPack.stickers.length : 0;
    html += `
      <div class="wsh-tab-pill ${currentActiveTab === 'pack_wa_saved' ? 'wsh-active' : ''}" data-tab="pack_wa_saved">
        ${getSvg('bookmark', 13)}
        <span>WA Starred</span>
        ${waCount > 0 ? `<span class="wsh-tab-count">${waCount}</span>` : ''}
      </div>
    `;

    // 5. Built-in Sticker Store
    html += `
      <div class="wsh-tab-pill wsh-store-pill ${currentActiveTab === 'store' ? 'wsh-active' : ''}" data-tab="store">
        ${getSvg('store', 13)}
        <span>Store</span>
      </div>
    `;

    // 6. User Packs
    for (const pack of allPacks) {
      if (pack.id === 'pack_wa_saved') continue;
      const active = currentActiveTab === pack.id ? 'wsh-active' : '';
      html += `
        <div class="wsh-tab-pill ${active}" data-tab="${pack.id}">
          ${getSvg(pack.icon === 'film' ? 'layers' : 'folder', 13)}
          <span>${pack.name.replace(/[^\w\s-]/g, '').trim() || 'Pack'}</span>
          <span class="wsh-tab-count">${pack.stickers.length}</span>
        </div>
      `;
    }

    // 7. Import Tab
    html += `
      <div class="wsh-tab-pill ${currentActiveTab === 'import' ? 'wsh-active' : ''}" data-tab="import">
        ${getSvg('plus-circle', 13)}
        <span>Import</span>
      </div>
    `;

    tabsBar.innerHTML = html;

    tabsBar.querySelectorAll('.wsh-tab-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        currentActiveTab = pill.getAttribute('data-tab');
        renderTabs();
        renderStickers();
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // 11. STICKERS & VIEWS RENDERING
  // ═══════════════════════════════════════════════════════════════════

  function renderStickers() {
    const container = document.getElementById('wsh-content-body');
    const searchVal = (document.getElementById('wsh-search-input')?.value || '').toLowerCase().trim();
    if (!container) return;

    // A. Store Tab View
    if (currentActiveTab === 'store') {
      renderStoreView(container);
      return;
    }

    // B. Import Tab View
    if (currentActiveTab === 'import') {
      renderImportView(container);
      return;
    }

    let stickerList = [];

    // Filter stickers based on active tab
    if (currentActiveTab === 'recents') {
      const stickerMap = new Map();
      for (const pack of allPacks) {
        for (const s of pack.stickers) stickerMap.set(s.id, s);
      }
      for (const recId of recents) {
        if (stickerMap.has(recId)) stickerList.push(stickerMap.get(recId));
      }
    } else if (currentActiveTab === 'all') {
      stickerList = StickerStorage.getAllStickersDeduplicated(allPacks);
    } else if (currentActiveTab === 'favorites') {
      const favSet = new Set(favorites);
      const seenFp = new Set();
      for (const pack of allPacks) {
        for (const s of pack.stickers) {
          if (favSet.has(s.id)) {
            const fp = StickerStorage.getStickerFingerprint(s);
            if (fp && seenFp.has(fp)) continue;
            if (fp) seenFp.add(fp);
            stickerList.push(s);
          }
        }
      }
    } else {
      const pack = allPacks.find(p => p.id === currentActiveTab);
      if (pack) {
        const seenFp = new Set();
        stickerList = [];
        for (const s of (pack.stickers || [])) {
          const fp = StickerStorage.getStickerFingerprint(s);
          if (fp && seenFp.has(fp)) continue;
          if (fp) seenFp.add(fp);
          stickerList.push(s);
        }
      }
    }

    // Apply Search Filter
    if (searchVal) {
      stickerList = stickerList.filter(s =>
        s.name.toLowerCase().includes(searchVal) ||
        (s.tags && s.tags.toLowerCase().includes(searchVal))
      );
    }

    let contentHtml = '';

    // WA Starred sync bar inside pack_wa_saved
    if (currentActiveTab === 'pack_wa_saved') {
      contentHtml += `
        <div class="wsh-pack-info-bar">
          <div class="wsh-pack-info-left">
            ${getSvg('bookmark', 14)}
            <span>WhatsApp Web Starred</span>
          </div>
          <button class="wsh-pack-btn" id="wsh-btn-sync-starred">
            ${getSvg('refresh', 12)} Sync Starred
          </button>
        </div>
      `;
    } else {
      const activePackObj = allPacks.find(p => p.id === currentActiveTab);
      if (activePackObj) {
        contentHtml += `
          <div class="wsh-pack-info-bar">
            <div class="wsh-pack-info-left">
              ${getSvg(activePackObj.icon === 'film' ? 'layers' : 'folder', 14)}
              <span>${activePackObj.name.replace(/[^\w\s-]/g, '').trim() || 'Sticker Pack'}</span>
              <span class="wsh-pack-badge">${activePackObj.stickers ? activePackObj.stickers.length : 0} stickers</span>
            </div>
            <div class="wsh-pack-info-actions">
              <button class="wsh-pack-btn wsh-pack-btn-danger" id="wsh-btn-delete-pack" data-id="${activePackObj.id}" title="Delete this entire pack">
                ${getSvg('trash', 12)} Delete Pack
              </button>
            </div>
          </div>
        `;
      }
    }

    // Empty state handling
    if (stickerList.length === 0) {
      let emptyTitle = 'No stickers found';
      let emptySub = 'Try a different search or browse the Store to add packs.';
      let emptyBtnText = 'Explore Store';
      let emptyBtnAction = () => { currentActiveTab = 'store'; renderTabs(); renderStickers(); };

      if (currentActiveTab === 'recents') {
        emptyTitle = 'No recent stickers';
        emptySub = 'Stickers you send in any chat will appear here for 1-click access.';
        emptyBtnText = 'Explore Store';
      } else if (currentActiveTab === 'favorites') {
        emptyTitle = 'No favorites yet';
        emptySub = 'Hover on any sticker and click the star icon to bookmark it here.';
        emptyBtnText = 'Browse All';
        emptyBtnAction = () => { currentActiveTab = 'all'; renderTabs(); renderStickers(); };
      } else if (currentActiveTab === 'pack_wa_saved') {
        emptyTitle = 'No WhatsApp Starred stickers';
        emptySub = 'Star any sticker in WhatsApp Web and click "Sync Starred" above.';
        emptyBtnText = 'Sync Now';
        emptyBtnAction = () => {
          showToast('Syncing WhatsApp Starred stickers...', 'info', 2000);
          window.postMessage({ type: 'WSH_GET_WA_STICKERS' }, '*');
        };
      }

      container.innerHTML = contentHtml + `
        <div class="wsh-empty-state">
          <div class="wsh-empty-icon">${getSvg('layers', 32)}</div>
          <div class="wsh-empty-title">${emptyTitle}</div>
          <div class="wsh-empty-sub">${emptySub}</div>
          <button class="wsh-empty-btn" id="wsh-empty-action-btn">
            ${getSvg('sparkles', 13)} ${emptyBtnText}
          </button>
        </div>
      `;

      container.querySelector('#wsh-empty-action-btn')?.addEventListener('click', emptyBtnAction);
      bindPackInfoEvents(container);
      return;
    }

    // Render Grid
    const favSet = new Set(favorites);
    const isRecentsTab = currentActiveTab === 'recents';

    // In-Drawer Smart Reply Suggestions
    if (!searchVal && currentSmartRecommendations && (currentActiveTab === 'recents' || currentActiveTab === 'all')) {
      const rec = currentSmartRecommendations;
      const snippet = rec.originalText.length > 25 ? (rec.originalText.slice(0, 23) + '…') : rec.originalText;
      contentHtml += `
        <div class="wsh-drawer-smart-section">
          <div class="wsh-dss-header">
            <div class="wsh-dss-tag">
              ${getSvg('sparkles', 13)}
              <span>Reply to "${snippet}"</span>
            </div>
            <span class="wsh-dss-intent">${rec.intentLabel}</span>
          </div>
          <div class="wsh-dss-row" id="wsh-dss-row">
            ${rec.stickers.map(stk => `
              <button class="wsh-dss-item" data-id="${stk.id}" title="${stk.name}">
                <img src="${stk.dataUrl}" alt="${stk.name}" loading="lazy" />
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    contentHtml += `<div class="wsh-sticker-grid ${isSelectionMode ? 'wsh-select-mode' : ''}">`;

    for (const sticker of stickerList) {
      const isFav = favSet.has(sticker.id);
      const isAnim = sticker.isAnimated || (sticker.tags && sticker.tags.includes('animated'));
      const isSelected = selectedStickerIds.has(sticker.id);

      contentHtml += `
        <div class="wsh-sticker-card ${isSelected ? 'wsh-selected' : ''}" data-id="${sticker.id}" title="${sticker.name}">
          <!-- Checkbox for multi-select -->
          <div class="wsh-select-checkbox">
            ${isSelected ? getSvg('check', 11) : ''}
          </div>

          <img src="${sticker.dataUrl}" alt="${sticker.name}" loading="lazy" />

          ${isAnim ? `
            <span class="wsh-card-anim-badge" title="Animated Sticker">
              ${getSvg('sparkles', 9)} GIF
            </span>
          ` : ''}

          <!-- Normal Mode Card Actions -->
          <div class="wsh-card-actions">
            ${isRecentsTab ? `
              <button class="wsh-card-mini-btn wsh-recent-remove-btn" data-action="remove-recent" data-id="${sticker.id}" title="Remove from recents">
                ${getSvg('x', 11)}
              </button>
            ` : `
              <button class="wsh-card-mini-btn wsh-fav-btn ${isFav ? 'wsh-is-fav' : ''}" data-action="fav" data-id="${sticker.id}" title="${isFav ? 'Remove Favorite' : 'Add to Favorites'}">
                ${getSvg(isFav ? 'star-filled' : 'star', 11)}
              </button>
              <button class="wsh-card-mini-btn wsh-del-btn" data-action="delete-sticker" data-id="${sticker.id}" title="Delete sticker">
                ${getSvg('trash', 11)}
              </button>
            `}
          </div>
        </div>
      `;
    }

    contentHtml += '</div>';
    container.innerHTML = contentHtml;

    container.querySelectorAll('.wsh-dss-item').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const id = btn.getAttribute('data-id');
        const sticker = findStickerById(id) || (currentSmartRecommendations && currentSmartRecommendations.stickers.find(s => s.id === id));
        if (sticker) {
          btn.style.transform = 'scale(0.88)';
          setTimeout(() => { btn.style.transform = ''; }, 140);
          await sendStickerToChat(sticker);
        }
      });
    });

    bindPackInfoEvents(container);
    bindStickerCardEvents(container);
  }

  function bindPackInfoEvents(container) {
    const syncBtn = container.querySelector('#wsh-btn-sync-starred');
    if (syncBtn) {
      syncBtn.addEventListener('click', () => {
        syncBtn.classList.add('wsh-syncing');
        showToast('Scanning WhatsApp for Starred Stickers...', 'info', 2000);
        window.postMessage({ type: 'WSH_GET_WA_STICKERS' }, '*');
        setTimeout(() => syncBtn.classList.remove('wsh-syncing'), 1800);
      });
    }

    const deletePackBtn = container.querySelector('#wsh-btn-delete-pack');
    if (deletePackBtn) {
      deletePackBtn.addEventListener('click', async () => {
        const packId = deletePackBtn.getAttribute('data-id');
        const pack = allPacks.find(p => p.id === packId);
        if (!pack) return;
        if (confirm(`Delete pack "${pack.name}" and all its ${pack.stickers.length} stickers?`)) {
          await StickerStorage.deletePack(packId);
          allPacks = await StickerStorage.getPacks();
          currentActiveTab = 'all';
          renderTabs();
          renderStickers();
          showToast(`Pack "${pack.name}" deleted!`, 'success', 2500);
        }
      });
    }
  }

  function bindStickerCardEvents(container) {
    container.querySelectorAll('.wsh-sticker-card').forEach(card => {
      card.addEventListener('click', async (e) => {
        const id = card.getAttribute('data-id');
        const sticker = findStickerById(id);
        if (!sticker) return;

        // Action 1: Remove from Recents
        const removeRecentBtn = e.target.closest('[data-action="remove-recent"]');
        if (removeRecentBtn) {
          e.stopPropagation();
          card.style.opacity = '0';
          card.style.transform = 'scale(0.8)';
          await StickerStorage.removeRecent(id);
          recents = await StickerStorage.getRecents();
          setTimeout(() => {
            renderTabs();
            renderStickers();
          }, 180);
          showToast('Removed from recents', 'info', 1600);
          return;
        }

        // Action 2: Favorite Toggle
        const favBtn = e.target.closest('[data-action="fav"]');
        if (favBtn) {
          e.stopPropagation();
          await StickerStorage.toggleFavorite(id);
          favorites = await StickerStorage.getFavorites();
          renderTabs();
          renderStickers();
          return;
        }

        // Action 2b: Delete Sticker
        const delBtn = e.target.closest('[data-action="delete-sticker"]');
        if (delBtn) {
          e.stopPropagation();
          card.style.opacity = '0';
          card.style.transform = 'scale(0.8)';
          await StickerStorage.deleteSticker(id);
          allPacks = await StickerStorage.getPacks();
          favorites = await StickerStorage.getFavorites();
          recents = await StickerStorage.getRecents();
          setTimeout(() => {
            renderTabs();
            renderStickers();
          }, 180);
          showToast('Sticker deleted', 'info', 1600);
          return;
        }

        // Action 3: Multi-Select Mode Click
        if (isSelectionMode) {
          if (selectedStickerIds.has(id)) {
            selectedStickerIds.delete(id);
            card.classList.remove('wsh-selected');
            const chk = card.querySelector('.wsh-select-checkbox');
            if (chk) chk.innerHTML = '';
          } else {
            selectedStickerIds.add(id);
            card.classList.add('wsh-selected');
            const chk = card.querySelector('.wsh-select-checkbox');
            if (chk) chk.innerHTML = getSvg('check', 11);
          }
          updateSelectionUI();
          return;
        }

        // Action 4: Send to Chat (Native True Sticker)
        card.style.transform = 'scale(0.92)';
        setTimeout(() => { card.style.transform = ''; }, 160);
        await sendStickerToChat(sticker);
      });
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // 12. MULTI-SELECT MODE & PACK CREATION
  // ═══════════════════════════════════════════════════════════════════

  function toggleSelectionMode() {
    isSelectionMode = !isSelectionMode;
    if (!isSelectionMode) {
      selectedStickerIds.clear();
    }
    updateSelectionUI();
    renderStickers();
  }

  function updateSelectionUI() {
    const toggleBtn = document.getElementById('wsh-select-toggle-btn');
    const bar = document.getElementById('wsh-selection-bar');
    const countEl = document.getElementById('wsh-sel-count');

    if (toggleBtn) {
      toggleBtn.classList.toggle('wsh-active', isSelectionMode);
      toggleBtn.title = isSelectionMode ? 'Cancel Selection Mode' : 'Select Stickers to Create Pack';
    }

    if (bar) {
      if (isSelectionMode && selectedStickerIds.size > 0) {
        bar.style.display = 'flex';
        countEl.textContent = `${selectedStickerIds.size} Selected`;
      } else {
        bar.style.display = 'none';
      }
    }
  }

  function openCreatePackModal() {
    if (selectedStickerIds.size === 0) return;

    const modalContainer = document.getElementById('wsh-modal-container');
    if (!modalContainer) return;

    modalContainer.style.display = 'block';
    modalContainer.innerHTML = `
      <div class="wsh-modal-backdrop" id="wsh-modal-backdrop">
        <div class="wsh-modal-box">
          <div class="wsh-modal-title">Create Custom Pack</div>
          <input type="text" class="wsh-modal-input" id="wsh-new-pack-name" placeholder="Pack Name (e.g. My Favorite Memes)" autofocus />
          <div class="wsh-modal-actions">
            <button class="wsh-btn-cancel" id="wsh-modal-cancel">Cancel</button>
            <button class="wsh-btn-confirm" id="wsh-modal-create">Create (${selectedStickerIds.size})</button>
          </div>
        </div>
      </div>
    `;

    const input = document.getElementById('wsh-new-pack-name');
    const cancelBtn = document.getElementById('wsh-modal-cancel');
    const createBtn = document.getElementById('wsh-modal-create');

    setTimeout(() => input?.focus(), 80);

    const closeModal = () => {
      modalContainer.style.display = 'none';
      modalContainer.innerHTML = '';
    };

    cancelBtn.addEventListener('click', closeModal);

    createBtn.addEventListener('click', async () => {
      const name = (input.value || '').trim() || 'My Pack';
      createBtn.disabled = true;
      createBtn.textContent = 'Creating...';

      try {
        const newPack = await StickerStorage.createPackFromStickers(name, Array.from(selectedStickerIds));
        showToast(`Created pack "${newPack.name}" with ${newPack.stickers.length} stickers!`, 'success', 2600);
        closeModal();
        isSelectionMode = false;
        selectedStickerIds.clear();
        updateSelectionUI();

        await loadData();
        currentActiveTab = newPack.id;
        renderTabs();
        renderStickers();
      } catch (err) {
        showToast('Error creating pack: ' + err.message, 'error');
        createBtn.disabled = false;
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') createBtn.click();
      if (e.key === 'Escape') closeModal();
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // 13. BUILT-IN CURATED STICKER STORE
  // ═══════════════════════════════════════════════════════════════════

  const storeThumbCache = new Map();
  let storeActiveCategory = 'all';

  async function loadStoreThumbnails(container) {
    const imgs = container.querySelectorAll('img[data-store-src]');
    imgs.forEach(async (img) => {
      const rawUrl = img.getAttribute('data-store-src');
      if (!rawUrl) return;

      if (rawUrl.startsWith('data:')) {
        img.src = rawUrl;
        img.classList.remove('wsh-store-img-loading');
        return;
      }

      if (storeThumbCache.has(rawUrl)) {
        img.src = storeThumbCache.get(rawUrl);
        img.classList.remove('wsh-store-img-loading');
        return;
      }

      try {
        const dataUrl = await StickerStorage.fetchExternal(rawUrl, 'dataUrl');
        if (dataUrl && dataUrl.startsWith('data:')) {
          storeThumbCache.set(rawUrl, dataUrl);
          img.src = dataUrl;
          img.classList.remove('wsh-store-img-loading');
        } else {
          img.closest('.wsh-store-detail-item, .wsh-store-thumb')?.style.setProperty('display', 'none');
        }
      } catch (err) {
        img.closest('.wsh-store-detail-item, .wsh-store-thumb')?.style.setProperty('display', 'none');
      }
    });
  }

  function renderStoreView(container) {
    const catalog = StickerStorage.getStoreCatalog();
    const searchVal = (document.getElementById('wsh-search-input')?.value || '').toLowerCase().trim();

    // Trigger automatic debounced live search on Sticker.ly when typing
    if (searchVal && searchVal.length >= 2 && searchVal !== lastLiveStoreQuery) {
      if (liveSearchDebounceTimer) clearTimeout(liveSearchDebounceTimer);
      isLiveSearching = true;
      liveSearchDebounceTimer = setTimeout(async () => {
        lastLiveStoreQuery = searchVal;
        try {
          const liveResults = await StickerStorage.searchStickerlyLive(searchVal);
          liveStorePacks = liveResults || [];
        } catch {
          liveStorePacks = [];
        } finally {
          isLiveSearching = false;
          if (currentActiveTab === 'store') {
            const sc = document.getElementById('wsh-stickers-container');
            if (sc) renderStoreView(sc);
          }
        }
      }, 450);
    } else if (!searchVal) {
      liveStorePacks = [];
      lastLiveStoreQuery = '';
      isLiveSearching = false;
    }

    let filtered = catalog;

    // Filter by Category or Topic
    if (storeActiveCategory !== 'all') {
      const catLower = storeActiveCategory.toLowerCase();
      filtered = filtered.filter(p =>
        p.category.toLowerCase().includes(catLower) ||
        p.name.toLowerCase().includes(catLower) ||
        (p.tags && p.tags.toLowerCase().includes(catLower)) ||
        (p.description && p.description.toLowerCase().includes(catLower))
      );
    }

    // Filter by Search Query
    if (searchVal) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchVal) ||
        p.category.toLowerCase().includes(searchVal) ||
        p.description.toLowerCase().includes(searchVal) ||
        (p.tags && p.tags.toLowerCase().includes(searchVal)) ||
        p.code.toLowerCase().includes(searchVal)
      );
    }

    // Merge live Sticker.ly search results at the top (deduplicate by code)
    if (liveStorePacks.length > 0) {
      const existingCodes = new Set(filtered.map(p => p.code.toUpperCase()));
      const uniqueLive = liveStorePacks.filter(p => !existingCodes.has(p.code.toUpperCase()));
      filtered = [...uniqueLive, ...filtered];
    }

    const categories = [
      { id: 'all', label: 'All (40+)' },
      { id: 'trending', label: 'Trending' },
      { id: 'tmkoc', label: 'TMKOC' },
      { id: 'hera pheri', label: 'Hera Pheri' },
      { id: 'panchayat', label: 'Panchayat' },
      { id: 'mirzapur', label: 'Mirzapur' },
      { id: 'carry', label: 'CarryMinati' },
      { id: 'cricket', label: 'Cricket' },
      { id: 'desi memes', label: 'Desi Memes' },
      { id: 'savage', label: 'Savage Replies' },
      { id: 'love', label: 'Love & Romance' },
      { id: 'shinchan', label: 'Shinchan' },
      { id: 'dudu', label: 'Bubu & Dudu' },
      { id: 'cute', label: 'Cute Animals' }
    ];

    const placeholderSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='1.5'><rect x='3' y='3' width='18' height='18' rx='4'/><circle cx='8.5' cy='8.5' r='1.5'/><polyline points='21 15 16 10 5 21'/></svg>";

    let html = `
      <div class="wsh-store-container">
        <!-- Store Category Filter Pills -->
        <div class="wsh-store-filters">
          ${categories.map(c => `
            <div class="wsh-filter-pill ${storeActiveCategory === c.id ? 'wsh-active' : ''}" data-cat="${c.id}">
              ${c.label}
            </div>
          `).join('')}
        </div>

        ${searchVal ? `
          <div class="wsh-store-search-action-bar">
            <span>
              ${isLiveSearching ? `${getSvg('refresh', 12, 'wsh-spin')} Searching Sticker.ly Live...` : (liveStorePacks.length > 0 ? `${getSvg('sparkles', 12)} Found ${liveStorePacks.length} live packs on Sticker.ly` : `Search Sticker.ly for: <strong>"${searchVal}"</strong>`)}
            </span>
            <button class="wsh-ssab-btn" id="wsh-btn-live-search-action" ${isLiveSearching ? 'disabled' : ''}>
              ${isLiveSearching ? 'Searching...' : `${getSvg('download', 12)} Search Live`}
            </button>
          </div>
        ` : ''}
    `;

    if (filtered.length === 0) {
      const isPossibleCode = searchVal.length >= 4 && searchVal.length <= 10;
      html += `
        <div class="wsh-empty-state">
          <div class="wsh-empty-icon">${getSvg('search', 28)}</div>
          <div class="wsh-empty-title">Search Sticker.ly for "${searchVal}"</div>
          <div class="wsh-empty-sub">
            Fetch packs or enter any pack code (e.g. YIKLU9) to load stickers directly from Sticker.ly.
          </div>
          <button class="wsh-empty-btn" id="wsh-store-live-fetch-btn">
            ${getSvg('download', 13)} Fetch "${searchVal.toUpperCase()}" from Sticker.ly
          </button>
        </div>
      `;
    } else {
      for (const pack of filtered) {
        const isInstalled = allPacks.some(p => p.id === `pack_${pack.code}` || p.name.includes(pack.name) || p.name.includes(`[${pack.code}]`));

        html += `
          <div class="wsh-store-card" data-code="${pack.code}">
            <div class="wsh-store-card-header">
              <div>
                <div class="wsh-store-card-title">${pack.name}</div>
                <div class="wsh-store-card-meta">
                  <span class="wsh-tag">${pack.category}</span>
                  ${pack.isAnimated ? `<span class="wsh-tag wsh-tag-anim">${getSvg('sparkles', 10)} Animated</span>` : ''}
                </div>
              </div>
              <button class="wsh-store-get-btn ${isInstalled ? 'wsh-installed' : ''}" data-code="${pack.code}" ${isInstalled ? 'disabled' : ''}>
                ${isInstalled ? `${getSvg('check', 12)} Installed` : `${getSvg('download', 12)} Get Pack`}
              </button>
            </div>

            <div class="wsh-store-card-desc">${pack.description}</div>

            <!-- Preview Thumbnails (Loaded via Background Proxy to bypass CSP) -->
            <div class="wsh-store-preview-row">
              ${(pack.previewUrls || []).map(url => `
                <div class="wsh-store-thumb">
                  <img data-store-src="${url}" src="${placeholderSvg}" class="wsh-store-img-loading" alt="" />
                </div>
              `).join('')}
            </div>

            <div class="wsh-store-card-footer">
              <span class="wsh-store-count">${pack.stickerCount} Stickers</span>
              <span style="font-size:10px; color:var(--wsh-text-muted); font-family:monospace;">Code: ${pack.code}</span>
            </div>
          </div>
        `;
      }
    }

    html += `</div>`;
    container.innerHTML = html;

    // Category click events
    container.querySelectorAll('.wsh-filter-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        storeActiveCategory = pill.getAttribute('data-cat');
        renderStoreView(container);
      });
    });

    // Live Sticker.ly search actions (from action bar or empty state)
    const triggerLiveSearch = async () => {
      const liveBtn = container.querySelector('#wsh-btn-live-search-action') || container.querySelector('#wsh-store-live-fetch-btn');
      if (liveBtn) {
        liveBtn.disabled = true;
        liveBtn.textContent = 'Searching...';
      }
      showToast(`Searching Sticker.ly for "${searchVal}"...`, 'info', 2500);

      try {
        const isCode = /^(https?:\/\/sticker\.ly\/s\/)?[A-Za-z0-9]{4,10}$/i.test(searchVal.trim());
        if (isCode) {
          const pack = await StickerStorage.importStickerlyPack(searchVal);
          showToast(`Pack "${pack.name}" installed with ${pack.stickers.length} stickers!`, 'success', 3000);
          await loadData();
          renderTabs();
          currentActiveTab = pack.id;
          renderStickers();
          return;
        }

        const livePacks = await StickerStorage.searchStickerlyLive(searchVal);
        if (livePacks && livePacks.length > 0) {
          liveStorePacks = livePacks;
          showToast(`Found ${livePacks.length} packs on Sticker.ly!`, 'success', 2500);
          renderStoreView(container);
        } else {
          showToast(`No live packs found for "${searchVal}". Try another keyword or code.`, 'warning', 3500);
          if (liveBtn) {
            liveBtn.disabled = false;
            liveBtn.textContent = 'Search Live';
          }
        }
      } catch (err) {
        showToast('Live search error: ' + err.message, 'error', 3500);
        if (liveBtn) {
          liveBtn.disabled = false;
          liveBtn.textContent = 'Search Live';
        }
      }
    };

    container.querySelector('#wsh-btn-live-search-action')?.addEventListener('click', triggerLiveSearch);
    container.querySelector('#wsh-store-live-fetch-btn')?.addEventListener('click', triggerLiveSearch);

    // Attach Card Click to open full details (preview all stickers without download)
    container.querySelectorAll('.wsh-store-card').forEach(card => {
      card.style.cursor = 'pointer';
      card.addEventListener('click', (e) => {
        if (e.target.closest('.wsh-store-get-btn')) return;
        const code = card.getAttribute('data-code');
        const pack = catalog.find(p => p.code === code);
        if (pack) renderStorePackDetail(container, pack);
      });
    });

    // Attach Install Event Listeners
    container.querySelectorAll('.wsh-store-get-btn:not(.wsh-installed)').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const code = btn.getAttribute('data-code');
        btn.classList.add('wsh-downloading');
        btn.innerHTML = `${getSvg('refresh', 12)} Downloading...`;
        btn.disabled = true;

        showToast(`Downloading pack [${code}]...`, 'info', 3000);

        try {
          const pack = await StickerStorage.importStickerlyPack(code, (curr, total) => {
            btn.innerHTML = `${getSvg('refresh', 12)} ${curr}/${total}`;
          });

          btn.classList.remove('wsh-downloading');
          btn.classList.add('wsh-installed');
          btn.innerHTML = `${getSvg('check', 12)} Installed`;

          showToast(`Pack "${pack.name}" installed with ${pack.stickers.length} stickers!`, 'success', 3000);
          await loadData();
          renderTabs();
        } catch (err) {
          btn.classList.remove('wsh-downloading');
          btn.disabled = false;
          btn.innerHTML = `${getSvg('download', 12)} Get Pack`;
          showToast('Failed to install pack: ' + err.message, 'error', 4000);
        }
      });
    });

    // Asynchronously load the preview thumbnails bypassing CSP
    loadStoreThumbnails(container);
  }

  /**
   * Render Pack Detail View inside in-page drawer: Preview all 19+ stickers without downloading!
   */
  function renderStorePackDetail(container, pack) {
    const isInstalled = allPacks.some(p => p.id === `pack_${pack.code}` || p.name.includes(pack.name) || p.name.includes(`[${pack.code}]`));
    const allUrls = pack.allUrls && pack.allUrls.length > 0 ? pack.allUrls : pack.previewUrls || [];
    const placeholderSvg = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24' fill='none' stroke='%2394A3B8' stroke-width='1.5'><rect x='3' y='3' width='18' height='18' rx='4'/><circle cx='8.5' cy='8.5' r='1.5'/><polyline points='21 15 16 10 5 21'/></svg>";

    let html = `
      <div class="wsh-store-detail-view">
        <div class="wsh-store-detail-header">
          <button class="wsh-store-back-btn" id="wsh-btn-store-detail-back">
            ${getSvg('arrow-left', 13)} Back
          </button>
          <button class="wsh-store-get-btn ${isInstalled ? 'wsh-installed' : ''}" id="wsh-btn-detail-get-pack" data-code="${pack.code}" ${isInstalled ? 'disabled' : ''}>
            ${isInstalled ? `${getSvg('check', 12)} Installed` : `${getSvg('download', 12)} Get Pack`}
          </button>
        </div>

        <div class="wsh-store-detail-meta">
          <div class="wsh-store-detail-title">${pack.name}</div>
          <div class="wsh-store-detail-sub">
            <span class="wsh-tag">${pack.category}</span>
            ${pack.isAnimated ? `<span class="wsh-tag wsh-tag-anim">${getSvg('sparkles', 10)} Animated</span>` : ''}
            <span>${pack.stickerCount} Stickers</span>
            <span style="font-family:monospace;">Code: ${pack.code}</span>
          </div>
          <div class="wsh-store-detail-desc">${pack.description}</div>
        </div>

        <div class="wsh-store-detail-grid">
          ${allUrls.map((url, i) => `
            <div class="wsh-store-detail-item" data-url="${url}" title="Click to send sticker #${i + 1} to chat">
              <img data-store-src="${url}" src="${placeholderSvg}" class="wsh-store-img-loading" alt="" />
              <div class="wsh-item-send-overlay">
                ${getSvg('sparkles', 10)} Send
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    container.innerHTML = html;

    // Back button returns to Store catalog view
    container.querySelector('#wsh-btn-store-detail-back')?.addEventListener('click', () => {
      renderStoreView(container);
    });

    // Get pack button
    const getBtn = container.querySelector('#wsh-btn-detail-get-pack');
    if (getBtn && !isInstalled) {
      getBtn.addEventListener('click', async () => {
        getBtn.classList.add('wsh-downloading');
        getBtn.innerHTML = `${getSvg('refresh', 12)} Downloading...`;
        getBtn.disabled = true;

        showToast(`Downloading pack [${pack.code}]...`, 'info', 3000);

        try {
          const installed = await StickerStorage.importStickerlyPack(pack.code, (curr, total) => {
            getBtn.innerHTML = `${getSvg('refresh', 12)} ${curr}/${total}`;
          });

          getBtn.classList.remove('wsh-downloading');
          getBtn.classList.add('wsh-installed');
          getBtn.innerHTML = `${getSvg('check', 12)} Installed`;

          showToast(`Pack "${installed.name}" installed with ${installed.stickers.length} stickers!`, 'success', 3000);
          await loadData();
          renderTabs();
        } catch (err) {
          getBtn.classList.remove('wsh-downloading');
          getBtn.disabled = false;
          getBtn.innerHTML = `${getSvg('download', 12)} Get Pack`;
          showToast('Failed to install pack: ' + err.message, 'error', 4000);
        }
      });
    }

    // 1-Click Send on any sticker directly from detail preview grid
    container.querySelectorAll('.wsh-store-detail-item').forEach(item => {
      item.addEventListener('click', async () => {
        const url = item.getAttribute('data-url');
        showToast('Preparing sticker for chat...', 'info', 1600);
        try {
          const dataUrl = await StickerStorage.fetchExternal(url, 'dataUrl');
          if (!dataUrl || !dataUrl.startsWith('data:')) {
            throw new Error('Could not convert preview image to sticker data.');
          }
          const stickerObj = {
            id: 'preview_' + Date.now(),
            name: `${pack.name} Sticker`,
            dataUrl: dataUrl
          };
          await sendStickerToChat(stickerObj);
        } catch (err) {
          showToast('Failed to send: ' + err.message, 'error');
        }
      });
    });

    // Load thumbnails bypassing CSP and caching permanently in IndexedDB
    loadStoreThumbnails(container);
  }

  // ═══════════════════════════════════════════════════════════════════
  // 14. IN-DRAWER IMPORT VIEW (Custom Code / Bulk upload)
  // ═══════════════════════════════════════════════════════════════════

  function renderImportView(container) {
    container.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:12px; padding:4px 0;">
        <div style="background:var(--wsh-surface); border:1px solid var(--wsh-border); border-radius:var(--wsh-radius-lg); padding:14px;">
          <div style="font-size:13px; font-weight:700; color:var(--wsh-text); margin-bottom:4px; display:flex; align-items:center; gap:6px;">
            ${getSvg('download', 14)} Import via Sticker.ly Code
          </div>
          <div style="font-size:11px; color:var(--wsh-text-muted); margin-bottom:10px;">
            Enter any Sticker.ly pack code or URL (e.g. <code>L0VDX7</code>, <code>AKB5VR</code>)
          </div>
          <input type="text" id="wsh-drawer-stk-code" placeholder="Enter code (e.g. L0VDX7)" class="wsh-modal-input" style="margin-bottom:8px;" />
          <button id="wsh-btn-drawer-import" class="wsh-btn-create-pack" style="width:100%; justify-content:center; padding:8px 0;">
            ${getSvg('download', 13)} Import Pack
          </button>
          <div id="wsh-drawer-import-status" style="font-size:11px; font-weight:600; text-align:center; margin-top:8px; display:none;"></div>
        </div>

        <div style="background:var(--wsh-surface); border:1px solid var(--wsh-border); border-radius:var(--wsh-radius-lg); padding:14px;">
          <div style="font-size:13px; font-weight:700; color:var(--wsh-text); margin-bottom:4px; display:flex; align-items:center; gap:6px;">
            ${getSvg('folder-plus', 14)} Create Pack from Files
          </div>
          <div style="font-size:11px; color:var(--wsh-text-muted); margin-bottom:10px;">
            Upload PNG, JPG, WebP, or animated GIFs from your device
          </div>
          <input type="text" id="wsh-bulk-name" placeholder="Pack Name" class="wsh-modal-input" style="margin-bottom:8px;" />
          <div id="wsh-drawer-bulk-zone" style="border:1.5px dashed var(--wsh-border-strong); border-radius:var(--wsh-radius-md); padding:14px 10px; text-align:center; cursor:pointer; font-size:12px; font-weight:600; color:var(--wsh-text-muted); margin-bottom:8px;">
            ${getSvg('plus', 14)} Choose Image Files
            <input type="file" id="wsh-drawer-bulk-input" multiple accept="image/*" style="display:none;" />
          </div>
          <button id="wsh-btn-drawer-bulk-save" class="wsh-btn-create-pack" style="width:100%; justify-content:center; padding:8px 0; display:none;">
            ${getSvg('check', 13)} Save Custom Pack
          </button>
        </div>
      </div>
    `;

    const codeInput = document.getElementById('wsh-drawer-stk-code');
    const importBtn = document.getElementById('wsh-btn-drawer-import');
    const statusDiv = document.getElementById('wsh-drawer-import-status');

    importBtn.addEventListener('click', async () => {
      const code = codeInput.value.trim();
      if (!code) return;

      importBtn.disabled = true;
      statusDiv.style.display = 'block';
      statusDiv.style.color = 'var(--wsh-primary)';
      statusDiv.textContent = 'Fetching pack from Sticker.ly...';

      try {
        const pack = await StickerStorage.importStickerlyPack(code, (curr, total, name) => {
          statusDiv.textContent = `Downloading ${curr}/${total}: ${name}`;
        });
        showToast(`Pack "${pack.name}" imported with ${pack.stickers.length} stickers!`, 'success', 3000);
        await loadData();
        currentActiveTab = pack.id;
        renderTabs();
        renderStickers();
      } catch (err) {
        statusDiv.style.color = 'var(--wsh-danger)';
        statusDiv.textContent = 'Error: ' + err.message;
        importBtn.disabled = false;
      }
    });

    const bulkZone = document.getElementById('wsh-drawer-bulk-zone');
    const bulkInput = document.getElementById('wsh-drawer-bulk-input');
    const bulkSaveBtn = document.getElementById('wsh-btn-drawer-bulk-save');
    const bulkNameInput = document.getElementById('wsh-bulk-name');

    let bulkFiles = [];
    bulkZone.addEventListener('click', () => bulkInput.click());

    bulkInput.addEventListener('change', () => {
      bulkFiles = Array.from(bulkInput.files).filter(f => f.type.startsWith('image/'));
      if (bulkFiles.length > 0) {
        bulkZone.textContent = `${bulkFiles.length} images selected`;
        bulkSaveBtn.style.display = 'flex';
      }
    });

    bulkSaveBtn.addEventListener('click', async () => {
      if (bulkFiles.length === 0) return;
      const name = bulkNameInput.value.trim() || 'My Custom Pack';
      bulkSaveBtn.disabled = true;
      showToast(`Creating pack "${name}"...`, 'info');

      try {
        const pack = await StickerStorage.createBulkPack(name, 'folder', bulkFiles);
        showToast(`Pack "${pack.name}" created!`, 'success');
        await loadData();
        currentActiveTab = pack.id;
        renderTabs();
        renderStickers();
      } catch (err) {
        showToast('Bulk upload error: ' + err.message, 'error');
        bulkSaveBtn.disabled = false;
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // 15. AUTO-SAVE INCOMING CHAT STICKERS
  // ═══════════════════════════════════════════════════════════════════

  function observeIncomingChatStickers() {
    let debounceTimer = null;

    const scanChatForStickers = () => {
      const stickerEls = document.querySelectorAll(
        '#main [data-testid="sticker"] img, ' +
        '#main img[src*="blob:"], ' +
        '#main div[class*="sticker"] img'
      );

      stickerEls.forEach(async (img) => {
        const bubble = img.closest('[data-id], [class*="message"]');
        if (!bubble) return;

        if (settings.autoSaveIncoming && !bubble.dataset.wshAutoSaved) {
          bubble.dataset.wshAutoSaved = '1';
          try {
            const res = await fetch(img.src);
            const blob = await res.blob();
            const dataUrl = await StickerStorage.processUploadedImage(blob);
            const saved = await StickerStorage.saveIncomingSticker(dataUrl, 'Active Chat');
            if (saved) {
              await loadData();
              renderTabs();
            }
          } catch (e) {}
        }
      });
    };

    const observer = new MutationObserver(() => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(scanChatForStickers, 700);
    });

    const startObserving = () => {
      const main = document.querySelector('#main');
      if (main) {
        observer.observe(main, { childList: true, subtree: true });
        scanChatForStickers();
      } else {
        setTimeout(startObserving, 1000);
      }
    };

    startObserving();
  }

  // ═══════════════════════════════════════════════════════════════════
  // 16. MODAL GRABBER (For WhatsApp Web Sticker Pack Modals)
  // ═══════════════════════════════════════════════════════════════════

  function observeStickerPackModal() {
    const observer = new MutationObserver(() => {
      const modals = document.querySelectorAll('div[role="dialog"], [data-animate-modal-popup="true"], [data-animate-modal-body="true"], div[class*="modal"]');
      modals.forEach(modal => {
        const modalText = (modal.innerText || '').toLowerCase();
        if ((modalText.includes('sticker pack info') || (modalText.includes('sticker') && modalText.includes('sticker.ly'))) && !modal.querySelector('#wsh-modal-grabber-btn')) {
          const titleEl = modal.querySelector('h1, [title], span[dir="auto"]');
          const packTitle = (titleEl?.getAttribute('title') || titleEl?.textContent || 'WhatsApp Sticker Pack').trim();

          const grabBtn = document.createElement('button');
          grabBtn.id = 'wsh-modal-grabber-btn';
          grabBtn.style.cssText = `
            position: absolute;
            top: 14px;
            right: 58px;
            background: #00A884;
            color: #FFFFFF;
            border: none;
            border-radius: 18px;
            padding: 6px 14px;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 3px 10px rgba(0, 168, 132, 0.4);
            z-index: 999999;
            display: flex;
            align-items: center;
            gap: 5px;
            font-family: inherit;
          `;
          grabBtn.innerHTML = `${getSvg('download', 12)} Save Pack to Hub`;

          grabBtn.addEventListener('click', async () => {
            grabBtn.disabled = true;
            grabBtn.textContent = 'Saving...';

            const codeMatch = (packTitle + ' ' + modalText).match(/\[([A-Za-z0-9]{4,10})\]/);
            if (codeMatch && codeMatch[1]) {
              showToast(`Importing full animated pack [${codeMatch[1]}]...`, 'info', 2000);
              try {
                const newPack = await StickerStorage.importStickerlyPack(codeMatch[1]);
                showToast(`Pack "${newPack.name}" saved with ${newPack.stickers.length} stickers!`, 'success', 3000);
                grabBtn.textContent = 'Saved!';
                await loadData();
                renderTabs();
                renderStickers();
                return;
              } catch (e) {
                console.warn('Code import failed, falling back to modal DOM grab:', e);
              }
            }

            const imgs = Array.from(modal.querySelectorAll('img')).filter(img => img.src && !img.src.includes('avatar'));
            if (imgs.length === 0) {
              showToast('No sticker images found', 'warning');
              grabBtn.disabled = false;
              return;
            }

            showToast(`Saving ${imgs.length} stickers...`, 'info', 2000);

            try {
              const newPack = await StickerStorage.createPack(packTitle, 'folder');
              for (let i = 0; i < imgs.length; i++) {
                try {
                  let dataUrl = '';
                  if (imgs[i].src.startsWith('data:')) {
                    dataUrl = await StickerStorage.processUploadedImage(imgs[i].src);
                  } else {
                    const res = await fetch(imgs[i].src);
                    const blob = await res.blob();
                    dataUrl = await StickerStorage.processUploadedImage(blob);
                  }
                  if (dataUrl) {
                    const bytes = await StickerStorage.getBytes(dataUrl);
                    const isAnim = StickerStorage.isAnimatedImage(bytes);
                    newPack.stickers.push({
                      id: 'stk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
                      name: `${packTitle} #${i + 1}`,
                      tags: `${packTitle.toLowerCase()}, whatsapp, ${isAnim ? 'animated' : 'static'}`,
                      dataUrl: dataUrl,
                      isAnimated: isAnim,
                      createdAt: Date.now() + i
                    });
                  }
                } catch (e) {}
              }

              const packs = await StickerStorage.getPacks();
              const idx = packs.findIndex(p => p.id === newPack.id);
              if (idx !== -1) packs[idx] = newPack;
              await StickerStorage.savePacks(packs);

              showToast(`Pack "${packTitle}" saved with ${newPack.stickers.length} stickers!`, 'success', 3000);
              grabBtn.textContent = 'Saved!';
              await loadData();
              renderTabs();
              renderStickers();
            } catch (err) {
              showToast('Failed to grab pack: ' + err.message, 'error');
              grabBtn.disabled = false;
            }
          });

          modal.style.position = 'relative';
          modal.appendChild(grabBtn);
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true });
  }

  // ═══════════════════════════════════════════════════════════════════
  // 16.5 SMART REPLY RECOMMENDATION BAR (Floating above chat input)
  // ═══════════════════════════════════════════════════════════════════

  function hideSmartReplyBar() {
    try {
      const bars = document.querySelectorAll('#wsh-smart-reply-bar, .wsh-smart-reply-bar, [class*="smart-reply-bar"], [id*="smart-reply"]');
      bars.forEach(b => b.remove());
    } catch {}
  }
  // Active continuous sweep ensuring no floating bar can ever appear above chat input
  setInterval(hideSmartReplyBar, 500);

  function updateSmartReplyBarPosition() {
    // Floating bar is disabled per user request:
    // "predition jo bhi ho bo yaha na dikh ke yaha hi dikhe"
    // Recommendations are presented exclusively inside the Sticker Hub drawer!
    hideSmartReplyBar();
  }

  function renderSmartReplyBar() {
    // Floating bar disabled on chat view — recommendations show inside the Sticker Hub drawer
    hideSmartReplyBar();
  }

  function extractMessageText(msgEl) {
    if (!msgEl) return '';
    try {
      // 1. WhatsApp classic and modern selectable-text
      const selectable = msgEl.querySelector('.selectable-text, [class*="selectable-text"]');
      if (selectable) {
        const clone = selectable.cloneNode(true);
        clone.querySelectorAll('[data-icon], [class*="time"], [aria-label*="time"], [data-testid*="tail"], [class*="status"]').forEach(e => e.remove());
        let t = (clone.innerText || clone.textContent || '').trim();
        t = t.replace(/\b\d{1,2}:\d{2}\s*(?:am|pm|AM|PM)?\b/gi, '').trim();
        if (t.length >= 1) return t;
      }

      // 2. WhatsApp copyable-text container
      const copyable = msgEl.querySelector('.copyable-text, [class*="copyable-text"]');
      if (copyable) {
        const clone = copyable.cloneNode(true);
        clone.querySelectorAll('[data-icon], [class*="time"], [aria-label*="time"], [data-testid*="tail"], [data-testid*="msg-meta"], [class*="status"]').forEach(e => e.remove());
        let t = (clone.innerText || clone.textContent || '').trim();
        t = t.replace(/\b\d{1,2}:\d{2}\s*(?:am|pm|AM|PM)?\b/gi, '').trim();
        if (t.length >= 1) return t;
      }

      // 3. Fallback: sanitize full message bubble
      const clone = msgEl.cloneNode(true);
      clone.querySelectorAll('[data-icon], [data-testid*="tail"], [data-testid*="msg-meta"], [class*="time"], [aria-label*="time"], [class*="status"], .quoted-mention, [data-testid*="quoted-message"]').forEach(e => e.remove());
      let t = (clone.innerText || clone.textContent || '').trim();
      t = t.replace(/\b\d{1,2}:\d{2}\s*(?:am|pm)?\b/gi, '');
      t = t.replace(/\b\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4}\b/g, '');
      return t.trim();
    } catch {
      return '';
    }
  }

  function getActiveChatTitle() {
    const header = document.querySelector('#main header, #main [data-testid="conversation-header"]');
    if (!header) return '';
    const titleEl = header.querySelector('span[dir="auto"], [title], span');
    return titleEl ? (titleEl.getAttribute('title') || titleEl.innerText || '').trim() : '';
  }

  function scanLatestIncomingMessage() {
    if (settings.smartReply === false) {
      currentSmartRecommendations = null;
      hideSmartReplyBar();
      return;
    }

    const main = document.querySelector('#main');
    if (!main) {
      currentSmartRecommendations = null;
      hideSmartReplyBar();
      return;
    }

    // 1. Check if active chat contact changed
    const currentChatTitle = getActiveChatTitle();
    if (currentChatTitle && currentChatTitle !== lastChatTitle) {
      lastChatTitle = currentChatTitle;
      lastAnalyzedMsgKey = '';
      isSmartReplyDismissed = false;
      currentSmartRecommendations = null;
    }

    // 2. Check if user is typing in WhatsApp's input box right now
    let activeInputText = '';
    const inputEl = main.querySelector('div[contenteditable="true"]');
    if (inputEl) {
      activeInputText = (inputEl.innerText || inputEl.textContent || '').trim();
    }

    let text = '';
    let msgKey = '';

    if (activeInputText && activeInputText.length >= 2) {
      text = activeInputText;
      msgKey = 'typed::' + text;
    } else {
      // 3. Query all message bubbles in conversation panel (scans newest message first)
      const allRows = Array.from(main.querySelectorAll(
        'div[data-id], div[role="row"], div[class*="message-"], div[data-testid="msg-container"]'
      ));

      if (allRows.length === 0) return;

      // Scan backward from the very latest message in the chat
      const maxLookback = Math.min(allRows.length, 14);
      for (let i = allRows.length - 1; i >= allRows.length - maxLookback; i--) {
        const el = allRows[i];
        const extracted = extractMessageText(el);
        if (extracted && extracted.length >= 1) {
          text = extracted;
          msgKey = (el.getAttribute('data-id') || text.slice(0, 40)) + '::' + text.slice(0, 80);
          break;
        }
      }
    }

    if (!text) return;

    if (msgKey !== lastAnalyzedMsgKey) {
      lastAnalyzedMsgKey = msgKey;
      isSmartReplyDismissed = false;

      if (window.WSH_SmartReply) {
        const rec = window.WSH_SmartReply.getRecommendations(text, allPacks, 8);
        if (rec && rec.stickers && rec.stickers.length > 0) {
          currentSmartRecommendations = rec;
          if (isDrawerOpen && (currentActiveTab === 'recents' || currentActiveTab === 'all')) {
            renderStickers();
          }
        } else {
          currentSmartRecommendations = null;
        }
      }
    }
  }

  function observeSmartReplies() {
    let debounceTimer = null;
    let lastObservedMain = null;

    const triggerScan = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(scanLatestIncomingMessage, 200);
    };

    const mainObserver = new MutationObserver(() => {
      triggerScan();
    });

    const checkActiveChat = () => {
      const main = document.querySelector('#main');
      if (main) {
        if (main !== lastObservedMain) {
          lastObservedMain = main;
          lastAnalyzedMsgKey = '';
          isSmartReplyDismissed = false;
          currentSmartRecommendations = null;
          mainObserver.disconnect();
          mainObserver.observe(main, { childList: true, subtree: true });
        }
        // Always scan on the 1.2s pulse to ensure recommendations are active
        scanLatestIncomingMessage();
      } else {
        hideSmartReplyBar();
      }
      updateSmartReplyBarPosition();
    };

    window.addEventListener('resize', updateSmartReplyBarPosition, { passive: true });
    window.addEventListener('scroll', updateSmartReplyBarPosition, { passive: true });

    setInterval(checkActiveChat, 1200);
    checkActiveChat();
  }

  // ═══════════════════════════════════════════════════════════════════
  // 17. TRUE NATIVE STICKER SENDING
  // ═══════════════════════════════════════════════════════════════════

  async function sendStickerToChat(sticker) {
    if (!chrome?.runtime?.id) {
      showToast('Extension reloaded. Please refresh WhatsApp Web (F5).', 'error', 5000);
      return { success: false, error: 'EXTENSION_CONTEXT_INVALIDATED' };
    }

    if (!sticker || !sticker.dataUrl) {
      showToast('Sticker data is empty or invalid.', 'error', 3000);
      return { success: false, error: 'INVALID_STICKER_DATA' };
    }

    showToast(`Sending: ${sticker.name || 'Sticker'}...`, 'info', 1600);

    try {
      let finalDataUrl = sticker.dataUrl;

      // If sticker dataUrl is a remote URL, fetch and convert via background proxy before sending
      if (typeof finalDataUrl === 'string' && (finalDataUrl.startsWith('http://') || finalDataUrl.startsWith('https://'))) {
        showToast('Preparing online sticker...', 'info', 2000);
        const resolved = await StickerStorage.fetchExternal(finalDataUrl, 'dataUrl');
        if (!resolved || !resolved.startsWith('data:')) {
          throw new Error('Failed to download sticker through proxy. Please check your internet connection.');
        }
        finalDataUrl = resolved;
        // Cache back on sticker object so subsequent sends are instant
        sticker.dataUrl = finalDataUrl;
        if (sticker.id && StickerStorage.updateStickerDataUrl) {
          StickerStorage.updateStickerDataUrl(sticker.id, finalDataUrl).catch(() => {});
        }
      }

      const result = await sendViaMainWorld(finalDataUrl);

      if (sticker.id) {
        await StickerStorage.recordRecent(sticker.id);
        recents = await StickerStorage.getRecents();
      }

      showToast('Sticker sent!', 'success', 2000);

      if (settings.closeAfterSend) {
        closeDrawer();
      }

      return { success: true, method: result.method };
    } catch (err) {
      console.warn('[WSH] Native sticker send error:', err);
      showToast('Error sending sticker: ' + err.message, 'error', 3500);
      return { success: false, error: err.message };
    }
  }

  function sendViaMainWorld(dataUrl) {
    return new Promise((resolve, reject) => {
      const id = 'stk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);

      const timer = setTimeout(() => {
        pendingStickerPromises.delete(id);
        reject(new Error('WhatsApp sticker engine timed out. Open a chat and retry!'));
      }, 15000);

      pendingStickerPromises.set(id, { resolve, reject, timer });

      window.postMessage({
        type: 'WSH_SEND_STICKER',
        dataUrl: dataUrl,
        id: id
      }, '*');
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // 18. HELPERS & SEARCH
  // ═══════════════════════════════════════════════════════════════════

  function handleSearch() {
    if (currentActiveTab === 'import') {
      currentActiveTab = 'all';
      renderTabs();
    }
    renderStickers();
  }

  function findStickerById(id) {
    for (const pack of allPacks) {
      for (const s of pack.stickers) {
        if (s.id === id) return s;
      }
    }
    return null;
  }

  function showToast(message, type = 'info', duration = 2400) {
    const toast = document.getElementById('wsh-toast');
    if (!toast) return;

    if (toastTimer) clearTimeout(toastTimer);

    toast.className = `wsh-toast wsh-visible wsh-toast-${type}`;
    toast.textContent = message;

    toastTimer = setTimeout(() => {
      toast.className = 'wsh-toast';
    }, duration);
  }

  // Extension popup messaging
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'SEND_STICKER') {
      sendStickerToChat(message.sticker).then(result => sendResponse(result));
      return true;
    }
    if (message.action === 'PING') {
      sendResponse({ status: 'PONG', activeChat: Boolean(document.querySelector('#main')), apiReady: waApiConnected });
      return true;
    }
    if (message.action === 'TOGGLE_DRAWER') {
      toggleDrawer();
      sendResponse({ isOpen: isDrawerOpen });
      return true;
    }
  });

  initWhenReady();
})();
