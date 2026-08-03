import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import type { AffiliateLink } from "@shared/schema";
import Header from "@/components/header";
import StatsBar from "@/components/stats-bar";
import SearchBar from "@/components/search-bar";
import CategoryFilter, { SPECIAL_FILTERS } from "@/components/category-filter";
import AffiliateCard from "@/components/affiliate-card";
import AdminPanel from "@/components/admin-panel";
import TrustIndicators from "@/components/trust-indicators";
import { ChevronDown, Dice6, Gift, Search } from "lucide-react";

import Leaderboard from "@/components/leaderboard";
import ReferralSystem from "@/components/referral-system";
import LiveFeed from "@/components/live-feed";
import SavingsProgress from "@/components/savings-progress";
import IdeaSubmission from "@/components/idea-submission";
import WishlistSection from "@/components/wishlist-section";
import AIChatbot from "@/components/ai-chatbot";
import ContactPopup from "@/components/contact-popup";
import ProductStories from "@/components/product-stories";
import { DiscoverButton, type DiscoverTab } from "@/components/ui/discover-button";
import { ServiceCard } from "@/components/ui/service-card";
import { ProgressiveFluxLoader } from "@/components/ui/progressive-flux-loader";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "wouter";

import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

const DEALS_LOADER_PHASES = [
  { at: 0, label: "reaching out to brands" },
  { at: 30, label: "negotiating partnerships" },
  { at: 60, label: "verifying new deals" },
  { at: 85, label: "adding real products" },
  { at: 100, label: "almost live" },
];

// The "more deals coming soon" loader should only play its full reveal once
// per browser session. Without this, every reload/back-navigation replays
// "reaching out to brands" → "almost live" from scratch, which reads as fake
// once a visitor notices it never actually changes — hurting the exact trust
// it's meant to build. sessionStorage is wrapped in try/catch because it can
// throw in privacy-restricted contexts (e.g. Safari private browsing, some
// embedded/iframed previews); falling back to "not seen" just means the
// reveal plays again, which is harmless.
const DEALS_LOADER_SESSION_KEY = "edh_deals_loader_seen";

function hasSeenDealsLoader(): boolean {
  try {
    return sessionStorage.getItem(DEALS_LOADER_SESSION_KEY) === "1";
  } catch {
    return false;
  }
}

function markDealsLoaderSeen() {
  try {
    sessionStorage.setItem(DEALS_LOADER_SESSION_KEY, "1");
  } catch {
    // Storage unavailable — non-critical, see note above.
  }
}

