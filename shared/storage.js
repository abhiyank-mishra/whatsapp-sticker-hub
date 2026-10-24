/**
 * StickerStorage: Centralized storage & sticker processing utility
 * Uses chrome.storage.local for persisting user collections & settings
 */

(function() {
'use strict';
if (typeof window !== 'undefined' && window.StickerStorage) return; // Already loaded

const STORAGE_KEYS = {
  PACKS: 'wsh_packs',
  FAVORITES: 'wsh_favorites',
  RECENTS: 'wsh_recents',
  SETTINGS: 'wsh_settings',
  WA_STICKERS: 'wsh_wa_stickers'
};

const DEFAULT_SETTINGS = {
  autoSend: true,
  closeAfterSend: false,
  autoSaveIncoming: true,
  smartReply: true,
  dockSide: 'right',
  tabTopPercent: 50,
  defaultTab: 'recents'
};

// ═══════════════════════════════════════════════════════════════════
// PERSISTENT INDEXEDDB IMAGE CACHING ENGINE
// Ensures sticker thumbnails and assets are never fetched repeatedly
// ═══════════════════════════════════════════════════════════════════

const WSH_ImageCache = {
  dbPromise: null,
  memCache: new Map(),

  async getDB() {
    if (this.dbPromise) return this.dbPromise;
    this.dbPromise = new Promise((resolve) => {
      try {
        if (typeof indexedDB === 'undefined') return resolve(null);
        const req = indexedDB.open('WSH_Cache_DB', 1);
        req.onupgradeneeded = (e) => {
          const db = e.target.result;
          if (!db.objectStoreNames.contains('image_cache')) {
            db.createObjectStore('image_cache');
          }
        };
        req.onsuccess = (e) => resolve(e.target.result);
        req.onerror = () => resolve(null);
      } catch {
        resolve(null);
      }
    });
    return this.dbPromise;
  },

  async get(url) {
    if (!url) return null;
    if (this.memCache.has(url)) return this.memCache.get(url);
    try {
      const db = await this.getDB();
      if (!db) return null;
      return new Promise((resolve) => {
        const tx = db.transaction('image_cache', 'readonly');
        const store = tx.objectStore('image_cache');
        const req = store.get(url);
        req.onsuccess = () => {
          const val = req.result;
          if (val) this.memCache.set(url, val);
          resolve(val || null);
        };
        req.onerror = () => resolve(null);
      });
    } catch {
      return null;
    }
  },

  async set(url, dataUrl) {
    if (!url || !dataUrl) return false;
    this.memCache.set(url, dataUrl);
    try {
      const db = await this.getDB();
      if (!db) return false;
      return new Promise((resolve) => {
        const tx = db.transaction('image_cache', 'readwrite');
        const store = tx.objectStore('image_cache');
        store.put(dataUrl, url);
        tx.oncomplete = () => resolve(true);
        tx.onerror = () => resolve(false);
      });
    } catch {
      return false;
    }
  }
};

const StickerStorage = {
  ImageCache: WSH_ImageCache,
  /**
   * Get all sticker packs. Automatically initializes or migrates to real photo packs (TMKOC).
   */
  async getPacks() {
    try {
      if (!chrome?.storage?.local) return window.DEFAULT_STICKER_PACKS || [];
      const data = await chrome.storage.local.get(STORAGE_KEYS.PACKS);
      let packs = data[STORAGE_KEYS.PACKS];
      const defaults = window.DEFAULT_STICKER_PACKS || [];

      // Check if packs are empty or if user still has the old emoji-only packs
      const hasTmkoc = packs && Array.isArray(packs) && packs.some(p => p.id === 'pack_tmkoc_chatpate' || p.name.includes('TMKOC'));

      if (!packs || !Array.isArray(packs) || packs.length === 0 || !hasTmkoc) {
        if (packs && packs.length > 0 && !hasTmkoc) {
          // Upgrade existing user: Put real TMKOC pack on top and keep user's custom packs
          const userCustom = packs.filter(p => p.id !== 'pack_desi_vibes' && p.id !== 'pack_reactions' && p.id !== 'pack_cute_memes');
          packs = [...defaults, ...userCustom];
        } else {
          packs = defaults;
        }
        await chrome.storage.local.set({ [STORAGE_KEYS.PACKS]: packs });
      }

      // Sanitize packs: Remove any broken stickers with dead blob: URLs or invalid base64
      let packsChanged = false;
      for (const pack of packs) {
        if (pack.stickers && Array.isArray(pack.stickers)) {
          const initialCount = pack.stickers.length;
          pack.stickers = pack.stickers.filter(s => {
            if (!s || !s.dataUrl) return false;
            if (typeof s.dataUrl !== 'string') return false;
            if (s.dataUrl.startsWith('blob:')) return false;
            // Must be a valid data URL or https URL
            if (!s.dataUrl.startsWith('data:image/') && !s.dataUrl.startsWith('https://')) return false;
            // For data URLs, validate base64 portion isn't corrupt
            if (s.dataUrl.startsWith('data:')) {
              const parts = s.dataUrl.split(',');
              if (parts.length < 2 || !parts[1] || parts[1].length < 10) return false;
            }
            return true;
          });
          if (pack.stickers.length !== initialCount) {
            packsChanged = true;
          }
        }
      }
      if (packsChanged) {
        await chrome.storage.local.set({ [STORAGE_KEYS.PACKS]: packs });
      }

      // Self-healing migration: Background convert any remaining remote URLs to local base64 WebP
      const remoteStickers = [];
      for (const pack of packs) {
        if (Array.isArray(pack.stickers)) {
          for (const s of pack.stickers) {
            if (s && typeof s.dataUrl === 'string' && (s.dataUrl.startsWith('http://') || s.dataUrl.startsWith('https://'))) {
              remoteStickers.push(s);
            }
          }
        }
      }
      if (remoteStickers.length > 0) {
        setTimeout(async () => {
          let updated = false;
          for (const s of remoteStickers) {
            try {
              const resolved = await this.fetchExternal(s.dataUrl, 'dataUrl');
              if (resolved && resolved.startsWith('data:')) {
                s.dataUrl = resolved;
                updated = true;
              }
            } catch {}
          }
          if (updated) {
            await this.savePacks(packs);
          }
        }, 1200);
      }

      return packs;
    } catch (err) {
      return window.DEFAULT_STICKER_PACKS || [];
    }
  },

  /**
   * Update dataUrl of a specific sticker across all packs in storage
   */
  async updateStickerDataUrl(stickerId, dataUrl) {
    if (!stickerId || !dataUrl) return;
    try {
      const packs = await this.getPacks();
      let modified = false;
      for (const pack of packs) {
        if (Array.isArray(pack.stickers)) {
          for (const s of pack.stickers) {
            if (s.id === stickerId) {
              s.dataUrl = dataUrl;
              modified = true;
            }
          }
        }
      }
      if (modified) {
        await this.savePacks(packs);
      }
    } catch (e) {
      console.warn('Failed to update sticker dataUrl in storage:', e);
    }
  },

  /**
   * Save entire packs array
   */
  async savePacks(packs) {
    try {
      if (chrome?.storage?.local) {
        await chrome.storage.local.set({ [STORAGE_KEYS.PACKS]: packs });
      }
    } catch (err) {}
    return packs;
  },

  /**
   * Create a new sticker pack
   */
  async createPack(name, icon = 'folder') {
    const packs = await this.getPacks();
    const newPack = {
      id: 'pack_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: name.trim(),
      icon: icon.trim() || 'folder',
      stickers: []
    };
    packs.unshift(newPack); // Add to top
    await this.savePacks(packs);
    return newPack;
  },

  /**
   * Delete an existing pack
   */
  async deletePack(packId) {
    let packs = await this.getPacks();
    packs = packs.filter(p => p.id !== packId);
    await this.savePacks(packs);
    return packs;
  },

  /**
   * Rename a pack
   */
  async renamePack(packId, newName, newIcon) {
    const packs = await this.getPacks();
    const pack = packs.find(p => p.id === packId);
    if (pack) {
      if (newName) pack.name = newName.trim();
      if (newIcon) pack.icon = newIcon.trim();
      await this.savePacks(packs);
    }
    return packs;
  },

  /**
   * Add a sticker to a pack
   */
  async addSticker(packId, stickerObj) {
    const packs = await this.getPacks();
    let pack = packs.find(p => p.id === packId);
    if (!pack) {
      if (packs.length > 0) {
        pack = packs[0];
      } else {
        pack = await this.createPack('My Stickers', 'star');
        packs.unshift(pack);
      }
    }

    const newSticker = {
      id: 'stk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: (stickerObj.name || 'Custom Sticker').trim(),
      tags: (stickerObj.tags || '').trim().toLowerCase(),
      dataUrl: stickerObj.dataUrl,
      createdAt: Date.now()
    };

    pack.stickers.push(newSticker);
    await this.savePacks(packs);
    return newSticker;
  },

  /**
   * Bulk add multiple files to a pack or create a new pack from files
   */
  async createBulkPack(packName, icon, fileArray, onProgress) {
    const newPack = await this.createPack(packName, icon);
    const total = fileArray.length;

    for (let i = 0; i < total; i++) {
      const file = fileArray[i];
      if (onProgress) onProgress(i + 1, total, file.name);
      try {
        const dataUrl = await this.processUploadedImage(file);
        const name = file.name.replace(/\.[^/.]+$/, '').trim() || `Sticker #${i + 1}`;
        newPack.stickers.push({
          id: 'stk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          name: name,
          tags: `${packName.toLowerCase()}, ${name.toLowerCase()}`,
          dataUrl: dataUrl,
          createdAt: Date.now() + i
        });
      } catch (err) {
        console.warn('Failed to process image in bulk:', file.name, err);
      }
    }

    const packs = await this.getPacks();
    const idx = packs.findIndex(p => p.id === newPack.id);
    if (idx !== -1) packs[idx] = newPack;
    await this.savePacks(packs);
    return newPack;
  },

  /**
   * Safe fetch via background proxy with persistent IndexedDB & memory caching
   */
  async fetchExternal(url, responseType = 'text') {
    if (!url) return null;

    // 1. Check persistent cache for data URLs
    if (responseType === 'dataUrl') {
      const cached = await WSH_ImageCache.get(url);
      if (cached) return cached;
    }

    return new Promise((resolve, reject) => {
      if (!chrome?.runtime?.id || !chrome?.runtime?.sendMessage) {
        return reject(new Error('Extension reloaded. Please refresh this WhatsApp Web tab (Press F5).'));
      }

      try {
        chrome.runtime.sendMessage({ action: 'FETCH_EXTERNAL_URL', url, responseType }, async (res) => {
          if (chrome.runtime.lastError) {
            const msg = chrome.runtime.lastError.message || '';
            if (msg.includes('context invalidated')) {
              return reject(new Error('Extension reloaded. Please refresh this WhatsApp Web tab (Press F5).'));
            }
            return reject(new Error(msg));
          }
          if (!res || !res.ok) {
            return reject(new Error(res?.error || 'Failed to fetch through background proxy'));
          }

          if (responseType === 'dataUrl') {
            if (res.data && res.data.startsWith('data:')) {
              // Save to persistent IndexedDB cache
              await WSH_ImageCache.set(url, res.data);
              resolve(res.data);
            } else {
              reject(new Error('Invalid image payload returned from background proxy'));
            }
          } else {
            resolve(res.text);
          }
        });
      } catch (e) {
        if (e.message && e.message.includes('context invalidated')) {
          reject(new Error('Extension reloaded. Please refresh this WhatsApp Web tab (Press F5).'));
        } else {
          reject(e);
        }
      }
    });
  },

  /**
   * Import pack directly from Sticker.ly code (e.g. 'AKB5VR' or 'L0VDX7') or link
   */
  async importStickerlyPack(codeOrUrl, onProgress) {
    let code = codeOrUrl.trim();
    const match = code.match(/sticker\.ly\/s\/([A-Za-z0-9]+)/i);
    if (match) {
      code = match[1];
    }
    // Clean any extra brackets or whitespace
    code = code.replace(/[^A-Za-z0-9]/g, '');

    if (!code) {
      throw new Error('Please enter a valid Sticker.ly pack code or URL (e.g. AKB5VR or L0VDX7)');
    }

    // Check if pack exists in pre-curated catalog
    const catalog = this.getStoreCatalog();
    const catalogPack = catalog.find(p => p.code.toUpperCase() === code.toUpperCase());

    let packTitle = catalogPack ? catalogPack.name : `Pack [${code}]`;
    let imgUrls = (catalogPack && catalogPack.allUrls && catalogPack.allUrls.length > 0) ? [...catalogPack.allUrls] : [];

    if (imgUrls.length === 0) {
      // 1. High-speed direct Sticker.ly API lookup via background proxy
      try {
        const apiRes = await new Promise(res => {
          if (!chrome?.runtime?.id) { res(null); return; }
          chrome.runtime.sendMessage({ action: 'STICKERLY_GET_PACK', code: code.toUpperCase() }, res);
        });
        if (apiRes && apiRes.ok && apiRes.data && apiRes.data.result) {
          const resObj = apiRes.data.result;
          if (resObj.name) packTitle = resObj.name;
          const prefix = resObj.resourceUrlPrefix || '';
          if (Array.isArray(resObj.stickers) && resObj.stickers.length > 0) {
            imgUrls = resObj.stickers.map(s => prefix + s.fileName);
          } else if (Array.isArray(resObj.resourceFiles) && resObj.resourceFiles.length > 0) {
            imgUrls = resObj.resourceFiles.map(f => prefix + f);
          }
        }
      } catch (err) {
        console.warn('[WSH] Direct Sticker.ly API lookup failed, falling back to HTML:', err);
      }
    }

    // 2. HTML scraper fallback if direct API did not return assets
    if (imgUrls.length === 0) {
      const pageUrl = `https://sticker.ly/s/${code}`;
      let html = '';
      try {
        html = await this.fetchExternal(pageUrl, 'text');
      } catch (e) {
        throw new Error('Network error loading Sticker.ly page: ' + e.message);
      }

      // Extract Title
      const titleMatch = html.match(/<title>(.*?)<\/title>/i);
      if (titleMatch) {
        packTitle = titleMatch[1].replace(/ - Sticker\.ly.*$/i, '').trim();
      }
      if (!packTitle) packTitle = `Sticker.ly Pack [${code}]`;

      // Extract all candidate image URLs containing the pack code
      const rawMatches = [...new Set(html.match(new RegExp(`https?:\\/\\/[^"\'\\s<>]+${code}[^"\'\\s<>]+`, 'g')) || [])];
      let cleanMatches = rawMatches
        .map(u => u.replace(/&amp;/g, '&').replace(/&#39;.*$/, '').replace(/["'<>].*$/, ''))
        .filter(u => u.includes('stickerly.pstatic.net') && (u.endsWith('.webp') || u.endsWith('.png')));

      if (cleanMatches.length === 0) {
        const generalMatches = [...new Set(html.match(/https?:\/\/stickerly\.pstatic\.net\/sticker_pack\/[^"'\s<>]+\.(?:webp|png)/gi) || [])];
        cleanMatches = generalMatches;
      }

      // Normalize: Prefer original .webp (which preserves full animations)
      imgUrls = cleanMatches.map(u => u.replace(/\.preview\.png$/, '.webp'));
      imgUrls = [...new Set(imgUrls)];
    }

    if (imgUrls.length === 0) {
      throw new Error(`No sticker assets found for code "${code}". Make sure the pack code is correct.`);
    }

    // Prepare Pack (find existing or create new)
    const existingPacks = await this.getPacks();
    let targetPack = existingPacks.find(p => p.id === `pack_${code}` || p.name === packTitle || p.name.includes(`[${code}]`));
    if (!targetPack) {
      targetPack = {
        id: `pack_${code}`,
        name: packTitle,
        icon: 'film',
        stickers: []
      };
      existingPacks.unshift(targetPack);
    } else {
      targetPack.stickers = []; // Refresh with full animated assets
      targetPack.name = packTitle;
    }

    const total = imgUrls.length;

    for (let i = 0; i < total; i++) {
      const imgUrl = imgUrls[i];
      if (onProgress) onProgress(i + 1, total, `${packTitle} #${i + 1}`);

      try {
        const dataUrlFromBg = await this.fetchExternal(imgUrl, 'dataUrl');
        if (!dataUrlFromBg) continue;
        const finalWebp = await this.processUploadedImage(dataUrlFromBg);
        const bytes = await this.getBytes(finalWebp);
        const isAnim = this.isAnimatedImage(bytes);

        targetPack.stickers.push({
          id: 'stk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          name: `${packTitle} #${targetPack.stickers.length + 1}`,
          tags: `${packTitle.toLowerCase()}, stickerly, meme, ${isAnim ? 'animated' : 'static'}`,
          dataUrl: finalWebp,
          isAnimated: isAnim,
          createdAt: Date.now() + targetPack.stickers.length
        });
      } catch (err) {
        console.warn('Failed to load sticker image:', imgUrl, err);
      }
    }

    await this.savePacks(existingPacks);
    return targetPack;
  },

  /**
   * Delete a sticker by ID across all packs
   */
  async deleteSticker(stickerId) {
    const packs = await this.getPacks();
    for (const pack of packs) {
      pack.stickers = pack.stickers.filter(s => s.id !== stickerId);
    }
    await this.savePacks(packs);
    await this.removeFavorite(stickerId);
    return packs;
  },

  /**
   * Favorites management
   */
  async getFavorites() {
    const data = await chrome.storage.local.get(STORAGE_KEYS.FAVORITES);
    return data[STORAGE_KEYS.FAVORITES] || [];
  },

  async toggleFavorite(stickerId) {
    const favs = await this.getFavorites();
    const idx = favs.indexOf(stickerId);
    let isFav = false;
    if (idx > -1) {
      favs.splice(idx, 1);
    } else {
      favs.unshift(stickerId);
      isFav = true;
    }
    await chrome.storage.local.set({ [STORAGE_KEYS.FAVORITES]: favs });
    return isFav;
  },

  async removeFavorite(stickerId) {
    const favs = await this.getFavorites();
    const updated = favs.filter(id => id !== stickerId);
    await chrome.storage.local.set({ [STORAGE_KEYS.FAVORITES]: updated });
  },

  /**
   * Recents tracking (keeps last 24 stickers)
   */
  async getRecents() {
    const data = await chrome.storage.local.get(STORAGE_KEYS.RECENTS);
    return data[STORAGE_KEYS.RECENTS] || [];
  },

  async recordRecent(stickerId) {
    const recents = await this.getRecents();
    const filtered = recents.filter(id => id !== stickerId);
    filtered.unshift(stickerId);
    if (filtered.length > 24) filtered.pop();
    await chrome.storage.local.set({ [STORAGE_KEYS.RECENTS]: filtered });
    return filtered;
  },

  /**
   * Remove a single sticker from recents
   */
  async removeRecent(stickerId) {
    const recents = await this.getRecents();
    const filtered = recents.filter(id => id !== stickerId);
    await chrome.storage.local.set({ [STORAGE_KEYS.RECENTS]: filtered });
    return filtered;
  },

  /**
   * Multi-select helper: Create a brand new pack from a list of sticker IDs
   */
  async createPackFromStickers(packName, stickerIds) {
    const packs = await this.getPacks();
    const idSet = new Set(stickerIds);
    const selectedStickers = [];

    for (const p of packs) {
      for (const s of p.stickers) {
        if (idSet.has(s.id)) {
          selectedStickers.push({
            id: 'stk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            name: s.name || 'Custom Sticker',
            tags: s.tags || '',
            dataUrl: s.dataUrl,
            isAnimated: Boolean(s.isAnimated),
            createdAt: Date.now()
          });
          idSet.delete(s.id);
        }
      }
    }

    const newPack = {
      id: 'pack_custom_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: packName.trim() || 'Custom Group',
      icon: 'folder',
      stickers: selectedStickers
    };

    packs.unshift(newPack);
    await this.savePacks(packs);
    return newPack;
  },

  /**
   * Get store catalog of curated downloadable packs
   */
  getStoreCatalog() {
    return window.WSH_STORE_CATALOG || [];
  },

  /**
   * Search Sticker.ly live for packs by keyword (via background proxy)
   * Returns array of pack objects: { code, name, author, stickerCount, previewUrl }
   */
  async searchStickerlyLive(query) {
    if (!query || typeof query !== 'string' || query.trim().length < 2) return [];

    return new Promise((resolve) => {
      if (!chrome?.runtime?.id) { resolve([]); return; }
      try {
        chrome.runtime.sendMessage({ action: 'STICKERLY_SEARCH', query: query.trim() }, (res) => {
          if (chrome.runtime.lastError || !res || !res.ok) {
            // If API fails, try HTML parsing
            if (res && res.html && res.fallback) {
              resolve(this._parseStickerlyHtml(res.html));
            } else {
              resolve([]);
            }
            return;
          }
          // Parse API response
          const packs = this._parseStickerlyApiResponse(res.data);
          resolve(packs);
        });
      } catch { resolve([]); }
    });
  },

  /**
   * Fetch trending packs from Sticker.ly (via background proxy)
   */
  async fetchStickerlyTrending(offset = 0) {
    return new Promise((resolve) => {
      if (!chrome?.runtime?.id) { resolve([]); return; }
      try {
        chrome.runtime.sendMessage({ action: 'STICKERLY_TRENDING', offset }, (res) => {
          if (chrome.runtime.lastError || !res || !res.ok) {
            if (res && res.html && res.fallback) {
              resolve(this._parseStickerlyHtml(res.html));
            } else {
              resolve([]);
            }
            return;
          }
          const packs = this._parseStickerlyApiResponse(res.data);
          resolve(packs);
        });
      } catch { resolve([]); }
    });
  },

  /**
   * Parse Sticker.ly API JSON response into our pack format
   */
  _parseStickerlyApiResponse(json) {
    if (!json) return [];
    const rawPacks = (json.result && json.result.stickerPacks) || json.data || json.result || json.packs || json.stickerPacks || [];
    if (!Array.isArray(rawPacks)) return [];

    return rawPacks.map(p => {
      const code = p.packId || p.packCode || p.code || (p.shareUrl ? p.shareUrl.split('/').pop() : '') || '';
      const prefix = p.resourceUrlPrefix || '';
      const files = p.resourceFiles || (p.stickers ? p.stickers.map(s => s.fileName) : []);
      const isAnimated = Boolean(p.isAnimated || p.animated);

      // Build full URLs for all stickers in the pack
      const allUrls = files.length > 0 ? files.map(f => prefix + f) : (p.allUrls || []);
      const previewUrls = allUrls.length > 0 ? allUrls.slice(0, 4) : (p.previewUrls || (p.previewUrl ? [p.previewUrl] : []));
      const author = p.authorName || p.user?.userName || p.author || 'Sticker.ly';
      const name = p.name || p.title || `Pack [${code}]`;
      const stickerCount = files.length || p.resourceCount || p.stickerCount || previewUrls.length;

      return {
        id: `store_live_${code.toLowerCase()}`,
        code: code,
        name: name,
        author: author,
        stickerCount: stickerCount,
        isAnimated: isAnimated,
        category: isAnimated ? 'Animated' : 'Trending',
        description: `By @${author} • ${stickerCount} stickers • Code: ${code}`,
        tags: `${name.toLowerCase()}, ${code.toLowerCase()}, stickerly, meme`,
        previewUrls: previewUrls,
        allUrls: allUrls
      };
    }).filter(p => p.code && p.code.length >= 3 && p.previewUrls.length > 0);
  },

  /**
   * Parse Sticker.ly HTML page for pack links (fallback when API is unavailable)
   */
  _parseStickerlyHtml(html) {
    if (!html || typeof html !== 'string') return [];
    const packs = [];
    const seen = new Set();

    // Match pack links: /s/PACKCODE
    const codeRegex = /\/s\/([A-Za-z0-9]{4,12})/g;
    let m;
    while ((m = codeRegex.exec(html)) !== null) {
      const code = m[1];
      if (!seen.has(code)) {
        seen.add(code);
        packs.push({
          code,
          name: `Pack [${code}]`,
          author: 'Sticker.ly',
          stickerCount: 0,
          previewUrl: '',
          isAnimated: false,
          category: ''
        });
      }
    }

    // Try to match names from meta or title tags
    const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
    if (titleMatch && packs.length === 1) {
      packs[0].name = titleMatch[1].replace(/ - Sticker\.ly.*$/i, '').trim() || packs[0].name;
    }

    return packs;
  },

  /**
   * Settings management
   */
  async getSettings() {
    const data = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    return { ...DEFAULT_SETTINGS, ...(data[STORAGE_KEYS.SETTINGS] || {}) };
  },

  async updateSettings(newSettings) {
    const current = await this.getSettings();
    const merged = { ...current, ...newSettings };
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: merged });
    return merged;
  },

  /**
   * Export all sticker packs and favorites as JSON
   */
  async exportBackup() {
    const packs = await this.getPacks();
    const favorites = await this.getFavorites();
    const settings = await this.getSettings();
    const backup = {
      app: 'WhatsAppStickerHub',
      version: '1.1.0',
      exportedAt: new Date().toISOString(),
      packs,
      favorites,
      settings
    };
    return JSON.stringify(backup, null, 2);
  },

  /**
   * Import sticker packs from backup JSON
   */
  async importBackup(jsonString, merge = true) {
    const parsed = JSON.parse(jsonString);
    if (!parsed.packs || !Array.isArray(parsed.packs)) {
      throw new Error('Invalid backup file format: missing packs array.');
    }

    if (!merge) {
      await this.savePacks(parsed.packs);
      if (parsed.favorites) {
        await chrome.storage.local.set({ [STORAGE_KEYS.FAVORITES]: parsed.favorites });
      }
      return parsed.packs;
    }

    const existing = await this.getPacks();
    for (const newPack of parsed.packs) {
      const match = existing.find(p => p.id === newPack.id || p.name.toLowerCase() === newPack.name.toLowerCase());
      if (match) {
        const existingStickerIds = new Set(match.stickers.map(s => s.id));
        for (const st of newPack.stickers) {
          if (!existingStickerIds.has(st.id)) {
            match.stickers.push(st);
          }
        }
      } else {
        existing.push(newPack);
      }
    }
    await this.savePacks(existing);
    return existing;
  },

  /**
   * Converts any sticker to 512x512 transparent WebP File object for WhatsApp Web DataTransfer
   */
  async stickerDataToFile(dataUrl, fileName = 'sticker.webp') {
    if (dataUrl.startsWith('data:image/svg+xml')) {
      return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          ctx.clearRect(0, 0, 512, 512);
          ctx.drawImage(img, 0, 0, 512, 512);
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(new File([blob], fileName, { type: 'image/webp' }));
            } else {
              reject(new Error('Canvas toBlob failed'));
            }
          }, 'image/webp', 0.95);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = dataUrl;
      });
    }

    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const mime = blob.type || 'image/webp';
      return new File([blob], fileName, { type: mime });
    } catch {
      try {
        const parts = dataUrl.split(',');
        if (parts.length < 2 || !parts[1]) throw new Error('Invalid data URL');
        // Validate base64 characters before atob
        const b64 = parts[1].replace(/\s/g, '');
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(b64)) throw new Error('Non-base64 chars');
        const byteString = atob(b64);
        const mimeString = parts[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
          ia[i] = byteString.charCodeAt(i);
        }
        const blob = new Blob([ab], { type: mimeString });
        return new File([blob], fileName, { type: mimeString });
      } catch (innerErr) {
        console.warn('[WSH] stickerDataToFile fallback atob failed:', innerErr);
        // Last resort: create empty placeholder
        const blob = new Blob([new Uint8Array(0)], { type: 'image/webp' });
        return new File([blob], fileName, { type: 'image/webp' });
      }
    }
  },

  /**
   * Detects if bytes represent an animated WebP or animated GIF
   */
  isAnimatedImage(bytes) {
    if (!bytes || bytes.length < 21) return false;
    // GIF animation signature (GIF87a / GIF89a)
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
      return true;
    }
    // WebP animation (RIFF....WEBP with ANIM chunk or VP8X animation flag)
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
        bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
      let offset = 12;
      while (offset + 8 <= bytes.length) {
        const tag = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
        const size = (bytes[offset + 4] | (bytes[offset + 5] << 8) | (bytes[offset + 6] << 16) | (bytes[offset + 7] << 24)) >>> 0;
        if (tag === 'VP8X') {
          if ((bytes[offset + 8] & 0x02) !== 0) return true; // Animation bit set
        }
        if (tag === 'ANIM') return true;
        offset += 8 + size + (size & 1);
      }
    }
    return false;
  },

  /**
   * Helper to convert base64 data URL, File, or Blob to Uint8Array
   */
  async getBytes(fileOrBlobOrString) {
    if (typeof fileOrBlobOrString === 'string') {
      try {
        const parts = fileOrBlobOrString.split(',');
        if (parts.length < 2 || !parts[1]) return new Uint8Array();
        const b64 = parts[1].replace(/\s/g, '');
        if (!/^[A-Za-z0-9+/]*={0,2}$/.test(b64)) return new Uint8Array();
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        return bytes;
      } catch (e) {
        console.warn('[WSH] getBytes atob failed:', e);
        return new Uint8Array();
      }
    } else {
      const arrayBuffer = await fileOrBlobOrString.arrayBuffer();
      return new Uint8Array(arrayBuffer);
    }
  },

  /**
   * Resizes and converts images into 512x512 transparent WebP data URLs.
   * PRESERVES ANIMATIONS: Animated WebP & GIFs are kept intact without canvas flattening!
   */
  async processUploadedImage(fileOrBlobOrString) {
    try {
      const bytes = await this.getBytes(fileOrBlobOrString);
      const isAnim = this.isAnimatedImage(bytes);

      if (isAnim) {
        // PRESERVE ANIMATION! Do NOT pass through canvas (which flattens frames to static).
        if (typeof fileOrBlobOrString === 'string' && fileOrBlobOrString.startsWith('data:')) {
          return fileOrBlobOrString;
        }
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
          reader.readAsDataURL(fileOrBlobOrString);
        });
      }
    } catch (e) {
      console.warn('Animation check failed, falling back to static processing:', e);
    }

    return new Promise((resolve, reject) => {
      const handleDataUrl = (src) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = 512;
          canvas.height = 512;
          const ctx = canvas.getContext('2d');
          ctx.clearRect(0, 0, 512, 512);

          const maxDim = 490;
          let w = img.width;
          let h = img.height;
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }

          const x = Math.round((512 - w) / 2);
          const y = Math.round((512 - h) / 2);

          ctx.drawImage(img, x, y, w, h);
          const webpDataUrl = canvas.toDataURL('image/webp', 0.92);
          resolve(webpDataUrl);
        };
        img.onerror = () => reject(new Error('Failed to decode image'));
        img.src = src;
      };

      if (typeof fileOrBlobOrString === 'string') {
        handleDataUrl(fileOrBlobOrString);
      } else {
        const reader = new FileReader();
        reader.onload = (e) => handleDataUrl(e.target.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(fileOrBlobOrString);
      }
    });
  },

  /**
   * Sync native WhatsApp stickers (Starred / Saved in WA) into a dedicated pack
   */
  async syncWaStickers(waStickers) {
    if (!waStickers || !Array.isArray(waStickers) || waStickers.length === 0) return null;
    const packs = await this.getPacks();
    let waPack = packs.find(p => p.id === 'pack_wa_saved');
    if (!waPack) {
      waPack = {
        id: 'pack_wa_saved',
        name: 'WA Starred',
        icon: 'bookmark',
        stickers: []
      };
      packs.splice(1, 0, waPack); // Insert right after TMKOC pack
    }

    const existingKeys = new Set(waPack.stickers.map(s => s.dataUrl.slice(-60)));
    let addedCount = 0;

    for (const item of waStickers) {
      if (!item.dataUrl || typeof item.dataUrl !== 'string') continue;
      // Filter out ephemeral blob URLs or non-image data
      if (item.dataUrl.startsWith('blob:') || (!item.dataUrl.startsWith('data:image/') && !item.dataUrl.startsWith('https://'))) {
        continue;
      }
      const key = item.dataUrl.slice(-60);
      if (!existingKeys.has(key)) {
        existingKeys.add(key);
        waPack.stickers.push({
          id: item.id || ('wa_stk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6)),
          name: item.name || `WA Sticker #${waPack.stickers.length + 1}`,
          tags: 'wa, starred, saved, whatsapp',
          dataUrl: item.dataUrl,
          createdAt: Date.now()
        });
        addedCount++;
      }
    }

    if (addedCount > 0) {
      await this.savePacks(packs);
    }
    return { pack: waPack, addedCount };
  },

  /**
   * Auto-save an incoming sticker from any chat
   */
  async saveIncomingSticker(dataUrl, sourceChat = '') {
    if (!dataUrl) return false;
    const packs = await this.getPacks();

    // Check duplicate across ALL packs
    const sample = dataUrl.slice(-80);
    for (const p of packs) {
      for (const s of p.stickers) {
        if (s.dataUrl && s.dataUrl.slice(-80) === sample) {
          return false; // Already saved
        }
      }
    }

    let targetPack = packs.find(p => p.id === 'pack_auto_saved');
    if (!targetPack) {
      targetPack = {
        id: 'pack_auto_saved',
        name: 'Auto-Saved',
        icon: 'download',
        stickers: []
      };
      // Insert after favorites / native packs
      packs.push(targetPack);
    }

    const newSticker = {
      id: 'incoming_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      name: `Chat Sticker #${targetPack.stickers.length + 1}` + (sourceChat ? ` (${sourceChat})` : ''),
      tags: `incoming, chat, auto, ${sourceChat.toLowerCase()}`,
      dataUrl: dataUrl,
      createdAt: Date.now()
    };

    targetPack.stickers.unshift(newSticker); // Newest at top
    await this.savePacks(packs);
    return true;
  }
};

if (typeof window !== 'undefined') {
  window.StickerStorage = StickerStorage;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { StickerStorage };
}
})();
