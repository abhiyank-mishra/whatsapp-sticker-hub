# Chrome Web Store Listing — WhatsApp Sticker Hub

> Last Updated: 2026-10-19

## Store Listing

**Extension Name** [REQUIRED]
WhatsApp Sticker Hub - Custom Stickers Manager

**Short Description** [REQUIRED]
Manage, organize, and 1-click send custom stickers directly inside WhatsApp Web without limitations.

**Detailed Description** [REQUIRED]
WhatsApp Sticker Hub transforms how you send and manage stickers on WhatsApp Web. Say goodbye to clunky sticker drawers and unorganized collections.

With WhatsApp Sticker Hub, you get full control over your stickers with a floating sticker launcher right inside WhatsApp Web and a powerful extension manager dashboard.

KEY FEATURES:
- In-Page Floating Hub: Access all your stickers right inside WhatsApp Web with a single click or keyboard shortcut (Alt + S).
- 1-Click Instant Send: Click any sticker and it automatically sends to your currently active chat.
- Custom Sticker Creator: Upload any PNG, WebP, JPG, or GIF image to automatically format it into an optimized 512x512 transparent sticker.
- Organize Custom Packs: Create named packs with custom emoji icons to keep your memes, reactions, and work stickers organized.
- Favorites & Recents: Star your most used stickers for quick access anytime.
- Pre-loaded Packs: Enjoy pre-built desi expressions, trending reaction faces, and hilarious meme stickers out of the box.
- Full Backup & Restore: Export and import your entire sticker collection as a JSON file anytime.
- Native WhatsApp Styling: Adapts to both WhatsApp Web dark mode and light mode effortlessly.

HOW TO USE IT:
1. Open WhatsApp Web (web.whatsapp.com) and click into any chat conversation.
2. Click the floating green sticker icon on the bottom right (or press Alt + S).
3. Click any sticker — it will be pasted and sent directly into your active chat!
4. Click the extension icon in your Chrome toolbar anytime to create new packs, upload custom stickers, or backup your collection.

PRIVACY & DATA SAFETY:
Your privacy is fully protected. All your stickers, collections, and settings are stored 100% locally on your computer using Chrome local storage. None of your chats, messages, or images are ever transmitted to any third-party server.

**Category** [REQUIRED]
Social & Communication

**Single Purpose** [REQUIRED]
Enables users to organize custom sticker packs and send stickers into active WhatsApp Web chats with one click.

**Primary Language** [REQUIRED]
English

## Graphics & Assets

| Asset | Dimensions | Status | Filename |
|-------|-----------|--------|----------|
| Store Icon [REQUIRED] | 128×128 PNG | ✅ Ready | `icons/icon-128.png` |
| Screenshot 1 [REQUIRED] | 1280×800 | ⬜ To capture | In-Page Floating Sticker Drawer on WhatsApp Web |
| Screenshot 2 [RECOMMENDED] | 1280×800 | ⬜ To capture | Extension Popup Management Dashboard |
| Screenshot 3 [RECOMMENDED] | 1280×800 | ⬜ To capture | Custom Sticker Creator & 512x512 Preview |
| Small Promo Tile [RECOMMENDED] | 440×280 | ⬜ Not created | |

## Permissions Justification

| Permission | Type | Justification |
|------------|------|---------------|
| `storage` | permissions | Required to store the user's custom sticker packs, favorite stickers, recent history, and settings locally on their device. |
| `unlimitedStorage` | permissions | Required to store larger high-definition sticker image packs locally without hitting browser quota limits. |
| `tabs` | permissions | Required to detect if WhatsApp Web is open, switch to the active chat tab, and check communication status with WhatsApp Web. |
| `scripting` | permissions | Required to inject helper scripts into WhatsApp Web when opening via popup if needed. |
| `contextMenus` | permissions | Allows right-clicking any image on any webpage to immediately convert and save it to the Sticker Hub. |
| `https://web.whatsapp.com/*` | host_permissions | Required to inject the in-page sticker drawer and interface with WhatsApp Web's native sticker sending pipeline. |
| `https://sticker.ly/*` | host_permissions | Allows direct 1-click import of sticker packs from Sticker.ly codes and links. |
| `https://*.pstatic.net/*` | host_permissions | Required to fetch high-resolution sticker assets from Sticker.ly's image CDN. |

## Privacy & Data Use

### Data Collection
**Does the extension collect user data?** No

All sticker artwork and pack definitions remain 100% locally on your device within `chrome.storage.local`.

### Data Use Certification
- [x] Data is NOT sold to third parties
- [x] Data is NOT used for purposes unrelated to the extension's core functionality
- [x] Data is NOT used for creditworthiness or lending purposes

## Version History

| Version | Date | Changes | Status |
|---------|------|---------|--------|
| 1.4.0 | 2026-10-19 | Native WhatsApp sticker sending pipeline (sends as true sticker, not image), sleek left-side edge tab launcher, auto-save incoming chat stickers, and WhatsApp Starred sticker sync | Active |
| 1.0.0 | 2026-10-19 | Initial release with in-page drawer, 1-click send, custom creator, backup/restore, and default packs | Superseded |

