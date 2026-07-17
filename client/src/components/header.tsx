import { useState, useEffect, useRef } from "react";
import { ShinyButton } from "@/components/ui/shiny-button";
import { NumberTicker } from "@/components/ui/number-ticker";
import { AnimatedGlowingSearchBar } from "@/components/ui/animated-glowing-search-bar";
import { BorderRotate } from "@/components/ui/animated-gradient-border";
import { GlowCard } from "@/components/ui/spotlight-card";
import { LiquidBadge } from "@/components/ui/liquid-badge";

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
  const getInitialCounts = () => {
    const ONE_HOUR = 60 * 60 * 1000;
    const stored = localStorage.getItem("edh_live_counts");
    if (stored) {
      try {
        const { viewers, orders, resetAt } = JSON.parse(stored);
        if (Date.now() - resetAt < ONE_HOUR) {
          // Only drop 10% of the time; 90% of the time keep or bump up
          let newViewers: number;
          if (Math.random() < 0.10) {
            // Rare drop — small dip, but NEVER below 3,000
            const dropPct = 0.02 + Math.random() * 0.03; // 2–5% drop
            newViewers = Math.max(3000, Math.round(viewers * (1 - dropPct)));
          } else if (Math.random() < 0.15) {
            // Occasional big jump (15% of non-drop refreshes)
            newViewers = viewers + Math.floor(Math.random() * 400) + 150;
          } else {
            // Normal: tiny creep upward
            newViewers = viewers + Math.floor(Math.random() * 40) + 5;
          }
          newViewers = Math.max(3000, newViewers);
          localStorage.setItem("edh_live_counts", JSON.stringify({ viewers: newViewers, orders, resetAt }));
          return { viewers: newViewers, orders, resetAt };
        }
      } catch { /* corrupt storage — fall through */ }
    }
    // Hourly reset: fresh base 3,000–7,500
    const base = Math.floor(Math.random() * 4500) + 3000;
    const counts = { viewers: base, orders: Math.floor(base * 0.35), resetAt: Date.now() };
    localStorage.setItem("edh_live_counts", JSON.stringify(counts));
    return counts;
  };

  const initial = getInitialCounts();
  const [viewers, setViewers] = useState(initial.viewers);
  const [orders, setOrders] = useState(initial.orders);
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

  useEffect(() => {
    const ONE_HOUR = 60 * 60 * 1000;

    const save = (v: number, o: number) => {
      const stored = localStorage.getItem("edh_live_counts");
      const resetAt = stored ? JSON.parse(stored).resetAt : Date.now();
      localStorage.setItem("edh_live_counts", JSON.stringify({ viewers: v, orders: o, resetAt }));
    };

    const checkReset = () => {
      const stored = localStorage.getItem("edh_live_counts");
      if (!stored) return;
      try {
        const { resetAt } = JSON.parse(stored);
        if (Date.now() - resetAt >= ONE_HOUR) {
          const base = Math.floor(Math.random() * 4500) + 3000; // 3,000–7,500
          const newOrders = Math.floor(base * 0.35);
          localStorage.setItem("edh_live_counts", JSON.stringify({ viewers: base, orders: newOrders, resetAt: Date.now() }));
          setViewers(base);
          setOrders(newOrders);
        }
      } catch { /* ignore */ }
    };

    let tickCount = 0;

    const iv = setInterval(() => {
      tickCount++;
      checkReset();

      // Big jump ~15% of ticks, tiny drop ~5% of ticks, rest creep up
      const rand = Math.random();
      const isBigJump = rand < 0.15;
      const isDrop    = rand > 0.95; // only 5% of ticks can drop

      setViewers(v => {
        let next: number;
        if (isBigJump) {
          next = v + Math.floor(Math.random() * 200) + 80; // +80–279
        } else if (isDrop) {
          next = v - (Math.floor(Math.random() * 30) + 10); // -10–39
        } else {
          next = v + Math.floor(Math.random() * 15) + 1; // +1–15
        }
        next = Math.max(3000, next); // FLOOR: never below 3,000
        setOrders(o => {
          const obump = isBigJump
            ? Math.floor(Math.random() * 20) + 8
            : (Math.random() < 0.65 ? 1 : 0);
          const onext = o + obump;
          save(next, onext);
          return onext;
        });
        return next;
      });
    }, 4000);

    return () => clearInterval(iv);
  }, []);

  // ── Scroll → always drop viewers 100-200 ──────────────────────────────────
  useEffect(() => {
    let lastDrop = 0;
    const handleScroll = () => {
      const now = Date.now();
      if (now - lastDrop < 320) return;
      lastDrop = now;
      const drop = Math.floor(Math.random() * 10) + 1;
      setViewers(v => {
        const next = Math.max(3000, v - drop);
        try {
          const stored = localStorage.getItem("edh_live_counts");
          if (stored) {
            const parsed = JSON.parse(stored);
            parsed.viewers = next;
            localStorage.setItem("edh_live_counts", JSON.stringify(parsed));
          }
        } catch {}
        return next;
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
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
          onChange={setHeaderSearch}
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
            <span className="tracking-[0.06em] sm:tracking-[0.14em] whitespace-nowrap font-black border-t-[0px] border-r-[0px] border-b-[0px] border-l-[0px] text-[6px] sm:text-[8px]" style={{ WebkitTextStroke: "0.5px currentColor" }}>
              #1 PREMIUM MARKETPLACE
            </span>
          </LiquidBadge>
        </div>
        <h1 className="font-extrabold leading-none tracking-tight text-white" style={{ fontSize: "clamp(52px,9vw,88px)", letterSpacing: "-0.02em" }}>
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
          <span style={{ color: "#4ade80" }}>98.7%</span> of members got more than they expected &nbsp;|&nbsp; No credit card required to start
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
            <div className="text-sm font-bold mb-1" style={{ color: "#fbbf24" }}>100% Satisfaction Guarantee</div>
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
      <div className="text-center py-3 text-xs" style={{ background: "#0a0c14", borderTop: "1px solid rgba(255,255,255,0.05)", color: "#4b5563" }}>
        <span style={{ color: "#22c55e" }}>✓</span> Every Deal Verified &nbsp;•&nbsp; No Fake Offers &nbsp;•&nbsp; Secure Checkout &nbsp;•&nbsp; 24/7 Support
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
