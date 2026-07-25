import * as RdxHoverCard from "@radix-ui/react-hover-card";
import { encode } from "qss";
import React, { useState, useMemo, useCallback, useEffect } from "react";
import { AnimatePresence, motion, useMotionValue, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

function usePreviewSource(url: string, width: number, height: number, isStatic: boolean, staticImageSrc?: string) {
  return useMemo(() => {
    if (isStatic) return staticImageSrc || "";
    const params = encode({
      url,
      screenshot: true,
      meta: false,
      embed: "screenshot.url",
      colorScheme: "dark",
      "viewport.isMobile": true,
      "viewport.deviceScaleFactor": 1,
      "viewport.width": width * 2.5,
      "viewport.height": height * 2.5,
    });
    return `https://api.microlink.io/?${params}`;
  }, [isStatic, staticImageSrc, url, width, height]);
}

function useHoverState(followMouse: boolean) {
  const [isPeeking, setPeeking] = useState(false);
  const mouseX = useMotionValue(0);
  const followX = useSpring(mouseX, { stiffness: 120, damping: 20 });

  const handlePointerMove = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (!followMouse) return;
    const target = event.currentTarget;
    const targetRect = target.getBoundingClientRect();
    const eventOffsetX = event.clientX - targetRect.left;
    const offsetFromCenter = (eventOffsetX - targetRect.width / 2) * 0.3;
    mouseX.set(offsetFromCenter);
  }, [mouseX, followMouse]);

  const handleOpenChange = useCallback((open: boolean) => {
    setPeeking(open);
    if (!open) mouseX.set(0);
  }, [mouseX]);

  return { isPeeking, handleOpenChange, handlePointerMove, followX };
}

type HoverPeekProps = {
  children: React.ReactNode;
  url: string;
  className?: string;
  peekWidth?: number;
  peekHeight?: number;
  enableMouseFollow?: boolean;
} & (
  | { isStatic: true; imageSrc: string }
  | { isStatic?: false; imageSrc?: never }
);

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}

export const HoverPeek = ({
  children,
  url,
  className,
  peekWidth = 220,
  peekHeight = 140,
  isStatic = false,
  imageSrc = "",
  enableMouseFollow = true,
}: HoverPeekProps) => {
  const isDesktop = useIsDesktop();
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const finalImageSrc = usePreviewSource(url, peekWidth, peekHeight, isStatic, imageSrc);
  const { isPeeking, handleOpenChange, handlePointerMove, followX } = useHoverState(enableMouseFollow);

  useEffect(() => {
    setImageLoadFailed(false);
    if (finalImageSrc) {
      const img = new Image();
      img.src = finalImageSrc;
    }
  }, [finalImageSrc]);
  useEffect(() => { if (!isPeeking) setImageLoadFailed(false); }, [isPeeking]);

  // On mobile/touch devices, skip the hover preview entirely — render children as-is
  if (!isDesktop) {
    return React.isValidElement(children)
      ? React.cloneElement(children as React.ReactElement<any>, { className: cn((children.props as any).className, className) })
      : <span className={className}>{children}</span>;
  }

  const cardMotionVariants = {
    initial: { opacity: 0, rotateY: -90, transition: { duration: 0.15 } },
    animate: { opacity: 1, rotateY: 0, transition: { type: "spring" as const, stiffness: 200, damping: 18 } },
    exit: { opacity: 0, rotateY: 90, transition: { duration: 0.15 } },
  };

  const displayUrl = (() => {
    try {
      const u = new URL(url);
      return u.hostname + (u.pathname !== "/" ? u.pathname : "");
    } catch {
      return url;
    }
  })();

  const triggerChild = React.isValidElement(children)
    ? React.cloneElement(children as React.ReactElement<any>, {
        className: cn((children.props as any).className, className),
        onPointerMove: handlePointerMove,
      })
    : <span className={className} onPointerMove={handlePointerMove}>{children}</span>;

  return (
    <RdxHoverCard.Root openDelay={75} closeDelay={150} onOpenChange={handleOpenChange}>
      <RdxHoverCard.Trigger asChild>
        {triggerChild}
      </RdxHoverCard.Trigger>

      <RdxHoverCard.Portal>
        <RdxHoverCard.Content
          className="[perspective:800px] [--radix-hover-card-content-transform-origin:center_center] z-50"
          side="top"
          align="center"
          sideOffset={12}
          style={{ pointerEvents: "none" }}
        >
          <AnimatePresence>
            {isPeeking && (
              <motion.div
                variants={cardMotionVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                style={{ x: enableMouseFollow ? followX : 0, pointerEvents: "auto" }}
              >
                <div
                  className="relative overflow-hidden rounded-lg shadow-xl border border-white/10"
                  style={{ width: peekWidth }}
                >
                  {imageLoadFailed ? (
                    <div
                      className="flex items-center justify-center bg-neutral-800 text-neutral-400 text-xs"
                      style={{ width: peekWidth, height: peekHeight }}
                    >
                      Preview unavailable
                    </div>
                  ) : (
                    <img
                      src={finalImageSrc}
                      width={peekWidth}
                      height={peekHeight}
                      className="block pointer-events-none bg-neutral-800 align-top"
                      style={{ width: peekWidth, height: peekHeight, objectFit: "cover" }}
                      alt={`Preview of ${displayUrl}`}
                      onError={() => setImageLoadFailed(true)}
                      loading="lazy"
                    />
                  )}

                  {/* View Site button overlaid on preview */}
                  <button
                    onClick={(e) => { e.stopPropagation(); window.open(url, '_blank'); }}
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-white text-[11px] font-bold px-3.5 py-1.5 rounded-full z-20 shadow-lg whitespace-nowrap hover:scale-105 active:scale-95 transition-transform duration-150"
                    style={{ background: "linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a855f7 100%)", boxShadow: "0 2px 12px rgba(139,92,246,0.5)" }}
                  >
                    🌐 View Site →
                  </button>

                  {/* URL label at the bottom of the image */}
                  <div
                    className="absolute bottom-0 left-0 right-0 px-2 py-1.5"
                    style={{
                      background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 70%, transparent 100%)",
                    }}
                  >
                    <p className="text-white text-[10px] font-mono truncate opacity-90">
                      🔗 {displayUrl}
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </RdxHoverCard.Content>
      </RdxHoverCard.Portal>
    </RdxHoverCard.Root>
  );
};
