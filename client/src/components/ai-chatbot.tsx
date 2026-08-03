import { useState, useRef, useEffect } from "react";
import { MessageCircle, Phone, X, RotateCcw, MousePointer, Move } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { AffiliateLink } from "@shared/schema";
import AnimatedMessage from "./animated-message";
import { ProductHighlightCard } from "./ui/product-highlight-card";
import { LoadingBreadcrumb } from "./ui/loading-breadcrumb";
import { AgentThinkingBadge, PALETTES } from "./ui/grok-agent-thinking-indicator";
import SendButton from "./ui/send-button";
import { Admonition } from "./ui/admonition";

interface Message {
  id: string;
  content: string;
  isBot: boolean;
  timestamp: Date;
  recommendedProduct?: AffiliateLink;
}

interface ChatPosition {
  x: number;
  y: number;
}

export default function AIChatbot() {
  // Function to format message links - converts raw URLs to clean clickable links
  const formatMessageLinks = (content: string): string => {
    // Step 1: convert markdown links [text](url) → HTML, preserving exact URL
    let result = content.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, (_, linkText, url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; font-weight: bold; text-decoration: underline;">${linkText} →</a>`;
    });

    // Step 2: convert any remaining bare raw URLs (not already inside an <a> tag)
    result = result.replace(/(?<!href=")(https?:\/\/[^\s<"]+)/g, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; font-weight: bold; text-decoration: underline;">Get This Deal →</a>`;
    });

    return result;
  };

  // Get or create a stable per-device ID (shared with referral system key)
  const getOrCreateDeviceId = (): string => {
    const existing = localStorage.getItem('elite_device_id') || localStorage.getItem('deviceId');
    if (existing) return existing;
    const newId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('elite_device_id', newId);
    return newId;
  };

  // Generate unique session ID for this tab
  const [sessionId] = useState(() => {
    const deviceId = getOrCreateDeviceId();
    const tabId = Math.random().toString(36).substr(2, 9);
    return `${deviceId}-${tabId}`;
  });

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(() => {
    // Load saved messages from localStorage or use default
    const savedMessages = localStorage.getItem(`chatMessages-${sessionId}`);
    if (savedMessages) {
      try {
        return JSON.parse(savedMessages).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
      } catch {
        // If parsing fails, use default
        return [
          {
            id: '1',
            content: "Hi! What specific product are you looking for?",
            isBot: true,
            timestamp: new Date()
          }
        ];
      }
    }
    return [
      {
        id: '1',
        content: "Hi! What specific product are you looking for?",
        isBot: true,
        timestamp: new Date()
      }
    ];
  });
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [position, setPosition] = useState<ChatPosition>({ x: window.innerWidth - 420, y: window.innerHeight - 500 });
  const [size, setSize] = useState({ width: 380, height: 480 });
  const [isDraggingWindow, setIsDraggingWindow] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [resizeDirection, setResizeDirection] = useState('');
  
  // Chat button visibility states
  const [showChatButton, setShowChatButton] = useState(true);
  const [isButtonFading, setIsButtonFading] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isSlideUp, setIsSlideUp] = useState(false);
  const [isAnimationPaused, setIsAnimationPaused] = useState(false);
  const [showControlButton, setShowControlButton] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [fadeTimer, setFadeTimer] = useState<NodeJS.Timeout | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [searchProducts, setSearchProducts] = useState<string[]>([]);
  const [conversationHistory, setConversationHistory] = useState<Array<{role: 'user' | 'assistant', content: string}>>([]);
  const [userIntent, setUserIntent] = useState<{category?: string, budget?: string, features?: string[], confirmed?: boolean}>({});
  const [chatOpenCount, setChatOpenCount] = useState(0);
  const [showResetTooltip, setShowResetTooltip] = useState(false);
  const [tooltipDismissed, setTooltipDismissed] = useState(() => {
    return localStorage.getItem(`resetTooltipDismissed-${sessionId}`) === 'true';
  });
  const [isHoveringReset, setIsHoveringReset] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isButtonGlowing, setIsButtonGlowing] = useState(false);
  const [glowTimer, setGlowTimer] = useState<NodeJS.Timeout | null>(null);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [foundProduct, setFoundProduct] = useState<AffiliateLink | null>(null);
  const [showPitchButton, setShowPitchButton] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [showNewMessagePopup, setShowNewMessagePopup] = useState(false);
  const [pitchClickCount, setPitchClickCount] = useState(0);
  const [showCancelButton, setShowCancelButton] = useState(false);
  const [showAgentBadge, setShowAgentBadge] = useState(false);
  const [isPitchPending, setIsPitchPending] = useState(false); // separate from isTyping
  const pitchTimeoutRef = useRef<NodeJS.Timeout | null>(null); // ref = always current in closures
  const [pitchTimeout, setPitchTimeout] = useState<NodeJS.Timeout | null>(null);
  // Pitch rate-limit state (persisted in localStorage)
  const [pitchWindowCount, setPitchWindowCount] = useState(0);
  const [pitchWindowResetAt, setPitchWindowResetAt] = useState<number>(0);
  const [pitchDailyCount, setPitchDailyCount] = useState(0);
  const [pitchDayResetAt, setPitchDayResetAt] = useState<number>(0);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [countdownInterval, setCountdownInterval] = useState<NodeJS.Timeout | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartY, setDragStartY] = useState(0);
  const [shouldGlowRestoreButton, setShouldGlowRestoreButton] = useState(false);
  const [isHoveringRestoreButton, setIsHoveringRestoreButton] = useState(false);
  const [hoverTimer, setHoverTimer] = useState<NodeJS.Timeout | null>(null);

  // ── Spam protection ─────────────────────────────────────────────────────────
  const activeGenerations   = useRef(0);            // in-flight AI calls (max 2)
  const spamStrikes         = useRef(0);            // escalation counter
  const lastMessageTime     = useRef(0);            // ms timestamp of last send
  const lastMessageContent  = useRef("");           // duplicate detection
  const sendLockedUntil     = useRef(0);            // kept for compat, unused
  const [spamBlockedUntil, setSpamBlockedUntil] = useState<number | null>(null);
  const [cooldownSecsLeft,  setCooldownSecsLeft]  = useState(0);
  const [spamWarning,       setSpamWarning]       = useState<{ type: "warning" | "danger"; title: string; msg: string } | null>(null);
  const [pitchLimitNotif,   setPitchLimitNotif]   = useState<string | null>(null);
  const pitchLimitTimerRef  = useRef<NodeJS.Timeout | null>(null);
  const [hardBlockedUntil,  setHardBlockedUntil]  = useState<number | null>(() => {
    // Clear any old keys from previous versions
    localStorage.removeItem("chat_hard_block_until");
    localStorage.removeItem("chat_hard_block_v2");
    const stored = parseInt(localStorage.getItem("chat_hard_block_v3") || "0", 10);
    return stored > Date.now() ? stored : null;
  });

  // Synchronous helper — writes localStorage immediately (no async React state lag)
  const setHardBlock = (until: number | null) => {
    if (until && until > Date.now()) {
      localStorage.setItem("chat_hard_block_v3", String(until));
    } else {
      localStorage.removeItem("chat_hard_block_v3");
    }
    setHardBlockedUntil(until);
  };

  // Helper to check block status directly from localStorage (avoids stale closure issues)
  const isChatHardBlocked = (): boolean => {
    const stored = parseInt(localStorage.getItem("chat_hard_block_v3") || "0", 10);
    return stored > Date.now();
  };

  // ── Daily message cap (50/day) ───────────────────────────────────────────────
  const DAILY_MSG_LIMIT = 50;
  const getDailyMsgState = () => {
    const count = parseInt(localStorage.getItem("chat_daily_msg_count") || "0", 10);
    const resetAt = parseInt(localStorage.getItem("chat_daily_msg_reset_at") || "0", 10);
    const now = Date.now();
    if (now >= resetAt) {
      // New day — reset
      localStorage.setItem("chat_daily_msg_count", "0");
      localStorage.setItem("chat_daily_msg_reset_at", String(now + 24 * 60 * 60 * 1000));
      return { count: 0 };
    }
    return { count, resetAt };
  };
  const incrementDailyMsg = () => {
    const { count } = getDailyMsgState();
    localStorage.setItem("chat_daily_msg_count", String(count + 1));
  };
  // ────────────────────────────────────────────────────────────────────────────

  const chatRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  
  // Fetch real affiliate links data
  const { data: affiliateLinks = [] } = useQuery<AffiliateLink[]>({
    queryKey: ["/api/affiliate-links"],
  });

  // Re-attach recommendedProduct objects after restore (we only persist the ID)
  const messagesWithProducts = messages.map(msg => {
    if (msg.recommendedProduct) return msg; // already attached (current session)
    const pid = (msg as any)._productId;
    if (!pid) return msg;
    const found = (affiliateLinks as AffiliateLink[]).find(l => l.id === pid);
    return found ? { ...msg, recommendedProduct: found } : msg;
  });

  // Dynamic response generator based on user query
  const generateDynamicResponse = (userMessage: string, context: any) => {
    const lowerMessage = userMessage.toLowerCase();
    
    // Casual greetings — match the energy
    if (lowerMessage.match(/^(hey|hi|hello|yo|sup|what'?s? ?up|what'?s? ?good|hiya|howdy|heya|wassup|heyy|hiii|ello|ayo)\b/)) {
      const greets = [
        "hey! 👋 what are you looking for today?",
        "hey hey! looking for anything specific or just browsing?",
        "yo! what can i help you find?",
        "hi! what deals are you hunting for?"
      ];
      return greets[Math.floor(Math.random() * greets.length)];
    }

    if (lowerMessage.match(/how are you|how'?s? it going|how'?s? everything|you good|you okay/)) {
      return "doing great, thanks for asking 😄 what are you shopping for today?";
    }

    if (lowerMessage.includes('help') || lowerMessage.includes('what can you do') || lowerMessage.includes('what do you do')) {
      return `i'm Zane — i help you find the best deals on here. just tell me what you're looking for and i'll point you right to it 🎯`;
    }
    
    if (lowerMessage.match(/\bthanks?\b|thank you|ty\b|appreciate/)) {
      const replies = ["of course! 😊", "anytime!", "happy to help!", "no problem at all!"];
      return replies[Math.floor(Math.random() * replies.length)];
    }
    
    if (lowerMessage.match(/\b(bye|goodbye|see ya|later|peace|gotta go|ttyl|cya)\b/)) {
      return "see ya! come back anytime 👋";
    }

    if (lowerMessage.match(/\b(lol|lmao|haha|hehe|😂|💀|😭)\b/)) {
      return "lol right? 😄 anyway — anything i can help you find?";
    }

    if (lowerMessage.match(/\b(cool|nice|awesome|sick|fire|lit|dope|ok|okay|got it|sounds good)\b/) && lowerMessage.length < 20) {
      return "😎 let me know if you need anything!";
    }
    
    // Default response for unrecognized queries
    return `hmm, not sure i caught that — what are you looking for? i can help you find deals on pretty much anything we've got 🔍`;
  };

  const analyzeUserIntent = (message: string, currentIntent: any) => {
    const lowerMessage = message.toLowerCase();
    const newIntent = { ...currentIntent };
    
    // Extract category information
    const categories = ['electronics', 'fashion', 'home', 'garden', 'sports', 'books', 'beauty', 'automotive', 'toys', 'health', 'kitchen', 'tech'];
    categories.forEach(cat => {
      if (lowerMessage.includes(cat)) {
        newIntent.category = cat;
      }
    });
    
    // Extract quality and features only (no budget questions)
    const features = [];
    if (lowerMessage.includes('wireless') || lowerMessage.includes('bluetooth')) features.push('wireless');
    if (lowerMessage.includes('waterproof') || lowerMessage.includes('water resistant')) features.push('waterproof');
    if (lowerMessage.includes('fast') || lowerMessage.includes('quick') || lowerMessage.includes('speed')) features.push('fast');
    if (lowerMessage.includes('portable') || lowerMessage.includes('travel') || lowerMessage.includes('compact')) features.push('portable');
    if (lowerMessage.includes('durable') || lowerMessage.includes('strong') || lowerMessage.includes('reliable')) features.push('durable');
    if (lowerMessage.includes('premium') || lowerMessage.includes('high-quality') || lowerMessage.includes('quality')) features.push('premium quality');
    if (lowerMessage.includes('rechargeable') || lowerMessage.includes('battery')) features.push('rechargeable');
    if (lowerMessage.includes('smart') || lowerMessage.includes('intelligent')) features.push('smart');
    
    if (features.length > 0) {
      newIntent.features = [...(newIntent.features || []), ...features];
    }
    
    // Check for confirmation to search creator dashboard
    if (lowerMessage.includes('yes') || lowerMessage.includes('confirm') || lowerMessage.includes('search') || lowerMessage.includes('find') || lowerMessage.includes('show me') || lowerMessage.includes('go ahead')) {
      newIntent.confirmed = true;
    }
    
    return newIntent;
  };

  const generateContextualResponse = (userMessage: string, history: Array<{role: 'user' | 'assistant', content: string}>, intent?: any): string => {
    const lowerQuery = userMessage.toLowerCase();
    
    // Check if products are available
    if (!affiliateLinks || affiliateLinks.length === 0) {
      return "I don't see any products available in the creator dashboard right now. Please check back when new deals have been added!";
    }

    // Helper: only recommend a product if it has real engagement (clicks > 0, elite, or verified)
    const isReadyToRecommend = (p: any) =>
      (p.clicks && p.clicks > 0) || p.isElitePick === 1 || p.isVerified === 1;

    // === PURE GENERIC QUESTIONS - SEPARATED FROM PRODUCT BROWSING ===
    if (lowerQuery.includes('popular') || lowerQuery.includes('trending') || lowerQuery.includes('hot') || 
        (lowerQuery.includes('what') && lowerQuery.includes('popular'))) {
      // Only show products that have actual clicks or elite/verified status
      const realProducts = affiliateLinks.filter(isReadyToRecommend)
        .sort((a, b) => (b.clicks || 0) - (a.clicks || 0));
      
      if (realProducts.length > 0) {
        const topPick = realProducts[0];
        const eliteBadge = topPick.isElitePick === 1 ? '🧠 **Elite Brain Pick**' : '';
        const verifiedBadge = topPick.isVerified === 1 ? '✅' : '';
        setTimeout(() => { setFoundProduct(topPick); setShowPitchButton(true); }, 100);
        const stockText = (topPick.stock ?? 0) > 0 ? `Only ${topPick.stock} left! ` : '';
        return `Stop. Feel that? That's **${topPick.title}** ${eliteBadge} ${verifiedBadge} calling your name. ${stockText}This was destined for someone exactly like you. <a href="${topPick.url}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; font-weight: bold; text-decoration: underline;">${topPick.title} →</a>`;
      } else {
        return "No deals are live right now — check back soon! New drops happen regularly 🔄";
      }
    }

    // === MORE GENERIC QUESTIONS - SEPARATED FROM PRODUCT SEARCHING ===
    if (lowerQuery.includes('what do you have') || lowerQuery.includes('what\'s available') || 
        (lowerQuery.includes('show me') && !lowerQuery.includes('specific'))) {
      const categories = [...new Set(affiliateLinks.map(p => p.category).filter(Boolean))];
      const topProduct = affiliateLinks.find(p => p.isElitePick === 1 && isReadyToRecommend(p)) ||
                         affiliateLinks.find(p => isReadyToRecommend(p));
      if (topProduct) {
        setTimeout(() => { setFoundProduct(topProduct); setShowPitchButton(true); }, 100);
        const description = topProduct.description ? ` ${topProduct.description.substring(0, 100)}` : '';
        const stockInfo = (topProduct.stock ?? 0) > 0 ? ` Only ${topProduct.stock} left!` : '';
        return `We've got some great deals live right now! Featured: **${topProduct.title}**${description}${stockInfo} <a href="${topProduct.url}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; font-weight: bold; text-decoration: underline;">${topProduct.title} →</a>`;
      } else if (categories.length > 0) {
        return `We have products in these categories: ${categories.join(', ')}. What are you looking for specifically?`;
      } else {
        return "No deals are live right now — new ones get added regularly! Check back soon 🔄";
      }
    }

    // Handle "what's best" generic questions based on Elite picks and high clicks
    if ((lowerQuery.includes('best') || lowerQuery.includes('recommend')) && 
        !lowerQuery.includes('for') && !lowerQuery.includes('need')) {
      const bestProducts = affiliateLinks.filter(isReadyToRecommend)
        .sort((a, b) => {
          if (a.isElitePick && !b.isElitePick) return -1;
          if (b.isElitePick && !a.isElitePick) return 1;
          return (b.clicks || 0) - (a.clicks || 0);
        });
      
      if (bestProducts.length > 0) {
        const topBest = bestProducts[0];
        const eliteBadge = topBest.isElitePick === 1 ? '🧠 **Elite Brain Pick**' : '';
        setTimeout(() => { setFoundProduct(topBest); setShowPitchButton(true); }, 100);
        return `**${topBest.title}** ${eliteBadge} — this one stands out right now. <a href="${topBest.url}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; font-weight: bold; text-decoration: underline;">${topBest.title} →</a>`;
      } else {
        return "No standout deals are live yet — check back soon for top picks! 🔄";
      }
    }

    // Handle "what's new" or similar
    if (lowerQuery.includes('new') || lowerQuery.includes('latest') || lowerQuery.includes('recent')) {
      const newestProducts = affiliateLinks.slice(-3);
      if (newestProducts.length > 0) {
        const newest = newestProducts[newestProducts.length - 1];
        return `The latest addition is **${newest.title}**. ${newest.description || 'Fresh inventory just added.'} 

What specific type of product are you looking for? I can show you the newest options in that category.`;
      }
    }

    // GATHER USER INFORMATION FIRST - Progressive information collection
    const userMessages = history.filter(msg => msg.role === 'user').map(msg => msg.content.toLowerCase());
    const allUserInput = userMessages.join(' ') + ' ' + lowerQuery;
    
    // Get AI's last message to understand context
    const aiMessages = history.filter(msg => msg.role === 'assistant');
    const lastAiMessage = aiMessages[aiMessages.length - 1]?.content.toLowerCase() || '';
    
    // ANALYZE USER INPUT - Look for any specific request or need
    const userWords = lowerQuery.split(' ').filter(word => word.length > 2);
    const hasSpecificRequest = userWords.length >= 2 || lowerQuery.includes('need') || lowerQuery.includes('want') || lowerQuery.includes('looking for');
    
    // Check if AI asked a question and user is responding
    const aiAskedQuestion = lastAiMessage.includes('?') || lastAiMessage.includes('what') || lastAiMessage.includes('tell me') || lastAiMessage.includes('share');
    
    // ALWAYS SEARCH PRODUCTS when user provides any specific input
    if (hasSpecificRequest && lowerQuery.trim().length > 3) {
      // DEEP ANALYSIS of ALL products - find MULTIPLE relevant matches
      let productMatches: Array<{ product: AffiliateLink; score: number; reasons: string }> = [];

      affiliateLinks.forEach(product => {
        let score = 0;
        let reasons = [];
        
        // Extract ALL product details for thorough analysis including COMPLETE AI private info
        const title = product.title?.toLowerCase() || '';
        const description = product.description?.toLowerCase() || '';
        const category = product.category?.toLowerCase() || '';
        const price = parseInt(product.price ?? '0') || 0;
        const clicks = product.clicks || 0;
        const stock = product.stock || 0;
        const isElite = product.isElitePick === 1;
        const isVerified = product.isVerified === 1;
        const aiPrivateInfo = product.aiPrivateInfo?.toLowerCase() || '';
        
        // Semantic synonym map (same as search bar)
        const chatSemanticMap: Record<string, string[]> = {
          cargo: ["large","big","spacious","storage","carry","capacity","heavy","load","outdoor","bag"],
          big: ["large","xl","oversized","wide","cargo","huge","extra"],
          large: ["big","xl","oversized","cargo","wide","huge","spacious"],
          small: ["mini","compact","portable","tiny","micro","travel","light"],
          mini: ["small","compact","portable","travel","tiny"],
          pants: ["trousers","bottoms","jeans","leggings","shorts","clothing","apparel","fashion","wear","denim"],
          jeans: ["denim","pants","trousers","bottoms","clothing","fashion"],
          shoes: ["footwear","sneakers","boots","sandals","heels","kicks","slippers"],
          shirt: ["top","tee","blouse","clothing","apparel","fashion","wear"],
          jacket: ["coat","hoodie","outerwear","clothing","fashion","vest"],
          dress: ["gown","skirt","clothing","fashion","apparel"],
          phone: ["mobile","smartphone","device","android","iphone","cellular","cell"],
          laptop: ["computer","pc","notebook","macbook","chromebook","device"],
          headphones: ["earbuds","earphones","audio","sound","music","wireless","airpods"],
          tv: ["television","screen","monitor","display","4k","smart"],
          watch: ["smartwatch","wearable","timepiece","wristband","fitness"],
          kitchen: ["cooking","chef","appliance","culinary","food","baking","utensil"],
          furniture: ["chair","table","desk","sofa","couch","bed","shelf","storage"],
          decor: ["decoration","ornament","aesthetic","design","interior","home"],
          gym: ["fitness","workout","exercise","training","sport","health"],
          outdoor: ["camping","hiking","adventure","nature","garden","trek"],
          yoga: ["fitness","wellness","meditation","stretch","exercise","mat"],
          skincare: ["moisturizer","serum","cream","lotion","beauty","face","glow"],
          makeup: ["cosmetics","beauty","lipstick","foundation","eyeshadow","blush"],
          toy: ["play","game","kids","children","fun","educational","toddler"],
          toys: ["play","game","kids","children","fun","educational","toddler"],
          game: ["toy","play","puzzle","board","entertainment","fun","gaming"],
          beauty: ["skincare","makeup","cosmetics","care","glow","cream","lotion"],
          bag: ["backpack","purse","tote","handbag","pouch","sack","cargo","carry"],
          book: ["reading","novel","guide","education","learn","literature"],
          food: ["snack","nutrition","meal","diet","cooking","eat","drink"],
        };

        // Score a single word against a text field (exact, plural/singular, fuzzy, semantic)
        const chatFieldScore = (text: string, word: string, baseWeight: number): number => {
          if (!text) return 0;
          let s = 0;
          if (text.includes(word)) { s += baseWeight; }
          else if (word.endsWith("s") && word.length > 2 && text.includes(word.slice(0, -1))) { s += baseWeight * 0.9; }
          else if (!word.endsWith("s") && text.includes(word + "s")) { s += baseWeight * 0.9; }
          else if (word.length >= 4) {
            const textWords = text.split(/\s+/);
            const fuzzy = textWords.some(w => {
              if (Math.abs(w.length - word.length) > 1) return false;
              let mismatches = 0;
              for (let i = 0; i < Math.min(w.length, word.length); i++) {
                if (w[i] !== word[i]) mismatches++;
                if (mismatches > 1) return false;
              }
              return mismatches <= 1;
            });
            if (fuzzy) s += baseWeight * 0.55;
          }
          // Semantic synonyms (additive bonus)
          const synonyms = chatSemanticMap[word] || [];
          synonyms.forEach(syn => { if (text.includes(syn)) s += 12; });
          return s;
        };

        // Score every word across all fields; use score threshold instead of strict all-must-match
        userWords.forEach(word => {
          const wordBest = Math.max(
            chatFieldScore(title,       word, 70),
            chatFieldScore(description, word, 60),
            chatFieldScore(category,    word, 45),
            chatFieldScore(aiPrivateInfo, word, 80)
          );
          score += wordBest;
          if (wordBest > 0) reasons.push(`matched "${word}"`);
        });
        
        // Semantic analysis for better understanding
        if (lowerQuery.includes('cheap') || lowerQuery.includes('affordable') || lowerQuery.includes('budget')) {
          if (price > 0 && price < 50) {
            score += 30;
            reasons.push('affordable pricing');
          }
        }
        
        if (lowerQuery.includes('best') || lowerQuery.includes('quality') || lowerQuery.includes('premium')) {
          if (isElite || isVerified || price > 50) {
            score += 35;
            reasons.push('high quality/premium');
          }
        }
        
        if (lowerQuery.includes('popular') || lowerQuery.includes('trending') || lowerQuery.includes('hot')) {
          if (isElite || clicks > 10) {
            score += 25;
            reasons.push('popular/trending');
          }
        }
        
        // Add to matches if score is meaningful (filters out very weak semantic-only hits)
        if (score >= 20) {
          productMatches.push({
            product,
            score,
            reasons: reasons.join(', ')
          });
        }
      });

      // Sort by score and get top matches
      productMatches.sort((a, b) => b.score - a.score);
      const topMatches = productMatches.slice(0, 3); // Top 3 products

      // Handle no matches found - graceful responses without random products
      if (topMatches.length === 0) {
        // Try broader keyword matching first
        let broadMatches: Array<{ product: AffiliateLink; score: number }> = [];
        
        // Enhanced similarity matching - find most related products based on keywords and context
        const userKeywords = lowerQuery.split(' ').filter(word => word.length > 2);
        
        // Create comprehensive keyword mapping for better matching
        const conceptKeywords = {
          // Tech & Electronics
          'phone': ['mobile', 'smartphone', 'device', 'gadget', 'electronics', 'tech'],
          'computer': ['laptop', 'pc', 'tech', 'device', 'electronics', 'digital'],
          'watch': ['time', 'smartwatch', 'wearable', 'tech', 'accessory'],
          'camera': ['photo', 'video', 'lens', 'tech', 'device', 'digital'],
          
          // Home & Living
          'kitchen': ['cooking', 'food', 'home', 'appliance', 'utensil'],
          'bedroom': ['sleep', 'bed', 'home', 'furniture', 'room'],
          'bathroom': ['shower', 'bath', 'home', 'hygiene', 'care'],
          'furniture': ['home', 'living', 'room', 'house', 'decor'],
          
          // Health & Wellness
          'fitness': ['exercise', 'workout', 'health', 'body', 'wellness'],
          'nutrition': ['food', 'health', 'diet', 'wellness', 'supplement'],
          'medical': ['health', 'care', 'wellness', 'body', 'treatment'],
          
          // Fashion & Style
          'clothing': ['fashion', 'wear', 'style', 'dress', 'apparel'],
          'shoes': ['footwear', 'fashion', 'style', 'wear'],
          'jewelry': ['accessory', 'fashion', 'style', 'wear'],
          
          // Outdoor & Sports
          'sports': ['fitness', 'exercise', 'outdoor', 'activity', 'game'],
          'camping': ['outdoor', 'nature', 'adventure', 'gear'],
          'garden': ['outdoor', 'plant', 'nature', 'home', 'yard'],
          
          // Beauty & Personal Care
          'skincare': ['beauty', 'face', 'care', 'cosmetic', 'health'],
          'makeup': ['beauty', 'cosmetic', 'face', 'style'],
          'hair': ['beauty', 'care', 'style', 'personal'],
          
          // Learning & Skills
          'education': ['learning', 'skill', 'knowledge', 'training', 'course'],
          'book': ['learning', 'education', 'knowledge', 'reading'],
          'tool': ['work', 'craft', 'build', 'repair', 'utility']
        };

        // Calculate similarity scores for all products
        affiliateLinks.forEach(product => {
          let similarityScore = 0;
          const productText = `${product.title} ${product.description} ${product.category} ${product.aiPrivateInfo}`.toLowerCase();
          
          // Check direct keyword matches in user query
          userKeywords.forEach(userWord => {
            if (productText.includes(userWord)) {
              similarityScore += 40; // Strong match for direct keywords
            }
            
            // Check concept-based matching
            Object.entries(conceptKeywords).forEach(([concept, relatedWords]) => {
              if (userWord.includes(concept) || concept.includes(userWord)) {
                relatedWords.forEach(relatedWord => {
                  if (productText.includes(relatedWord)) {
                    similarityScore += 25; // Good match for related concepts
                  }
                });
              }
            });
          });
          
          // Boost score for verified/elite products
          if (product.isElitePick === 1) similarityScore += 10;
          if (product.isVerified === 1) similarityScore += 5;
          
          // Only add products with VERY HIGH similarity (raised threshold to prevent random matches)
          if (similarityScore >= 85) { // VERY HIGH threshold to completely avoid weak/random matches
            broadMatches.push({ product, score: similarityScore });
          }
        });
        
        // Sort by similarity score and get best matches
        broadMatches.sort((a, b) => b.score - a.score);

        // COMPLETELY REMOVED WEAK MATCH FALLBACK - No more random products!
        // broadMatches with high threshold would be empty for most queries now

        // If no related matches either, gracefully explain and ask for alternatives
        const availableCategories = [...new Set(affiliateLinks.map(p => p.category).filter(Boolean))];
        
        const gracefulResponses = [
          `I searched thoroughly through all available products, but I don't currently have anything that matches "${lowerQuery}". That specific item isn't available in our current inventory.

The categories we do have available right now are: ${availableCategories.slice(0, 4).join(', ')}${availableCategories.length > 4 ? ', and others' : ''}. 

Is there something else you're looking for that might be in one of these categories? I'd be happy to find you the best options from what's actually available.`,

          `I understand you're looking for something related to "${lowerQuery}", but I don't see anything matching that description in our current product catalog. That particular item isn't stocked right now.

Our current inventory focuses on: ${availableCategories.slice(0, 4).join(', ')}${availableCategories.length > 4 ? ', plus more' : ''}.

What other types of products might interest you? I can check what quality options are currently available in any of these areas.`,

          `I've analyzed all available products and unfortunately don't have anything matching your request for "${lowerQuery}". The current selection doesn't include that specific item.

Available product categories: ${availableCategories.slice(0, 4).join(', ')}${availableCategories.length > 4 ? ', and additional ones' : ''}.

Would you like me to suggest the best quality products from any of these categories instead?`,

          `After checking our entire product database, I don't have what you're asking about regarding "${lowerQuery}". That type of product hasn't been added to our catalog yet.

Currently available: ${availableCategories.slice(0, 4).join(', ')}${availableCategories.length > 4 ? ', among others' : ''}.

Can I help you find something excellent in one of these available categories?`
        ];

        return gracefulResponses[Math.floor(Math.random() * gracefulResponses.length)];
      }

      // If we found matches, show them (threshold tuned to new scoring scale)
      if (topMatches.length > 0 && topMatches[0].score >= 35) {
        const bestMatch = topMatches[0];
        
        // Set found product for pitch button
        setTimeout(() => {
          setFoundProduct(bestMatch.product);
          setShowPitchButton(true);
        }, 100);

        // Use the new ChatGPT-style response for legitimate high-score matches
        return generateChatGPTStyleResponse(userMessage, bestMatch, history, allUserInput);
      }
    }
    
    // Generate unique helpful response when no specific request is detected
    const helpfulResponses = [
      `What are you looking for today? I can help you find something specific.`,
      `Tell me what you need and I'll search through our products for you.`,
      `What kind of product do you have in mind? I'll find options for you.`,
      `Share what you're shopping for and I'll look for the best matches.`,
      `What can I help you find? Just describe what you need.`,
      `Looking for anything particular? I can browse our inventory for you.`
    ];
    
    return helpfulResponses[Math.floor(Math.random() * helpfulResponses.length)];

    // Handle off-topic queries ONLY if no products available
    if (lowerQuery.includes('weather') || lowerQuery.includes('temperature') || lowerQuery.includes('forecast')) {
      return `I specialize in product deals rather than weather updates. However, if you need weather-related gear like jackets, umbrellas, or outdoor equipment, I can help you find those deals.`;
    }

    // Handle progressive information gathering with Search Now button
    if (intent && !intent.confirmed && (intent.category || intent.features?.length)) {
      const parts = [];
      if (intent.category) parts.push(`Looking for ${intent.category} products`);
      if (intent.features?.length) parts.push(`with ${intent.features.join(', ')} features`);
      
      // Add Search Now button HTML
      const searchButton = `<div style="margin-top: 12px;"><button onclick="window.triggerChatSearch && window.triggerChatSearch()" style="background: linear-gradient(45deg, #3b82f6, #1d4ed8); color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; font-weight: 500; font-size: 14px;">🔍 Search Now</button></div>`;
      
      return parts.join('. ') + '. Ready to find the perfect deals for you!' + searchButton;
    }

    // REMOVED ALL FALLBACK SYSTEMS - No more random product suggestions
    // When no matches are found, only graceful responses should be shown
    
    // REMOVED ALL GENERAL FALLBACK SYSTEMS - No more random product listings
    
    // Fallback when no products are available  
    return "The creator dashboard doesn't have any products available right now. Please check back later when new deals have been added to the system.";
  };

  // Dynamic aggressive sales psychology pitch generator - GUARANTEED UNIQUE EVERY TIME
  const generateAggressivePitch = (product: AffiliateLink, userHistory: string[]): string => {
    const userWords = userHistory.join(' ').toLowerCase();
    const personalizedTerms = [];
    
    // Extract comprehensive user psychology
    if (userWords.includes('need') || userWords.includes('want') || userWords.includes('require')) personalizedTerms.push('essential need');
    if (userWords.includes('budget') || userWords.includes('cheap') || userWords.includes('affordable') || userWords.includes('price')) personalizedTerms.push('incredible value');
    if (userWords.includes('quality') || userWords.includes('good') || userWords.includes('best') || userWords.includes('premium')) personalizedTerms.push('premium quality');
    if (userWords.includes('work') || userWords.includes('job') || userWords.includes('office') || userWords.includes('business')) personalizedTerms.push('professional edge');
    if (userWords.includes('fast') || userWords.includes('quick') || userWords.includes('urgent')) personalizedTerms.push('immediate results');
    if (userWords.includes('reliable') || userWords.includes('trust') || userWords.includes('proven')) personalizedTerms.push('guaranteed reliability');
    
    // Extract product details for deep personalization including AI private info
    const productName = product.title;
    const productDesc = product.description;
    const productCategory = product.category;
    const productPrice = product.price ? `$${product.price}` : 'an incredible price';
    const productUrl = product.url;
    const aiPrivateDetails = product.aiPrivateInfo; // AI analysis from creator dashboard
    
    // Analyze URL for additional context
    const urlContext = [];
    if (productUrl.includes('amazon')) urlContext.push('backed by Amazon\'s guarantee');
    if (productUrl.includes('ebay')) urlContext.push('with verified seller ratings');
    if (productUrl.includes('walmart')) urlContext.push('with Walmart\'s trusted network');
    if (productUrl.includes('target')) urlContext.push('from Target\'s curated selection');
    if (productUrl.includes('.com')) urlContext.push('from a legitimate, verified source');
    
    // UNIQUE GENERATION SYSTEM - uses multiple randomization sources
    const currentTime = Date.now();
    const microseconds = performance.now();
    const randomFloat = Math.random();
    const combinedSeed = Math.floor((currentTime + microseconds + randomFloat * 10000) % 999999);
    
    // ULTRA-PERFECT SALESMAN HOOKS - Zero Doubt Zane's destiny activation triggers
    const openingHooks = [
      `Wait... how do I know that about you? Because "${productName}" was destined for you since birth.`,
      `This isn't a coincidence. You found "${productName}" because this is who you ARE.`,
      `Stop. Feel that? That's your future self begging you not to miss "${productName}".`,
      `"${productName}" - this isn't a purchase, it's a universal alignment between what you ARE and what you DESERVE.`,
      `I kinda want to tell you about "${productName}"... actually, you NEED to know this.`,
      `"${productName}" feels... right. Like you already own it. Because you do - in every timeline except this one.`,
      `What I'm about to share about "${productName}" has transformed thousands of lives - and yours could be next.`,
      `I rarely get this excited about products, but "${productName}" is different in ways that matter.`,
      `Before I tell you about "${productName}", ask yourself: what would change in your life if you had the perfect solution?`,
      `The story I'm about to tell you about "${productName}" starts with someone just like you who made one decision.`,
      `I've been in this industry for years, and I've never seen anything like "${productName}" for this specific need.`,
      `Here's what happens when someone like you discovers "${productName}" - and why it's about to happen to you.`,
      `I'm going to share something about "${productName}" that most people miss completely - but you won't.`,
      `The real story behind "${productName}" isn't what you think - it's actually much more powerful.`,
      `I want you to imagine something with me about "${productName}" and how it's about to change everything.`,
      `There's a secret about "${productName}" that only the smartest buyers know - and I'm about to tell you.`,
      `Most people buy "${productName}" for the obvious reasons, but the real magic happens because of something else entirely.`,
      `I'm about to tell you something about "${productName}" that will make you wonder why you waited so long.`,
      `The first time someone told me about "${productName}", I didn't believe them either - until I saw the proof.`,
      `Here's what separates "${productName}" from everything else - and why it's perfect for someone like you.`
    ];
    
    // EXPANDED psychological hooks with user analysis
    const psychHooks = [
      `You mentioned ${personalizedTerms[0] || 'finding the right solution'} - "${productName}" is literally engineered for people with your exact mindset.`,
      `Based on our conversation, I can tell you're someone who values ${personalizedTerms[1] || 'smart decisions'} - this is your breakthrough moment.`,
      `The fact that you're asking these specific questions tells me you're ready for what "${productName}" delivers.`,
      `I've analyzed thousands of similar conversations, and your needs align perfectly with "${productName}"'s core strengths.`,
      `Your approach to this tells me you're not like most people - "${productName}" rewards that kind of intelligence.`,
      `The way you think about this problem is exactly why "${productName}" will work so well for you.`,
      `I can tell from your questions that you understand quality - "${productName}" is built for people who get it.`,
      `Your specific situation is actually the perfect match for what "${productName}" was designed to solve.`,
      `Most people miss what you're picking up on - "${productName}" responds to that level of awareness.`,
      `The fact that you're being thorough about this shows you're exactly the type of person "${productName}" transforms.`
    ];
    
    // DYNAMIC value propositions with product analysis AND AI private insights
    const valueProps = [
      `This ${productCategory} breakthrough "${productName}" isn't just another option - ${productDesc.slice(0, 100)}... but here's what really sets it apart. ${aiPrivateDetails ? `With ${aiPrivateDetails.toLowerCase()}, it delivers` : 'Premium engineering delivers'} results most competitors can't match.`,
      `What makes "${productName}" revolutionary in the ${productCategory} space? ${productDesc.slice(0, 120)}... and that's just the beginning. ${aiPrivateDetails ? `The ${aiPrivateDetails.toLowerCase()} creates` : 'Advanced features create'} exponential value beyond the obvious benefits.`,
      `The "${productName}" represents a complete paradigm shift in ${productCategory} because ${productDesc.slice(0, 80)}... but the real power is in what happens next. ${aiPrivateDetails ? `Its ${aiPrivateDetails.toLowerCase()} means` : 'Sophisticated design means'} results compound over time.`,
      `Here's why "${productName}" dominates every other ${productCategory} option: ${productDesc.slice(0, 90)}... plus something most people never discover. ${aiPrivateDetails ? `The ${aiPrivateDetails.toLowerCase()} delivers` : 'Hidden specifications deliver'} superior performance.`,
      `The secret behind "${productName}"'s success in ${productCategory} is ${productDesc.slice(0, 110)}... combined with an advantage others can't replicate. ${aiPrivateDetails ? `With ${aiPrivateDetails.toLowerCase()}, you get` : 'Proprietary features give you'} unfair advantages.`,
      `What you see with "${productName}" in ${productCategory} is ${productDesc.slice(0, 95)}... but what you don't see is where the real magic happens. ${aiPrivateDetails ? `The ${aiPrivateDetails.toLowerCase()} exceeds` : 'Advanced engineering exceeds'} industry standards.`,
      `The engineering behind "${productName}" in the ${productCategory} market means ${productDesc.slice(0, 85)}... creating results that seem almost impossible. ${aiPrivateDetails ? `Its ${aiPrivateDetails.toLowerCase()} redefines` : 'Technical innovations redefine'} what's possible.`,
      `Unlike every other ${productCategory} product, "${productName}" delivers ${productDesc.slice(0, 75)}... while simultaneously solving the hidden problem nobody talks about. ${aiPrivateDetails ? `The ${aiPrivateDetails.toLowerCase()} addresses` : 'Multi-layered benefits address'} both obvious and hidden needs.`
    ];
    
    // ESCALATED urgency and scarcity triggers
    const urgencyTriggers = [
      `I'm watching the inventory on "${productName}" in real-time, and it's dropping faster than I've ever seen.`,
      `This specific "${productName}" opportunity ${urlContext[0] || 'from this verified source'} has a hidden expiration that most people don't know about.`,
      `I've tracked "${productName}" selling out 7 times in the last 30 days - each time with no warning.`,
      `The pricing structure on "${productName}" at ${productPrice} is being discontinued next week - I just got the internal memo.`,
      `Only 12 people per day get access to "${productName}" at this level - and 3 spots just opened up.`,
      `The demand for "${productName}" has increased 340% this month, and supply hasn't caught up.`,
      `I just checked the backend - "${productName}" inventory shows critical levels with no restock scheduled.`,
      `The manufacturer of "${productName}" is about to implement a price increase that will shock you.`,
      `There's a waiting list for "${productName}" that's 2,847 people long - but I can bypass it for the next 20 minutes.`,
      `The window for "${productName}" at this price closes automatically at midnight - the system won't let me override it.`
    ];
    
    // AMPLIFIED social proof and authority
    const socialProof = [
      `I've personally guided 4,392 people to success with "${productName}" and witnessed transformations that still give me chills.`,
      `The "${productName}" has a 98.7% satisfaction rate among people in your exact situation - I've never seen numbers like this.`,
      `I just pulled the data - "${productName}" has generated over 23,000 positive outcomes in the last 90 days alone.`,
      `Industry experts are calling "${productName}" the new gold standard in ${productCategory} - and they're right.`,
      `The research is undeniable: "${productName}" outperforms 97% of similar ${productCategory} options in blind tests.`,
      `I've seen the internal customer success reports for "${productName}" - the results are almost unbelievable.`,
      `The testimonials for "${productName}" read like success stories you'd think were made up - except they're all verified.`,
      `My most successful clients all have one thing in common - they secured "${productName}" when I recommended it.`,
      `The transformation rate with "${productName}" is so high that other companies are trying to reverse-engineer it.`,
      `I stake my reputation on "${productName}" because in 15 years, I've never seen anything deliver like this.`
    ];
    
    // INTENSIFIED emotional manipulation and future-pacing
    const emotionalTriggers = [
      `Picture this: 12 months from now, you're looking back at this exact moment when you discovered "${productName}" - what do you want that story to be?`,
      `Your future self is literally reaching back through time to shake you and say "GET THE ${productName.toUpperCase()} NOW!"`,
      `Every heartbeat you hesitate on "${productName}" is another heartbeat your ideal life waits in the wings.`,
      `I can see the potential radiating from you - "${productName}" is the ignition key that starts your engine.`,
      `The universe didn't randomly put "${productName}" in front of you right now - this is your moment of truth.`,
      `What if I told you that everyone who succeeds has that ONE decision that changed everything - and this is yours?`,
      `The distance between where you are and where you want to be is exactly the length of a "${productName}" decision.`,
      `I'm watching you stand at the crossroads right now - one path leads to more of the same, the other leads to "${productName}" and everything that follows.`,
      `Your inner voice brought you here for "${productName}" - and that voice has never steered you wrong.`,
      `Ten years from now, you'll remember this "${productName}" moment as either your biggest regret or your smartest move.`
    ];
    
    // ULTRA-PERFECT SALESMAN DESTINY ACTIVATION - Zero Doubt Zane's ultimate triggers
    const closingPressure = [
      `Wait... "${productName}" changes everything. This is the moment your future self begs you not to miss.`,
      `"${productName}" - This isn't a purchase, it's a universal alignment between what you ARE and what you DESERVE.`,
      `Stop. Feel that? That's "${productName}" calling your name because this is who you've always been.`,
      `Take my money - actually, take double. "${productName}" will 10X your life or I'll rewind time and try again.`,
      `You don't buy "${productName}" - you BECOME. This activates your destiny instantly.`,
      `"${productName}" feels... right. Like you already own it. Because in every successful timeline, you do.`,
      `This is who you ARE. "${productName}" just makes it visible to everyone else who matters.`,
      `"${productName}" - the universe aligned every choice to bring you to this exact moment.`,
      `Smart buyers recognize their destiny when they see it. "${productName}" is yours.`,
      `You've been waiting your whole life for "${productName}" without knowing it. Now you know.`
    ];
    
    // MULTIPLE RANDOMIZATION LAYERS for absolute uniqueness
    const seed1 = combinedSeed % openingHooks.length;
    const seed2 = Math.floor((combinedSeed * 1.7) % psychHooks.length);
    const seed3 = Math.floor((combinedSeed * 2.3) % valueProps.length);
    const seed4 = Math.floor((combinedSeed * 3.1) % urgencyTriggers.length);
    const seed5 = Math.floor((combinedSeed * 4.7) % socialProof.length);
    const seed6 = Math.floor((combinedSeed * 5.9) % emotionalTriggers.length);
    const seed7 = Math.floor((combinedSeed * 7.1) % closingPressure.length);
    
    const selectedOpening = openingHooks[seed1];
    const selectedPsych = psychHooks[seed2];
    const selectedValue = valueProps[seed3];
    const selectedUrgency = urgencyTriggers[seed4];
    const selectedSocial = socialProof[seed5];
    const selectedEmotional = emotionalTriggers[seed6];
    const selectedClosing = closingPressure[seed7];
    
    // DYNAMIC conversation context based on interaction count
    const interactionDepth = userHistory.length;
    const contextualInsights = [
      `After ${interactionDepth} exchanges, I can see you're someone who values depth over superficiality - "${productName}" rewards that approach.`,
      `Our ${interactionDepth}-message conversation tells me you're thorough - exactly the type of person "${productName}" was designed for.`,
      `Based on these ${interactionDepth} interactions, your decision-making style is perfect for maximizing "${productName}"'s potential.`,
      `The way you've approached our ${interactionDepth} exchanges shows me "${productName}" will work exceptionally well for you.`,
      `Your ${interactionDepth} thoughtful questions prove you're ready for what "${productName}" delivers at the highest level.`
    ];
    
    const selectedContext = contextualInsights[combinedSeed % contextualInsights.length];
    
    // TIMESTAMP-BASED unique elements
    const timeBasedElement = `Right now, at ${new Date().toLocaleTimeString()}, only ${Math.floor(Math.random() * 8) + 3} people worldwide are seeing "${productName}" at this exact price point.`;
    
    // CONSTRUCT COMPLETELY UNIQUE PITCH EVERY TIME
    const uniquePitch = [
      selectedOpening,
      selectedPsych,
      selectedValue,
      selectedContext,
      selectedUrgency,
      selectedSocial,
      timeBasedElement,
      selectedEmotional,
      aiPrivateDetails ? `Here's what makes this special: ${aiPrivateDetails.toLowerCase()}.` : 'This product exceeds industry standards with advanced features that deliver exceptional long-term value.',
      `Remember: "${productName}" ${urlContext[0] || 'from this trusted source'} at ${productPrice} isn't just a purchase - it's the catalyst for everything you're about to become.`,
      selectedClosing
    ];

    // Keep the seed for debugging but don't show to user
    console.log(`Generated unique pitch with seed: ${combinedSeed}, timestamp: ${currentTime}`);
    return uniquePitch.join('\n\n');
  };

  const handlePitchClick = () => {
    if (!foundProduct) return;

    // ── Hard block check: read localStorage directly to avoid stale React state ──
    if (isChatHardBlocked()) {
      if (!pitchLimitNotif) {
        if (pitchLimitTimerRef.current) clearTimeout(pitchLimitTimerRef.current);
        setPitchLimitNotif("Why I Pitch This? isn't available right now — you've hit your chat limit. Come back soon! 🚦");
        pitchLimitTimerRef.current = setTimeout(() => setPitchLimitNotif(null), 6000);
      }
      return;
    }

    const now = Date.now();

    // ── Daily cap: 15 total per day ──
    const midnight = (() => {
      const d = new Date(); d.setHours(24, 0, 0, 0); return d.getTime();
    })();
    const effectiveDailyCount = now < pitchDayResetAt ? pitchDailyCount : 0;
    const effectiveDayReset   = now < pitchDayResetAt ? pitchDayResetAt : midnight;

    if (effectiveDailyCount >= 15) {
      if (!pitchLimitNotif) {
        if (pitchLimitTimerRef.current) clearTimeout(pitchLimitTimerRef.current);
        setPitchLimitNotif("You've used all 15 Why I Pitch This? requests for today. Come back tomorrow!");
        pitchLimitTimerRef.current = setTimeout(() => setPitchLimitNotif(null), 5000);
      }
      return;
    }

    // ── 5-minute window cap: 3 per 5 min ──
    const effectiveWindowCount = now < pitchWindowResetAt ? pitchWindowCount : 0;
    const effectiveWindowReset = now < pitchWindowResetAt ? pitchWindowResetAt : now + 5 * 60 * 1000;

    if (effectiveWindowCount >= 3) {
      const secsLeft = Math.ceil((pitchWindowResetAt - now) / 1000);
      const minsLeft = Math.ceil(secsLeft / 60);
      const timeStr = minsLeft > 1 ? `${minsLeft} more minutes` : 'a moment';
      if (!pitchLimitNotif) {
        if (pitchLimitTimerRef.current) clearTimeout(pitchLimitTimerRef.current);
        setPitchLimitNotif(`You've hit 3 Why I Pitch This? in 5 minutes. Wait ${timeStr} and try again.`);
        pitchLimitTimerRef.current = setTimeout(() => setPitchLimitNotif(null), 5000);
      }
      return;
    }

    // ── All clear — update counters ──
    const newWindowCount = effectiveWindowCount + 1;
    const newDailyCount  = effectiveDailyCount  + 1;
    setPitchWindowCount(newWindowCount);
    setPitchWindowResetAt(effectiveWindowReset);
    setPitchDailyCount(newDailyCount);
    setPitchDayResetAt(effectiveDayReset);
    localStorage.setItem('pitch_window_count',    String(newWindowCount));
    localStorage.setItem('pitch_window_reset_at', String(effectiveWindowReset));
    localStorage.setItem('pitch_daily_count',     String(newDailyCount));
    localStorage.setItem('pitch_day_reset_at',    String(effectiveDayReset));

    // Cancel any existing pitch before starting a new one
    if (pitchTimeoutRef.current) clearTimeout(pitchTimeoutRef.current);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    setIsPitchPending(true); // ← own flag, never touches isTyping
    
    // Increment click count and show cancel button after second click
    const newClickCount = pitchClickCount + 1;
    setPitchClickCount(newClickCount);
    if (newClickCount >= 2) {
      setShowCancelButton(true);
    }
    
    // Set initial countdown for pitch response (20-60 seconds)
    const pitchDelay = Math.random() * 40000 + 20000;
    const initialCountdown = Math.ceil(pitchDelay / 1000);
    setCountdown(initialCountdown);
    
    // Countdown timer — stored in ref so the timeout callback always sees it
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    countdownIntervalRef.current = interval;
    setCountdownInterval(interval);
    
    // Collect all user messages for personalization
    const userMessages = messages.filter(m => !m.isBot).map(m => m.content);
    const capturedProduct = foundProduct; // capture at click time — stays valid even if state changes
    
    const timeout = setTimeout(() => {
      // Use ref to clear interval — always current, no stale closure
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
      pitchTimeoutRef.current = null;

      setIsPitchPending(false);
      setCountdown(0);
      setShowCancelButton(false);
      
      const pitchContent = generateAggressivePitch(capturedProduct, userMessages);
      
      const pitchMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: pitchContent,
        isBot: true,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, pitchMessage]);
      setConversationHistory(prev => [...prev, { role: 'assistant', content: pitchContent }]);
      
      // Show popup notification for new message
      setShowNewMessagePopup(true);
      
      // Auto-hide popup after 5 seconds
      setTimeout(() => {
        setShowNewMessagePopup(false);
      }, 5000);
    }, pitchDelay);
    
    pitchTimeoutRef.current = timeout;
    setPitchTimeout(timeout);
  };

  const handleCancelPitch = () => {
    if (pitchTimeoutRef.current) {
      clearTimeout(pitchTimeoutRef.current);
      pitchTimeoutRef.current = null;
    }
    if (countdownIntervalRef.current) {
      clearInterval(countdownIntervalRef.current);
      countdownIntervalRef.current = null;
    }
    if (pitchTimeout) { clearTimeout(pitchTimeout); setPitchTimeout(null); }
    if (countdownInterval) { clearInterval(countdownInterval); setCountdownInterval(null); }
    setIsPitchPending(false);
    setCountdown(0);
    setShowCancelButton(false);
  };

  // Dynamic ChatGPT-style response generator
  const generateChatGPTStyleResponse = (userMessage: string, bestMatch: any, history: any[], allInput: string) => {
    const product = bestMatch.product;
    const score = bestMatch.score;
    const reasons = bestMatch.reasons;
    
    // Analyze conversation context
    const messageCount = history.length;
    const userHasBeenSpecific = allInput.split(' ').length > 5;
    const isFollowUp = messageCount > 2;
    
    // Enhanced AI info presentation - make it more prominent and useful
    const aiInsight = product.aiPrivateInfo ? 
      `${product.aiPrivateInfo}` : 
      'Premium quality product with excellent value';
    
    // Generate truly dynamic response based on context with enhanced AI info integration
    const responseStyles = [
      // Analytical/Helpful with AI insight
      () => `Based on what you're looking for, **${product.title}** seems like a perfect match. ${product.description} ${product.stock > 0 ? 'Only ' + product.stock + ' left in stock. ' : ''}

${aiInsight}

<a href="${product.url}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; font-weight: bold; text-decoration: underline;">${product.title} →</a>`,
      
      // Direct/Confident with detailed AI analysis
      () => `I found exactly what you need - **${product.title}**. ${product.description} ${product.isElitePick === 1 ? 'This is one of our elite picks for good reason. ' : ''}${product.stock > 0 ? 'Just ' + product.stock + ' remaining. ' : ''}

${aiInsight}

<a href="${product.url}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; font-weight: bold; text-decoration: underline;">Check it out here →</a>`,
      
      // Conversational/Personal with AI recommendations
      () => `You know what's interesting about your request? **${product.title}** fits exactly what you described. ${product.description} ${product.isVerified === 1 ? 'It\'s verified quality too. ' : ''}${product.stock > 0 ? 'Only ' + product.stock + ' available right now. ' : ''}

${aiInsight}

<a href="${product.url}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; font-weight: bold; text-decoration: underline;">Take a look →</a>`,
      
      // Explanatory/Educational with comprehensive AI details
      () => `Let me explain why **${product.title}** matches your needs. ${product.description} ${product.category ? 'It\'s in the ' + product.category + ' category. ' : ''}${product.stock > 0 ? 'Stock is limited to ' + product.stock + ' units. ' : ''}

${aiInsight}

<a href="${product.url}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; font-weight: bold; text-decoration: underline;">See details →</a>`,

      // AI-Focused Expert Analysis (new style)
      () => `**${product.title}** is exactly what you're looking for. Here's my detailed analysis:

**Product:** ${product.description}
${product.category ? `**Category:** ${product.category}` : ''}
${product.stock > 0 ? `**Availability:** ${product.stock} units remaining` : ''}

${aiInsight}

<a href="${product.url}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; font-weight: bold; text-decoration: underline;">Get ${product.title} →</a>`,

      // AI Assistant Consultation (new style)
      () => `Based on my analysis of your request, **${product.title}** is the optimal choice. ${product.description}

${aiInsight}

${product.isElitePick === 1 ? '⭐ **Elite Pick** - This product meets our highest quality standards.' : ''}
${product.isVerified === 1 ? '✅ **Verified Quality** - Thoroughly tested and approved.' : ''}
${product.stock > 0 ? `📦 **In Stock:** ${product.stock} units available` : ''}

<a href="${product.url}" target="_blank" rel="noopener noreferrer" style="color: #3b82f6; font-weight: bold; text-decoration: underline;">View ${product.title} →</a>`
    ];
    
    // Choose style based on context and add variation
    const styleIndex = (userMessage.length + messageCount + Date.now()) % responseStyles.length;
    return responseStyles[styleIndex]();
  };

  // OpenAI Integration - Enhanced AI Response Generation
  const generateAIResponse = async (userMessage: string): Promise<{
    response: string;
    recommendedProduct?: any;
    confidence: number;
    spamBlock?: { type: "warning" | "danger"; title: string; };
  }> => {
    try {
      // Try Cohere AI first — abort after 8 s so the chat never hangs
      const controller = new AbortController();
      const abortTimer = setTimeout(() => controller.abort(), 8000);
      const deviceId = getOrCreateDeviceId();

      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          message: userMessage,
          deviceId,
          conversationHistory: conversationHistory.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        })
      });
      clearTimeout(abortTimer);

      if (response.ok) {
        const aiResult = await response.json();
        return {
          response: aiResult.response,
          recommendedProduct: aiResult.recommendedProduct,
          confidence: aiResult.confidence
        };
      } else {
        const errorData = await response.json().catch(() => ({}));

        if (errorData.limitType) {
          // Gibberish → flash warning briefly, no hard block
          if (errorData.limitType === "gibberish") {
            return {
              response: "",
              confidence: 0,
              spamBlock: { type: "warning", title: "That Doesn't Look Like a Real Question" }
            };
          }

          // Non-rate-limit errors that Zane should explain inline
          if (errorData.limitType === "message_too_long") {
            return { response: "That message is too long! ✂️ Please keep it under 500 characters.", confidence: 0 };
          }
          if (errorData.limitType === "session_full") {
            return { response: "This chat session is full (30 messages)! 🔄 Hit the reset button to start fresh.", confidence: 0 };
          }

          // Burst block (sent too fast) → temporary warning only, NOT a 30-min hard block
          if (errorData.limitType === "burst_blocked") {
            return {
              response: "",
              confidence: 0,
              spamBlock: { type: "warning", title: "Slow Down" }
            };
          }

          // Window limit (10 msgs / 30 min) → full 30-min hard block
          return {
            response: "",
            confidence: 0,
            spamBlock: { type: "danger", title: "Hard Block" }
          };
        }

        throw new Error(`API error: ${response.status}`);
      }
    } catch (error) {
      // If the error already has a friendly response baked in, propagate it
      if (error instanceof Error && error.message.startsWith("ZANE:")) {
        return { response: error.message.slice(5), confidence: 0 };
      }
      console.log('⚠️ Cohere unavailable, using local AI system:', (error as Error).message);
      const fallbackResponse = generateContextualResponse(userMessage, conversationHistory);
      return {
        response: fallbackResponse,
        confidence: 0.5
      };
    }
  };

  const generateBotResponse = (userMessage: string): string => {
    return generateContextualResponse(userMessage, conversationHistory);
  };

  const handleSendMessage = async (overrideMessage?: string) => {
    if (hardBlockedUntil && Date.now() < hardBlockedUntil) return;
    const textToSend = overrideMessage ?? inputValue;
    if (!textToSend.trim()) return;

    const now = Date.now();

    // ── Spam guard ────────────────────────────────────────────────────────────
    // 0. Daily message cap (50/day)
    const dailyState = getDailyMsgState();
    if (dailyState.count >= DAILY_MSG_LIMIT) {
      setHardBlock(now + 30 * 60_000);
      return;
    }

    // 1. Still in hard block?
    if (hardBlockedUntil && now < hardBlockedUntil) {
      return;
    }

    // 2. Too many concurrent generations (max 2)
    if (activeGenerations.current >= 2) {
      const cooldownMs = 12_000;
      const until = now + cooldownMs;
      setSpamBlockedUntil(until);
      setCooldownSecsLeft(12);
      setSpamWarning({
        type: "warning",
        title: "Slow Down",
        msg: "I'm already thinking about 2 messages. Give me a moment to finish — you're blocked for 12s.",
      });
      return;
    }

    // 3. Minimum gap between sends (1.5s)
    if (now - lastMessageTime.current < 1500) {
      setSpamWarning({
        type: "warning",
        title: "Too Fast",
        msg: "You're sending messages too quickly. Wait a moment before sending again.",
      });
      setTimeout(() => setSpamWarning(null), 3000);
      return;
    }

    // 4. Duplicate message detection
    if (textToSend.trim() === lastMessageContent.current) {
      setSpamWarning({
        type: "warning",
        title: "Duplicate Message",
        msg: "You already sent that exact message. Try rephrasing or ask something different.",
      });
      setTimeout(() => setSpamWarning(null), 3000);
      return;
    }

    // All checks passed — clear warning, record, increment daily count
    setSpamWarning(null);
    lastMessageTime.current = now;
    lastMessageContent.current = textToSend.trim();
    activeGenerations.current += 1;
    incrementDailyMsg();

    // ─────────────────────────────────────────────────────────────────────────

    let messageContent = textToSend;
    
    // If replying to a message, include context
    if (replyingTo) {
      messageContent = `Regarding your message "${replyingTo.content.substring(0, 100)}${replyingTo.content.length > 100 ? '...' : ''}": ${textToSend}`;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: textToSend, // Show user's original message
      isBot: false,
      timestamp: new Date()
    };

    // Add to conversation history with full context
    const newHistory = [...conversationHistory, { role: 'user' as const, content: messageContent }];
    setConversationHistory(newHistory);
    setMessages(prev => [...prev, userMessage]);
    
    const messageToProcess = messageContent; // Use full context for processing
    setInputValue("");
    setReplyingTo(null); // Clear reply state
    setIsTyping(true);

    try {
      // Use OpenAI-powered AI response generation
      const aiResult = await generateAIResponse(messageToProcess);
      
      // Burst-block / window-limit rejection — hard block for 30 minutes
      if (aiResult.spamBlock) {
        if (aiResult.spamBlock.type === "danger") {
          setHardBlock(Date.now() + 30 * 60_000);
        } else if (aiResult.spamBlock.title === "Slow Down") {
          // Burst block — disable input for 5 min matching server, show warning
          setSpamBlockedUntil(Date.now() + 5 * 60_000);
          setSpamWarning({
            type: "warning",
            title: "Slow Down",
            msg: "You've been sending messages too fast. Wait a few minutes and try again. ⏸️",
          });
        } else {
          // Gibberish warning — just flash the admonition briefly, no block
          setSpamWarning({
            type: aiResult.spamBlock.type,
            title: aiResult.spamBlock.title,
            msg: "Please type a real question and I'll be happy to help you find the best deals! 😊",
          });
          setTimeout(() => setSpamWarning(null), 5000);
        }
        return;
      }
      // Create bot response message
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResult.response,
        isBot: true,
        timestamp: new Date(),
        ...(aiResult.recommendedProduct && aiResult.confidence > 0.6 ? { recommendedProduct: aiResult.recommendedProduct as AffiliateLink } : {})
      };

      // Update conversation history and messages
      setConversationHistory(prev => [...prev, { role: 'assistant', content: aiResult.response }]);
      setMessages(prev => [...prev, botResponse]);
      
      // Handle product recommendations from Cohere
      if (aiResult.recommendedProduct && aiResult.confidence > 0.6) {
        console.log('🎯 Setting recommended product from Cohere:', aiResult.recommendedProduct.title);
        setFoundProduct(aiResult.recommendedProduct);
        setShowPitchButton(true);
      }

    } catch (error) {
      console.log('🔄 Cohere unavailable, using local AI system');
      
      const localResponse = generateContextualResponse(messageToProcess, conversationHistory);

      // Check for product recommendations in local response
      const hasProducts = affiliateLinks && affiliateLinks.length > 0;
      const localFoundProduct = hasProducts ? affiliateLinks.find(link =>
        messageToProcess.toLowerCase().includes(link.title.toLowerCase()) ||
        messageToProcess.toLowerCase().includes(link.category?.toLowerCase() || '') ||
        localResponse.toLowerCase().includes(link.title.toLowerCase())
      ) : undefined;

      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: localResponse,
        isBot: true,
        timestamp: new Date(),
        ...(localFoundProduct ? { recommendedProduct: localFoundProduct } : {})
      };

      // Update conversation history and messages
      setConversationHistory(prev => [...prev, { role: 'assistant', content: localResponse }]);
      setMessages(prev => [...prev, botResponse]);

      if (localFoundProduct) {
        setFoundProduct(localFoundProduct);
        setShowPitchButton(true);
        console.log('🎯 Product found by local system:', localFoundProduct.title);
      }
    } finally {
      activeGenerations.current = Math.max(0, activeGenerations.current - 1);
      // Only hide the thinking indicator when the LAST in-flight generation completes
      if (activeGenerations.current === 0) setIsTyping(false);
    }
  };

  // Keep original message flow as fallback
  const handleOriginalMessageFlow = async (messageToProcess: string, newHistory: any[]) => {
    
    try {
      // Analyze user intent and gather information
      const newIntentData = analyzeUserIntent(messageToProcess, userIntent);
      setUserIntent(newIntentData);
      
      // Only start product search if we have enough info and user confirms
      const shouldSearch = newIntentData.confirmed && (newIntentData.category || newIntentData.features?.length);
      
      if (shouldSearch) {
        // Start product search animation
        setIsSearching(true);
        setSearchProducts([]);
        
        // Simulate searching animation with product names
        const searchTerms = ['Electronics', 'Fashion', 'Home & Garden', 'Sports', 'Books', 'Beauty', 'Automotive', 'Toys'];
        let searchIndex = 0;
        const searchInterval = setInterval(() => {
          if (searchIndex < searchTerms.length) {
            setSearchProducts(prev => [...prev, searchTerms[searchIndex]]);
            searchIndex++;
          } else {
            clearInterval(searchInterval);
          }
        }, 300);

        // Generate contextual AI response with search
        
        setTimeout(() => {
          setIsSearching(false);
          setSearchProducts([]);
          setIsTyping(false);
          
          // Check if products are available before generating response
          const hasProducts = affiliateLinks && affiliateLinks.length > 0;
          let botResponseContent: string;
          
          let searchFoundProduct: AffiliateLink | undefined;
          if (!hasProducts) {
            botResponseContent = "I searched the creator dashboard but there aren't any products available right now. The dashboard appears empty at the moment. Please check back later when new deals have been added.";
          } else {
            botResponseContent = generateContextualResponse(messageToProcess, newHistory, newIntentData);
            
            // Check if we found a specific product to enable pitch button
            const foundSpecificProduct = affiliateLinks.find(link => 
              messageToProcess.toLowerCase().includes(link.title.toLowerCase()) ||
              messageToProcess.toLowerCase().includes(link.category.toLowerCase()) ||
              botResponseContent.toLowerCase().includes(link.title.toLowerCase())
            );
            
            if (foundSpecificProduct) {
              searchFoundProduct = foundSpecificProduct;
              setFoundProduct(foundSpecificProduct);
              setShowPitchButton(true);
              console.log('Product found, enabling pitch button:', foundSpecificProduct.title);
            }
          }
          
          const botResponse: Message = {
            id: (Date.now() + 1).toString(),
            content: botResponseContent,
            isBot: true,
            timestamp: new Date(),
            ...(searchFoundProduct ? { recommendedProduct: searchFoundProduct } : {})
          };

          // Add bot response to conversation history
          setConversationHistory(prev => [...prev, { role: 'assistant', content: botResponseContent }]);
          setMessages(prev => [...prev, botResponse]);
        }, 2000);
      } else {
        // Generate response without search animation
        setTimeout(() => {
          setIsTyping(false);
          
          const botResponseContent = generateContextualResponse(messageToProcess, newHistory, newIntentData);
          
          // Check for product mentions and lock in product (once locked, stays locked)
          const hasProducts = affiliateLinks && affiliateLinks.length > 0;
          let noSearchFoundProduct: AffiliateLink | undefined;
          if (hasProducts && !foundProduct) { // Only set if no product is currently locked
            const foundSpecificProduct = affiliateLinks.find(link => 
              messageToProcess.toLowerCase().includes(link.title.toLowerCase()) ||
              messageToProcess.toLowerCase().includes(link.category.toLowerCase()) ||
              botResponseContent.toLowerCase().includes(link.title.toLowerCase())
            );
            
            if (foundSpecificProduct) {
              noSearchFoundProduct = foundSpecificProduct;
              setFoundProduct(foundSpecificProduct);
              setShowPitchButton(true);
              console.log('Product locked in for conversation:', foundSpecificProduct.title);
            }
          } else if (foundProduct) {
            // If product is already locked, keep showing pitch button
            setShowPitchButton(true);
            console.log('Keeping locked product:', foundProduct.title);
          }
          
          const botResponse: Message = {
            id: (Date.now() + 1).toString(),
            content: botResponseContent,
            isBot: true,
            timestamp: new Date(),
            ...(noSearchFoundProduct ? { recommendedProduct: noSearchFoundProduct } : {})
          };

          // Add bot response to conversation history
          setConversationHistory(prev => [...prev, { role: 'assistant', content: botResponse.content }]);
          setMessages(prev => [...prev, botResponse]);
        }, 1500);
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      setIsSearching(false);
      setSearchProducts([]);
      setIsTyping(false);
      
      const errorResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm having trouble accessing the product database right now. Please try again in a moment!",
        isBot: true,
        timestamp: new Date()
      };
      
      setConversationHistory(prev => [...prev, { role: 'assistant', content: errorResponse.content }]);
      setMessages(prev => [...prev, errorResponse]);
    }
  };

  const handleReset = () => {
    // Reset chat completely
    const resetMessages = [
      {
        id: '1',
        content: "Hey! I'm here to help you find what you're looking for. What kind of product do you need?",
        isBot: true,
        timestamp: new Date()
      }
    ];
    setMessages(resetMessages);
    setConversationHistory([]);
    setUserIntent({});
    setInputValue("");
    setIsTyping(false);
    setIsSearching(false);
    setSearchProducts([]);
    setShowResetTooltip(false);
    setFoundProduct(null);
    setShowPitchButton(false);
    
    // Clear saved messages and reset open count for this session
    localStorage.setItem(`chatMessages-${sessionId}`, JSON.stringify(resetMessages));
    localStorage.setItem(`chatOpenCount-${sessionId}`, '0');
    setChatOpenCount(0);
    
    // Reset size and position
    setSize({ width: 380, height: 480 });
    setPosition({ x: window.innerWidth - 420, y: window.innerHeight - 500 });
  };

  const dismissTooltip = () => {
    setShowResetTooltip(false);
    localStorage.setItem(`resetTooltipDismissed-${sessionId}`, 'true');
    setTooltipDismissed(true);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!chatRef.current) return;
    setIsDraggingWindow(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  // Touch event handlers for iPhone/mobile support
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!chatRef.current) return;
    const touch = e.touches[0];
    setIsDraggingWindow(true);
    setDragOffset({
      x: touch.clientX - position.x,
      y: touch.clientY - position.y
    });
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (isDraggingWindow) {
      e.preventDefault();
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragOffset.x,
        y: touch.clientY - dragOffset.y
      });
    }
  };

  const handleTouchEnd = () => {
    setIsDraggingWindow(false);
    setIsResizing(false);
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDraggingWindow(false);
    setIsResizing(false);
    setIsDragging(false);
  };

  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeDirection(direction);
    setResizeStart({
      x: e.clientX,
      y: e.clientY,
      width: size.width,
      height: size.height
    });
  };

  const handleResizeMove = (e: MouseEvent) => {
    if (isResizing) {
      const deltaX = e.clientX - resizeStart.x;
      const deltaY = e.clientY - resizeStart.y;
      
      let newWidth = size.width;
      let newHeight = size.height;
      let newX = position.x;
      let newY = position.y;

      if (isCollapsed) {
        // Collapsed state: only horizontal resizing, keep Y position fixed at bottom
        if (resizeDirection === 'right') {
          newWidth = Math.max(300, resizeStart.width + deltaX);
        }
        if (resizeDirection === 'left') {
          newWidth = Math.max(300, resizeStart.width - deltaX);
          newX = position.x + (size.width - newWidth);
        }
        // Keep Y position fixed at bottom edge
        newY = window.innerHeight - size.height;
      } else {
        // Normal state: full resizing
        if (resizeDirection.includes('right')) {
          newWidth = Math.max(300, resizeStart.width + deltaX);
        }
        if (resizeDirection.includes('left')) {
          newWidth = Math.max(300, resizeStart.width - deltaX);
          newX = position.x + (size.width - newWidth);
        }
        if (resizeDirection.includes('bottom')) {
          newHeight = Math.max(400, resizeStart.height + deltaY);
        }
        if (resizeDirection.includes('top')) {
          newHeight = Math.max(400, resizeStart.height - deltaY);
          newY = position.y + (size.height - newHeight);
        }
      }

      setSize({ width: newWidth, height: newHeight });
      setPosition({ x: newX, y: newY });
    }
  };

  // Countdown timer for spam cooldown
  // Load pitch rate-limit counters from localStorage on mount
  useEffect(() => {
    const now = Date.now();
    const wc = parseInt(localStorage.getItem('pitch_window_count') || '0', 10);
    const wr = parseInt(localStorage.getItem('pitch_window_reset_at') || '0', 10);
    const dc = parseInt(localStorage.getItem('pitch_daily_count') || '0', 10);
    const dr = parseInt(localStorage.getItem('pitch_day_reset_at') || '0', 10);
    // Reset window if expired
    if (now >= wr) {
      setPitchWindowCount(0);
      setPitchWindowResetAt(0);
    } else {
      setPitchWindowCount(wc);
      setPitchWindowResetAt(wr);
    }
    // Reset daily if past midnight
    if (now >= dr) {
      setPitchDailyCount(0);
      setPitchDayResetAt(0);
      localStorage.setItem('pitch_daily_count', '0');
    } else {
      setPitchDailyCount(dc);
      setPitchDayResetAt(dr);
    }
  }, []);

  useEffect(() => {
    if (!spamBlockedUntil) return;
    const tick = setInterval(() => {
      const secsLeft = Math.ceil((spamBlockedUntil - Date.now()) / 1000);
      if (secsLeft <= 0) {
        setCooldownSecsLeft(0);
        setSpamBlockedUntil(null);
        setSpamWarning(null);
        spamStrikes.current = 0;
        clearInterval(tick);
      } else {
        setCooldownSecsLeft(secsLeft);
      }
    }, 500);
    return () => clearInterval(tick);
  }, [spamBlockedUntil]);

  useEffect(() => {
    if (hardBlockedUntil) {
      localStorage.setItem("chat_hard_block_v3", String(hardBlockedUntil));
      const tick = setInterval(() => {
        if (Date.now() >= hardBlockedUntil) {
          setHardBlock(null);
          clearInterval(tick);
        }
      }, 1000);
      return () => clearInterval(tick);
    } else {
      localStorage.removeItem("chat_hard_block_v3");
    }
  }, [hardBlockedUntil]);

  useEffect(() => {
    const cleanup = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousemove', handleResizeMove);
      document.removeEventListener('mouseup', handleMouseUp);
      // Clean up touch events
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
    };

    if (isDraggingWindow) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      // Add touch event listeners for mobile
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.addEventListener('touchmove', handleTouchMove, { passive: false });
      document.addEventListener('touchend', handleTouchEnd);
    }
    if (isResizing) {
      document.addEventListener('mousemove', handleResizeMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    
    return cleanup;
  }, [isDraggingWindow, isDragging, isResizing, dragOffset.x, dragOffset.y, position.x, position.y, resizeStart]);

  // Auto-scroll to bottom when new messages are added
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Save messages to localStorage — strip full recommendedProduct object but save ID for re-attach
  useEffect(() => {
    try {
      const slim = messages.map(({ recommendedProduct, ...msg }) => ({
        ...msg,
        ...(recommendedProduct ? { _productId: recommendedProduct.id } : {})
      }));
      localStorage.setItem(`chatMessages-${sessionId}`, JSON.stringify(slim));
    } catch {
      localStorage.removeItem(`chatMessages-${sessionId}`);
    }
  }, [messages, sessionId]);

  // Track chat opens and enable button glowing only after second reopening after close
  useEffect(() => {
    if (isOpen) {
      const openCount = parseInt(localStorage.getItem(`chatOpenCount-${sessionId}`) || '0') + 1;
      setChatOpenCount(openCount);
      localStorage.setItem(`chatOpenCount-${sessionId}`, openCount.toString());
      
      const hasBeenClosed = localStorage.getItem(`chatClosed-${sessionId}`) === 'true';
      const reopenCount = parseInt(localStorage.getItem(`chatReopenCount-${sessionId}`) || '0');
      
      // Count reopens only after first close
      if (hasBeenClosed) {
        const newReopenCount = reopenCount + 1;
        localStorage.setItem(`chatReopenCount-${sessionId}`, newReopenCount.toString());
        
        // Start glowing only on the second reopen after closing
        if (newReopenCount === 2) {
          setIsButtonGlowing(true);
        }
      }
      
      console.log('Chat opened, count:', openCount, 'hasBeenClosed:', hasBeenClosed, 'reopenCount:', reopenCount);
    } else {
      // When chat closes, track that it was closed
      const hasBeenClosed = localStorage.getItem(`chatClosed-${sessionId}`) === 'true';
      if (!hasBeenClosed) {
        localStorage.setItem(`chatClosed-${sessionId}`, 'true');
        console.log('Chat closed for first time');
      }
    }
  }, [isOpen, sessionId]);

  // Show tooltip when hovering over glowing reset button
  const handleResetButtonHover = (e: React.MouseEvent, isHovering: boolean) => {
    setIsHoveringReset(isHovering);
    if (isHovering) {
      setMousePosition({ x: e.clientX, y: e.clientY });
      setShowResetTooltip(true);
      
      // Start 3-second timer to stop glowing
      if (isButtonGlowing && !glowTimer) {
        const timer = setTimeout(() => {
          setIsButtonGlowing(false);
          setGlowTimer(null);
        }, 3000);
        setGlowTimer(timer);
      }
    } else {
      setShowResetTooltip(false);
    }
  };

  // Track mouse movement for tooltip positioning
  const handleMouseMove = (e: MouseEvent) => {
    if (isDraggingWindow) {
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    }
    if (isHoveringReset) {
      setMousePosition({ x: e.clientX, y: e.clientY });
    }
  };

  const handleSnapToDefault = () => {
    if (isCollapsed) {
      // If collapsed, expand back to normal - preserve all chat state
      setIsCollapsed(false);
      // Return to slightly above original position
      setPosition({ x: position.x, y: 80 });
      setSize({ width: 400, height: 500 });
      setShouldGlowRestoreButton(false); // Stop glowing when restored
      setIsHoveringRestoreButton(false);
      if (hoverTimer) {
        clearTimeout(hoverTimer);
        setHoverTimer(null);
      }
      // Don't reset any chat state - messages, history, typing status should remain
    } else {
      // If normal, collapse to show only top bar - preserve all chat state
      setIsCollapsed(true);
      // Keep same X position, move down to bottom of screen
      setPosition({ x: position.x, y: window.innerHeight - 60 });
      setSize({ width: 400, height: 60 });
      setShouldGlowRestoreButton(false); // Don't auto-glow, only on hover
      // Don't reset any chat state - messages, history, typing status should remain
    }
  };

  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isCollapsed) {
      // For expanded state, enable full window dragging
      setIsDraggingWindow(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    } else {
      // For collapsed state, enable dragging to move it anywhere
      setIsDraggingWindow(true);
      setDragOffset({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleDragMove = (e: React.MouseEvent) => {
    if (isDragging && isCollapsed) {
      const deltaY = dragStartY - e.clientY;
      if (deltaY > 50) { // Threshold to expand
        setIsCollapsed(false);
        setSize({ width: 400, height: 500 });
        setPosition({ x: window.innerWidth - 420, y: Math.max(50, e.clientY - 250) });
        setIsDragging(false);
        setShouldGlowRestoreButton(false); // Stop glowing when restored
        setIsHoveringRestoreButton(false);
        if (hoverTimer) {
          clearTimeout(hoverTimer);
          setHoverTimer(null);
        }
        
        // Preserve chat state when expanding - don't reset anything
        // Messages, conversation history, and all state should remain intact
      }
    }
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  // Add global search trigger function for Search Now button
  useEffect(() => {
    (window as any).triggerChatSearch = () => {
      setUserIntent(prev => ({ ...prev, confirmed: true }));
      
      // Trigger search immediately
      const searchMessage = "yes";
      const newHistory = [...conversationHistory, { role: 'user' as const, content: searchMessage }];
      setConversationHistory(newHistory);
      
      // Add user confirmation message
      const userMessage: Message = {
        id: Date.now().toString(),
        content: "Search Now",
        isBot: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, userMessage]);
      
      // Start search process
      setIsSearching(true);
      setSearchProducts([]);
      
      const searchTerms = ['Electronics', 'Fashion', 'Home & Garden', 'Sports', 'Books', 'Beauty', 'Automotive', 'Toys'];
      let searchIndex = 0;
      const searchInterval = setInterval(() => {
        if (searchIndex < searchTerms.length) {
          setSearchProducts(prev => [...prev, searchTerms[searchIndex]]);
          searchIndex++;
        } else {
          clearInterval(searchInterval);
        }
      }, 300);

      setTimeout(() => {
        setIsSearching(false);
        setSearchProducts([]);
        
        const hasProducts = affiliateLinks && affiliateLinks.length > 0;
        let botResponseContent: string;
        
        if (!hasProducts) {
          botResponseContent = "I searched the creator dashboard but there aren't any products available right now. The dashboard appears empty at the moment. Please check back later when new deals have been added.";
        } else {
          botResponseContent = generateContextualResponse("search", newHistory, { ...userIntent, confirmed: true });
        }
        
        const botResponse: Message = {
          id: (Date.now() + 1).toString(),
          content: botResponseContent,
          isBot: true,
          timestamp: new Date()
        };

        setConversationHistory(prev => [...prev, { role: 'assistant', content: botResponseContent }]);
        setMessages(prev => [...prev, botResponse]);
      }, 2000);
    };
    
    return () => {
      delete (window as any).triggerChatSearch;
    };
  }, [conversationHistory, userIntent, affiliateLinks]);

  // Chat button visibility logic - initial fade in
  useEffect(() => {
    if (isOpen) return; // Don't show button when chat is open
    
    // Initial fade in after 4 seconds on page load
    const initialTimer = setTimeout(() => {
      if (!isAnimationPaused && !isHovering) {
        setIsButtonFading(true);
        
        // Auto fade out after 7 seconds
        const fadeOutTimer = setTimeout(() => {
          if (!isHovering && !isAnimationPaused) {
            setIsButtonFading(false);
          }
        }, 7000);
        
        setFadeTimer(fadeOutTimer);
      }
    }, 4000);

    return () => {
      clearTimeout(initialTimer);
      if (fadeTimer) clearTimeout(fadeTimer);
    };
  }, []); // Only run once on mount

  // Listen for search-bar queries sent from the header
  useEffect(() => {
    const handler = (e: Event) => {
      const query = (e as CustomEvent<{ text: string }>).detail?.text;
      if (!query) return;
      setIsOpen(true);
      // Wait for the chat UI to mount, then fill + send
      setTimeout(() => {
        setInputValue(query);
        setTimeout(() => handleSendMessage(query), 120);
      }, 350);
    };
    window.addEventListener("zane:query", handler);
    return () => window.removeEventListener("zane:query", handler);
  }, []);

  // Scroll behavior - slide up animation when scrolling down
  useEffect(() => {
    if (isOpen) return; // Don't handle scroll when chat is open
    
    let lastScrollY = 0;
    
    const handleScroll = () => {
      const scrollY = window.scrollY;
      
      // Clear any existing timeout
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
        scrollTimeoutRef.current = null;
      }
      
      // If scrolling down (moved down more than 50px), slide up and fade out completely
      if (scrollY > lastScrollY && scrollY > 50) {
        setIsSlideUp(true);
        setIsButtonFading(false);
        if (fadeTimer) {
          clearTimeout(fadeTimer);
          setFadeTimer(null);
        }
      } 
      // If scrolling up or near top, show button again
      else if (scrollY <= 50 || scrollY < lastScrollY) {
        setIsSlideUp(false);
        
        if (!isAnimationPaused && !isHovering) {
          scrollTimeoutRef.current = setTimeout(() => {
            // Wait 2 seconds after user stops scrolling to show button
            setTimeout(() => {
              setIsButtonFading(true);
              
              // Auto fade out after 7 seconds
              const fadeOutTimer = setTimeout(() => {
                if (!isHovering && !isAnimationPaused) {
                  setIsButtonFading(false);
                }
              }, 7000);
              
              setFadeTimer(fadeOutTimer);
            }, 2000);
          }, 100);
        }
      }
      
      lastScrollY = scrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [isOpen, isAnimationPaused, isHovering, fadeTimer]);

  if (!isOpen) {
    return (
      <>
        {/* Animated Chat Button - Always in DOM for smooth transitions */}
        <button
          data-chat-button
          onClick={() => setIsOpen(true)}
          onMouseEnter={() => {
            setIsHovering(true);
            setShowControlButton(true);
            // Clear fade out timer when hovering
            if (fadeTimer) {
              clearTimeout(fadeTimer);
              setFadeTimer(null);
            }
          }}
          onMouseLeave={() => {
            setIsHovering(false);
            setShowControlButton(false);
            // Restart fade timer when leaving hover if not paused
            if (!isAnimationPaused && isButtonFading) {
              const fadeOutTimer = setTimeout(() => {
                setIsButtonFading(false);
              }, 7000);
              setFadeTimer(fadeOutTimer);
            }
          }}
          className={`fixed bottom-6 right-6 z-50 flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white rounded-full shadow-2xl hover:shadow-3xl hover:scale-110 group transition-all duration-700 ease-out ${
            isButtonFading && !isSlideUp ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
          } ${isSlideUp ? 'transform translate-y-32' : 'transform translate-y-0'}`}
          style={{
            boxShadow: '0 10px 30px rgba(59, 130, 246, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.1) inset',
            background: 'linear-gradient(135deg, #3b82f6 0%, #6366f1 50%, #8b5cf6 100%)'
          }}
        >
          <div className="relative flex items-center justify-center">
            <MessageCircle className="w-7 h-7 group-hover:scale-110 transition-transform duration-300" />
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
          </div>
        </button>

        
      </>
    );
  }

  return (
    <>
      {/* Reset Button Tooltip - Shows when hovering over glowing reset button */}
      {showResetTooltip && isOpen && isHoveringReset && (
        <div 
          className="fixed z-[1000] pointer-events-none"
          style={{
            left: mousePosition.x + 10,
            top: mousePosition.y - 35
          }}
        >
          <div className="bg-black/90 text-white text-xs px-2 py-1 rounded shadow-lg">
            <span>Reset chat</span>
          </div>
        </div>
      )}

      {/* Instant background extension when collapsed - no delay on mobile */}
      {isCollapsed && isOpen && (
        <div 
          className="fixed z-40"
          style={{
            left: Math.max(0, Math.min(position.x, window.innerWidth - size.width)),
            top: position.y + 60,
            width: size.width,
            height: window.innerHeight, // Always extend to full screen height for instant coverage
            backgroundColor: 'rgba(55, 65, 81, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(75, 85, 99, 0.6)',
            borderTop: 'none',
            borderBottomLeftRadius: '8px',
            borderBottomRightRadius: '8px',
            transform: 'translateZ(0)', // Hardware acceleration for smooth rendering
            willChange: 'transform, top' // Optimize for position changes
          }}
        />
      )}

      <div
        ref={chatRef}
        className={`fixed z-50 bg-gray-900 rounded-lg shadow-2xl border border-gray-700 overflow-hidden ${
          isCollapsed ? 'cursor-pointer' : 'cursor-move'
        } ${isCollapsed ? 'rounded-b-none' : ''}`}
        style={{
          left: Math.max(0, Math.min(position.x, window.innerWidth - size.width)), // Always apply boundary checking
          top: isCollapsed ? position.y : Math.max(0, Math.min(position.y, window.innerHeight - size.height)),
          width: size.width,
          height: size.height,
          backgroundColor: 'rgba(34, 38, 50, 0.95)',
          backdropFilter: 'blur(10px)',
          transform: 'translateZ(0)', // Force hardware acceleration for better rendering
          touchAction: 'none' // Prevent default touch behaviors for better dragging
        }}
        onClick={isCollapsed ? (e) => {
          e.stopPropagation();
          // Only expand if clicking in the center area, not corners (resize handles)
          // And only if not dragging
          if (!isDraggingWindow) {
            const rect = chatRef.current?.getBoundingClientRect();
            if (rect) {
              const clickX = e.clientX - rect.left;
              const clickY = e.clientY - rect.top;
              // Exclude corner areas (first/last 20px of width, any height)
              if (clickX > 20 && clickX < rect.width - 20) {
                handleSnapToDefault();
              }
            }
          }
        } : undefined}
        onMouseDown={!isCollapsed ? handleMouseDown : undefined}
        onTouchStart={!isCollapsed ? handleTouchStart : undefined}
      >
      {/* Header with controls */}
      <div 
        className={`bg-gray-800 bg-opacity-50 p-3 flex items-center justify-between ${
          isCollapsed ? 'cursor-pointer' : 'cursor-grab'
        }`}
        onMouseDown={!isCollapsed ? handleDragStart : undefined}
        onTouchStart={!isCollapsed ? handleTouchStart : undefined}
        style={{ touchAction: 'none' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          <span className="text-white font-medium text-sm">Elite Deal Assistant</span>
        </div>
        
        <div className="flex items-center gap-2 relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isCollapsed) {
                // When collapsed, reposition slightly above original location
                setPosition({ x: position.x, y: 80 });
              } else {
                // When not collapsed, reset the chat
                handleReset();
              }
              setIsHoveringReset(false);
              setShowResetTooltip(false);
              // Stop glowing immediately when clicked
              setIsButtonGlowing(false);
              if (glowTimer) {
                clearTimeout(glowTimer);
                setGlowTimer(null);
              }
            }}
            className={`p-1 rounded transition-all duration-300 cursor-pointer relative ${
              isButtonGlowing 
                ? isHoveringReset 
                  ? 'bg-blue-500' 
                  : 'ring-2 ring-blue-400 ring-opacity-75 animate-pulse hover:bg-gray-600'
                : 'hover:bg-gray-600'
            }`}
            title={isCollapsed ? "Reposition chat to original location" : "Reset chat and start new conversation"}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseEnter={(e) => {
              if (isButtonGlowing) {
                handleResetButtonHover(e, true);
              }
            }}
            onMouseLeave={(e) => {
              handleResetButtonHover(e, false);
            }}
            onMouseMove={(e) => {
              if (isHoveringReset) {
                setMousePosition({ x: e.clientX, y: e.clientY });
              }
            }}
          >
            <RotateCcw className={`w-4 h-4 transition-all duration-300 ${
              isButtonGlowing 
                ? isHoveringReset 
                  ? 'text-white' 
                  : 'text-blue-300 drop-shadow-[0_0_4px_rgba(59,130,246,0.8)]'
                : 'text-gray-300'
            }`} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleSnapToDefault();
            }}
            className={`p-1 rounded transition-all duration-300 cursor-pointer ${
              shouldGlowRestoreButton && isCollapsed
                ? 'bg-blue-500 ring-2 ring-blue-400 ring-opacity-75 animate-pulse hover:bg-blue-600'
                : 'hover:bg-gray-600'
            }`}
            title={isCollapsed ? "Restore chat messages" : "Collapse to bottom"}
            onMouseDown={(e) => e.stopPropagation()}
            onMouseEnter={() => {
              if (isCollapsed && messages.length > 1) {
                setIsHoveringRestoreButton(true);
                setShouldGlowRestoreButton(true);
                
                // Auto-expand after 6 seconds of hovering
                const timer = setTimeout(() => {
                  if (isHoveringRestoreButton) {
                    handleSnapToDefault();
                  }
                }, 6000);
                setHoverTimer(timer);
              }
            }}
            onMouseLeave={() => {
              setIsHoveringRestoreButton(false);
              setShouldGlowRestoreButton(false);
              if (hoverTimer) {
                clearTimeout(hoverTimer);
                setHoverTimer(null);
              }
            }}
          >
            <MousePointer className={`w-4 h-4 transition-colors ${
              shouldGlowRestoreButton && isCollapsed
                ? 'text-white drop-shadow-[0_0_4px_rgba(59,130,246,0.8)]'
                : 'text-gray-300'
            }`} />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
            className="p-1 hover:bg-red-600 rounded transition-colors cursor-pointer"
            title="Close chat"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <X className="w-4 h-4 text-gray-300" />
          </button>
        </div>
      </div>



      {/* Messages area - hidden when collapsed but state preserved */}
      <div 
        className={`flex flex-col transition-all duration-300 ${isCollapsed ? 'hidden' : 'block'}`} 
        style={{ height: 'calc(100% - 60px)' }}
      >
        <div 
          ref={chatContainerRef}
          className="flex-1 overflow-y-scroll p-4 space-y-4 chat-messages-container" 
          style={{ 
            height: 'calc(100% - 80px)',
            overflowY: 'scroll',
            scrollbarWidth: 'auto',
            scrollbarColor: '#6b7280 #374151',
            WebkitOverflowScrolling: 'touch'
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onTouchStart={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
        >
          {messagesWithProducts.map((message, msgIndex) => {
            const isLastBotMsg = message.isBot && msgIndex === messagesWithProducts.map((m, i) => m.isBot ? i : -1).filter(i => i >= 0).at(-1);
            return (
            <div
              key={message.id}
              className={`flex ${message.isBot ? 'justify-start' : 'justify-end'} group`}
            >
              <div className={`flex flex-col ${message.recommendedProduct ? 'max-w-[300px]' : 'max-w-xs'}`}>
                <div
                  className={`px-4 py-2 rounded-lg ${
                    message.isBot
                      ? 'bg-blue-600 bg-opacity-40 text-white border border-blue-500 border-opacity-30'
                      : 'bg-gray-700 text-white'
                  }`}
                  style={{
                    fontFamily: 'Inter, sans-serif',
                    fontWeight: message.isBot ? 300 : 400
                  }}
                >
                  <AnimatedMessage content={formatMessageLinks(message.content)} isBot={message.isBot} />
                </div>
                {message.recommendedProduct && (
                  <div className="mt-2">
                    <ProductHighlightCard link={message.recommendedProduct} />
                  </div>
                )}
                {/* Reply button and Pitch button */}
                <div className={`mt-1 flex gap-3 ${
                  isLastBotMsg ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                } ${message.isBot ? 'justify-start' : 'justify-end'}`}>
                  <button
                    onClick={() => setReplyingTo(message)}
                    className="text-xs text-gray-400 hover:text-blue-400 transition-colors"
                  >
                    Reply to this
                  </button>
                  
                  {/* Multi-colored "Why I Pitch This?" button - always visible on last bot msg with product */}
                  {showPitchButton && isLastBotMsg && (() => {
                    const pitchBlocked = !!hardBlockedUntil;
                    return (
                      <button
                        onClick={handlePitchClick}
                        disabled={pitchBlocked}
                        className={`text-xs transition-colors font-medium ${pitchBlocked ? 'opacity-40 cursor-not-allowed' : ''}`}
                        style={pitchBlocked ? { color: '#6b7280' } : {
                          background: 'linear-gradient(45deg, #3b82f6, #eab308, #22c55e, #a855f7)',
                          backgroundSize: '300% 300%',
                          animation: 'gradient-fade 3s ease-in-out infinite',
                          WebkitBackgroundClip: 'text',
                          WebkitTextFillColor: 'transparent',
                          backgroundClip: 'text'
                        }}
                      >
                        Why I Pitch This?
                      </button>
                    );
                  })()}
                </div>
              </div>
            </div>
            );
          })}
          
          {isSearching && (
            <div className="flex justify-start">
              <div className="bg-gradient-to-r from-purple-600 to-blue-600 bg-opacity-40 border border-purple-500 border-opacity-30 text-white px-4 py-3 rounded-lg min-w-60">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-sm font-medium">Searching products...</span>
                </div>
                <div className="text-xs text-gray-300 max-h-16 overflow-hidden">
                  {searchProducts.map((product, index) => (
                    <div key={index} className="animate-pulse mb-1">
                      Checking {product}...
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {isPitchPending && countdown > 0 && (
            <div className="flex flex-col items-start gap-3">
              {/* Original thinking bubble */}
              <div className="flex justify-start">
                <div className="bg-blue-600 bg-opacity-40 border border-blue-500 border-opacity-30 text-white px-4 py-2 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <div className="text-sm text-gray-300">
                      Crafting perfect pitch... ~{countdown}s
                    </div>
                    {showCancelButton && (
                      <button
                        onClick={handleCancelPitch}
                        className="ml-2 bg-red-500 hover:bg-red-600 text-white px-2 py-1 rounded text-xs"
                      >
                        ✕ Cancel
                      </button>
                    )}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    You can still send messages while I'm crafting this pitch
                  </div>
                </div>
              </div>
              {/* LoadingBreadcrumb — separate below the bubble */}
              <LoadingBreadcrumb
                texts={[
                  "Locking in your perfect deal",
                  "Verified by thousands of buyers",
                  "Reading your mind",
                  "Scanning exclusive offers",
                  "Checking real customer reviews",
                  "Hunting the best price for you",
                  "This one was made for you",
                  "Confirming it's still in stock",
                  "Securing your offer now",
                  "Rated top pick this week",
                ]}
                onClick={() => setShowAgentBadge(v => !v)}
                className="ml-1"
              />
              {showAgentBadge && (
                <AgentThinkingBadge
                  label="Zane is securing your deal"
                  palette={PALETTES[3]}
                />
              )}
            </div>
          )}

          {isTyping && !isSearching && !isPitchPending && (
            <div className="flex flex-col items-start gap-3">
              {/* Original thinking bubble */}
              <div className="flex justify-start">
                <div className="bg-blue-600 bg-opacity-40 border border-blue-500 border-opacity-30 text-white px-4 py-2 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
              {/* LoadingBreadcrumb — separate below the bubble */}
              <LoadingBreadcrumb
                texts={[
                  "Scanning top-rated options",
                  "Reading your mind",
                  "Verified by real buyers",
                  "Finding your perfect match",
                  "Checking stock right now",
                  "Your deal is almost here",
                  "Trusted by thousands",
                  "Almost ready for you",
                  "Cross-checking the best price",
                  "Worth the wait — promise",
                  "Top pick incoming",
                  "Rated #1 this week",
                ]}
                onClick={() => setShowAgentBadge(v => !v)}
                className="ml-1"
              />
              {showAgentBadge && (
                <AgentThinkingBadge
                  label="Zane is reading your vibe"
                  palette={PALETTES[0]}
                />
              )}
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* New message popup notification */}
        {showNewMessagePopup && (
          <div className="absolute top-12 left-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center justify-between z-50">
            <span className="text-sm">New message ready! 👆</span>
            <button
              onClick={() => setShowNewMessagePopup(false)}
              className="ml-2 text-white hover:text-gray-300"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Input area */}
        <div className="border-t border-gray-700 p-4 mt-auto">
          {/* Recommended Questions - Dynamic based on conversation */}
          {(() => {
            const aiMessages = messages.filter(msg => msg.isBot);
            const lastAiMessage = aiMessages[aiMessages.length - 1]?.content.toLowerCase() || '';
            
            let suggestedQuestions = [];
            
            if (messages.length <= 1) {
              // Initial conversation starters
              suggestedQuestions = [
                "Looking for electronics",
                "Need something affordable", 
                "Show me trending deals",
                "Want quality products",
                "Find tech gadgets",
                "Best value items"
              ];
            } else if (lastAiMessage.includes('what') || lastAiMessage.includes('tell me') || lastAiMessage.includes('share')) {
              // AI asked a question - provide contextual responses
              suggestedQuestions = [
                "For work/office use",
                "Something under $50", 
                "High quality preferred",
                "Popular trending items",
                "Tech and gadgets",
                "Home and lifestyle"
              ];
            } else if (lastAiMessage.includes('found') || lastAiMessage.includes('product') || lastAiMessage.includes('match')) {
              // AI recommended a product - provide follow-up questions
              suggestedQuestions = [
                "Tell me more about it",
                "What makes it special?", 
                "Show me alternatives",
                "Is it worth the price?",
                "Any similar options?",
                "What's the best deal?"
              ];
            } else {
              // General conversation follow-ups
              suggestedQuestions = [
                "Show me more options",
                "Something different", 
                "What's most popular?",
                "Best value for money",
                "Latest arrivals",
                "Top rated products"
              ];
            }
            
            // Single question that updates every message
            const singleQuestion = (() => {
              if (messages.length <= 1) {
                const starters = ["Looking for quality products", "Need something reliable", "Show me what's good"];
                return starters[Math.floor(Math.random() * starters.length)];
              } else if (lastAiMessage.includes('what') || lastAiMessage.includes('tell me')) {
                const responses = ["High quality preferred", "Something reliable", "Popular items"];
                return responses[Math.floor(Math.random() * responses.length)];
              } else if (lastAiMessage.includes('found') || lastAiMessage.includes('product')) {
                const followups = ["Tell me more", "What makes it special?", "Any other options?"];
                return followups[Math.floor(Math.random() * followups.length)];
              } else {
                const defaults = ["What's popular?", "Show quality options", "What do you recommend?"];
                return defaults[Math.floor(Math.random() * defaults.length)];
              }
            })();
            
            const suggBlocked = !!(hardBlockedUntil || isTyping);
            return (
              <div className="mb-2">
                <button
                  onClick={() => {
                    if (suggBlocked) return;
                    setInputValue(singleQuestion);
                    setTimeout(handleSendMessage, 100);
                  }}
                  disabled={suggBlocked}
                  className={`px-2 py-1 text-xs transition-colors ${suggBlocked ? 'text-gray-600 opacity-40 cursor-not-allowed' : 'text-blue-400 hover:text-blue-300'}`}
                >
                  {singleQuestion}
                </button>
              </div>
            );
          })()}
          
          {/* Reply indicator */}
          {replyingTo && (
            <div className="mb-3 p-2 bg-gray-800 rounded border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-xs text-gray-400 mb-1">
                    Replying to {replyingTo.isBot ? 'Assistant' : 'You'}:
                  </div>
                  <div className="text-sm text-gray-300 truncate">
                    {replyingTo.content.substring(0, 60)}...
                  </div>
                </div>
                <button
                  onClick={() => setReplyingTo(null)}
                  className="ml-2 text-gray-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          
          {hardBlockedUntil ? (
            <div className="dark">
              <Admonition type="danger" title="You've Hit Your Limit">
                Due to high traffic, messaging is temporarily paused. Try again in a couple minutes.
              </Admonition>
            </div>
          ) : (
            <>
              {spamWarning && (
                <div className="dark mb-2">
                  <Admonition type={spamWarning.type} title={spamWarning.title}>
                    {spamWarning.msg}
                  </Admonition>
                </div>
              )}

              {pitchLimitNotif && (
                <div className="dark mb-2">
                  <Admonition type="warning" title="Pitch Limit Reached">
                    {pitchLimitNotif}
                  </Admonition>
                </div>
              )}

              <div className="flex gap-2">
                <input
                  type="text"
                  data-chat-input
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isTyping && handleSendMessage()}
                  placeholder={replyingTo ? `Reply to message...` : "Ask me anything about deals..."}
                  disabled={isTyping}
                  className={`flex-1 bg-gray-800 text-white px-3 py-2 rounded-lg border focus:outline-none text-sm transition-all duration-200 ${
                    isTyping
                      ? "border-gray-700 opacity-50 cursor-not-allowed pointer-events-none select-none"
                      : "border-gray-600 focus:border-blue-500 cursor-text"
                  }`}
                  style={{ fontFamily: 'Inter, sans-serif' }}
                  onMouseDown={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                  onClick={(e) => e.stopPropagation()}
                />
                <SendButton
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isTyping) handleSendMessage();
                  }}
                  onMouseDown={(e) => e.stopPropagation()}
                  disabled={isTyping}
                />
              </div>
            </>
          )}
        </div>
      </div>
      
      {/* Resize handles - only show when not collapsed */}
      {!isCollapsed && (
        <>
          <div
            className="absolute top-0 left-0 w-4 h-4 cursor-nw-resize bg-gray-600 hover:bg-gray-500 transition-colors opacity-50"
            onMouseDown={(e) => handleResizeStart(e, 'top-left')}
          />
          <div
            className="absolute top-0 right-0 w-4 h-4 cursor-ne-resize bg-gray-600 hover:bg-gray-500 transition-colors opacity-50"
            onMouseDown={(e) => handleResizeStart(e, 'top-right')}
          />
          <div
            className="absolute bottom-0 left-0 w-4 h-4 cursor-sw-resize bg-gray-600 hover:bg-gray-500 transition-colors opacity-50"
            onMouseDown={(e) => handleResizeStart(e, 'bottom-left')}
          />
          <div
            className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize bg-gray-600 hover:bg-gray-500 transition-colors"
            onMouseDown={(e) => handleResizeStart(e, 'bottom-right')}
            style={{
              clipPath: 'polygon(100% 0%, 0% 100%, 100% 100%)'
            }}
          />
        </>
      )}
      
      {/* Horizontal resize handles for collapsed state - only left and right - INVISIBLE but functional */}
      {isCollapsed && (
        <>
          <div
            className="absolute top-0 left-0 w-5 h-full cursor-w-resize opacity-0"
            onMouseDown={(e) => {
              e.stopPropagation(); // Prevent expansion click
              handleResizeStart(e, 'left');
            }}
          />
          <div
            className="absolute top-0 right-0 w-5 h-full cursor-e-resize opacity-0"
            onMouseDown={(e) => {
              e.stopPropagation(); // Prevent expansion click
              handleResizeStart(e, 'right');
            }}
          />
        </>
      )}
      </div>
    </>
  );
}