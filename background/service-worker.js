/**
 * WhatsApp Sticker Hub - Background Service Worker
 * Manages right-click context menu to add stickers from anywhere on the web
 */

chrome.runtime.onInstalled.addListener(async () => {
  // Create Context Menu Item
  chrome.contextMenus.create({
    id: 'wsh-add-sticker-from-web',
    title: '➕ Add to WhatsApp Sticker Hub',
    contexts: ['image']
  });

  // Automatically refresh WhatsApp tabs on extension update so old code is never cached
  try {
    const waTabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
    for (const t of waTabs) {
      chrome.tabs.reload(t.id);
    }
  } catch {}
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'wsh-add-sticker-from-web' && info.srcUrl) {
    await handleAddStickerFromWeb(info.srcUrl, tab);
  }
});

async function handleAddStickerFromWeb(imageUrl, currentTab) {
  try {
    // 1. Fetch image and process to 512x512 WebP using OffscreenCanvas
    const dataUrl = await convertImageUrlToWebp(imageUrl);

    // 2. Fetch existing packs from chrome.storage
    const data = await chrome.storage.local.get('wsh_packs');
    let packs = data.wsh_packs || [];

    // Find or create "🌐 Saved from Web" pack
    let webPack = packs.find(p => p.id === 'pack_saved_from_web' || p.name.includes('Saved from Web'));
    if (!webPack) {
      webPack = {
        id: 'pack_saved_from_web',
        name: '🌐 Saved from Web',
        icon: '🌐',
        stickers: []
      };
      packs.unshift(webPack);
    }

    // Add new sticker
    const stickerName = 'Web Sticker #' + (webPack.stickers.length + 1);
    webPack.stickers.unshift({
      id: 'stk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      name: stickerName,
      tags: 'web, custom, sticker',
      dataUrl: dataUrl,
      createdAt: Date.now()
    });

    await chrome.storage.local.set({ wsh_packs: packs });

    // 3. User feedback: Flash badge
    await chrome.action.setBadgeText({ text: '✓' });
    await chrome.action.setBadgeBackgroundColor({ color: '#25D366' });
    setTimeout(async () => {
      await chrome.action.setBadgeText({ text: '' });
    }, 3000);

    // Notify WhatsApp tab if open
    const waTabs = await chrome.tabs.query({ url: 'https://web.whatsapp.com/*' });
    for (const t of waTabs) {
      try {
        chrome.tabs.sendMessage(t.id, {
          action: 'TOAST',
          message: 'Sticker saved to Hub from web! 🌐',
          type: 'success'
        });
      } catch {}
    }
  } catch (err) {
    console.error('[WhatsAppStickerHub] Failed to save sticker from web:', err);
    await chrome.action.setBadgeText({ text: '!' });
    await chrome.action.setBadgeBackgroundColor({ color: '#EF4444' });
    setTimeout(async () => {
      await chrome.action.setBadgeText({ text: '' });
    }, 3000);
  }
}

async function convertImageUrlToWebp(imageUrl) {
  const res = await fetch(imageUrl);
  const blob = await res.blob();
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(512, 512);
  const ctx = canvas.getContext('2d');

  const maxDim = 490;
  let w = bitmap.width;
  let h = bitmap.height;
  if (w > h) {
    h = Math.round((h * maxDim) / w);
    w = maxDim;
  } else {
    w = Math.round((w * maxDim) / h);
    h = maxDim;
  }
  const x = Math.round((512 - w) / 2);
  const y = Math.round((512 - h) / 2);

  ctx.drawImage(bitmap, x, y, w, h);
  const convertedBlob = await canvas.convertToBlob({ type: 'image/webp', quality: 0.92 });

  const arrayBuffer = await convertedBlob.arrayBuffer();
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return `data:image/webp;base64,${btoa(binary)}`;
}

