import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface InteractiveProductPopupProps {
  imageUrl: string;
  title: string;
  description: string;
  price: string;
  badge?: string;
  className?: string;
  onClose: () => void;
}

export function InteractiveProductPopup({
  imageUrl,
  title,
  description,
  price,
  badge,
  className,
  onClose,
}: InteractiveProductPopupProps) {
  const cardRef = React.useRef<HTMLDivElement>(null);
  const [style, setStyle] = React.useState<React.CSSProperties>({});

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const { left, top, width, height } = cardRef.current.getBoundingClientRect();
    const x = e.clientX - left;
    const y = e.clientY - top;
    const rotateX = ((y - height / 2) / (height / 2)) * -4;
    const rotateY = ((x - width / 2) / (width / 2)) * 4;
    setStyle({
      transform: `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.015, 1.015, 1.015)`,
      transition: "transform 0.1s ease-out",
    });
  };

  const handleMouseLeave = () => {
    setStyle({
      transform: "perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)",
      transition: "transform 0.4s ease-in-out",
    });
  };

  return (
    <div
      className={cn(
        "absolute inset-0 z-50 flex items-center justify-center p-2 animate-in fade-in zoom-in-95 duration-200",
        className
      )}
      onDoubleClick={(e) => { e.stopPropagation(); onClose(); }}
      data-testid="popup-product-quickview"
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={style}
        className="relative w-full h-full rounded-2xl overflow-hidden shadow-2xl"
      >
        <img
          src={imageUrl}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ transform: "scale(1.08)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />

        <button
          onClick={(e) => { e.stopPropagation(); onClose(); }}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
          data-testid="button-close-quickview"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative h-full w-full p-4 flex flex-col justify-between">
          <div className="flex items-start justify-between rounded-xl border border-white/15 bg-white/10 p-3 pr-11 backdrop-blur-md">
            <div className="flex flex-col min-w-0">
              <h3 className="text-base font-bold text-white" data-testid="text-popup-title">
                {title}
              </h3>
              <p className="text-[11px] text-white/80 mt-0.5" data-testid="text-popup-description">
                {description}
              </p>
            </div>
            {badge ? (
              <span className="text-xl leading-none ml-2 shrink-0">{badge}</span>
            ) : null}
          </div>

          <div className="flex items-end justify-end">
            <div className="rounded-full bg-black/50 px-4 py-1.5 text-sm font-bold text-white backdrop-blur-sm" data-testid="text-popup-price">
              {price}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
