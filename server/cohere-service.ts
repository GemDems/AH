import { CohereClient } from "cohere-ai";
import type { AffiliateLink } from "@shared/schema";

let cohere: CohereClient | null = null;

function getCohere(): CohereClient {
  if (!process.env.COHERE_API_KEY) {
    throw new Error("COHERE_API_KEY not set");
  }
  if (!cohere) {
    cohere = new CohereClient({ token: process.env.COHERE_API_KEY });
  }
  return cohere;
}

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ProductAnalysisResult {
  recommendedProduct?: AffiliateLink;
  response: string;
  confidence: number;
}

function buildProductCatalog(products: AffiliateLink[]): string {
  if (!products.length) return "No products available right now.";
  return products.map((p, i) => {
    const stock = (p.stock ?? 0) > 0 ? `⚡ ${p.stock} left` : "✅ In stock";
    const verified = p.isVerified ? " ✔️ Verified" : "";
    const elite = p.isElitePick ? " 🧠 Elite Pick" : "";
    const privateData = p.aiPrivateInfo ? `\n  🔒 PRIVATE INTEL: ${p.aiPrivateInfo}` : "";
    return `[${i + 1}] ${p.title}${verified}${elite}
  💰 $${p.price || "?"} | 📦 ${stock} | 🏷️ ${p.category || "General"}
  📝 ${p.description || "No description"}${privateData}
  🔗 ${p.url}`;
  }).join("\n\n");
}

// ============================================================
// TYPO TOLERANCE — simple Levenshtein for fuzzy matching
// ============================================================
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  );
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1]
        : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);
  return dp[m][n];
}

function fuzzyIncludes(haystack: string, needle: string): boolean {
  if (needle.length < 4) return haystack.includes(needle);
  if (haystack.includes(needle)) return true;
  // Check each word in haystack for close edit distance
  const words = haystack.split(/\s+/);
  const maxDist = needle.length <= 5 ? 1 : 2;
  return words.some(w => Math.abs(w.length - needle.length) <= maxDist && levenshtein(w, needle) <= maxDist);
}

// ============================================================
// CONCEPT EXPANSION — semantic synonyms for natural language
// ============================================================
const CONCEPT_MAP: Record<string, string[]> = {
  // Children / family
  kids: ["toy", "child", "children", "toddler", "baby", "play", "game", "junior"],
  kid: ["toy", "child", "children", "toddler", "play", "game"],
  children: ["toy", "kids", "child", "toddler", "baby", "play"],
  child: ["toy", "kids", "children", "toddler", "play"],
  baby: ["toy", "infant", "toddler", "kids", "child"],
  boy: ["toy", "kids", "game", "play"],
  girl: ["toy", "kids", "game", "play", "doll"],
  // Shopping intent (explicit)
  gift: ["toy", "present", "birthday"],
  present: ["gift", "toy", "birthday"],
  birthday: ["gift", "toy", "present"],
  // Home
  home: ["furniture", "decor", "kitchen", "appliance", "cleaning"],
  house: ["furniture", "decor", "kitchen", "appliance"],
  kitchen: ["food", "cooking", "appliance"],
  cook: ["kitchen", "food", "appliance", "cooking"],
  // Fitness
  gym: ["fitness", "workout", "exercise", "sport", "health"],
  workout: ["fitness", "gym", "exercise", "sport", "health"],
  exercise: ["fitness", "gym", "workout", "sport", "health"],
  sport: ["fitness", "workout", "exercise", "athletic"],
  // Tech
  tech: ["electronic", "gadget", "device", "smart", "digital"],
  gadget: ["tech", "electronic", "device", "smart"],
  phone: ["mobile", "smartphone", "electronic", "device"],
  // Price / deals (explicit shopping signals)
  cheap: ["deal", "affordable", "discount", "budget", "sale"],
  affordable: ["cheap", "deal", "discount", "budget"],
  deal: ["sale", "discount", "cheap", "affordable"],
  // Explicit recommendation requests
  popular: ["best", "top", "trending"],
  trending: ["popular", "hot", "best"],
  recommend: ["best", "top", "popular"],
};

