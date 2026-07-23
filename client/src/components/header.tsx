import { useState, useEffect, useRef } from "react";
import { ShinyButton } from "@/components/ui/shiny-button";
import { NumberTicker } from "@/components/ui/number-ticker";
import { AnimatedGlowingSearchBar } from "@/components/ui/animated-glowing-search-bar";
import { BorderRotate } from "@/components/ui/animated-gradient-border";
import { GlowCard } from "@/components/ui/spotlight-card";
import { LiquidBadge } from "@/components/ui/liquid-badge";

function GuaranteeInfoIcon() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <span ref={ref} className="relative inline-block align-middle ml-1.5" style={{ verticalAlign: "middle" }}>
      <button
        type="button"
        aria-label="How purchases work"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center justify-center w-[13px] h-[13px] rounded-full border transition-colors duration-200 leading-none"
        style={{ fontSize: 8, fontWeight: 700, fontStyle: "italic", verticalAlign: "middle", borderColor: "#fbbf24", color: "#fbbf24" }}
      >
        i
      </button>
      {open && <InfoPopup />}
    </span>
  );
}

function InfoPopup() {
  return (
    <div
      className="absolute z-50 bottom-[calc(100%+10px)] left-1/2 -translate-x-1/2 w-72 rounded-2xl shadow-2xl p-4 text-left"
      style={{ background: "#1c2033", border: "1px solid rgba(255,255,255,0.08)" }}
    >
      {/* arrow */}
      <div className="absolute left-1/2 -translate-x-1/2 -bottom-[7px] w-3 h-3 rotate-45" style={{ background: "#1c2033", borderRight: "1px solid rgba(255,255,255,0.08)", borderBottom: "1px solid rgba(255,255,255,0.08)" }} />
      <div className="flex items-center gap-2 mb-2.5">
        <span className="text-base leading-none">🔒</span>
        <span className="text-[13px] font-bold text-white leading-tight">All purchases happen directly on official retailer sites</span>
      </div>
      <p className="text-[11.5px] leading-relaxed mb-1" style={{ color: "#94a3b8" }}>We never handle your payment or personal info.</p>
      <p className="text-[11.5px] leading-relaxed" style={{ color: "#94a3b8" }}>Every link goes straight to the brand's own store.</p>
    </div>
  );
}

function TrustInfoIcon() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <span ref={ref} className="relative inline-block align-middle ml-1">
      <button
        type="button"
        aria-label="How purchases work"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center justify-center w-[14px] h-[14px] rounded-full border border-gray-400 text-gray-400 hover:border-green-400 hover:text-green-400 transition-colors duration-200 leading-none"
        style={{ fontSize: 9, fontWeight: 700, fontStyle: "italic", verticalAlign: "middle" }}
      >
        i
      </button>
      {open && <InfoPopup />}
    </span>
  );
}

interface LiveStats {
  viewers: number;
  hourlyBuyers: number;
  timestamp: number;
}

const ALL_REVIEWS = [
  { text: `"Saved $340 on my first order. was skeptical at first but this is the real deal, eveything arrived exactly as described."`, author: "tyler", badge: "Verified Buyer" },
  { text: `"Best marketplace ive used. the curation is insane every deal is actually worth it. my friends all joined after I told them."`, author: "brittany", badge: "Member since 2023" },
  { text: `"Legit saved over $1,200 this year. The security and authenticity checks give me total peace of mind. 10/10."`, author: "nathan", badge: "Elite Member" },
  { text: `"I dont usually leave reviews but this place genuinly surprised me. Got a $200 item for $58. no catches at all."`, author: "ashley", badge: "Verified Buyer" },
  { text: `"Scored noise-cancelling headphones for basically nothing. my coworkers keep asking where I got them lol."`, author: "derek", badge: "Member since 2024" },
  { text: `"Thought it was too good to be true. its not. Third order and everythings been prefect."`, author: "kayla", badge: "Verified Buyer" },
  { text: `"The AI assistant helped me find exactly what I needed in like 30 seconds. honestly the best feature on here."`, author: "mike", badge: "Elite Member" },
  { text: `"Got my whole Cristmas shopping done for half price. Everyone was asking where I found this stuff."`, author: "sarah", badge: "Member since 2023" },
  { text: `"Wasnt sure about signing up but the guarantee made me feel safe. glad I did, absolute steal."`, author: "jake", badge: "Verified Buyer" },
  { text: `"Used to spend hours lookng for deals. This just shows me the good ones. my time is worth something."`, author: "amanda", badge: "Member since 2024" },
  { text: `"Omar vouched for this and now im vouching for it. Saved $80 my first week alone."`, author: "chris", badge: "Verified Buyer" },
  { text: `"Finally a marketplace that doesn't feel sketchy. Everything is legit and the prices are wild."`, author: "omar", badge: "Elite Member" },
  { text: `"Bought gym equipment at 60% off. quality is exatly as listed. Zero complaints."`, author: "jessica", badge: "Member since 2024" },
  { text: `"My boyfriend sent me the link and ive been hooked since. Found stuff I didnt even know I needed."`, author: "megan", badge: "Verified Buyer" },
  { text: `"Three orders in, three wins. this thing is consistent which is rare."`, author: "ryan", badge: "Elite Member" },
];

