import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, ShoppingCart, Users, Star, Clock, TrendingUp, Award, AlertCircle, Trash2, Eye, EyeOff, Heart, Zap, Lock, Flame, BadgeCheck } from "lucide-react";
import ProductCardImages from "@/components/ui/product-card-images";
import { InteractiveProductPopup } from "@/components/ui/interactive-product-popup";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AffiliateLink } from "@shared/schema";
import { HoverPeek } from "@/components/ui/link-preview";

interface ConversionAffiliateCardProps {
  link: AffiliateLink;
}

function seededRand(seed: number, offset: number = 0) {
  const x = Math.sin(seed + offset) * 10000;
  return x - Math.floor(x);
}

export default function ConversionAffiliateCard({ link }: ConversionAffiliateCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showQuickView, setShowQuickView] = useState(false);
  const { toast } = useToast();

  const pinchStartDist = useRef<number | null>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey && e.deltaY < 0) { e.preventDefault(); setShowQuickView(true); }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchStartDist.current = Math.hypot(dx, dy);
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2 && pinchStartDist.current !== null) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      if (Math.hypot(dx, dy) - pinchStartDist.current > 20) {
        pinchStartDist.current = null;
        setShowQuickView(true);
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => { pinchStartDist.current = null; }, []);

  const queryClient = useQueryClient();
  const seed = link.id;

  const buyers      = 100 + Math.floor(seededRand(seed, 1) * 900);
  const rating      = (4.0 + seededRand(seed, 2) * 1).toFixed(1);
  const reviews     = 50  + Math.floor(seededRand(seed, 3) * 450);
  const savedAmount = 50  + Math.floor(seededRand(seed, 4) * 200);
  const demandPct   = 30  + Math.floor(seededRand(seed, 5) * 50);
  const wishlists   = 40  + Math.floor(seededRand(seed, 6) * 180);
  const inCart      = 3   + Math.floor(seededRand(seed, 7) * 18);
  const timeLeft    = 1   + Math.floor(seededRand(seed, 8) * 11);
  const stockBase   = 3   + Math.floor(seededRand(seed, 9) * 8);
  const discounts   = ['25%', '40%', '50%', '60%', '70%'];
  const discount    = discounts[Math.floor(seededRand(seed, 10) * discounts.length)];
  const viewersBase = 5   + Math.floor(seededRand(seed, 12) * 20);

  const [secsLeft, setSecsLeft] = useState(timeLeft * 3600);
  useEffect(() => {
    const tick = setInterval(() => setSecsLeft(s => (s > 0 ? s - 1 : s)), 1000);
    return () => clearInterval(tick);
  }, []);

  const fmtTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m.toString().padStart(2, "0")}m`;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };
  const timerCritical = secsLeft < 600;

  const [stock, setStock] = useState(stockBase);
  useEffect(() => {
    const t = setTimeout(() => setStock(s => (s > 1 ? s - 1 : s)),
      (3 + Math.floor(Math.random() * 4)) * 60 * 1000);
    return () => clearTimeout(t);
  }, [stock]);

  const [viewers, setViewers] = useState(viewersBase);
  useEffect(() => {
    const iv = setInterval(() => setViewers(v => Math.max(3, v + Math.floor(Math.random() * 5) - 2)), 7000);
    return () => clearInterval(iv);
  }, []);

  const alerts = [
    "🚨 PRICE JUST DROPPED — ACT NOW",
    "⚡ ONLY A FEW LEFT — SELLING FAST",
    "🔥 TOP DEAL OF THE DAY",
    "⚠️ {viewers} PEOPLE VIEWING RIGHT NOW",
    "🎯 EXCLUSIVE DEAL — LIMITED TIME",
  ];
  const [alertIdx, setAlertIdx] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setAlertIdx(i => (i + 1) % alerts.length), 3500);
    return () => clearInterval(iv);
  }, []);

  const getPrice = () => {
    if (link.price && link.price.trim()) return link.price;
    const prices = ['$49', '$79', '$129', '$199', '$299', '$399'];
    return prices[Math.floor(seededRand(seed, 13) * prices.length)];
  };
  const price = getPrice();
  const priceNum = parseFloat(price.replace(/[^0-9.]/g, '')) || 99;
  const originalPrice = Math.round(priceNum * 2.2);
  const retailPrice   = Math.round(priceNum * 1.35);

  const trackClickMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/affiliate-links/${link.id}/click`);
      return response.json();
    },
  });

  const deleteLinkMutation = useMutation({
    mutationFn: async (password: string) => {
      const response = await apiRequest("DELETE", `/api/affiliate-links/${link.id}`, { password });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/affiliate-links"] });
      toast({ title: "Success", description: "Product deleted successfully" });
      setShowDeleteDialog(false);
      setPassword("");
    },
    onError: (error: any) => {
      toast({ title: "Error", description: error.message || "Failed to delete product", variant: "destructive" });
      setPassword("");
    },
  });

  const handleDelete = (e: React.FormEvent) => {
    e.preventDefault();
    deleteLinkMutation.mutate(password);
  };

  const handleClick = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const priceMatch = price.match(/\$?(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (priceMatch && (window as any).updateSavingsProgress) {
      const amount = parseInt(priceMatch[1].replace(/,/g, ''));
      (window as any).updateSavingsProgress(amount);
    }
    trackClickMutation.mutate();
    window.open(link.url, '_blank');
  };

  const [allImages, setAllImages] = useState<string[]>(() =>
    link.imageUrl && link.imageUrl.trim() ? [link.imageUrl] : []
  );

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/affiliate-links/${link.id}/images`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (cancelled) return;
        const imgs: string[] = data?.imageUrls?.filter((u: string) => u && u.trim()) ?? [];
        if (imgs.length > 0) setAllImages(imgs);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [link.id]);

  const alertText = alerts[alertIdx].replace("{viewers}", String(viewers));

  const starCount = Math.round(parseFloat(rating));

  return (
    <>
      <Card className="rounded-2xl overflow-hidden border-0 shadow-2xl relative"
        style={{ background: "#0f0f0f", boxShadow: "0 0 0 2px #dc2626, 0 20px 60px rgba(220,38,38,0.25)" }}>

        {/* ── TOP RED ALERT BANNER — always shown ── */}
        <div className="relative z-30 flex items-center justify-center gap-2 py-1.5 px-3 text-xs font-bold text-white"
          style={{ background: "linear-gradient(90deg,#7f1d1d,#dc2626,#7f1d1d)", animation: "urgency-breathe 2s ease-in-out infinite" }}>
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-yellow-300" />
          <span className="truncate tracking-wide">{alertText}</span>
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 text-yellow-300" />
        </div>

        {/* ── STOCK WARNING ── */}
        {stock > 0 && (
          <div className="relative z-20 flex items-center justify-center gap-1.5 py-1 px-3 text-xs font-bold"
            style={{ background: "linear-gradient(90deg,#450a0a,#991b1b,#450a0a)", color: "#fca5a5" }}>
            <Flame className="w-3 h-3 text-orange-400" />
            ONLY {stock} LEFT IN STOCK — DEMAND IS EXTREME
            <Flame className="w-3 h-3 text-orange-400" />
          </div>
        )}

        {/* ── IMAGE ── */}
        <div className="relative"
          onDoubleClick={e => { e.stopPropagation(); setShowQuickView(true); }}
          onWheel={handleWheel} onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>

          {/* Bestseller badge */}
          <div className="absolute top-2 left-2 z-10">
            <div className="text-xs font-black px-2.5 py-1 rounded-full shadow-lg"
              style={{ background: "linear-gradient(135deg,#fbbf24,#f59e0b)", color: "#1c1917" }}>
              🏆 BESTSELLER
            </div>
          </div>

          {/* Timer */}
          <div className="absolute top-2 right-2 z-10">
            <div className={`text-xs font-bold px-2.5 py-1 rounded-full shadow-lg flex items-center gap-1 ${timerCritical ? "animate-pulse" : ""}`}
              style={{ background: timerCritical ? "#dc2626" : "linear-gradient(135deg,#dc2626,#7f1d1d)", color: "#fff" }}>
              <Clock className="w-3 h-3" />{fmtTime(secsLeft)}
            </div>
          </div>

          <ProductCardImages images={allImages} title={link.title} className="w-full h-48" />
        </div>

        {showQuickView && allImages.length > 0 && (
          <InteractiveProductPopup
            imageUrl={allImages[0]} title={link.title}
            description={link.description} price={price}
            badge="🔥" onClose={() => setShowQuickView(false)} />
        )}

        <CardContent className="p-5 space-y-3.5" style={{ background: "#0f0f0f", color: "#f5f5f5" }}>

          {/* Title */}
          <h3 className="text-xl font-black leading-tight text-white">
            {link.title}
          </h3>

          {/* ── STAR RATING — yellow ── */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className={`w-4 h-4 ${i < starCount ? "fill-yellow-400 text-yellow-400" : "text-gray-600"}`} />
              ))}
            </div>
            <span className="text-yellow-400 font-bold text-sm">{rating}</span>
            <span className="text-gray-400 text-xs">({reviews.toLocaleString()} reviews)</span>
          </div>

          {/* Description */}
          <p className="text-gray-400 text-sm line-clamp-2 leading-relaxed">
            {link.description}
          </p>

          {/* ── PRICE — green, bold ── */}
          <div className="rounded-xl p-3.5 space-y-1.5"
            style={{ background: "linear-gradient(135deg,rgba(21,128,61,0.25),rgba(20,83,45,0.4))", border: "1.5px solid #16a34a" }}>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-3xl font-black" style={{ color: "#4ade80" }}>{price}</span>
              <span className="text-lg text-gray-500 line-through">${originalPrice}</span>
              <span className="ml-auto text-xs font-black px-2 py-0.5 rounded-full"
                style={{ background: "#16a34a", color: "#fff" }}>SAVE {discount}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-gray-400" />
              <span className="text-xs text-gray-400">vs retail</span>
              <span className="text-xs font-bold text-red-400 line-through">${retailPrice}</span>
              <span className="text-xs text-green-400 font-semibold ml-auto">You save ${retailPrice - priceNum > 0 ? Math.round(retailPrice - priceNum) : savedAmount}</span>
            </div>
          </div>

          {/* ── STATS GRID ── */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg p-2.5 flex items-center gap-2"
              style={{ background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.3)" }}>
              <Users className="w-4 h-4 text-red-400 flex-shrink-0" />
              <div>
                <div className="text-xs font-black text-red-300">{buyers.toLocaleString()} bought</div>
                <div className="text-[10px] text-gray-500">this week</div>
              </div>
            </div>
            <div className="rounded-lg p-2.5 flex items-center gap-2"
              style={{ background: "rgba(234,179,8,0.15)", border: "1px solid rgba(234,179,8,0.3)" }}>
              <TrendingUp className="w-4 h-4 text-yellow-400 flex-shrink-0" />
              <div>
                <div className="text-xs font-black text-yellow-300">+{demandPct}% demand</div>
                <div className="text-[10px] text-gray-500">trending ↗</div>
              </div>
            </div>
            <div className="rounded-lg p-2.5 flex items-center gap-2"
              style={{ background: "rgba(21,128,61,0.15)", border: "1px solid rgba(21,128,61,0.3)" }}>
              <Heart className="w-4 h-4 text-green-400 flex-shrink-0" />
              <div>
                <div className="text-xs font-black text-green-300">{wishlists} wishlists</div>
                <div className="text-[10px] text-gray-500">saved by users</div>
              </div>
            </div>
            <div className="rounded-lg p-2.5 flex items-center gap-2"
              style={{ background: "rgba(234,179,8,0.15)", border: "1px solid rgba(234,179,8,0.3)" }}>
              <Flame className="w-4 h-4 text-orange-400 flex-shrink-0" />
              <div>
                <div className="text-xs font-black text-orange-300">{inCart} in cart</div>
                <div className="text-[10px] text-gray-500">right now</div>
              </div>
            </div>
          </div>

          {/* ── VIEWERS LIVE BAR ── */}
          <div className="flex items-center gap-2 rounded-lg px-3 py-2"
            style={{ background: "rgba(220,38,38,0.12)", border: "1px solid rgba(220,38,38,0.25)" }}>
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
            <span className="text-xs font-bold text-red-300">{viewers} people viewing this deal right now</span>
          </div>

          {/* ── CTA BUTTON — orange/red gradient ── */}
          <HoverPeek url={link.url} peekWidth={240} peekHeight={150}>
            <Button
              onClick={e => handleClick(e)}
              disabled={trackClickMutation.isPending}
              className="w-full font-black py-5 rounded-xl text-lg relative overflow-hidden transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{ background: "linear-gradient(135deg,#dc2626,#ea580c,#dc2626)", color: "#fff", border: "none", boxShadow: "0 4px 24px rgba(220,38,38,0.5)" }}>
              <span className="relative z-10 flex items-center justify-center gap-2">
                {trackClickMutation.isPending ? "Processing..." : (
                  <><ShoppingCart className="w-5 h-5" />CLAIM THIS DEAL NOW<Zap className="w-5 h-5 text-yellow-300" /></>
                )}
              </span>
            </Button>
          </HoverPeek>

          {/* Trust row */}
          <div className="flex items-center justify-center gap-1.5 text-xs text-gray-500">
            <Lock className="w-3 h-3 text-green-500" />
            <span>Secure • Verified • Instant access</span>
          </div>

          {/* Trust badges */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg px-3 py-2 text-center"
              style={{ background: "rgba(21,128,61,0.15)", border: "1px solid rgba(21,128,61,0.35)" }}>
              <div className="text-xs font-bold text-green-400">🔒 SSL Secured</div>
            </div>
            <div className="rounded-lg px-3 py-2 text-center"
              style={{ background: "rgba(59,130,246,0.15)", border: "1px solid rgba(59,130,246,0.35)" }}>
              <div className="text-xs font-bold text-blue-400">🛡️ Encrypted</div>
            </div>
          </div>

          {/* Click social proof */}
          {link.clicks > 0 && (
            <div className="rounded-lg p-2 text-center"
              style={{ background: "rgba(234,179,8,0.1)", border: "1px solid rgba(234,179,8,0.25)" }}>
              <div className="text-sm font-bold text-yellow-300">
                🏆 {(link.clicks + buyers).toLocaleString()} people claimed this deal
              </div>
            </div>
          )}

          {/* Verified badge */}
          {link.isVerified && (
            <div className="flex items-center justify-center gap-2 py-1">
              <BadgeCheck className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-semibold text-blue-400 tracking-wide">Verified Source</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md" aria-describedby="delete-desc-conv">
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDelete} className="space-y-4">
            <p id="delete-desc-conv" className="text-sm text-gray-600">
              Are you sure you want to permanently delete "{link.title}"? This action cannot be undone.
            </p>
            <div className="relative">
              <Label htmlFor="deletePasswordConv">Enter Creator Password</Label>
              <div className="relative mt-1">
                <Input
                  id="deletePasswordConv"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Enter password to confirm deletion"
                  className="pr-10" />
                <Button type="button" variant="ghost" size="sm"
                  className="absolute right-1 top-1 h-8 w-8 p-0"
                  onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="flex space-x-3 pt-4">
              <Button type="submit" className="flex-1 bg-red-600 hover:bg-red-700"
                disabled={deleteLinkMutation.isPending}>
                {deleteLinkMutation.isPending ? "Deleting..." : "Delete Product"}
              </Button>
              <Button type="button" variant="outline"
                onClick={() => { setShowDeleteDialog(false); setPassword(""); }}
                className="flex-1">Cancel</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