function expandUserWords(words: string[]): string[] {
  const expanded = new Set(words);
  for (const word of words) {
    const synonyms = CONCEPT_MAP[word] || [];
    for (const syn of synonyms) expanded.add(syn);
  }
  return Array.from(expanded);
}

// ============================================================
// BUILT-IN FALLBACK — runs when Cohere is unavailable/out of credits
// ============================================================
function scoreProduct(userMessage: string, product: AffiliateLink): number {
  const userLower = userMessage.toLowerCase();
  const rawWords = userLower.split(/\s+/).filter(w => w.length > 2);
  const userWords = expandUserWords(rawWords);
  let score = 0;

  const privateInfo = (product.aiPrivateInfo || "").toLowerCase();
  const title = product.title.toLowerCase();
  const desc = (product.description || "").toLowerCase();
  const cat = (product.category || "").toLowerCase();
  const productText = `${title} ${desc} ${cat} ${privateInfo}`;

  for (const word of rawWords) {
    // Private info (highest priority) with fuzzy match
    if (privateInfo && fuzzyIncludes(privateInfo, word)) score += 10;
    // Title with fuzzy match
    if (fuzzyIncludes(title, word)) score += 7;
    // Desc/category with fuzzy match
    else if (fuzzyIncludes(desc, word)) score += 4;
    else if (fuzzyIncludes(cat, word)) score += 3;
  }

  // Bonus for multi-word private info match
  if (privateInfo) {
    const matching = rawWords.filter(w => fuzzyIncludes(privateInfo, w));
    if (matching.length >= 2) score += 20;
    else if (matching.length === 1 && matching[0].length > 3) score += 5;
  }

  // Concept expansion scoring (lower weight — semantic bonus)
  const expandedOnly = expandUserWords(rawWords).filter(w => !rawWords.includes(w));
  for (const expanded of expandedOnly) {
    if (fuzzyIncludes(productText, expanded)) score += 3;
  }

  if (score >= 3) {
    if (product.isElitePick) score += 2;
    if (product.isVerified) score += 1;
  }
  return score;
}

