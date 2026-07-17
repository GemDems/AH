import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import type { AffiliateLink } from "@shared/schema";
import { StoryViewerModal, type Story } from "@/components/ui/story-viewer";

const IG_GRAD_ID = "ig-ring-grad-v2";

function getFallbackImage(link: AffiliateLink): string {
  const initial = encodeURIComponent(link.title.charAt(0).toUpperCase());
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'><rect width='100%' height='100%' fill='#3b82f6'/><text x='50%' y='50%' font-size='160' fill='white' text-anchor='middle' dominant-baseline='central' font-family='sans-serif'>${initial}</text></svg>`
  )}`;
}

function getProductImages(link: AffiliateLink): string[] {
  if (link.imageUrls && link.imageUrls.length > 0) return link.imageUrls;
  if (link.imageUrl) return [link.imageUrl];
  return [getFallbackImage(link)];
}

function getProductStories(link: AffiliateLink): Story[] {
  const imgs = getProductImages(link);
  const ring = imgs.length > 1 ? imgs : [imgs[0], imgs[0]];
  return ring.map((src, i) => ({ id: `${link.id}-${i}`, type: "image" as const, src }));
}

function RingThumbnail({
  title,
  avatar,
  viewedIndices,
  segmentCount,
  isActive,
  onClick,
}: {
  title: string;
  avatar: string;
  viewedIndices: Set<number>;
  segmentCount: number;
  isActive: boolean;
  onClick: () => void;
}) {
  const count = Math.max(2, segmentCount);
  const gapDeg = 12;
  const segDeg = (360 - gapDeg * count) / count;
  const r = 46;
  const allViewed = viewedIndices.size >= count;

  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 cursor-pointer bg-transparent border-none outline-none group"
      style={{ minWidth: 72 }}
      aria-label={`View ${title} stories`}
    >
      <div className="relative w-[72px] h-[72px]">
        <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100">
          {Array.from({ length: count }, (_, i) => {
            const startAngle = -90 + i * (segDeg + gapDeg);
            const endAngle = startAngle + segDeg;
            const x1 = 50 + r * Math.cos((startAngle * Math.PI) / 180);
            const y1 = 50 + r * Math.sin((startAngle * Math.PI) / 180);
            const x2 = 50 + r * Math.cos((endAngle * Math.PI) / 180);
            const y2 = 50 + r * Math.sin((endAngle * Math.PI) / 180);
            const largeArc = segDeg > 180 ? 1 : 0;
            const viewed = viewedIndices.has(i) || allViewed;
            return (
              <path
                key={i}
                d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`}
                fill="none"
                strokeWidth="5"
                strokeLinecap="round"
                stroke={viewed ? "rgba(168,168,168,0.38)" : `url(#${IG_GRAD_ID})`}
                style={{ transition: "stroke 0.3s" }}
              />
            );
          })}
        </svg>
        <div className="absolute inset-[5px] rounded-full bg-white p-[2px]">
          <img
            src={avatar}
            className="w-full h-full rounded-full object-cover transition-transform duration-300 group-hover:scale-110"
            alt={title}
          />
        </div>
        {isActive && (
          <div className="absolute inset-0 rounded-full ring-2 ring-white/60 pointer-events-none" />
        )}
      </div>
      <span className="text-xs text-gray-700 text-center truncate" style={{ maxWidth: 72 }}>
        {title.split(" ").slice(0, 3).join(" ")}
      </span>
    </button>
  );
}

interface ProductStoriesProps {
  products: AffiliateLink[];
}