export default function Home() {
  const [showAdmin, setShowAdmin] = useState(false);
  const [activeCategories, setActiveCategories] = useState<Set<string>>(new Set(["all"]));
  const [activeFilters, setActiveFilters] = useState<Set<string>>(new Set());
  const [dealsLoaderSeen, setDealsLoaderSeen] = useState(hasSeenDealsLoader);

  const toggleFilter = (id: string) => {
    setActiveFilters(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleCategory = (id: string) => {
    setActiveCategories(prev => {
      const next = new Set(prev);
      if (id === "all") {
        return new Set(["all"]);
      }
      // Remove "all" when picking a specific genre
      next.delete("all");
      if (next.has(id)) {
        next.delete(id);
        // Nothing left → fall back to All
        if (next.size === 0) return new Set(["all"]);
      } else {
        next.add(id);
      }
      return next;
    });
  };
  const [searchQuery, setSearchQuery] = useState("");
  const [sortByClicks, setSortByClicks] = useState(false);

  const [discoverTab, setDiscoverTab] = useState<DiscoverTab>("popular");
  const [hasInteractedWithTabs, setHasInteractedWithTabs] = useState(false);
  const [mobileTabsOpen, setMobileTabsOpen] = useState(false);

  // ── VRR gold progress bar ─────────────────────────────────────────────────
  const [vrFilled, setVrFilled] = useState(0);
  const [vrPulse, setVrPulse] = useState(false);
  const vrScrollsSince = useRef(0);
  const vrNextGap = useRef(Math.floor(Math.random() * 5) + 3); // 3–7

  // ── VRR dark-blue card overlay ────────────────────────────────────────────
  const [vrCardOpacity, setVrCardOpacity] = useState(0.01);
  const vrCardScrollsSince = useRef(0);
  const vrCardNextGap = useRef(Math.floor(Math.random() * 6) + 3); // 3–8
  const [showDropdown, setShowDropdown] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [timerCount, setTimerCount] = useState(5);
  const [isTimerActive, setIsTimerActive] = useState(false);
  const [hasExpired, setHasExpired] = useState(false);
  const showScrollButtonRef = useRef(false);
  const hasExpiredRef = useRef(false);
  const showReviewPopupRef = useRef(false);
  const reviewDoneRef = useRef(false);

  // ─── Welcome-back returning visitor ───────────────────────────────────────
  const [showWelcomeBack, setShowWelcomeBack] = useState(false);
  const [showReviewPopup, setShowReviewPopup] = useState(false);
  const [reviewDone, setReviewDone] = useState(false);
  const [reviewName, setReviewName] = useState("");
  const [reviewMsg, setReviewMsg] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState(false);
  useEffect(() => {
    const last = localStorage.getItem("edh_last_visit");
    const now = Date.now();
    if (last && now - parseInt(last) > 60 * 60 * 1000) {
      // Been away > 1 hour — show welcome back
      setTimeout(() => setShowWelcomeBack(true), 2500);
      setTimeout(() => setShowWelcomeBack(false), 7000);
    }
    localStorage.setItem("edh_last_visit", now.toString());
  }, []);


  const { data: affiliateLinks = [], isLoading, refetch } = useQuery<AffiliateLink[]>({
    queryKey: ["/api/affiliate-links"],
  });

  function seededRand(seed: number, offset = 0) {
    const x = Math.sin(seed + offset) * 10000;
    return x - Math.floor(x);
  }

  // Fuzzy match helper — tolerates 1-2 character typos
  function fuzzyMatch(haystack: string, needle: string): boolean {
    if (!needle || needle.length < 2) return false;
    if (haystack.includes(needle)) return true;
    const words = haystack.split(/\s+/);
    const maxDist = needle.length <= 4 ? 1 : 2;
    return words.some(w => {
      if (Math.abs(w.length - needle.length) > maxDist) return false;
      let mismatches = 0;
      for (let i = 0; i < Math.min(w.length, needle.length); i++) {
        if (w[i] !== needle[i]) mismatches++;
        if (mismatches > maxDist) return false;
      }
      return mismatches <= maxDist;
    });
  }

  // Semantic synonym map — "cargo" can mean big/spacious, etc.
  const semanticMap: Record<string, string[]> = {
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

  // Score how well a single query word matches a text field
  function fieldScore(text: string, word: string): number {
    if (!text) return 0;
    let s = 0;
    // Exact substring
    if (text.includes(word)) s += 40;
    // Singular/plural (only add if no exact match already)
    else if (word.endsWith("s") && word.length > 2 && text.includes(word.slice(0, -1))) s += 35;
    else if (!word.endsWith("s") && text.includes(word + "s")) s += 35;
    // Fuzzy: allow 1 typo for words ≥ 4 chars
    else if (word.length >= 4) {
      const wordArr = text.split(/\s+/);
      const maxDist = 1;
      const fuzzy = wordArr.some(w => {
        if (Math.abs(w.length - word.length) > maxDist) return false;
        let mismatches = 0;
        for (let i = 0; i < Math.min(w.length, word.length); i++) {
          if (w[i] !== word[i]) mismatches++;
          if (mismatches > maxDist) return false;
        }
        return mismatches <= maxDist;
      });
      if (fuzzy) s += 22;
    }
    // Semantic synonyms
    const synonyms = semanticMap[word] || [];
    synonyms.forEach(syn => { if (text.includes(syn)) s += 10; });
    return s;
  }

  const filteredAndSortedLinks = (() => {
    const q = searchQuery.toLowerCase().trim();
    const words = q ? q.split(/\s+/).filter(w => w.length > 1) : [];

    const scored = affiliateLinks
      .map(link => {
        const allLinkCategories = [
          link.category,
          ...((link as any).categories || []),
        ].filter(Boolean) as string[];
        const matchesCategory =
          activeCategories.has("all") ||
          [...activeCategories].some(cat =>
            allLinkCategories.some(lc => lc.toLowerCase().includes(cat.toLowerCase()))
          );
        if (!matchesCategory) return null;

        // Special filters
        if (activeFilters.size > 0) {
          const searchable = `${link.title} ${link.description || ""} ${link.aiPrivateInfo || ""}`.toLowerCase();
          const price = parseFloat(link.price || "0") || 0;
          for (const f of activeFilters) {
            if (f === "free_trial" && !searchable.includes("free trial") && !searchable.includes("free plan") && !searchable.includes("try free")) return null;
            if (f === "elite_pick" && !link.isElitePick) return null;
            if (f === "verified" && !link.isVerified) return null;
            if (f === "in_stock" && !(link.stock && link.stock > 0)) return null;
            if (f === "under_25" && !(price > 0 && price < 25)) return null;
            if (f === "under_50" && !(price > 0 && price < 50)) return null;
            if (f === "under_100" && !(price > 0 && price < 100)) return null;
          }
        }

        if (words.length === 0) return { link, score: 0 };

        const title = link.title.toLowerCase();
        const desc  = (link.description || "").toLowerCase();
        const cat   = (link.category || "").toLowerCase();
        const priv  = (link.aiPrivateInfo || "").toLowerCase();

        // Score each word across all fields
        let totalScore = 0;
        words.forEach(word => {
          const wordBest = Math.max(
            fieldScore(title, word) * 1.5,   // title matches worth more
            fieldScore(desc,  word),
            fieldScore(cat,   word),
            fieldScore(priv,  word)
          );
          totalScore += wordBest;
        });

        // Minimum threshold: at least 20 points total to show the product
        if (totalScore < 20) return null;

        return { link, score: totalScore };
      })
      .filter(Boolean) as { link: AffiliateLink; score: number }[];

    return scored
      .sort((a, b) => {
        if (q) return b.score - a.score;
        if (discoverTab === "favorites") {
          const wA = 40 + Math.floor(seededRand(a.link.id, 6) * 180);
          const wB = 40 + Math.floor(seededRand(b.link.id, 6) * 180);
          return wB - wA;
        }
        if (hasInteractedWithTabs && discoverTab === "popular") {
          return (b.link.clicks || 0) - (a.link.clicks || 0);
        }
        if (sortByClicks) return (b.link.clicks || 0) - (a.link.clicks || 0);
        return 0;
      })
      .map(s => s.link);
  })();

  const categories = [
    { id: "all",           label: "All Deals",        emoji: "" },
    { id: "hot",           label: "Hot Deals",        emoji: "🔥" },
    { id: "tech",          label: "Tech & Gadgets",   emoji: "📱" },
    { id: "fashion",       label: "Fashion",          emoji: "👔" },
    { id: "health",        label: "Health & Fitness", emoji: "💪" },
    { id: "travel",        label: "Travel",           emoji: "✈️" },
    { id: "subscriptions", label: "Subscriptions",    emoji: "🔄" },
  ];

  const handleNewDropsClick = () => {
    setSortByClicks(true);
    setActiveCategories(new Set(["all"]));
    setSearchQuery("");
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLeaderboardClick = () => {
    const el = document.querySelector('[data-section="leaderboard"]');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleMyDealsClick = () => {
    const el = document.querySelector('[data-section="savings-progress"]');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleRandomLink = () => {
    if (affiliateLinks.length === 0) return;
    const linksWithClicks = affiliateLinks.map(link => ({ ...link, clicks: link.clicks || 0 }));
    const sortedLinks = linksWithClicks.sort((a, b) => b.clicks - a.clicks);
    const totalWeight = sortedLinks.reduce((sum, _, index) => sum + (index < Math.ceil(sortedLinks.length * 0.6) ? 0.6 : 0.4), 0);
    let random = Math.random() * totalWeight;
    let selectedLink = sortedLinks[0];
    for (let i = 0; i < sortedLinks.length; i++) {
      const weight = i < Math.ceil(sortedLinks.length * 0.6) ? 0.6 : 0.4;
      if (random <= weight) { selectedLink = sortedLinks[i]; break; }
      random -= weight;
    }
    window.open(selectedLink.url, '_blank');
  };

  const handleDropdownCategorySelect = (category: string) => {
    toggleCategory(category);
    if (category === "all") setShowDropdown(false);
  };

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const shouldShow = scrollY > 2000;
      if (shouldShow && !showScrollButtonRef.current && !hasExpiredRef.current) {
        showScrollButtonRef.current = true;
        setShowScrollButton(true);
        setIsTimerActive(true);
        setTimerCount(5);
      }
      if (scrollY < 100) {
        showScrollButtonRef.current = false;
        hasExpiredRef.current = false;
        setShowScrollButton(false);
        setIsTimerActive(false);
        setTimerCount(5);
        setHasExpired(false);
        setShowDropdown(false);
      }
      // Show review popup when near bottom of page
      const nearBottom = scrollY + window.innerHeight >= document.documentElement.scrollHeight - 200;
      if (nearBottom && !reviewDoneRef.current && !showReviewPopupRef.current) {
        showReviewPopupRef.current = true;
        setShowReviewPopup(true);
      }

      // ── VRR gold progress bar logic ────────────────────────────────────────
      vrScrollsSince.current += 1;
      if (vrScrollsSince.current >= vrNextGap.current) {
        setVrFilled(prev => {
          const goForward = Math.random() < 0.62; // 62% forward, 38% back
          let delta: number;
          if (goForward) {
            delta = Math.random() * 10 + 5; // +5 to +15
          } else {
            delta = -(Math.random() * 9 + 4); // -4 to -13
          }
          // Hard cap: 2%–87% — never reaches the end, never empties
          return Math.min(87, Math.max(2, prev + delta));
        });
        setVrPulse(true);
        setTimeout(() => setVrPulse(false), 700);
        vrScrollsSince.current = 0;
        vrNextGap.current = Math.floor(Math.random() * 6) + 3;
      }

      // ── VRR dark-blue card overlay logic ───────────────────────────────────
      vrCardScrollsSince.current += 1;
      if (vrCardScrollsSince.current >= vrCardNextGap.current) {
        // Random opacity between 0.010 and 0.019 (1%–1.9%)
        const newOp = Math.round((0.01 + Math.random() * 0.009) * 1000) / 1000;
        setVrCardOpacity(newOp);
        vrCardScrollsSince.current = 0;
        vrCardNextGap.current = Math.floor(Math.random() * 6) + 3; // 3–8 scrolls until next shift
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (isTimerActive && timerCount > 0) {
      const timer = setTimeout(() => setTimerCount(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (isTimerActive && timerCount === 0) {
      showScrollButtonRef.current = false;
      hasExpiredRef.current = true;
      setShowScrollButton(false);
      setIsTimerActive(false);
      setShowDropdown(false);
      setHasExpired(true);
    }
  }, [isTimerActive, timerCount]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showDropdown && !(event.target as Element).closest('.dropdown-container')) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showDropdown]);


  return (
    <div className="min-h-screen bg-gray-50">
      {/* ── VRR Gold Progress Bar ────────────────────────────────────────────── */}
      <div
        className="fixed top-0 left-0 right-0 pointer-events-none"
        style={{ zIndex: 99999, height: 4 }}
      >
        <div
          style={{
            height: "100%",
            width: `${vrFilled}%`,
            background: "linear-gradient(90deg, #f59e0b, #fcd34d, #f97316, #fcd34d, #f59e0b)",
            backgroundSize: "200% 100%",
            opacity: vrPulse ? 0.18 : 0.01,
            transition: vrPulse
              ? "width 0.25s ease-out, opacity 0.08s ease-in"
              : "width 0.15s linear, opacity 0.55s ease-out",
            boxShadow: vrPulse ? "0 0 18px 6px rgba(251,191,36,0.55), 0 0 4px 1px rgba(251,191,36,0.9)" : "none",
            animation: vrPulse ? "vrr-sweep 0.6s linear" : "none",
          }}
        />
      </div>
      {/* ── WELCOME BACK NOTIFICATION ──────────────────────────────────── */}
      {showWelcomeBack && (
        <div className="fixed top-4 right-4 z-[9997] max-w-xs float-notif">
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl shadow-2xl p-4 flex items-center gap-3">
            <Gift className="w-8 h-8 flex-shrink-0" />
            <div>
              <div className="font-bold text-sm">Welcome back! 🎉</div>
              <div className="text-xs opacity-90">New deals dropped since your last visit</div>
            </div>
          </div>
        </div>
      )}
      {/* Category Dropdown Menu */}
      <div className={`fixed top-4 left-4 z-50 transition-all duration-1000 ${showScrollButton ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
        <div className="relative dropdown-container">
          {isTimerActive && (
            <div className="absolute -top-2 -left-2 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-white text-xs font-bold z-10">
              {timerCount}
            </div>
          )}
          <button
            onClick={() => setShowDropdown(!showDropdown)}
            className="w-8 h-8 bg-white/20 backdrop-blur-md hover:bg-white/30 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 border border-white/30"
            title="Categories"
          >
            <ChevronDown className="w-4 h-4 text-black" />
          </button>
          {showDropdown && (
            <div className="absolute top-10 left-0 bg-white/10 backdrop-blur-lg rounded-lg shadow-xl border border-white/20 py-2 min-w-48 z-50">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => handleDropdownCategorySelect(category.id)}
                  className={`w-full px-4 py-2 text-left flex items-center space-x-2 transition-all duration-200 ${activeCategories.has(category.id) ? "bg-blue-500/30" : "hover:bg-white/20"}`}
                >
                  {category.emoji && <span>{category.emoji}</span>}
                  <span className="text-sm font-medium text-gray-900">{category.label}</span>
                  {activeCategories.has(category.id) && !activeCategories.has("all") && category.id !== "all" && (
                    <span className="ml-auto text-blue-400 text-xs">✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      {/* Invisible Admin Toggle */}
      <div className="fixed top-1 right-1 z-50">
        <Button
          onClick={() => setShowAdmin(true)}
          className="w-6 h-6 sm:w-16 sm:h-16 bg-transparent hover:bg-transparent border-0 shadow-none opacity-0 p-0 min-w-0"
          title="Creator Mode"
        >
          <Settings className="w-2 h-2 opacity-0" />
        </Button>
      </div>
      <Header onSearch={setSearchQuery} />
      {/* Smooth color fade from dark header (#0d0f1a) to white page body */}
      <div
        style={{
          height: 80,
          background: "linear-gradient(to bottom, #0d0f1a 0%, #0d0f1a 10%, #1a1f36 35%, #4a4a6a 60%, #c0c0d8 80%, #ffffff 100%)",
          pointerEvents: "none",
          marginBottom: -1,
        }}
      />
      <StatsBar />
      {/* ── As Seen In ── (absolute overlay, takes no layout space) */}
      <div style={{ position: "relative", height: 0, overflow: "visible", zIndex: 20 }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, opacity: 0.011, pointerEvents: "none", padding: "14px 16px" }}>
          <div className="max-w-5xl mx-auto">
            <p className="text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-gray-300 mb-3">As Seen In</p>
            <div className="flex items-center justify-center gap-10 flex-wrap">
              {[
                { name: "Forbes", src: "/logos/forbes.png", h: 26 },
                { name: "CNN", src: "/logos/cnn.png", h: 30 },
                { name: "Business Insider", src: "/logos/business-insider.png", h: 16 },
                { name: "TechCrunch", src: "/logos/techcrunch.png", h: 28 },
                { name: "WSJ", src: "/logos/wsj.png", h: 28 },
                { name: "Bloomberg", src: "/logos/bloomberg.png", h: 26 },
              ].map((pub) => (
                <img
                  key={pub.name}
                  src={pub.src}
                  alt={pub.name}
                  style={{ height: pub.h, width: "auto", objectFit: "contain", display: "block", filter: "grayscale(100%)" }}
                  draggable={false}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
      <main data-section="products" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center mb-6">
          <h2 className="font-extrabold text-4xl sm:text-5xl mb-2" style={{ color: "#00008B" }}>
            Elite Deals Hub
          </h2>
          <p className="text-base sm:text-lg text-gray-700">
            <strong>Curated deals</strong> by industry experts. <strong>Limited quantities</strong> · Act fast!
          </p>
        </div>
        {/* ── Search bar + Discover tabs row ── */}
        {/* DESKTOP — unchanged */}
        <div className="hidden sm:flex items-center gap-4 mb-12">
          <div className="flex-1 min-w-0">
            <SearchBar onSearch={setSearchQuery} links={affiliateLinks} containerClass="relative" />
          </div>
          <div className="shrink-0 self-center">
            <DiscoverButton
              activeTab={discoverTab}
              onTabChange={(tab) => { setDiscoverTab(tab); setHasInteractedWithTabs(true); }}
            />
          </div>
        </div>
        {/* MOBILE — search icon toggles between SearchBar and tabs */}
        <div className="sm:hidden mb-12">
          {!mobileTabsOpen ? (
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <SearchBar onSearch={setSearchQuery} links={affiliateLinks} containerClass="relative" />
              </div>
              <button
                type="button"
                onClick={() => setMobileTabsOpen(true)}
                className="shrink-0 w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center"
              >
                <Search className="w-5 h-5 text-gray-700" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 justify-center">
              <button
                type="button"
                onClick={() => setMobileTabsOpen(false)}
                className="shrink-0 w-11 h-11 bg-white rounded-full shadow-lg flex items-center justify-center"
              >
                <Search className="w-5 h-5 text-gray-700" />
              </button>
              <DiscoverButton
                activeTab={discoverTab}
                onTabChange={(tab) => { setDiscoverTab(tab); setHasInteractedWithTabs(true); }}
              />
            </div>
          )}
        </div>

        {/* ── Instagram-style product stories ── */}
        <ProductStories products={affiliateLinks} />

        <CategoryFilter categories={categories} activeCategories={activeCategories} onCategoryToggle={toggleCategory} activeFilters={activeFilters} onFilterToggle={toggleFilter} />

        {/* ── FTC / Affiliate Disclosure ──
            FTC's ".com Disclosures" guidance requires this to be "clear and
            conspicuous": legible on mobile without zooming, high enough
            contrast to notice (not to blend into the background), and
            positioned before the consumer acts on any deal claim below.
            10px/#6b7280-on-pale-blue was borderline unreadable on small
            screens — bumped size, weight, and contrast so it actually reads
            as a real disclosure rather than legal fine print people skip. */}
        <div className="flex items-center justify-center gap-2 py-2.5 px-4 mb-4 rounded-lg text-center flex-wrap"
          style={{ background: "#eff6ff", border: "1px solid #bfdbfe" }}>
          <span className="text-xs sm:text-[13px] leading-snug" style={{ color: "#1f2937" }}>
            📋 <strong style={{ color: "#111827" }}>Affiliate Disclosure:</strong> Links on this page may earn us a commission at no extra cost to you. Prices shown at time of listing and may vary.
          </span>
          <Link href="/about" className="text-xs sm:text-[13px] font-semibold hover:underline whitespace-nowrap" style={{ color: "#2563eb", textDecoration: "none" }}>
            Full Legal Disclosure →
          </Link>
        </div>

        {/* ── Temporary "more deals coming" notice ──
            Bounded in its own card (border + subtle shadow) instead of loose
            text, so on narrow/iPhone widths it reads as a deliberate status
            panel rather than an unstyled paragraph sitting awkwardly between
            the disclosure bar and the deal grid. */}
        <div className="text-center mb-6 mx-auto max-w-lg rounded-xl border border-gray-200 bg-white px-4 py-5 sm:px-6 shadow-sm">
          <p className="text-sm sm:text-[15px] font-semibold text-gray-900">🚧 Deals coming soon</p>
          <p className="text-sm text-gray-600 mt-1.5 leading-snug">
            I'm personally reaching out to major affiliate brands and retailers to bring on new partners and real products.
          </p>
          <p className="text-xs text-gray-500 mt-1 mb-4 leading-snug">
            New brands, companies, and deals are being added as partnerships close. Check back shortly — the good stuff is on its way.
          </p>
          <div style={{ "--flux-from": "#2563eb", "--flux-to": "#38bdf8" } as React.CSSProperties}>
            <ProgressiveFluxLoader
              phases={DEALS_LOADER_PHASES}
              value={dealsLoaderSeen ? 100 : undefined}
              duration={12}
              loop={false}
              onComplete={() => {
                markDealsLoaderSeen();
                setDealsLoaderSeen(true);
              }}
              className="max-w-sm mx-auto gap-3"
              barClassName="h-[10px] shadow-none dark:shadow-none"
              textClassName="text-sm sm:text-base text-gray-600 font-medium"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="bg-white rounded-xl shadow-lg p-6 animate-pulse">
                <div className="h-48 bg-gray-200 rounded-lg mb-4"></div>
                <div className="h-6 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded mb-4"></div>
                <div className="h-12 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        ) : filteredAndSortedLinks.length === 0 ? (
          <div className="text-center py-16">
            {searchQuery ? (
              <>
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">
                  No deals found for "{searchQuery}"
                </h3>
                <p className="text-gray-600 mb-6">
                  Can't find what you're looking for? Let our AI assistant help you!
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
                  <button
                    onClick={() => {
                      const chatButton = document.querySelector('[data-chat-button]') as HTMLButtonElement;
                      if (chatButton) {
                        chatButton.click();
                        setTimeout(() => {
                          const chatInput = document.querySelector('[data-chat-input]') as HTMLInputElement;
                          if (chatInput) {
                            chatInput.value = `I'm looking for "${searchQuery}"`;
                            chatInput.focus();
                          }
                        }, 500);
                      }
                    }}
                    className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-8 py-4 rounded-lg font-medium text-lg shadow-lg transform transition-all duration-200 hover:scale-105 flex items-center gap-3"
                  >
                    🤖 Ask AI Assistant
                  </button>
                  <button onClick={() => setSearchQuery("")} className="bg-conversion-blue hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium">
                    Clear Search
                  </button>
                </div>
                <p className="text-sm text-gray-500">Or try a different search term or browse our categories</p>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-semibold text-gray-900 mb-4">No deals available yet</h3>
                <p className="text-gray-600 mb-8">Use Creator Mode to add your first affiliate link!</p>
                <Button onClick={() => setShowAdmin(true)} className="bg-conversion-blue hover:bg-blue-700">
                  Add Your First Deal
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="relative">
            {/* VRR dark-blue tint overlay — ON TOP of cards, pointer-events:none so all clicks pass through */}
            <div
              className="absolute inset-0 rounded-xl pointer-events-none"
              style={{
                background: "#00008B",
                opacity: vrCardOpacity,
                transition: "opacity 1.2s ease-in-out",
                zIndex: 10,
              }}
            />
            {(() => {
              const first = filteredAndSortedLinks.slice(0, 2);
              const rest  = filteredAndSortedLinks.slice(2);
              const restCols =
                rest.length === 1 ? "grid-cols-1 max-w-sm mx-auto"
                : "grid-cols-1 sm:grid-cols-2";
              const scrollTo = (selector: string) => {
                document.querySelector(selector)?.scrollIntoView({ behavior: "smooth", block: "start" });
              };
              return (
                <>
                  <div className="grid gap-6 grid-cols-1 sm:grid-cols-2">
                    {first.map((link, i) => (
                      <div key={link.id} data-product-card={i === 0 ? "first" : undefined} data-product-id={link.id}>
                        <AffiliateCard link={link} />
                      </div>
                    ))}
                  </div>

                  {/* ── Conversion section — perfect scroll-pause spot ── */}
                  <div className="my-8">
                    <p className="text-center text-xs font-semibold uppercase tracking-widest text-gray-400 mb-4">Why Elite Deals Hub</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <ServiceCard
                        variant="red"
                        title="Best Price Guarantee"
                        description="Every deal is manually vetted. If you find it cheaper elsewhere, we'll match it — no questions asked."
                        imgSrc="https://www.thiings.co/_next/image?url=https%3A%2F%2Flftz25oez4aqbxpq.public.blob.vercel-storage.com%2Fimage-DFiJBJyUFg9QYTZOWEFeeza18HBnty.png&w=320&q=75"
                        imgAlt="Price guarantee"
                        linkLabel="SEE ALL DEALS"
                        onLinkClick={() => scrollTo('[data-product-card="first"]')}
                        className="min-h-[160px]"
                      />
                      <ServiceCard
                        variant="blue"
                        title="100% Verified Products"
                        description="Nothing goes live without passing our quality check. Scam-proof, sourced, and authenticated."
                        imgSrc="https://www.thiings.co/_next/image?url=https%3A%2F%2Flftz25oez4aqbxpq.public.blob.vercel-storage.com%2Fimage-SxvnIpN2RVwLK77XxK3MnVCU6Xgc29.png&w=320&q=75"
                        imgAlt="Verified products"
                        linkLabel="HOW WE VERIFY"
                        onLinkClick={() => scrollTo('[data-section="trust"]')}
                        className="min-h-[160px]"
                      />
                      <ServiceCard
                        variant="default"
                        title="AI Deal Finder"
                        description="Can't find it? Our AI assistant knows every product in our database and finds the perfect match for you."
                        imgSrc="https://www.thiings.co/_next/image?url=https%3A%2F%2Flftz25oez4aqbxpq.public.blob.vercel-storage.com%2Fimage-J7XYh5Cix5CceVeAtkuVXYSGgrhjDL.png&w=320&q=75"
                        imgAlt="AI assistant"
                        linkLabel="ASK AI NOW"
                        onLinkClick={() => {
                          const chatButton = document.querySelector('[data-chat-button]') as HTMLButtonElement;
                          if (chatButton) chatButton.click();
                        }}
                        className="min-h-[160px]"
                      />
                      <ServiceCard
                        variant="gray"
                        title="VIP Member Rewards"
                        description="Refer 3 friends and unlock VIP status, bonus codes, and exclusive drops before anyone else."
                        imgSrc="https://www.thiings.co/_next/image?url=https%3A%2F%2Flftz25oez4aqbxpq.public.blob.vercel-storage.com%2Fimage-nY3Stc1545aP21dAi1IEbYlnc4rovS.png&w=320&q=75"
                        imgAlt="VIP rewards"
                        linkLabel="JOIN VIP"
                        onLinkClick={() => scrollTo('[data-section="savings-progress"]')}
                        className="min-h-[160px]"
                      />
                    </div>
                  </div>

                  {rest.length > 0 && (
                    <div className={`grid gap-6 ${restCols}`}>
                      {rest.map((link) => (
                        <div key={link.id} data-product-id={link.id}>
                          <AffiliateCard link={link} />
                        </div>
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
        )}
      </main>
      <div data-section="trust"><TrustIndicators /></div>
      <div className="bg-white pt-0 pb-10" data-section="leaderboard">
        <Leaderboard />
      </div>
      <div className="bg-gray-100 py-8 border-t" data-section="savings-progress">
        <div className="max-w-md mx-auto">
          <h2 className="text-center text-gray-500 text-xs mb-4 uppercase tracking-wider">Elite Access</h2>
          <ReferralSystem />
        </div>
      </div>
      <div className="bg-gray-900 py-16">
        <LiveFeed />
      </div>
      <div className="bg-gray-900 py-4">
        <div className="text-center">
          <button onClick={handleNewDropsClick} className="text-white text-sm mx-4 hover:text-blue-300 transition-colors underline">
            🔥 New Drops
          </button>
          <span className="text-gray-500">|</span>
          <button onClick={handleLeaderboardClick} className="text-white text-sm mx-4 hover:text-blue-300 transition-colors underline">
            🎁 View Leaderboard
          </button>
          <span className="text-gray-500">|</span>
          <button onClick={handleMyDealsClick} className="text-white text-sm mx-4 hover:text-blue-300 transition-colors underline">
            🛍️ My Deals
          </button>
        </div>
      </div>
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 py-8">
        <div className="text-center">
          <button
            onClick={handleRandomLink}
            className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 mx-auto mb-4"
            title="Random Deal"
          >
            <Dice6 className="w-8 h-8 text-white" />
          </button>
          <p className="text-white text-sm">Click for a random!</p>
        </div>
      </div>
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 py-12">
        <div className="max-w-md mx-auto px-4">
          <IdeaSubmission />
        </div>
      </div>
      {/* Leave a Review popup — appears when user scrolls to bottom */}
      {showReviewPopup && !reviewDone && (
        <div className="fixed bottom-4 right-4 z-[9998] w-80 bg-white rounded-2xl shadow-2xl border border-gray-200 p-5 animate-in slide-in-from-bottom">
          <button
            onClick={() => { setShowReviewPopup(false); setReviewDone(true); }}
            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-lg leading-none"
          >×</button>
          {reviewSuccess ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-2">🎉</div>
              <div className="font-bold text-gray-900 mb-1">Thanks for your review!</div>
              <div className="text-xs text-gray-500">It means a lot to us.</div>
            </div>
          ) : (
            <>
              <div className="font-bold text-gray-900 mb-1">Enjoying Elite Deals?</div>
              <div className="text-xs text-gray-500 mb-3">Leave a quick review — it helps others discover real deals.</div>
              {/* Stars */}
              <div className="flex gap-1 mb-3">
                {[1,2,3,4,5].map(s => (
                  <button key={s} onClick={() => setReviewRating(s)} className="text-2xl" style={{ color: s <= reviewRating ? "#f59e0b" : "#d1d5db", background: "none", border: "none", cursor: "pointer" }}>★</button>
                ))}
              </div>
              <input
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-2 focus:outline-none focus:border-blue-400"
                placeholder="Your name"
                value={reviewName}
                onChange={e => setReviewName(e.target.value.toLowerCase())}
                maxLength={40}
              />
              <textarea
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3 focus:outline-none focus:border-blue-400 resize-none"
                placeholder="Share your experience..."
                rows={3}
                value={reviewMsg}
                onChange={e => setReviewMsg(e.target.value)}
                maxLength={300}
              />
              <div className="relative w-full">
                <button
                  disabled={reviewSubmitting || !reviewName.trim() || !reviewMsg.trim()}
                  onClick={async () => {
                    if (!reviewName.trim() || !reviewMsg.trim()) return;
                    setReviewSubmitting(true);
                    try {
                      const deviceId = localStorage.getItem("deviceId") || `anon_${Date.now()}`;
                      await fetch("/api/reviews", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ name: reviewName.trim(), rating: reviewRating, message: reviewMsg.trim(), deviceId })
                      });
                      setReviewSuccess(true);
                      setTimeout(() => { setShowReviewPopup(false); setReviewDone(true); }, 2500);
                    } catch { setReviewSubmitting(false); }
                  }}
                  className="w-full py-2.5 rounded-full text-sm font-semibold text-white transition-all"
                  style={{
                    background: reviewSubmitting || !reviewName.trim() || !reviewMsg.trim() ? "#374151" : "#0f0f0f",
                    border: "none",
                    cursor: reviewSubmitting || !reviewName.trim() || !reviewMsg.trim() ? "not-allowed" : "pointer",
                    letterSpacing: "0.01em",
                  }}
                >
                  {reviewSubmitting ? "Submitting..." : "Submit Review"}
                </button>
                {!reviewSubmitting && (
                  <span
                    className="absolute -top-2.5 -right-1 text-[9px] font-bold text-white px-2 py-[3px] rounded-full pointer-events-none select-none"
                    style={{ background: "linear-gradient(90deg,#7c3aed,#06b6d4)", lineHeight: 1 }}
                  >
                    free
                  </span>
                )}
              </div>
            </>
          )}
        </div>
      )}
      <AdminPanel
        isOpen={showAdmin}
        onClose={() => setShowAdmin(false)}
        onSuccess={() => { refetch(); setShowAdmin(false); }}
      />
      <AIChatbot />
      <WishlistSection />
      {/* Site footer */}
      <div className="mt-10 pb-6 text-center space-y-2">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          <ContactPopup />
          <Link href="/about" className="text-xs hover:opacity-70 transition-opacity" style={{ color: "#4b5563", textDecoration: "none" }}>
            About Us &amp; Legal
          </Link>
        </div>
        <p className="text-xs" style={{ color: "#374151" }}>
          © {new Date().getFullYear()} Elite Deals Hub · Affiliate links may earn us a commission at no cost to you
        </p>
      </div>
    </div>
  );
}