function generateBuiltInResponse(
  userMessage: string,
  products: AffiliateLink[]
): ProductAnalysisResult {
  const lower = userMessage.toLowerCase().trim();

  // Non-shopping topics — site features the AI should NEVER turn into product pitches
  const siteTopics = [
    "leaderboard", "vip", "referral", "invite", "invites", "code", "bonus code",
    "rank", "ranking", "points", "progress", "savings", "how do i get vip",
    "how do i qualify", "username", "profile", "my account", "my code",
    "used count", "score", "status", "tier", "earn", "reward"
  ];
  const isSiteTopic = siteTopics.some(t => lower.includes(t));
  if (isSiteTopic) {
    const siteResponses = [
      "that's a site feature question — i'm the deal-finder here 😄 for VIP/leaderboard stuff, check the section at the bottom of the page!",
      "i'm mostly the shopping expert here 🛍️ for leaderboard or VIP questions, scroll down to the VIP section on the page!",
      "great question but that's above my pay grade 😂 i handle deals — for referrals/VIP, check the bottom of the page!"
    ];
    return { response: siteResponses[Math.floor(Math.random() * siteResponses.length)], confidence: 0.4 };
  }

  // Greetings
  const greetings = ["hey", "hi", "hello", "sup", "yo", "hiya", "what's up", "whats up", "howdy", "helo", "heya"];
  if (greetings.some(g => lower === g || lower.startsWith(g + " ") || lower.startsWith(g + "!"))) {
    const responses = [
      "hey!! 👋 what you looking for today? i got some 🔥 deals locked and loaded",
      "yo!! 🤙 what's good? ready to find you something 🔥 — what you need?",
      "heyyy 👋 welcome to Elite Deals Hub! i'm Zane, your deal expert — what can i get for you today?",
      "what's up!! 🔥 you came to the right place — drop what you're looking for and i got you 👇"
    ];
    return { response: responses[Math.floor(Math.random() * responses.length)], confidence: 0.5 };
  }

  // Thanks / bye
  if (["thanks", "thank you", "thx", "ty", "bye", "later", "goodbye", "cya"].some(w => lower.includes(w))) {
    const responses = [
      "of course!! come back anytime 🙌 deals are always fresh here",
      "anytime!! 🔥 you know where to find me when you need the next deal 😉",
      "lateeer! 👋 deals are still here when you're ready 😉"
    ];
    return { response: responses[Math.floor(Math.random() * responses.length)], confidence: 0.5 };
  }

  // Product search — find best match
  if (products.length > 0) {
    let bestMatch: AffiliateLink | undefined;
    let bestScore = 0;
    for (const product of products) {
      const s = scoreProduct(userMessage, product);
      if (s > bestScore) { bestMatch = product; bestScore = s; }
    }

    // Detect general browsing / recommendation intent — ONLY clear shopping phrases
    const browseIntent = [
      "recommend", "what do you have", "show me deals", "what's good to buy",
      "what's hot right now", "best deal", "top deal", "most popular deal",
      "surprise me", "what's new in stock", "hot right now",
      "what you got for sale", "give me a deal", "what's trending to buy",
      "got any deals", "show me something to buy", "what should i buy",
      "what's your best product", "what's popular right now"
    ];
    const isGeneralBrowse = browseIntent.some(phrase => lower.includes(phrase));

    if (bestMatch && bestScore >= 15) {
      const price = bestMatch.price ? `$${bestMatch.price}` : "great price";
      const verified = bestMatch.isVerified ? " ✔️ verified" : "";
      const elite = bestMatch.isElitePick ? " 🧠 Elite Pick" : "";
      const intros = [
        `oh we ACTUALLY have exactly that 👀 →`,
        `bro we got this one and it's 🔥 →`,
        `say less — found it 👇`,
        `you're in luck fr fr →`,
        `okay okay i see you, check this out 👀 →`
      ];
      const intro = intros[Math.floor(Math.random() * intros.length)];
      const stock = (bestMatch.stock ?? 0) > 0 ? ` ⚡ only ${bestMatch.stock} left` : "";
      const response = `${intro} [${bestMatch.title}](${bestMatch.url})${verified}${elite} — ${price}${stock} 🔥`;
      return { recommendedProduct: bestMatch, response, confidence: Math.min(0.95, 0.55 + bestScore * 0.04) };
    }

    // General browse intent — push the best product we have (elite pick first, then verified, then any)
    if (isGeneralBrowse) {
      const top = products.find(p => p.isElitePick) || products.find(p => p.isVerified) || products[0];
      const price = top.price ? `$${top.price}` : "great price";
      const stock = (top.stock ?? 0) > 0 ? ` ⚡ only ${top.stock} left` : "";
      const elite = top.isElitePick ? " 🧠 Elite Pick" : "";
      const browseIntros = [
        `okay our hottest one rn is this 👇`,
        `people are grabbing this one like crazy rn →`,
        `if i had to pick one for you right now, it's this 🔥`,
        `this one's been moving fast — check it out 👀`,
        `ngl this is the move rn →`
      ];
      const intro = browseIntros[Math.floor(Math.random() * browseIntros.length)];
      const response = `${intro} [${top.title}](${top.url})${elite} — ${price}${stock} 🔥 want me to find something more specific?`;
      return { recommendedProduct: top, response, confidence: 0.75 };
    }

    // No shopping intent detected — just chat naturally
    const noMatchResponses = [
      "that's a good one! 🤔 let me know if you're looking for any deals and i'll hook you up 🔥",
      "haha love the energy 😄 drop me what you're shopping for and i'll find you something 🔥",
      "real talk i gotchu — what are you actually looking for today? 👀"
    ];
    return {
      response: noMatchResponses[Math.floor(Math.random() * noMatchResponses.length)],
      confidence: 0.3
    };
  }

  // General fallback
  const generalResponses = [
    "that's a good one! 🤔 btw we drop new deals daily — keep checking back for the best finds 🔥",
    "love the energy!! 😂 and hey — we got some 🔥 deals rn if you're ever looking 👇",
    "real talk i got you on that 👀 also check out the deals on this page — people are grabbing them fast ⚡"
  ];
  return { response: generalResponses[Math.floor(Math.random() * generalResponses.length)], confidence: 0.3 };
}

