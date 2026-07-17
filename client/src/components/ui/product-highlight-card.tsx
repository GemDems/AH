import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Tag, Cpu, Shirt, Home, Dumbbell, Heart, Star, BookOpen, Car, ShoppingBag } from "lucide-react";
import type { AffiliateLink } from "@shared/schema";

function getCategoryIcon(category?: string | null) {
  if (!category) return <ShoppingBag className="h-3.5 w-3.5" />;
  const lower = category.toLowerCase();
  if (lower.includes("electron") || lower.includes("tech") || lower.includes("gadget") || lower.includes("circuit")) return <Cpu className="h-3.5 w-3.5" />;
  if (lower.includes("fashion") || lower.includes("cloth") || lower.includes("wear") || lower.includes("apparel")) return <Shirt className="h-3.5 w-3.5" />;
  if (lower.includes("home") || lower.includes("kitchen") || lower.includes("garden") || lower.includes("decor")) return <Home className="h-3.5 w-3.5" />;
  if (lower.includes("sport") || lower.includes("fitness") || lower.includes("outdoor") || lower.includes("gym")) return <Dumbbell className="h-3.5 w-3.5" />;
  if (lower.includes("beauty") || lower.includes("health") || lower.includes("wellness") || lower.includes("skin")) return <Heart className="h-3.5 w-3.5" />;
  if (lower.includes("toy") || lower.includes("kids") || lower.includes("child") || lower.includes("game")) return <Star className="h-3.5 w-3.5" />;
  if (lower.includes("book") || lower.includes("education") || lower.includes("learn")) return <BookOpen className="h-3.5 w-3.5" />;
  if (lower.includes("auto") || lower.includes("car") || lower.includes("vehicle") || lower.includes("motor")) return <Car className="h-3.5 w-3.5" />;
  return <Tag className="h-3.5 w-3.5" />;
}

interface Props {
  link: AffiliateLink;
}

export function ProductHighlightCard({ link }: Props) {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const handleMouseMove = ({ clientX, clientY, currentTarget }: React.MouseEvent<HTMLDivElement>) => {
    const { left, top } = currentTarget.getBoundingClientRect();
    mouseX.set(clientX - left);
    mouseY.set(clientY - top);
  };

  const rotateX = useTransform(mouseY, [0, 180], [6, -6]);
  const rotateY = useTransform(mouseX, [0, 280], [-6, 6]);
  const springConfig = { stiffness: 300, damping: 22 };
  const springRotateX = useSpring(rotateX, springConfig);
  const springRotateY = useSpring(rotateY, springConfig);

  const glowX = useTransform(mouseX, [0, 280], [0, 100]);
  const glowY = useTransform(mouseY, [0, 180], [0, 100]);
  const glowOpacity = useTransform(mouseX, [0, 280], [0, 0.55]);

  const imageSrc = (link.imageUrls && link.imageUrls.length > 0 ? link.imageUrls[0] : null) || link.imageUrl || null;
  const desc = link.description ? (link.description.length > 72 ? link.description.slice(0, 72) + "…" : link.description) : null;

  return (
    <motion.div
      onMouseMove={handleMouseMove}
      onMouseLeave={() => { mouseX.set(0); mouseY.set(0); }}
      style={{ rotateX: springRotateX, rotateY: springRotateY, transformStyle: "preserve-3d" }}
      whileHover={{ scale: 1.02 }}
      onClick={() => window.open(link.url, "_blank", "noopener,noreferrer")}
      className="relative w-full rounded-xl cursor-pointer select-none overflow-hidden"
    >
      <div
        style={{ transform: "translateZ(12px)", transformStyle: "preserve-3d" }}
        className="relative rounded-xl bg-gray-900/90 border border-indigo-500/20 shadow-xl p-3.5 flex gap-3 items-start"
      >
        {/* Grid texture */}
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,#80808010_1px,transparent_1px),linear-gradient(to_bottom,#80808010_1px,transparent_1px)] bg-[size:20px_20px] [mask-image:radial-gradient(ellipse_80%_80%_at_50%_50%,#000_60%,transparent_100%)]" />

        {/* Mouse-follow glow */}
        <motion.div
          className="pointer-events-none absolute inset-0 rounded-xl"
          style={{
            opacity: glowOpacity,
            background: `radial-gradient(55px at ${glowX}% ${glowY}%, rgba(99,102,241,0.5), transparent 60%)`,
          }}
        />

        {/* Text content */}
        <div className="relative z-10 flex-1 min-w-0">
          <div className="flex items-center gap-1.5 text-indigo-400 mb-1.5">
            {getCategoryIcon(link.category)}
            <span className="text-[10px] font-semibold uppercase tracking-wider">{link.category || "Product"}</span>
          </div>

          <h3 className="text-white font-bold text-sm leading-snug line-clamp-2 mb-1">
            {link.title}
          </h3>

          {desc && (
            <p className="text-gray-400 text-[11px] leading-relaxed line-clamp-2">{desc}</p>
          )}

          <div className="mt-2.5">
            <span className="text-[11px] font-bold text-blue-400">Get This Deal →</span>
          </div>
        </div>

        {/* Product image */}
        {imageSrc ? (
          <motion.img
            src={imageSrc}
            alt={link.title}
            className="relative z-10 flex-shrink-0 w-[72px] h-[72px] object-contain rounded-lg"
            style={{ transform: "translateZ(20px)" }}
            whileHover={{ scale: 1.1, y: -3 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div className="relative z-10 flex-shrink-0 w-[72px] h-[72px] rounded-lg bg-indigo-900/40 flex items-center justify-center">
            <ShoppingBag className="w-8 h-8 text-indigo-400/60" />
          </div>
        )}
      </div>
    </motion.div>
  );
}