interface HeaderProps {
  onSearch?: (query: string) => void;
}

export default function Header({ onSearch }: HeaderProps) {
  const [viewers, setViewers] = useState(4200);
  const [orders, setOrders] = useState(1470);
  const [reviewPage, setReviewPage] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);
  const [headerSearch, setHeaderSearch] = useState("");
  const totalPages = Math.ceil(ALL_REVIEWS.length / 3);

  const goToPage = (next: number) => {
    setFadeIn(false);
    setTimeout(() => {
      setReviewPage(next);
      setFadeIn(true);
    }, 250);
  };

  const handleReviewScroll = (e: React.WheelEvent<HTMLDivElement>) => {
    if (totalPages <= 1) return;
    e.preventDefault();
    e.stopPropagation();
    if (e.deltaY > 0) {
      goToPage((reviewPage + 1) % totalPages);
    } else {
      goToPage((reviewPage - 1 + totalPages) % totalPages);
    }
  };

  const currentReviews = ALL_REVIEWS.slice(reviewPage * 3, reviewPage * 3 + 3);

  // Poll the server every 4 seconds — same source of truth for every tab and device
  useEffect(() => {
    const fetchStats = () => {
      fetch("/api/live-stats")
        .then(r => r.json())
        .then((data: LiveStats) => {
          setViewers(data.viewers);
          setOrders(data.hourlyBuyers);
        })
        .catch(() => { /* keep last known values on network hiccup */ });
    };
    fetchStats(); // immediate on mount
    const iv = setInterval(fetchStats, 4000);
    return () => clearInterval(iv);
  }, []);

  return (
    <header style={{ background: "#0d0f1a" }} className="w-full">
      {/* Flash sale ticker */}
      <div style={{ background: "linear-gradient(90deg,#e63946,#9b2dca)" }} className="w-full py-2.5 text-center text-xs font-semibold tracking-widest text-white opacity-[0.01]">
        ⚡ FLASH SALE ENDING SOON — {viewers.toLocaleString()} MEMBERS ACTIVE TODAY &nbsp;|&nbsp; SPOTS FILLING FAST ⚡
      </div>
      {/* Search bar */}
      <div className="relative z-20 px-4" style={{ marginTop: "14px" }}>
        <AnimatedGlowingSearchBar
          value={headerSearch}
          onChange={(val) => {
            setHeaderSearch(val);
            onSearch?.(val);
          }}
          placeholder="Search for deals..."
          animatedPhrases={[
            "Search for deals...",
            "Find premium electronics...",
            "Discover trending gadgets...",
            "Search top-rated products...",
            "Find your next favorite...",
          ]}
          onKeyDown={(e) => {
            if (e.key === "Enter" && headerSearch.trim()) {
              onSearch?.(headerSearch);
              window.dispatchEvent(new CustomEvent("zane:query", { detail: { text: headerSearch.trim() } }));
              const el = document.querySelector('[data-section="products"]') as HTMLElement;
              el?.scrollIntoView({ behavior: "smooth" });
            }
          }}
          onFilterClick={() => {
            if (headerSearch.trim()) {
              onSearch?.(headerSearch);
              window.dispatchEvent(new CustomEvent("zane:query", { detail: { text: headerSearch.trim() } }));
            }
            const el = document.querySelector('[data-section="products"]') as HTMLElement;
            el?.scrollIntoView({ behavior: "smooth" });
          }}
        />
      </div>
      {/* Hero */}
      <div className="relative text-center pt-10 pb-2 px-4">
        <div className="mb-3 flex justify-center">
          <LiquidBadge className="sm:w-44 w-40">
            <span className="tracking-[0.06em] sm:tracking-[0.14em] whitespace-nowrap font-black border-t-[0px] border-r-[0px] border-b-[0px] border-l-[0px] sm:text-[8px] text-[8px]" style={{ WebkitTextStroke: "0.5px currentColor" }}>
              #1 PREMIUM MARKETPLACE
            </span>
          </LiquidBadge>
        </div>
        <h1 className="font-extrabold leading-none tracking-tight text-white" style={{ fontSize: "clamp(64px,9vw,88px)", letterSpacing: "-0.02em" }}>
          ELITE<br />
          <span style={{ color: "#2563eb" }}>DEALS</span>
        </h1>
        <div className="mt-2 text-sm font-normal tracking-[0.2em]" style={{ color: "#9ca3af" }}>
          PREMIUM MARKETPLACE
        </div>
        {/* Trust pills */}
        <div className="flex flex-wrap justify-center gap-2 mt-5 max-w-lg mx-auto">
          <span className="px-3.5 py-1 rounded-full text-xs font-semibold border" style={{ background: "rgba(251,191,36,0.1)", borderColor: "rgba(251,191,36,0.3)", color: "#fbbf24" }}></span>
          <span className="px-3.5 py-1 rounded-full text-xs font-semibold border" style={{ background: "rgba(34,197,94,0.1)", borderColor: "rgba(34,197,94,0.3)", color: "#22c55e" }}></span>
          <span className="px-3.5 py-1 rounded-full text-xs font-semibold border" style={{ background: "rgba(96,165,250,0.1)", borderColor: "rgba(96,165,250,0.3)", color: "#60a5fa" }}></span>
        </div>
      </div>
      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-3xl mx-auto px-4 mt-5">
        {[
          { icon: "✅", label: "Verified", desc: "Every product vetted", color: "#4ade80", bg: "rgba(34,197,94,0.15)" },
          { icon: "⭐", label: "4.9/5 Rating", desc: "78K+ reviews", color: "#fbbf24", bg: "rgba(251,191,36,0.15)" },
          { icon: "🏆", label: "#1 Marketplace", desc: "Industry leader", color: "#a78bfa", bg: "rgba(139,92,246,0.15)" },
          { icon: "🔒", label: "Bank-Level", desc: "256-bit encryption", color: "#60a5fa", bg: "rgba(96,165,250,0.15)" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: "#151929", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="w-11 h-11 rounded-full flex items-center justify-center mx-auto mb-2 text-xl" style={{ background: s.bg }}>
              {s.icon}
            </div>
            <div className="text-sm font-bold mb-0.5" style={{ color: s.color }}>{s.label}</div>
            <div className="text-xs" style={{ color: "#6b7280" }}>{s.desc}</div>
          </div>
        ))}
      </div>
      {/* Live bar */}
      <div className="max-w-lg mx-auto px-4 mt-4">
        <div className="rounded-xl px-6 py-3.5 flex justify-around items-center" style={{ background: "#151929", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#22c55e" }}></div>
            <NumberTicker
              value={viewers}
              locale
              duration={0.6}
              className="font-bold text-white"
            />
            <span style={{ color: "#9ca3af" }}>live viewers</span>
          </div>
          <div style={{ width: 1, background: "rgba(255,255,255,0.07)", height: 28 }}></div>
          <div className="flex items-center gap-2 text-sm">
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#60a5fa", animationDelay: "0.4s" }}></div>
            <NumberTicker
              value={orders}
              locale
              duration={0.6}
              className="font-bold text-white"
            />
            <span style={{ color: "#9ca3af" }}>orders this hour</span>
          </div>
        </div>
      </div>
      {/* CTA */}
      <div className="text-center px-4 mt-7 pb-2">
        <div className="inline-block text-3xl font-extrabold px-8 py-2.5 rounded-xl mb-1.5"
          style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ade80" }}>
          $6.2M+ SAVED
        </div>
        <div className="text-xs mb-6" style={{ color: "#6b7280" }}>by our members this month alone</div>
        <ShinyButton
          onClick={() => {
            const chatBtn = document.querySelector('[data-chat-button]') as HTMLElement;
            if (chatBtn) chatBtn.click();
          }}
        >
          CLAIM MY EXCLUSIVE ACCESS →
        </ShinyButton>
        <div className="mt-3 text-xs" style={{ color: "#6b7280" }}>
          <span style={{ color: "#4ade80" }}>98.7%</span> of members got more than they expected &nbsp;|&nbsp; No credit card required
          <TrustInfoIcon />
        </div>
      </div>
      {/* Guarantee */}
      <div className="max-w-lg mx-auto px-4 mt-6">
        <BorderRotate
          animationMode="auto-rotate"
          animationSpeed={4}
          gradientColors={{ primary: "#78350f", secondary: "#fbbf24", accent: "#fef3c7" }}
          backgroundColor="#151221"
          borderWidth={2}
          borderRadius={12}
          className="px-5 py-4 flex gap-4 items-start"
        >
          <div className="text-3xl flex-shrink-0 mt-0.5">🏅</div>
          <div>
            <div className="text-sm font-bold mb-1 flex items-center" style={{ color: "#fbbf24" }}>100% Satisfaction Guarantee<GuaranteeInfoIcon /></div>
            <div className="text-xs leading-relaxed" style={{ color: "#9ca3af" }}>Not happy? We'll make it right — If the deal isn't real, I'll personally find you a better one — or send it to you for free. We're so confident in Elite Deals that we take on all the risk so you don't have to. —elitedealshub.edh@gmail.com</div>
          </div>
        </BorderRotate>
      </div>
      {/* Reviews — 3 shown at a time, scroll to fade through all */}
      <div
        className="max-w-2xl mx-auto px-4 mt-5 pb-8"
        onWheel={handleReviewScroll}
        style={{ cursor: "ns-resize" }}
      >
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-3"
          style={{
            opacity: fadeIn ? 1 : 0,
            transition: "opacity 0.25s ease",
          }}
        >
          {currentReviews.map((r) => (
            <GlowCard
              key={r.author + r.badge}
              glowColor="purple"
              customSize
              className="p-4"
              style={{ background: "#151929", border: "1px solid rgba(255,255,255,0.06)" }}
            >
              <div className="text-xs mb-1.5" style={{ color: "#fbbf24" }}>★★★★★</div>
              <div className="text-xs leading-relaxed mb-2" style={{ color: "#d1d5db" }}>{r.text}</div>
              <div className="text-xs font-medium" style={{ color: "#6b7280" }}>{r.author} — {r.badge}</div>
            </GlowCard>
          ))}
        </div>
        <div className="flex justify-center gap-1.5 mt-3">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => goToPage(i)}
              style={{
                width: i === reviewPage ? "18px" : "6px",
                height: "4px",
                borderRadius: "2px",
                background: i === reviewPage ? "#7c3aed" : "rgba(255,255,255,0.15)",
                border: "none",
                padding: 0,
                cursor: "pointer",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </div>
      </div>
      {/* Footer strip */}
      <div
        className="relative text-center py-3 text-xs group cursor-default"
        style={{ background: "#0a0c14", borderTop: "1px solid rgba(255,255,255,0.05)", color: "#4b5563" }}
      >
        <span style={{ color: "#22c55e" }}>✓</span> Every Deal Verified &nbsp;•&nbsp; No Fake Offers &nbsp;•&nbsp; Secure Checkout &nbsp;•&nbsp; 24/7 Support

        {/* Hover tooltip */}
        <div
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-full mt-2 z-50
            opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        >
          <div
            className="rounded-xl px-4 py-3 text-left whitespace-nowrap shadow-2xl"
            style={{
              background: "#131626",
              border: "1px solid rgba(255,255,255,0.1)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
            }}
          >
            <div className="flex items-start gap-2 mb-1.5">
              <span style={{ color: "#22c55e", fontSize: 13 }}>🔒</span>
              <span className="font-semibold" style={{ color: "#f9fafb", fontSize: 12 }}>
                All purchases happen directly on official retailer sites
              </span>
            </div>
            <div style={{ color: "#9ca3af", fontSize: 11, lineHeight: "1.5" }}>
              We never handle your payment or personal info.<br />
              Every link goes straight to the brand's own store.
            </div>
          </div>
          {/* Caret */}
          <div className="flex justify-center order-first">
            <div style={{
              width: 0, height: 0,
              borderLeft: "7px solid transparent",
              borderRight: "7px solid transparent",
              borderBottom: "7px solid rgba(255,255,255,0.1)",
              marginBottom: -1,
            }} />
          </div>
        </div>
      </div>
      <style>{`
        @keyframes ctapulse {
          0%,100% { box-shadow: 0 0 0 0 rgba(124,58,237,0.5); }
          50% { box-shadow: 0 0 0 14px rgba(124,58,237,0); }
        }
        div::-webkit-scrollbar { display: none; }
      `}</style>
    </header>
  );
}