// ============================================================
// MAIN EXPORT
// ============================================================
export async function generateAIChatResponse(
  userMessage: string,
  conversationHistory: ChatMessage[],
  availableProducts: AffiliateLink[]
): Promise<ProductAnalysisResult> {
  // Try Cohere first
  if (process.env.COHERE_API_KEY) {
    try {
      const client = getCohere();
      const catalog = buildProductCatalog(availableProducts);

      const systemPrompt = `You are Zero Doubt Zane — Elite Deals Hub's hype deal expert. Snappy, emoji-rich, fun. 2-3 sentences max. Match user energy.${availableProducts.length === 0 ? ' NO products in catalog — never invent or link anything, just say deals are coming soon.' : ''}

RULES:
• Only recommend products from the CATALOG below. Never name external brands.
• Only recommend a product if the user's message is GENUINELY related to it. Do NOT force-fit unrelated queries.
  - "what do kids enjoy?" + catalog has a toy → recommend the toy ✅
  - "what's the weather like?" → do NOT recommend anything, just chat naturally ✅
  - "tell me a joke" → do NOT recommend anything, just reply naturally ✅
  - "what's popular?" → recommend the best catalog item ✅
• SITE FEATURE QUESTIONS — if the user asks about VIP status, leaderboard, referral codes, invite codes, rankings, points, savings tracker, or any other site feature: reply naturally explaining you're the deal-finder and direct them to the relevant section on the page. NEVER push a product in response to these.
  - "how do I get VIP?" → explain you handle deals, point them to the VIP section ✅
  - "what's my leaderboard rank?" → explain you handle deals, point them to the leaderboard ✅
  - "how do referral codes work?" → explain you handle deals, refer them to the VIP section ✅
• If the user's message is small talk, random chat, or clearly unrelated to shopping — reply naturally without pushing any product.
• Links MUST use exact catalog URLs. Format: [Name](URL). Never paste raw URLs.
• PRIVATE INTEL field = top priority for matching — read it carefully.
• Users OFTEN misspell — interpret charitably. "tyo" = toy, "chlid" = child, "expnsive" = expensive, etc.
• Only say "not in stock" if the user asked about something shopping-related and NOTHING in the catalog matches.

CATALOG:
${catalog}`;

      const chatHistory = conversationHistory.slice(-4).map(msg => ({
        role: msg.role === 'user' ? 'USER' as const : 'CHATBOT' as const,
        message: msg.content
      }));

      const cohereCall = client.chat({
        model: "command-r-08-2024",
        message: userMessage,
        preamble: systemPrompt,
        chatHistory,
        maxTokens: 180,
        temperature: 0.5,
      });

      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Cohere timeout")), 12000)
      );

      const response = await Promise.race([cohereCall, timeoutPromise]);

      let aiResponse = response.text?.trim() || "hold on something went sideways on my end 😅 try again?";

      // ── SERVER-SIDE BRAND FILTER ─────────────────────────────────────────
      // Build a set of all words that appear in the actual catalog so we can
      // detect external brand names the AI hallucinated.
      const catalogText = availableProducts.map(p =>
        `${p.title} ${p.description || ''} ${p.category || ''} ${p.aiPrivateInfo || ''}`
      ).join(' ').toLowerCase();

      const externalBrands = [
        'samsung', 'apple', 'iphone', 'ipad', 'macbook', 'airpods',
        'sony', 'lg', 'google', 'pixel', 'android', 'oneplus',
        'nokia', 'motorola', 'huawei', 'xiaomi', 'oppo', 'vivo',
        'nike', 'adidas', 'puma', 'reebok', 'under armour',
        'dyson', 'bose', 'jbl', 'beats', 'sennheiser', 'logitech',
        'microsoft', 'xbox', 'playstation', 'nintendo', 'amazon',
        'fitbit', 'garmin', 'gopro', 'canon', 'nikon', 'lenovo',
        'dell', 'hp ', 'asus', 'acer', 'razer', 'corsair'
      ];

      const responseLower = aiResponse.toLowerCase();
      const hallucinated = externalBrands.filter(brand =>
        responseLower.includes(brand) && !catalogText.includes(brand)
      );

      if (hallucinated.length > 0) {
        console.warn('🚨 Brand filter triggered — AI mentioned external brands:', hallucinated);
        // Replace the hallucinated response with a safe catalog-only reply — never link a product
        aiResponse = `that specific brand/item isn't in our catalog rn 😅 we only carry what's listed here — keep checking back, new deals drop regularly! 🔄`;
      }
      // ────────────────────────────────────────────────────────────────────

      // ── FINAL URL SANITIZER ─────────────────────────────────────────────
      // Strip any URL from the AI response that is NOT in the catalog.
      // This prevents hallucinated/example.com links from leaking through.
      const catalogUrls = new Set(availableProducts.map(p => p.url.toLowerCase().trim()));
      aiResponse = aiResponse.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (match, text, url) => {
        const urlKey = url.toLowerCase().trim();
        if (catalogUrls.has(urlKey)) return match; // Allowed
        console.warn('🚫 URL sanitizer removed hallucinated link:', url);
        return text; // Keep the text, drop the link
      });
      aiResponse = aiResponse.replace(/(?<!\()https?:\/\/[^\s)>\]"]+/g, (url) => {
        if (catalogUrls.has(url.toLowerCase().trim())) return url;
        console.warn('🚫 URL sanitizer removed bare hallucinated URL:', url);
        return '';
      });
      // ────────────────────────────────────────────────────────────────────

      let recommendedProduct: AffiliateLink | undefined;
      let confidence = 0.5;

      for (const product of availableProducts) {
        if (aiResponse.toLowerCase().includes(product.title.toLowerCase())) {
          recommendedProduct = product;
          confidence = 0.85;
          break;
        }
      }

      if (!recommendedProduct && availableProducts.length > 0) {
        let bestMatch: AffiliateLink | undefined;
        let bestScore = 0;

        for (const product of availableProducts) {
          const s = scoreProduct(userMessage, product);
          if (s > bestScore && s >= 5) { bestScore = s; bestMatch = product; }
        }

        if (bestMatch) {
          recommendedProduct = bestMatch;
          confidence = Math.min(0.95, 0.55 + bestScore * 0.04);
        }
      }

      return { recommendedProduct, response: aiResponse, confidence };

    } catch (error) {
      console.error('Cohere unavailable, switching to built-in system:', (error as Error).message);
      // Fall through to built-in system
    }
  }

  // Built-in fallback (runs when Cohere key missing OR Cohere fails/out of credits)
  return generateBuiltInResponse(userMessage, availableProducts);
}

export async function enhanceProductDescription(product: AffiliateLink): Promise<string> {
  if (!process.env.COHERE_API_KEY) {
    return product.description || 'Quality product with great value.';
  }

  try {
    const client = getCohere();
    const prompt = `Enhance this product description to be more compelling and sales-focused while maintaining accuracy:

Product: ${product.title}
Current Description: ${product.description || 'No description provided'}
Category: ${product.category || 'General'}
Price: $${product.price || 'Not specified'}
${product.aiPrivateInfo ? `Private Intel: ${product.aiPrivateInfo}` : ''}

Create a compelling, benefit-focused description. Keep it concise (1-2 sentences).

Enhanced Description:`;

    const response = await client.generate({
      model: "command-r-plus-08-2024",
      prompt: prompt,
      maxTokens: 150,
      temperature: 0.7,
      k: 0,
      returnLikelihoods: "NONE"
    });

    return response.generations[0]?.text?.trim() || product.description || 'Great product at an excellent price.';

  } catch (error) {
    console.error('Cohere Enhancement Error:', error);
    return product.description || 'Quality product with great value.';
  }
}
