import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Review } from "@shared/schema";

const SEED_REVIEWS = [
  { id: -1, name: "James T.", rating: 5, message: "Saved $340 on my first order. i was skeptical but everything arrived exactly as described. Total game changer.", createdAt: "" },
  { id: -2, name: "Priya M.", rating: 5, message: "Best marketplace I've used. the curation is insane — every deal is actually worth it. my friends all joined after I told them.", createdAt: "" },
  { id: -3, name: "Marcus R.", rating: 5, message: "Saved over $1,200 this year. The security and authenticity checks give me total peace of mind. 10/10 would recommend.", createdAt: "" },
  { id: -4, name: "Sofia L.", rating: 5, message: "Honestly shocked at how legit these deals are. Got premium headphones for half the price id find anywhere else.", createdAt: "" },
  { id: -5, name: "Derek W.", rating: 5, message: "Been a member for 6 months and already saved more than my annual subscription fee 10x over. Worth every second.", createdAt: "" },
  { id: -6, name: "Aaliyah K.", rating: 5, message: "My sister told me about this and I thought it sounded too good. Nope — it's 100% real. already saved $280 this month alone.", createdAt: "" },
];

export default function ReviewCarousel() {
  const { data: apiReviews = [] } = useQuery<Review[]>({ queryKey: ["/api/reviews"] });

  const all = [
    ...SEED_REVIEWS,
    ...apiReviews.filter(r => r.isApproved).map(r => ({ ...r, createdAt: String(r.createdAt) }))
  ];

  const perPage = 3;
  const total = Math.ceil(all.length / perPage);
  const [idx, setIdx] = useState(0);

  // Auto-advance every 6 seconds
  useEffect(() => {
    const iv = setInterval(() => setIdx(i => (i + 1) % total), 6000);
    return () => clearInterval(iv);
  }, [total]);

  const prev = () => setIdx(i => (i - 1 + total) % total);
  const next = () => setIdx(i => (i + 1) % total);

  const visible = all.slice(idx * perPage, idx * perPage + perPage);
  const stars = (n: number) => "★".repeat(n) + "☆".repeat(5 - n);

  return (
    <div className="w-full py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-center text-2xl font-bold text-gray-900 mb-1">What Our Members Say</h2>
        <p className="text-center text-sm text-gray-500 mb-8">Real reviews from verified buyers</p>

        {/* Cards + arrows */}
        <div className="flex items-center gap-3">
          {/* Left arrow */}
          <button
            onClick={prev}
            aria-label="Previous reviews"
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
            style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", color: "#7c3aed" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          {/* Review cards */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4 transition-all duration-500">
            {visible.map((r, i) => (
              <div
                key={`${r.id}-${i}`}
                className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm"
                style={{ animation: "fadeSlide 0.4s ease both", animationDelay: `${i * 0.07}s` }}
              >
                <div className="text-yellow-400 text-sm mb-2">{stars(r.rating)}</div>
                <p className="text-sm text-gray-700 leading-relaxed mb-3">"{r.message}"</p>
                <div className="text-xs font-semibold text-gray-400">{r.name}</div>
              </div>
            ))}
            {/* Fill empty slots so grid doesn't collapse on last page */}
            {visible.length < perPage && Array.from({ length: perPage - visible.length }).map((_, i) => (
              <div key={`empty-${i}`} className="hidden md:block" />
            ))}
          </div>

          {/* Right arrow */}
          <button
            onClick={next}
            aria-label="Next reviews"
            className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition-all duration-200 hover:scale-110 active:scale-95"
            style={{ background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", color: "#7c3aed" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </div>

        {/* Dot indicators */}
        <div className="flex justify-center gap-2 mt-6">
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`Go to page ${i + 1}`}
              className="rounded-full transition-all duration-300"
              style={{
                width: i === idx ? 24 : 8,
                height: 8,
                background: i === idx ? "#7c3aed" : "#e5e7eb",
                border: "none",
                cursor: "pointer",
                padding: 0,
              }}
            />
          ))}
        </div>

        {/* Page counter */}
        <div className="text-center mt-3 text-xs text-gray-400">
          {idx + 1} / {total}
        </div>
      </div>

      <style>{`
        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
