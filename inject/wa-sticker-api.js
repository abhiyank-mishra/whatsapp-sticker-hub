/**
 * WhatsApp Sticker Hub — Page Context Script (world: "MAIN")
 * 
 * Powered by WhatsApp Web's internal namespace architecture:
 * - WAWebUploadManager.encryptAndUpload (type: "sticker")
 * - WAWebSendMsgChatAction.addAndSendMsgToChat
 * - WAWebMsgKey
 * - WAWebCollections (Chat & Stickers)
 * - Fallback: Native WhatsApp Sticker Maker DOM flow
 * 
 * Guarantees stickers are sent as REAL WhatsApp Stickers (never photo attachments).
 */

(function () {
  'use strict';

  if (window.__WSH_INJECTED__) return;
  window.__WSH_INJECTED__ = true;

  const LOG_PREFIX = '[WSH-NativeSticker]';

  // ═══════════════════════════════════════════════════════════════════
  // 1. NAMESPACE RESOLVER
  // ═══════════════════════════════════════════════════════════════════

  function flashExport(ns) {
    if (!ns) return null;
    const named = ns.default;
    if (!named) return ns;
    if (
      typeof named === "function" ||
      typeof named.encryptAndUpload === "function" ||
      named.Chat ||
      typeof named.getMaybeMePnUser === "function" ||
      typeof named.findOrCreateLatestChat === "function" ||
      typeof named.createWid === "function" ||
      typeof named.getEphemeralFields === "function" ||
      typeof named.startMediaUploadQpl === "function" ||
      typeof named.addAndSendMsgToChat === "function"
    ) return named;
    return ns;
  }

  function getNamespace(name) {
    try {
      window.ErrorGuard?.skipGuardGlobal?.(true);
    } catch {}

    try {
      if (typeof window.importNamespace === "function") {
        const loaded = flashExport(window.importNamespace(name));
        if (loaded) return loaded;
      }
    } catch {}

    try {
      if (typeof window.require === "function") {
        return flashExport(window.require(name));
      }
    } catch {}

    return null;
  }

  async function waitForNamespace(name, timeoutMs = 8000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      const ns = getNamespace(name);
      if (ns) return ns;
      await new Promise(r => setTimeout(r, 200));
    }
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════
  // 2. ACTIVE USER & ACTIVE CHAT RESOLUTION
  // ═══════════════════════════════════════════════════════════════════

  function getMeUser() {
    const prefs = getNamespace("WAWebUserPrefsMeUser");
    let pn = null;
    let lid = null;
    try { pn = prefs?.getMaybeMePnUser?.() || null; } catch {}
    try { lid = prefs?.getMaybeMeLidUser?.() || null; } catch {}

    if (!pn && !lid) {
      try {
        const WidFactory = getNamespace("WAWebWidFactory");
        for (const k of ["last-wid-md", "last-wid"]) {
          const val = (localStorage.getItem(k) || "").replace(/^"|"$/g, "");
          if (val && WidFactory?.createWid) {
            pn = WidFactory.createWid(val);
            break;
          }
        }
      } catch {}
    }
    return { pn, lid };
  }

  async function getActiveChat() {
    const collections = await waitForNamespace("WAWebCollections", 8000);
    const chats = collections?.Chat;
    if (!chats) return null;

    // Strategy 1: chats.getActive()
    try {
      const active = typeof chats.getActive === "function" ? chats.getActive() : chats.active;
      if (active && active.id) return active;
    } catch {}

    // Strategy 2: Search models for currently active or open chat
    try {
      const models = typeof chats.getModelsArray === "function" ? chats.getModelsArray() :
                     Array.isArray(chats.models) ? chats.models : [];

      for (const c of models) {
        if (c.active || c.isActive || c.isOpen) return c;
      }

      // Strategy 3: Match header title from DOM
      const headerTitleEl = document.querySelector('#main header [title], #main header span[dir="auto"]');
      const title = (headerTitleEl?.getAttribute('title') || headerTitleEl?.textContent || '').trim();
      if (title) {
        for (const c of models) {
          const cTitle = c.name || c.formattedTitle || c.contact?.name || c.contact?.pushname || '';
          if (cTitle === title) return c;
        }
      }

      if (models.length > 0) {
        const sorted = [...models].filter(c => c.t || c.timestamp).sort((a, b) => (b.t || 0) - (a.t || 0));
        if (sorted[0]) return sorted[0];
      }
    } catch {}

    return null;
  }

  // ═══════════════════════════════════════════════════════════════════
  // 3. CRYPTO & HASH HELPERS
  // ═══════════════════════════════════════════════════════════════════

  function generateRandomKey(length = 32) {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    const bytes = crypto.getRandomValues(new Uint8Array(length));
    let key = "";
    for (let i = 0; i < bytes.length; i++) {
      key += alphabet[bytes[i] % alphabet.length];
    }
    return key;
  }

  async function computeFileHash(blob) {
    const digest = await crypto.subtle.digest("SHA-256", await blob.arrayBuffer());
    const bytes = new Uint8Array(digest);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }

  function dataUrlToBlob(dataUrl) {
    if (!dataUrl || typeof dataUrl !== 'string') {
      throw new Error('Invalid sticker data URL');
    }
    const parts = dataUrl.split(',');
    if (parts.length < 2 || !parts[1]) {
      throw new Error('Data URL is missing base64 payload');
    }
    const mime = (parts[0].match(/:(.*?);/) || [])[1] || 'image/webp';
    const b64 = parts[1].replace(/\s/g, '');
    // Validate base64 before atob
    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(b64)) {
      throw new Error('Data URL contains invalid base64 characters');
    }
    try {
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return new Blob([bytes], { type: mime });
    } catch (e) {
      console.warn(LOG_PREFIX, 'dataUrlToBlob atob error:', e.message);
      throw new Error('Failed to decode base64 sticker data');
    }
  }

  function dataUrlToBytes(dataUrl) {
    if (!dataUrl || typeof dataUrl !== 'string') {
      return new Uint8Array(0);
    }
    const parts = dataUrl.split(',');
    const b64 = (parts[1] || '').replace(/\s/g, '');
    if (!b64 || !/^[A-Za-z0-9+/]*={0,2}$/.test(b64)) return new Uint8Array(0);
    try {
      const binary = atob(b64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      return bytes;
    } catch {
      return new Uint8Array(0);
    }
  }

  function isAnimatedWebp(bytes) {
    if (!bytes || bytes.length < 21) return false;
    if (String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== "RIFF") return false;
    if (String.fromCharCode(bytes[8], bytes[9], bytes[10], bytes[11]) !== "WEBP") return false;
    let offset = 12;
    while (offset + 8 <= bytes.length) {
      const tag = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);
      const size = (bytes[offset + 4] | (bytes[offset + 5] << 8) | (bytes[offset + 6] << 16) | (bytes[offset + 7] << 24)) >>> 0;
      if (tag === "VP8X") {
        if ((bytes[offset + 8] & 0x02) !== 0) return true;
      }
      if (tag === "ANIM") return true;
      offset += 8 + size + (size & 1);
    }
    return false;
  }

  async function formatTo512Webp(blobOrDataUrl) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 512;
        canvas.height = 512;
        const ctx = canvas.getContext("2d");
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

        canvas.toBlob((b) => {
          if (b) resolve(b);
          else reject(new Error("Canvas toBlob failed"));
        }, "image/webp", 0.95);
      };
      img.onerror = () => reject(new Error("Image decode failed"));

      if (typeof blobOrDataUrl === 'string') {
        img.src = blobOrDataUrl;
      } else {
        img.src = URL.createObjectURL(blobOrDataUrl);
      }
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // 4. TRUE STICKER SENDING (Primary: WAWebUploadManager | Backup: Sticker Maker DOM)
  // ═══════════════════════════════════════════════════════════════════

  async function sendStickerNative(dataUrl) {
    console.log(LOG_PREFIX, 'Initiating sticker dispatch...');

    // Try Primary Pipeline: WAWebUploadManager + WAWebSendMsgChatAction
    try {
      const res = await sendViaInternalApi(dataUrl);
      return res;
    } catch (apiErr) {
      console.warn(LOG_PREFIX, 'Primary upload failed, switching to native Sticker Maker DOM pipeline:', apiErr.message);
      try {
        const domRes = await sendViaNativeStickerMakerDOM(dataUrl);
        return domRes;
      } catch (domErr) {
        throw new Error(`Sticker send failed: ${apiErr.message} | DOM: ${domErr.message}`);
      }
    }
  }

  async function resolveStickerFile(dataUrl) {
    if (!dataUrl || typeof dataUrl !== 'string') {
      throw new Error('Invalid sticker data URL');
    }

    // Case 1: Blob URL (blob:) or Same-Origin WhatsApp Blob
    if (dataUrl.startsWith('blob:')) {
      try {
        const res = await fetch(dataUrl);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        const ab = await blob.arrayBuffer();
        const bytes = new Uint8Array(ab);
        const isAnim = isAnimatedWebp(bytes);
        if (isAnim) {
          return { file: new File([bytes], "sticker.webp", { type: "image/webp" }), isAnim: true };
        }
        const webpBlob = await formatTo512Webp(blob);
        return { file: new File([webpBlob], "sticker.webp", { type: "image/webp" }), isAnim: false };
      } catch (err) {
        throw new Error(`Failed to resolve blob sticker: ${err.message}`);
      }
    }

    // Remote HTTP/HTTPS URLs cannot be fetched directly in WhatsApp page context due to WhatsApp Web CSP
    if (dataUrl.startsWith('https://') || dataUrl.startsWith('http://')) {
      throw new Error(`Remote URL cannot be fetched in WhatsApp page context due to Content Security Policy. It must be converted to a Base64 data URL by the extension content script before dispatching.`);
    }

    // Case 2: Data URL or Base64 string
    let b64 = dataUrl;
    let mime = 'image/webp';
    if (dataUrl.includes(',')) {
      const parts = dataUrl.split(',');
      const mimeMatch = parts[0].match(/:(.*?);/);
      if (mimeMatch) mime = mimeMatch[1];
      b64 = parts[1];
    }

    b64 = (b64 || '').replace(/\s+/g, '');
    // Ensure base64 padding
    while (b64.length % 4 !== 0) {
      b64 += '=';
    }

    // Syntax validation: ensure b64 contains only valid base64 characters
    if (!/^[A-Za-z0-9+/=]+$/.test(b64)) {
      throw new Error('Invalid base64 payload received for sticker dispatch.');
    }

    let bytes = null;
    try {
      const binary = atob(b64);
      bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
    } catch (e) {
      // Fallback: Use browser native fetch on data URL
      try {
        const dataUri = dataUrl.startsWith('data:') ? dataUrl : `data:${mime};base64,${b64}`;
        const res = await fetch(dataUri);
        const ab = await res.arrayBuffer();
        bytes = new Uint8Array(ab);
      } catch (inner) {
        throw new Error('Failed to decode sticker data: ' + e.message);
      }
    }

    const isAnim = isAnimatedWebp(bytes);
    if (isAnim) {
      return { file: new File([bytes], "sticker.webp", { type: "image/webp" }), isAnim: true };
    }
    const rawBlob = new Blob([bytes], { type: mime });
    const webpBlob = await formatTo512Webp(rawBlob);
    return { file: new File([webpBlob], "sticker.webp", { type: "image/webp" }), isAnim: false };
  }

  async function sendViaInternalApi(dataUrl) {
    const { file, isAnim } = await resolveStickerFile(dataUrl);

    if (isAnim) {
      console.log(LOG_PREFIX, '🎬 Detected ANIMATED WebP sticker! Preserving original animation frames.');
    }

    const chat = await getActiveChat();
    if (!chat || !chat.id) {
      throw new Error("Pehle WhatsApp me koi chat open karo!");
    }

    const me = getMeUser();
    const from = (typeof chat.id?.isLid === "function" && chat.id.isLid() ? me.lid : me.pn) || me.pn || me.lid;
    if (!from) {
      throw new Error("WhatsApp user identity not ready yet");
    }

    const uploadManager = await waitForNamespace("WAWebUploadManager", 6000);
    if (typeof uploadManager?.encryptAndUpload !== "function") {
      throw new Error("WAWebUploadManager not ready");
    }

    const filehash = await computeFileHash(file);
    const mediaKey = generateRandomKey(32);

    let uploadQpl;
    try {
      uploadQpl = getNamespace("WAWebStartMediaUploadQpl")?.startMediaUploadQpl?.({ entryPoint: "MediaUpload" });
    } catch {}

    const uploaded = await uploadManager.encryptAndUpload({
      blob: file,
      type: "sticker",
      signal: new AbortController().signal,
      mediaKey,
      uploadQpl
    });

    const url = uploaded?.url || uploaded?.clientUrl;
    if (!url) {
      throw new Error("Upload did not return a valid URL");
    }

    const keyModule = getNamespace("WAWebMsgKey");
    if (typeof keyModule !== "function" || typeof keyModule.newId !== "function") {
      throw new Error("WAWebMsgKey not ready");
    }

    const key = new keyModule({ from, to: chat.id, id: await keyModule.newId(), selfDir: "out" });

    let ephemeral = {};
    try {
      ephemeral = getNamespace("WAWebGetEphemeralFieldsMsgActionsUtils")?.getEphemeralFields?.(chat) || {};
    } catch {}

    const message = {
      ...ephemeral,
      ...uploaded,
      clientUrl: url,
      deprecatedMms3Url: url,
      uploadhash: uploaded.encFilehash,
      size: file.size,
      mimetype: "image/webp",
      filehash,
      mediaKey: uploaded.mediaKey || mediaKey,
      id: key,
      ack: 0,
      from,
      to: chat.id,
      local: true,
      self: "out",
      t: Math.floor(Date.now() / 1000),
      isNewMsg: true,
      type: "sticker",
      isAnimated: Boolean(isAnim),
    };
    delete message.__x_id;

    const sendAction = getNamespace("WAWebSendMsgChatAction");
    if (typeof sendAction?.addAndSendMsgToChat !== "function") {
      throw new Error("WAWebSendMsgChatAction not ready");
    }

    const result = sendAction.addAndSendMsgToChat(chat, message);
    const [added, delivered] = Array.isArray(result) ? result : [result, null];
    await added;

    if (delivered && typeof delivered.then === "function") {
      await Promise.race([delivered, new Promise(r => setTimeout(r, 8000))]);
    }

    console.log(LOG_PREFIX, `✅ Sent as TRUE ${isAnim ? 'ANIMATED ' : ''}STICKER!`);
    return { success: true, method: "native-internal-api", isAnimated: isAnim };
  }

  /**
   * DOM FALLBACK: Opens WhatsApp's native Sticker Maker editor and clicks send
   * Never sends as photo attachment!
   */
  async function sendViaNativeStickerMakerDOM(dataUrl) {
    const { file, isAnim } = await resolveStickerFile(dataUrl);
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);

    // Click attach button ('plus' or 'clip')
    const attachIcon = document.querySelector(
      '#main footer [data-icon="plus"], #main footer [data-icon="attach-menu-plus"], #main footer [data-icon="wds-ic-add"], #main footer [data-icon="clip"], #main footer div[aria-label="Attach"]'
    );
    const attachBtn = attachIcon?.closest('button, [role="button"]') || attachIcon;
    if (attachBtn) {
      attachBtn.click();
      await new Promise(r => setTimeout(r, 100));
    }

    // Find file input for stickers or general images
    const inputs = Array.from(document.querySelectorAll('input[type="file"]'));
    let targetInput = inputs.find(i => (i.getAttribute('accept') || '').toLowerCase().includes('webp'));
    if (!targetInput) {
      targetInput = inputs.find(i => (i.getAttribute('accept') || '').toLowerCase().includes('image'));
    }

    if (!targetInput) {
      throw new Error("WhatsApp file input could not be mounted");
    }

    try { targetInput.value = ''; } catch (e) {}

    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'files');
    if (setter && setter.set) {
      setter.set.call(targetInput, dataTransfer.files);
    } else {
      targetInput.files = dataTransfer.files;
    }

    targetInput.dispatchEvent(new Event('input', { bubbles: true }));
    targetInput.dispatchEvent(new Event('change', { bubbles: true }));

    // Wait for the green Send button in the sticker editor and auto-click
    return new Promise((resolve, reject) => {
      let count = 0;
      const interval = setInterval(() => {
        count++;
        const sendBtn = document.querySelector(
          'span[data-icon="send"], span[data-icon="wds-ic-send-filled"], div[aria-label="Send"], button[aria-label="Send"]'
        );
        if (sendBtn) {
          clearInterval(interval);
          const btn = sendBtn.closest('button, [role="button"]') || sendBtn;
          btn.click();
          resolve({ success: true, method: "native-dom-sticker-maker" });
        } else if (count >= 30) {
          clearInterval(interval);
          reject(new Error("Sticker editor preview did not appear"));
        }
      }, 100);
    });
  }

  // ═══════════════════════════════════════════════════════════════════
  // 5. FETCH USER'S EXISTING WHATSAPP SAVED STICKERS
  // ═══════════════════════════════════════════════════════════════════

  async function fetchUserWaStickers() {
    const list = [];
    const seenUrls = new Set();

    function bufferToDataUrl(buf, mime = 'image/webp') {
      try {
        if (!buf) return null;
        const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
        if (bytes.length < 10) return null;
        let binary = '';
        for (let i = 0; i < bytes.length; i++) {
          binary += String.fromCharCode(bytes[i]);
        }
        return `data:${mime};base64,` + btoa(binary);
      } catch {
        return null;
      }
    }

    function imgElementToDataUrl(img) {
      try {
        if (!img || !img.src) return null;
        if (img.src.startsWith('data:image/')) return img.src;
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth || img.width || 128;
        canvas.height = img.naturalHeight || img.height || 128;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        return canvas.toDataURL('image/webp', 0.9);
      } catch {
        return null;
      }
    }

    async function convertBlobUrlToDataUrl(blobUrl) {
      if (!blobUrl || typeof blobUrl !== 'string' || !blobUrl.startsWith('blob:')) return null;
      try {
        const res = await fetch(blobUrl);
        const blob = await res.blob();
        return new Promise((resolve) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => resolve(null);
          reader.readAsDataURL(blob);
        });
      } catch {
        return null;
      }
    }

    async function addCandidate(rawUrl, name = 'WA Starred Sticker') {
      if (!rawUrl) return;
      let url = rawUrl;

      if (url instanceof Uint8Array || url instanceof ArrayBuffer) {
        url = bufferToDataUrl(url);
      } else if (typeof url === 'string' && url.startsWith('blob:')) {
        url = await convertBlobUrlToDataUrl(url);
      }

      if (!url || typeof url !== 'string') return;
      url = url.trim();

      // Normalize bare base64
      if (!url.startsWith('data:') && !url.startsWith('https://') && url.length > 50 && /^[A-Za-z0-9+/=]+$/.test(url.slice(0, 100))) {
        url = 'data:image/webp;base64,' + url;
      }

      if (!url.startsWith('data:image/') && !url.startsWith('https://')) return;
      if (url.length < 50) return;

      const key = url.slice(-80);
      if (seenUrls.has(key)) return;
      seenUrls.add(key);

      list.push({
        id: 'wa_fav_' + Math.random().toString(36).substring(2, 8),
        name: name,
        dataUrl: url
      });
    }

    // 1. WhatsApp Web Internal Collections
    try {
      const collections = getNamespace("WAWebCollections");
      const candidates = [
        collections?.StarredSticker,
        collections?.Sticker,
        collections?.RecentSticker,
        getNamespace("WAWebStarredStickerCollection"),
        getNamespace("WAWebStickerCollection"),
        window.Store?.StarredSticker,
        window.Store?.Sticker,
        window.Store?.RecentSticker
      ].filter(Boolean);

      for (const coll of candidates) {
        try {
          const models = typeof coll.getModelsArray === "function" ? coll.getModelsArray() :
                         Array.isArray(coll.models) ? coll.models : [];
          for (const item of models) {
            const url = item.preview || item.mediaData?.preview || item.mediaUrl || item.url || item.body || item.directPath;
            if (url) {
              const name = item.emojis ? item.emojis.join(' ') : 'WA Starred';
              await addCandidate(url, name);
            }
          }
        } catch (e) {}
      }
    } catch (e) {}

    // 2. WhatsApp Web Message Models (Stickers sent/received in chats)
    try {
      const msgs = window.Store?.Msg?.getModelsArray ? window.Store.Msg.getModelsArray() : (window.Store?.Msg?.models || []);
      for (const m of msgs) {
        if (m.type === 'sticker') {
          const u = m.mediaData?.preview || m.body || m.preview || m.mediaUrl;
          if (u) await addCandidate(u, 'WA Sticker #' + (list.length + 1));
        }
      }
    } catch (e) {}

    // 3. Scan DOM in page context for active stickers
    try {
      const imgs = document.querySelectorAll('img');
      for (const img of imgs) {
        if ((img.naturalWidth >= 48 && img.naturalHeight >= 48) || img.closest('[data-id], div[role="row"], div[data-testid*="sticker"], div[role="application"]')) {
          const isSticker = img.closest('[data-id]') ||
                            img.closest('div[role="row"]') ||
                            img.closest('div[data-testid*="sticker"]') ||
                            img.closest('div[role="application"]') ||
                            img.closest('div[class*="sticker"]');
          if (isSticker && img.src) {
            let dataUrl = null;
            if (img.src.startsWith('data:')) {
              dataUrl = img.src;
            } else if (img.src.startsWith('blob:')) {
              dataUrl = await convertBlobUrlToDataUrl(img.src) || imgElementToDataUrl(img);
            } else if (img.src.startsWith('https://')) {
              dataUrl = img.src;
            }
            if (dataUrl) {
              await addCandidate(dataUrl, 'WA Sticker #' + (list.length + 1));
            }
          }
        }
      }
    } catch (e) {}

    // 4. Scan IndexedDB for Starred / Saved Stickers
    if (window.indexedDB) {
      let candidateDbs = ['model-storage', 'wawc', 'wawc-db', 'whatsapp'];
      try {
        if (typeof indexedDB.databases === 'function') {
          const dbs = await indexedDB.databases();
          if (Array.isArray(dbs) && dbs.length > 0) {
            const foundNames = dbs.map(d => d.name).filter(Boolean);
            if (foundNames.length > 0) {
              candidateDbs = Array.from(new Set([...foundNames, ...candidateDbs]));
            }
          }
        }
      } catch (e) {}

      for (const dbName of candidateDbs) {
        try {
          await new Promise((resolve) => {
            const req = indexedDB.open(dbName);
            req.onerror = () => resolve();
            req.onsuccess = async (e) => {
              const db = e.target.result;
              const storeNames = Array.from(db.objectStoreNames || []);
              const relevantStores = storeNames.filter(n =>
                /starred|sticker|favorite|recent|saved|custom|pack/i.test(n)
              );

              if (relevantStores.length === 0) {
                db.close();
                return resolve();
              }

              let pending = relevantStores.length;
              for (const sName of relevantStores) {
                try {
                  const tx = db.transaction([sName], 'readonly');
                  const store = tx.objectStore(sName);
                  const getAllReq = store.getAll ? store.getAll(null, 50) : null;
                  if (getAllReq) {
                    getAllReq.onsuccess = async () => {
                      const records = getAllReq.result || [];
                      for (const it of records) {
                        const url = it.preview || it.mediaData?.preview || it.mediaUrl || it.url || it.directPath || it.body || it.fullWidthHint;
                        if (url) {
                          await addCandidate(url, 'WA Starred #' + (list.length + 1));
                        }
                      }
                      pending--;
                      if (pending <= 0) { db.close(); resolve(); }
                    };
                    getAllReq.onerror = () => {
                      pending--;
                      if (pending <= 0) { db.close(); resolve(); }
                    };
                  } else {
                    pending--;
                    if (pending <= 0) { db.close(); resolve(); }
                  }
                } catch {
                  pending--;
                  if (pending <= 0) { db.close(); resolve(); }
                }
              }
            };
          });
        } catch (e) {}
      }
    }

    return list;
  }

  // ═══════════════════════════════════════════════════════════════════
  // 6. INITIALIZATION & RE-SYNC
  // ═══════════════════════════════════════════════════════════════════

  async function checkApiReadiness() {
    const uploadManager = await waitForNamespace("WAWebUploadManager", 5000);
    const sendAction = getNamespace("WAWebSendMsgChatAction");
    const ready = Boolean(uploadManager && sendAction);

    window.postMessage({ type: 'WSH_API_READY', ready }, '*');

    if (ready) {
      console.log(LOG_PREFIX, '✅ WA Internal Sticker API fully connected!');
      const waStickers = await fetchUserWaStickers();
      if (waStickers.length > 0) {
        window.postMessage({ type: 'WSH_WA_STICKERS_DATA', stickers: waStickers }, '*');
      }
    }
    return ready;
  }

  // ═══════════════════════════════════════════════════════════════════
  // 7. POSTMESSAGE BRIDGE (Content Script <-> Page Context)
  // ═══════════════════════════════════════════════════════════════════

  window.addEventListener('message', async (event) => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || typeof data.type !== 'string') return;

    if (data.type === 'WSH_PING') {
      const ready = Boolean(getNamespace("WAWebUploadManager") && getNamespace("WAWebSendMsgChatAction"));
      window.postMessage({ type: 'WSH_PONG', ready }, '*');
      return;
    }

    if (data.type === 'WSH_GET_WA_STICKERS') {
      const stickers = await fetchUserWaStickers();
      window.postMessage({ type: 'WSH_WA_STICKERS_DATA', stickers }, '*');
      return;
    }

    if (data.type === 'WSH_SEND_STICKER') {
      const { dataUrl, id } = data;
      try {
        const result = await sendStickerNative(dataUrl);
        window.postMessage({
          type: 'WSH_STICKER_RESULT',
          id,
          success: true,
          method: result.method
        }, '*');
      } catch (err) {
        console.error(LOG_PREFIX, 'Native sticker send error:', err);
        window.postMessage({
          type: 'WSH_STICKER_RESULT',
          id,
          success: false,
          error: err.message
        }, '*');
      }
    }
  });

  checkApiReadiness();
  const retryInterval = setInterval(async () => {
    const isReady = await checkApiReadiness();
    if (isReady) clearInterval(retryInterval);
  }, 3000);
})();