// Background Fetch Proxy (Bypasses web.whatsapp.com page CSP / CORS)
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'FETCH_EXTERNAL_URL') {
    (async () => {
      try {
        let res = await fetch(message.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        // Automatic Extension Fallback: If .webp returns 404, try .png; if .png returns 404, try .webp!
        if (!res.ok && res.status === 404) {
          try {
            if (message.url.endsWith('.webp')) {
              const altRes = await fetch(message.url.replace(/\.webp$/, '.png'), {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
              });
              if (altRes.ok) res = altRes;
            } else if (message.url.endsWith('.png')) {
              const altRes = await fetch(message.url.replace(/\.png$/, '.webp'), {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
              });
              if (altRes.ok) res = altRes;
            }
          } catch {}
        }

        if (!res.ok) {
          sendResponse({ ok: false, error: `HTTP ${res.status}` });
          return;
        }
        if (message.responseType === 'dataUrl') {
          const blob = await res.blob();
          const arrayBuffer = await blob.arrayBuffer();
          const bytes = new Uint8Array(arrayBuffer);
          let binary = '';
          const chunkSize = 8192;
          for (let i = 0; i < bytes.length; i += chunkSize) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
          }
          const base64 = btoa(binary);
          const mime = blob.type || (message.url.endsWith('.webp') ? 'image/webp' : 'image/png');
          sendResponse({ ok: true, data: `data:${mime};base64,${base64}` });
        } else {
          const text = await res.text();
          sendResponse({ ok: true, text });
        }
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }
    })();
    return true; // Keep channel open
  }

  // ═══════════════════════════════════════════════════════════════════
  // ═══════════════════════════════════════════════════════════════════
  // STICKER.LY LIVE SEARCH & PACK DISCOVERY API PROXY
  // ═══════════════════════════════════════════════════════════════════

  if (message.action === 'STICKERLY_SEARCH') {
    (async () => {
      try {
        const query = (message.query || '').trim();
        const res = await fetch('http://api.sticker.ly/v3.1/stickerPack/search', {
          method: 'POST',
          headers: {
            'User-Agent': 'androidapp.stickerly/2.16.0 (SM-G973N; U; Android 10; en;)',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ keyword: query, size: 60 })
        });
        if (res.ok) {
          const json = await res.json();
          sendResponse({ ok: true, data: json });
        } else {
          // Fallback: scrape HTML search page
          const htmlUrl = `https://sticker.ly/s/${encodeURIComponent(query)}`;
          const htmlRes = await fetch(htmlUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
          });
          const html = await htmlRes.text();
          sendResponse({ ok: true, html: html, fallback: true });
        }
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }
    })();
    return true;
  }

  if (message.action === 'STICKERLY_TRENDING') {
    (async () => {
      try {
        const res = await fetch('http://api.sticker.ly/v3.1/stickerPack/search', {
          method: 'POST',
          headers: {
            'User-Agent': 'androidapp.stickerly/2.16.0 (SM-G973N; U; Android 10; en;)',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify({ keyword: 'trending', size: 60 })
        });
        if (res.ok) {
          const json = await res.json();
          sendResponse({ ok: true, data: json });
        } else {
          sendResponse({ ok: false, error: 'Failed to fetch trending packs' });
        }
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }
    })();
    return true;
  }

  if (message.action === 'STICKERLY_GET_PACK') {
    (async () => {
      try {
        const code = (message.code || '').trim();
        const res = await fetch(`http://api.sticker.ly/v3.1/stickerPack/${code}`, {
          headers: {
            'User-Agent': 'androidapp.stickerly/2.16.0 (SM-G973N; U; Android 10; en;)',
            'Accept': 'application/json'
          }
        });
        if (res.ok) {
          const json = await res.json();
          sendResponse({ ok: true, data: json });
        } else {
          sendResponse({ ok: false, error: `Failed to fetch pack ${code} (status ${res.status})` });
        }
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }
    })();
    return true;
  }

  if (message.action === 'STICKERLY_FETCH_PACK_PAGE') {
    (async () => {
      try {
        const code = message.code;
        const url = `https://sticker.ly/s/${code}`;
        const res = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'text/html'
          }
        });
        if (!res.ok) {
          sendResponse({ ok: false, error: `HTTP ${res.status}` });
          return;
        }
        const html = await res.text();
        sendResponse({ ok: true, html });
      } catch (err) {
        sendResponse({ ok: false, error: err.message });
      }
    })();
    return true;
  }
});