export default function ProductStories({ products }: ProductStoriesProps) {
  const published = useMemo(() => products.filter((p) => !p.isDraft), [products]);

  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [viewedSets, setViewedSets] = useState<Map<number, Set<number>>>(new Map());

  // Stable ref so callbacks don't change reference when activeIdx changes
  const activeIdxRef = useRef(activeIdx);
  useEffect(() => { activeIdxRef.current = activeIdx; }, [activeIdx]);

  const publishedRef = useRef(published);
  useEffect(() => { publishedRef.current = published; }, [published]);

  const handleThumbnailClick = useCallback((idx: number) => {
    setActiveIdx(idx);
  }, []);

  // onClose: advance to next product, or truly close at the end
  const handleClose = useCallback(() => {
    setActiveIdx((prev) => {
      if (prev === null) return null;
      const next = prev + 1;
      return next < publishedRef.current.length ? next : null;
    });
  }, []);

  // Stable callback — reads activeIdx via ref, never re-creates on each activeIdx change.
  // This prevents the [currentIndex, onStoryChange] effect inside StoryViewerModal
  // from spuriously re-firing every time the active product changes.
  const handleStoryChange = useCallback((storyIdx: number) => {
    const idx = activeIdxRef.current;
    if (idx === null) return;
    const productId = publishedRef.current[idx]?.id;
    if (productId === undefined) return;
    setViewedSets((sets) => {
      const next = new Map(sets);
      const s = new Set(next.get(productId) ?? []);
      s.add(storyIdx);
      next.set(productId, s);
      return next;
    });
  }, []); // intentionally empty — reads live values via refs

  if (published.length === 0) return null;

  const activeProduct = activeIdx !== null ? published[activeIdx] : null;
  const activeStories: Story[] = activeProduct ? getProductStories(activeProduct) : [];
  const activeImages = activeProduct ? getProductImages(activeProduct) : [];
  const activeAvatar = activeImages[0] ?? "";
  const activeUsername = activeProduct?.title.split(" ").slice(0, 3).join(" ") ?? "";
  const activeViewed = activeProduct
    ? (viewedSets.get(activeProduct.id) ?? new Set<number>())
    : new Set<number>();

  return (
    <>
      {/* Instagram gradient defs */}
      <svg width="0" height="0" style={{ position: "absolute", overflow: "hidden" }}>
        <defs>
          <linearGradient id={IG_GRAD_ID} x1="0" y1="100" x2="100" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#feda75" />
            <stop offset="25%" stopColor="#fa7e1e" />
            <stop offset="50%" stopColor="#d62976" />
            <stop offset="75%" stopColor="#962fbf" />
            <stop offset="100%" stopColor="#4f5bd5" />
          </linearGradient>
        </defs>
      </svg>

      {/* Scrollable thumbnail row */}
      <div
        className="w-full overflow-x-auto"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch", paddingBottom: 4 }}
      >
        <style>{`.ps-row::-webkit-scrollbar{display:none}`}</style>
        <div className="ps-row flex gap-4 px-2 py-2 w-max">
          {published.map((product, pi) => {
            const imgs = getProductImages(product);
            const ring = imgs.length > 1 ? imgs : [imgs[0], imgs[0]];
            return (
              <RingThumbnail
                key={product.id}
                title={product.title}
                avatar={imgs[0]}
                viewedIndices={viewedSets.get(product.id) ?? new Set()}
                segmentCount={ring.length}
                isActive={activeIdx === pi}
                onClick={() => handleThumbnailClick(pi)}
              />
            );
          })}
        </div>
      </div>

      {/*
        Single persistent modal — stays mounted across all product transitions.
        productKey changes each time the active product changes, which triggers
        a clean internal state reset (currentIndex → 0, progress → 0) without
        any AnimatePresence unmount/remount animation.
        AnimatePresence here only handles the very first open and very last close.
      */}
      <AnimatePresence>
        {activeIdx !== null && activeProduct && (
          <StoryViewerModal
            key="ps-viewer"
            productKey={activeIdx}
            stories={activeStories}
            username={activeUsername}
            avatar={activeAvatar}
            initialIndex={0}
            viewedIndices={activeViewed}
            onClose={handleClose}
            onStoryChange={handleStoryChange}
          />
        )}
      </AnimatePresence>
    </>
  );
}
