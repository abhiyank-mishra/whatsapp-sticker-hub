/**
 * WhatsApp Sticker Hub — Smart Reply Recommendation Engine
 * 
 * Analyzes incoming WhatsApp chat messages (Hinglish, Hindi, English)
 * and recommends the most contextually relevant desi meme stickers
 * (TMKOC, Hera Pheri, Mirzapur, Panchayat, Savage, Love, Laugh, etc.).
 * 
 * 100% Client-side, Zero Latency, Completely Private & Offline.
 */

(function () {
  'use strict';
  if (typeof window !== 'undefined' && window.WSH_SmartReply) return; // Already loaded

  // ═══════════════════════════════════════════════════════════════════
  // 1. INTENT & KEYWORD MAPPINGS (DESI MEMES & EMOTIONS)
  // ═══════════════════════════════════════════════════════════════════

  const INTENT_RULES = [
    {
      id: 'swag_attitude',
      label: 'Swag & Attitude',
      patterns: [
        /\b(jo\s*(m|mai|hum)?\s*boldu|vahi\s*hota|wahi\s*hota|jo\s*bol\s*diya|apna\s*raj|apna\s*time|jalwa|system|systumm|aukaat|aukat|baap|boss|don|sher|jhukega\s*nahi|rule|hukumat|bhai\s*hai\s*apna|dada|gangster|attitude|swag|meri\s*marzi|chal\s*be|apun|king|dialogue|dialog|soch)\b/i,
        /[😎🦁👑🔥💪]/
      ],
      targetTags: ['soch', 'jesi jiski soch', 'jethalal', 'babu rao', 'swag', 'attitude', 'jalwa', 'savage', 'mirzapur'],
      preferredStickerWords: ['soch', 'jethalal', 'safalta', 'akal', 'babu', 'swag']
    },
    {
      id: 'love_romance',
      label: 'Pyar & Romance',
      patterns: [
        /\b(love|pyar|pyaar|jaan|babu|baby|shona|sweet|cute|miss\s*you|miss\s*u|yaad|yaad\s*kiya|tumjhe\s*yaad|tujhe\s*yaad|tera\s*naam|naam\s*liya|muah|kiss|dil|heart|romantic|flirt|sundar|khubsurat|beautiful|crush|pata\s*le|ummm|loveyou|ily|deewana|mohabbat|ishq|song|gaana|filmy|aankhein|palkein)\b/i,
        /[❤️💖💕😘😍🥰😚💋🌹]/
      ],
      targetTags: ['babita', 'good morning', 'love', 'cute', 'romance', 'shinchan', 'heart', 'bubu', 'dudu'],
      preferredStickerWords: ['babita', 'good morning', 'love', 'cute', 'jetha', 'dil']
    },
    {
      id: 'laugh',
      label: 'Laugh & Comedy',
      patterns: [
        /\b(haha|hahaha|lmao|lol|rofl|hasna|joke|chutkula|funny|laugh|xd|komedi|comedy|lotpot|gazab|hasi|haso|maza|funny\s*meme|kya\s*joke|epic)\b/i,
        /[😂🤣😆😹]/
      ],
      targetTags: ['me core', 'akal', 'funny', 'tmkoc', 'jethalal', 'babu rao', 'comedy', 'carryminati'],
      preferredStickerWords: ['me core', 'akal', 'jethalal', 'laugh', 'funny']
    },
    {
      id: 'savage_troll',
      label: 'Savage & Chup',
      patterns: [
        /\b(chup|shutup|shut\s*up|vaidi|chup\s*kar|chup\s*re|chal\s*nikal|nikal|pehli\s*fursat|aukat|gyan\s*mat\s*de|so\s*ja|tu\s*janta\s*hai|nhi\s*hoga|hatt|overacting|chal\s*hat|aukaat|baap\s*ko\s*mat\s*sikha|50\s*rupya|dimag\s*mat\s*kharab|dimaag\s*mat\s*chaat|bakwas|faltu|bakchodi|pagal|gadhe|ullu|kalank|dibba|nonsense|gussa|ladai)\b/i,
        /[😡🤬👊👎😠🤫]/
      ],
      targetTags: ['chup kar ne vaidi', 'kalank', 'dibba', 'nonsense', 'akal hai tere mein', 'savage', 'insult'],
      preferredStickerWords: ['vaidi', 'kalank', 'dibba', 'nonsense', 'akal', 'chup']
    },
    {
      id: 'party_money',
      label: 'Party & Paisa',
      patterns: [
        /\b(party|treat|paisa|paise|kharcha|bill|daaru|beer|khana|bhook|swiggy|zomato|biryani|paisa\s*double|25\s*din|ameer|garib|salary|rupaye|dhan|scheme|party\s*kab|treat\s*de|treat\s*kab|paisa\s*hi\s*paisa)\b/i,
        /[🍻🍺🍾🍕🍔💰💸💵]/
      ],
      targetTags: ['paisa', 'bhaiya safalta', 'kem palty', 'party', 'money', 'raju', '25 din'],
      preferredStickerWords: ['safalta', 'palty', 'paisa', 'jethalal']
    },
    {
      id: 'sad_crying',
      label: 'Dukh & Dard',
      patterns: [
        /\b(sad|rona|cry|dard|dukhi|fail|exam|marks|stress|tension|mood\s*off|kya\s*kare|yaar\s*kyu|bura\s*laga|depressed|anxiety|dukh|kasht|peeda|rone\s*ka\s*man|dukh\s*kahe\s*khatam|rone\s*laga|akela)\b/i,
        /[😭😢😿💔🥺]/
      ],
      targetTags: ['dukh. dard. peeda.', 'tensionram', 'sad', 'crying', 'tears', 'jethalal'],
      preferredStickerWords: ['dukh', 'peeda', 'tensionram', 'bhide', 'sad']
    },
    {
      id: 'shock_surprise',
      label: 'Shock & Sach Me',
      patterns: [
        /\b(kya|what|omg|really|sach\s*me|sacchi|are\s*you\s*serious|kya\s*hua|dhoka|scam|wait\s*what|are\s*baap\s*re|hey\s*bhagwan|shock|bhai\s*ye\s*kya|khopdi|kya\s*tapleek|confuse|confused|hain\??|are\s*bc)\b/i,
        /[😱🤯😳😲❓]/
      ],
      targetTags: ['kya? sach me?', 'kya tapleek hai aapko?', 'champaklal confused', 'shock'],
      preferredStickerWords: ['sach me', 'tapleek', 'confused', 'kya']
    },
    {
      id: 'agreement',
      label: 'Haan & Sahi Hai',
      patterns: [
        /\b(ok|okay|thik\s*hai|theek\s*hai|done|haan|sahi\s*hai|sahi\s*pakde|chalega|chlega|pakka|sure|nice|great|shukriya|thanks|thank\s*you|dhanyawad|welcome|badiya|zabardast|sahi\s*bola|bilkul|yes|shabaash|wah)\b/i,
        /[👍👌✅🤝💯]/
      ],
      targetTags: ['hannn sahi pakde ho', 'chlega', 'kya baat hai jetha', 'thank you bhagwan', 'jesi jiski soch'],
      preferredStickerWords: ['sahi pakde', 'chlega', 'kya baat', 'bhagwan', 'soch']
    },
    {
      id: 'rejection',
      label: 'Nahi & Cancel',
      patterns: [
        /\b(nahi|nhi|no|never|mana|rehne\s*de|rehnedo|nhi\s*chahiye|mat\s*kar|nope|kabhi\s*nahi|bilkul\s*nahi|cancel|hatao|mat\s*karna)\b/i,
        /[❌🚫🙅‍♂️🙅‍♀️]/
      ],
      targetTags: ['cancel cancel cancel', 'nonsense', 'nahi', 'reject'],
      preferredStickerWords: ['cancel', 'nonsense', 'nahi']
    },
    {
      id: 'greeting',
      label: 'Hello & Bhai',
      patterns: [
        /\b(hi|hello|hey|kaisa\s*hai|aur\s*bhai|sup|wassup|kya\s*chal\s*raha|good\s*morning|gm|gn|good\s*night|namaste|pranam|kaise\s*ho|ram\s*ram|radhe\s*radhe|kem\s*palty|palty|bhai\s*sun)\b/i,
        /[👋🙏🤝]/
      ],
      targetTags: ['kem palty', 'good morning babita ji', 'bhaiya safalta', 'hello'],
      preferredStickerWords: ['palty', 'good morning', 'safalta']
    },
    {
      id: 'cricket',
      label: 'Cricket & Kohli',
      patterns: [
        /\b(cricket|virat|rohit|dhoni|match|ipl|six|out|century|india|world\s*cup|sixer|bowling|batting|rcb|csk|mi)\b/i,
        /[🏏🏆🇮🇳]/
      ],
      targetTags: ['cricket', 'virat', 'kohli', 'rohit', 'dhoni', 'ipl'],
      preferredStickerWords: ['virat', 'kohli', 'rohit', 'cricket']
    },
    {
      id: 'panchayat',
      label: 'Panchayat & Binod',
      patterns: [
        /\b(panchayat|sachiv|sachiv\s*ji|binod|pradhan|banrakas|vidhayak|phulera|dekh\s*raha\s*hai)\b/i
      ],
      targetTags: ['panchayat', 'binod', 'sachiv', 'phulera'],
      preferredStickerWords: ['panchayat', 'binod', 'sachiv', 'pradhan']
    },
    {
      id: 'food_chai',
      label: 'Chai & Khana',
      patterns: [
        /\b(chai|coffee|khana|khaya|bhookh|bhook|pizza|burger|maggie|biscuit|nashta|dinner|lunch|jalebi|fafda)\b/i,
        /[☕🍵🍕🍔🍜🍽️]/
      ],
      targetTags: ['tmkoc is so jaruri', 'nahane ja nahane', 'chai', 'khana'],
      preferredStickerWords: ['jaruri', 'nahane', 'jalebi']
    }
  ];

  // ═══════════════════════════════════════════════════════════════════
  // 2. RECOMMENDATION ENGINE
  // ═══════════════════════════════════════════════════════════════════

  // ═══════════════════════════════════════════════════════════════════
  // 1.5 MEME & DIALOGUE SEMANTIC KEYWORD DICTIONARY
  // Maps colloquial Hinglish/Hindi phrases directly to specific iconic meme stickers
  // ═══════════════════════════════════════════════════════════════════

  const STICKER_KEYWORD_MAP = {
    'Akal Hai Tere Mein': ['akal', 'dimag', 'dimaag', 'pagal', 'gadhe', 'gadha', 'bewakoof', 'idiot', 'stupid', 'ullu', 'sense', 'dimaag kharab', 'bina akal'],
    'Chup Kar Ne Vaidi': ['chup', 'shut up', 'shutup', 'vaidi', 'chup kar', 'chup re', 'bakwas', 'bol mat', 'bakchodi mat kar', 'shant', 'bolna mat', 'overacting'],
    'Jesi Jiski Soch': ['soch', 'attitude', 'swag', 'boldu', 'wahi hota', 'vahi hota', 'meri marzi', 'apun', 'apna time', 'system', 'systumm', 'jalwa', 'boss', 'aukat', 'aukaat', 'dialogue', 'dialog', 'sher', 'king', 'rule'],
    'Kem Palty': ['kem palty', 'palty', 'party', 'bhai', 'hello', 'sup', 'wassup', 'kaise ho', 'kaisa hai', 'dost', 'yaar', 'bro', 'hi', 'hey'],
    'Chlega': ['chlega', 'chalega', 'thik hai', 'theek hai', 'ok', 'okay', 'done', 'yes', 'haan', 'sahi hai', 'agree', 'deal', 'chalega na', 'pakka'],
    'Dukh. Dard. Peeda': ['dukh', 'dard', 'peeda', 'kasht', 'sad', 'rona', 'cry', 'dukhi', 'anxiety', 'depressed', 'mood off', 'dard e dil', 'rone ka man', 'akela', 'rona aa raha'],
    'Bhaiya Safalta Ke Raste': ['safalta', 'raste', 'chalo', 'paisa', 'ameer', 'paise', 'bhaiya', 'success', 'scheme', 'crorepati', 'double', '25 din', 'dhan'],
    'Nahane Ja Nahane': ['nahane', 'naha', 'fresh', 'subah', 'ganda', 'smell', 'badboo', 'khana', 'chai', 'safai', 'naha le'],
    'Kalank He Tu Kalank': ['kalank', 'sharm', 'dhabba', 'bezzati', 'insult', 'troll', 'savage', 'sharam kar', 'thoo', 'kya kiya', 'gande kaam'],
    'Kya Tapleek Hai': ['tapleek', 'takleef', 'problem', 'dikkat', 'issue', 'kya hua', 'pareshaan', 'kya chahiye', 'shanti', 'pareshan', 'kyu pareshan'],
    'Nonsense': ['nonsense', 'bakwas', 'jhoot', 'gussa', 'irritated', 'angry', 'pagal', 'faltu', 'chup', 'dimag mat chaat'],
    'Hannn Sahi Pakde Ho': ['sahi pakde', 'sahi', 'correct', 'exactly', 'bilkul', 'true', 'sach', 'ekdum', 'pakda', 'right', 'sahi bola', 'satya'],
    'Kya? Sach Me': ['sach me', 'really', 'shock', 'omg', 'sacchi', 'hain', 'what', 'are you serious', 'dhoka', 'scam', 'kya', 'sacchi me', 'are baap re'],
    'Tmkoc Is So Jaruri': ['jaruri', 'zaroori', 'important', 'chai', 'khana', 'sukoon', 'chill', 'relax', 'shaam', 'nashta', 'jarurat'],
    'Okay Bye': ['bye', 'tata', 'good night', 'gn', 'chalta hu', 'alvida', 'nikal', 'so jao', 'see you', 'fir milte', 'bye bye'],
    'Good Morning Babita Ji': ['good morning', 'babita', 'gm', 'subah', 'romance', 'love', 'pyar', 'pyaar', 'crush', 'sundar', 'khubsurat', 'yaad', 'tera naam', 'tumjhe yaad', 'miss you', 'dil', 'heart', 'baby', 'jaan', 'shona', 'cute', 'flirt', 'mohabbat', 'ishq'],
    'Kuch Karna Hoga': ['kuch karna hoga', 'idea', 'plan', 'socho', 'scheme', 'dimag', 'jugad', 'jugaad', 'solution', 'kaam karo', 'kya kare'],
    'Champaklal Confused': ['confused', 'champaklal', 'bapuji', 'samajh nahi aaya', 'ye kya tha', 'shock', 'ghabrahat', 'bhaisahab', 'kya bole'],
    'Thank You Bhagwan': ['thank you', 'thanks', 'bhagwan', 'shukriya', 'bach gaye', 'pass', 'dhanyawad', 'shabaash', 'grace', 'sukar hai', 'shukar'],
    'Kya Baat Hai Jetha': ['kya baat', 'kya baat hai', 'wah', 'shabaash', 'badiya', 'badhiya', 'super', 'zabardast', 'mast', 'great', 'awesome', 'op', 'champion', 'moye moye'],
    'Me Core': ['me core', 'haha', 'hahaha', 'funny', 'lol', 'lmao', 'relatable', 'mai hu', 'hasi', 'laugh', 'komedi', 'comedy', 'rofl', 'haso'],
    'Tensionram Tukaram Bhide': ['tensionram', 'tension', 'bhide', 'stress', 'marks', 'exam', 'darr', 'dar', 'padhai', 'result', 'anxiety', 'chinta'],
    'Dibba Hai Tu Dibba': ['dibba', 'bewakoof', 'gadha', 'dabba', 'zero', 'idiot', 'savage', 'dimaag nahi', 'looser', 'chomu', 'loser'],
    'Cancel Cancel Cancel': ['cancel', 'mana', 'reject', 'mat kar', 'nahi', 'never', 'no', 'rehnedo', 'nhi chahiye', 'nope', 'mat karo', 'hatao']
  };

  const WSH_SmartReply = {
    /**
     * Analyze message text and identify matched intent
     */
    detectIntent(text) {
      if (!text || typeof text !== 'string') return null;
      const clean = text.trim();
      if (clean.length === 0) return null;

      let bestRule = null;
      let highestScore = 0;

      for (const rule of INTENT_RULES) {
        let score = 0;
        for (const pattern of rule.patterns) {
          try {
            const gPattern = new RegExp(pattern.source, pattern.flags.includes('i') ? 'gi' : 'g');
            const matches = clean.match(gPattern);
            if (matches) {
              for (const m of matches) {
                // Multi-word / longer matches carry exponentially higher contextual weight
                score += m.length * 3;
              }
            }
          } catch {
            const singleMatch = clean.match(pattern);
            if (singleMatch) score += 6;
          }
        }
        if (score > highestScore) {
          highestScore = score;
          bestRule = rule;
        }
      }

      return {
        rule: bestRule,
        score: highestScore,
        cleanText: clean
      };
    },

    /**
     * Extract all unique stickers available in user collections and default packs
     */
    gatherCandidateStickers(packs = []) {
      const candidates = [];
      const seen = new Set();

      function addSticker(s, packName = '') {
        if (!s || !s.dataUrl) return;
        // Skip dead blobs
        if (typeof s.dataUrl === 'string' && s.dataUrl.startsWith('blob:')) return;
        // Skip remote web URLs to avoid CSP breakage and broken images in chat
        if (typeof s.dataUrl === 'string' && s.dataUrl.startsWith('http')) return;
        const key = s.dataUrl.slice(-60);
        if (seen.has(key)) return;
        seen.add(key);

        candidates.push({
          id: s.id,
          name: s.name || 'Meme Sticker',
          tags: (s.tags || '') + ', ' + packName.toLowerCase(),
          dataUrl: s.dataUrl,
          isAnimated: Boolean(s.isAnimated),
          packName: packName
        });
      }

      // 1. User's currently loaded packs (Installed base64 WebP stickers)
      if (Array.isArray(packs)) {
        for (const p of packs) {
          if (Array.isArray(p.stickers)) {
            for (const s of p.stickers) {
              addSticker(s, p.name);
            }
          }
        }
      }

      // 2. Default bundled packs (Real embedded base64 TMKOC stickers with full dialogues)
      const defaults = (typeof window !== 'undefined' ? window.DEFAULT_STICKER_PACKS : null) || [];
      for (const p of defaults) {
        if (Array.isArray(p.stickers)) {
          for (const s of p.stickers) {
            addSticker(s, p.name);
          }
        }
      }

      return candidates;
    },

    /**
     * Score a candidate sticker against a matched intent and text keywords
     * KEY INNOVATION: Stickers with text written on them (name/tags) get
     * exponentially higher scores when their text semantically matches the message.
     */
    scoreSticker(sticker, rule, textTokens, fullText) {
      let score = 0;
      const stickerNameLower = (sticker.name || '').toLowerCase();
      const stickerText = (sticker.name + ' ' + sticker.tags + ' ' + (sticker.packName || '')).toLowerCase();
      const msgLower = (fullText || '').toLowerCase();

      // 0. DIALOGUE & MEME SEMANTIC DICTIONARY (Highest precision scoring)
      for (const [keyPrefix, keywords] of Object.entries(STICKER_KEYWORD_MAP)) {
        if (stickerNameLower.includes(keyPrefix.toLowerCase())) {
          for (const kw of keywords) {
            if (msgLower.includes(kw.toLowerCase())) {
              score += 160; // Direct semantic keyword trigger
              break;
            }
          }
        }
      }

      // 1. HIGHEST PRIORITY: Sticker name/text directly echoes the incoming message
      // E.g. message "kya baat hai" matches sticker named "Kya Baat Hai Jetha"
      // E.g. message "dukh" matches sticker "Dukh. Dard. Peeda."
      if (msgLower.length > 2) {
        // Check if the sticker name contains a substantial chunk of the message
        const nameClean = (sticker.name || '').toLowerCase().replace(/[^\w\s\u0900-\u097F]/g, ' ').trim();
        const msgClean = msgLower.replace(/[^\w\s\u0900-\u097F]/g, ' ').trim();
        
        // Full message substring match in sticker name (strongest signal)
        if (nameClean.length > 3 && msgClean.length > 3) {
          if (nameClean.includes(msgClean) || msgClean.includes(nameClean)) {
            score += 200; // Extremely high for direct text match
          }
        }
        
        // Check each significant word of the message against sticker name
        const msgWords = msgClean.split(/\s+/).filter(w => w.length >= 3);
        let nameMatchCount = 0;
        for (const word of msgWords) {
          if (nameClean.includes(word)) {
            nameMatchCount++;
            score += 50; // Very high for word-level match on sticker text
          }
        }
        // Bonus for multiple word matches (sticker text closely mirrors message)
        if (nameMatchCount >= 2) score += nameMatchCount * 30;
      }

      // 2. Match against intent target tags
      if (rule && rule.targetTags) {
        for (const tag of rule.targetTags) {
          if (stickerText.includes(tag.toLowerCase())) {
            score += 15;
          }
        }
      }

      // 3. Match against preferred sticker words
      if (rule && rule.preferredStickerWords) {
        for (const pw of rule.preferredStickerWords) {
          if (stickerText.includes(pw.toLowerCase())) {
            score += 25;
          }
        }
      }

      // 4. Direct token overlap between incoming message and sticker tags/name
      if (Array.isArray(textTokens)) {
        for (const token of textTokens) {
          if (token.length > 2 && stickerText.includes(token)) {
            score += 30;
          }
        }
      }

      return score;
    },

    /**
     * Get top sticker recommendations for an incoming chat message
     * 
     * @param {string} msgText Incoming text message from friend
     * @param {Array} userPacks Currently loaded packs
     * @param {number} limit Max recommendations to return (default: 5)
     * @returns {Object} { intentId, intentLabel, originalText, stickers: Array }
     */
    getRecommendations(msgText, userPacks = [], limit = 5) {
      if (!msgText || typeof msgText !== 'string' || msgText.trim().length === 0) {
        return null;
      }

      const intentData = this.detectIntent(msgText);
      const allCandidates = this.gatherCandidateStickers(userPacks);
      if (allCandidates.length === 0) return null;

      // Tokenize incoming text (words with 3+ characters)
      const tokens = msgText
        .toLowerCase()
        .replace(/[^\w\s\u0900-\u097F]/g, ' ')
        .split(/\s+/)
        .filter(t => t.length >= 3);

      const rule = intentData ? intentData.rule : null;

      // Score all candidates
      const scored = allCandidates.map(stk => ({
        sticker: stk,
        score: this.scoreSticker(stk, rule, tokens, msgText)
      }));

      // Sort by score descending
      scored.sort((a, b) => b.score - a.score);

      // Filter candidates with positive scores
      let topList = scored.filter(item => item.score > 0).map(item => item.sticker);

      // Fallback: If no specific score matched, pick popular all-rounder reaction stickers
      if (topList.length === 0) {
        const universalReactionWords = ['kya baat', 'akal', 'chlega', 'soch', 'sahi pakde', 'kem palty', 'dukh', 'babita'];
        const curated = allCandidates.filter(s =>
          universalReactionWords.some(rw => (s.name + ' ' + (s.tags || '')).toLowerCase().includes(rw))
        );
        topList = curated.length >= limit ? curated.slice(0, limit) : allCandidates.slice(0, limit);
      }

      // Trim to limit
      topList = topList.slice(0, limit);

      return {
        intentId: rule ? rule.id : 'reactions',
        intentLabel: rule ? rule.label : 'Quick Reactions',
        originalText: msgText.trim(),
        stickers: topList
      };
    }
  };

  // Browser window export
  if (typeof window !== 'undefined') {
    window.WSH_SmartReply = WSH_SmartReply;
  }

  // Node.js export for unit tests
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { WSH_SmartReply, INTENT_RULES };
  }
})();
