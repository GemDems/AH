import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ExternalLink, ShoppingCart, Users, Star, Clock, TrendingUp, Award, AlertCircle, Trash2, Eye, EyeOff, Heart, Zap, Lock, Info } from "lucide-react";
import PhotoCarousel from "./photo-carousel";
import ProductCardImages from "@/components/ui/product-card-images";
import { InteractiveProductPopup } from "@/components/ui/interactive-product-popup";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { AffiliateLink } from "@shared/schema";
import { HoverPeek } from "@/components/ui/link-preview";

interface AffiliateCardProps {
  link: AffiliateLink;
}

function seededRand(seed: number, offset: number = 0) {
  const x = Math.sin(seed + offset) * 10000;
  return x - Math.floor(x);
}

export default function AffiliateCard({ link }: AffiliateCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showQuickView, setShowQuickView] = useState(false);
  const [isCardTouched, setIsCardTouched] = useState(false);
  const touchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  // Pinch-to-zoom: track initial finger distance for touch events
  const pinchStartDist = useRef<number | null>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    // Trackpad pinch fires as wheel with ctrlKey; deltaY < 0 = pinch-open (zoom in)
    if (e.ctrlKey && e.deltaY < 0) {
      e.preventDefault();
      setShowQuickView(true);
    }
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
      const dist = Math.hypot(dx, dy);
      if (dist - pinchStartDist.current > 20) {
        pinchStartDist.current = null;
        setShowQuickView(true);
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    pinchStartDist.current = null;
  }, []);
  const queryClient = useQueryClient();
  const seed = link.id;

  const buyers       = 100 + Math.floor(seededRand(seed, 1) * 900);
  const rating       = (4.0 + seededRand(seed, 2) * 1).toFixed(1);
  const reviews      = 50  + Math.floor(seededRand(seed, 3) * 450);
  const savedAmount  = 50  + Math.floor(seededRand(seed, 4) * 200);
  const demandPct    = 30  + Math.floor(seededRand(seed, 5) * 50);
  const wishlists    = 40  + Math.floor(seededRand(seed, 6) * 180);
  const inCart       = 3   + Math.floor(seededRand(seed, 7) * 18);
  const timeLeft     = 1   + Math.floor(seededRand(seed, 8) * 11);
  const stockBase    = 3   + Math.floor(seededRand(seed, 9) * 8);
  const discounts    = ['25%', '40%', '50%', '60%', '70%'];
  const discount     = discounts[Math.floor(seededRand(seed, 10) * discounts.length)];
  const isElitePick  = seededRand(seed, 11) < 0.2;
  const viewersBase  = 5   + Math.floor(seededRand(seed, 12) * 20);

  const [secsLeft, setSecsLeft] = useState(timeLeft * 3600);
  useEffect(() => {
    const tick = setInterval(() => setSecsLeft(s => (s > 0 ? s - 1 : s)), 1000);
    return () => clearInterval(tick);
  }, []);

  const fmtTime = (s: number) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (h > 0) return `${h}h ${m.toString().padStart(2,"0")}m`;
    return `${m.toString().padStart(2,"0")}:${sec.toString().padStart(2,"0")}`;
  };
  const timerCritical = secsLeft < 600;

  const [stock, setStock] = useState(stockBase);
  useEffect(() => {
    const dropAfter = (3 + Math.floor(Math.random() * 4)) * 60 * 1000;
    const t = setTimeout(() => {
      setStock(s => (s > 1 ? s - 1 : s));
    }, dropAfter);
    return () => clearTimeout(t);
  }, [stock]);

  const [viewers, setViewers] = useState(viewersBase);
  useEffect(() => {
    const iv = setInterval(() => {
      setViewers(v => Math.max(3, v + Math.floor(Math.random() * 5) - 2));
    }, 7000);
    return () => clearInterval(iv);
  }, []);

  const alerts = [
    "🔔 Real-time Stock Drop",
    "📉 Price Dropped Again!",
    "🔥 Locked For You",
    "⚠️ Deal Watchlist Alert",
    "👥 Others Also Claimed"
  ];
  const [alertIdx, setAlertIdx] = useState(0);
  useEffect(() => {
    const iv = setInterval(() => setAlertIdx(i => (i + 1) % alerts.length), 4000);
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

  const getCategoryEmoji = (cat: string) => {
    if (!cat) return '💎';
    const c = cat.toLowerCase();
    if (c.includes('hot'))     return '🔥';
    if (c.includes('tech'))    return '📱';
    if (c.includes('fashion')) return '👔';
    if (c.includes('health'))  return '💪';
    if (c.includes('travel'))  return '✈️';
    return '💎';
  };

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

  // imageUrls are stripped from the main API response for performance.
  // Fetch them lazily from the dedicated endpoint.
  const [allImages, setAllImages] = useState<string[]>(() => {
    const base = link.imageUrl && link.imageUrl.trim() ? [link.imageUrl] : [];
    return base;
  });

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

  return (
    <>
      <Card
        className="bg-white rounded-2xl shadow-xl hover:shadow-2xl transition-[box-shadow,transform,border-color,opacity] duration-500 transform hover:-translate-y-2 hover:scale-[1.02] border-2 border-gray-100 hover:border-conversion-blue/30 overflow-hidden group relative backdrop-blur-sm"
        style={{ ['--tw-shadow-colored' as any]: '0 25px 50px -12px rgba(249,115,22,0.05)' }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 20px 40px -8px rgba(0,0,0,0.18), 0 8px 20px -4px rgba(249,115,22,0.05)')}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = '')}
        onTouchStart={() => {
          if (touchTimeoutRef.current) clearTimeout(touchTimeoutRef.current);
          setIsCardTouched(true);
        }}
        onTouchEnd={() => {
          touchTimeoutRef.current = setTimeout(() => setIsCardTouched(false), 2500);
        }}
      >
        <div className="absolute inset-0 pointer-events-none z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-2xl" style={{ backgroundColor: 'rgba(0,0,139,0.011)' }} />

        <div className="absolute top-2 right-2 z-30" style={{ opacity: 0, visibility: 'hidden' }}>
          <Button onClick={(e) => { e.stopPropagation(); setShowDeleteDialog(true); }} className="w-8 h-8 p-0 bg-transparent hover:bg-transparent border-0 shadow-none" title="Delete Product" style={{ opacity: 0, visibility: 'hidden' }}>
            <Trash2 className="w-4 h-4" style={{ opacity: 0, visibility: 'hidden' }} />
          </Button>
        </div>

        {isElitePick && alerts[alertIdx] ? (
          <div className="absolute top-[0px] left-[0px] right-[0px] z-30">
            <div className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-yellow-900 text-xs font-bold text-center py-1">
              <Users className="w-3 h-3 inline mr-1" />
              {alerts[alertIdx]}
            </div>
          </div>
        ) : null}

        {stock > 0 ? (
          <div className={`absolute ${isElitePick ? 'top-6' : 'top-[0px]'} left-[0px] right-[0px] z-10`}>
            <div className="bg-gradient-to-r from-urgency-red to-red-600 text-white text-xs font-bold text-center py-1">
              <AlertCircle className="w-3 h-3 inline mr-1" />
              ONLY {stock} LEFT IN STOCK
            </div>
          </div>
        ) : null}

        <div
          className={`relative ${isElitePick ? 'mt-8' : 'mt-6'}`}
          onDoubleClick={(e) => { e.stopPropagation(); setShowQuickView(true); }}
          onWheel={handleWheel}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          data-testid={`container-image-quickview-${link.id}`}
        >
          <div className="absolute top-3 left-3 z-10">
            <div className="bg-gradient-to-r from-urgency-red to-red-600 text-gray-900 text-xs font-bold px-3 py-1 rounded-full shadow-lg">
              {getCategoryEmoji(link.category || '')} BESTSELLER
            </div>
          </div>

          <div className="absolute top-3 right-3 z-10 flex flex-col gap-1">
            <div className={`text-xs font-bold px-3 py-1 rounded-full shadow-lg flex items-center ${timerCritical ? 'timer-critical' : 'bg-gradient-to-r from-action-orange to-orange-600 text-gray-900'}`}>
              <Clock className="w-3 h-3 mr-1 inline" />
              {fmtTime(secsLeft)}
            </div>
          </div>

          <ProductCardImages images={allImages} title={link.title} className="w-full h-48" />
        </div>

        {showQuickView && allImages.length > 0 ? (
          <InteractiveProductPopup
            imageUrl={allImages[0]}
            title={link.title}
            description={link.description}
            price={price}
            badge={getCategoryEmoji(link.category || '')}
            onClose={() => setShowQuickView(false)}
          />
        ) : null}

        <CardContent className="p-6 space-y-4">

          <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-3 group-hover:from-conversion-blue group-hover:to-blue-700 transition-all duration-300">
            {link.title}
          </h3>

          <p className="text-gray-700 mb-4 text-sm line-clamp-3 leading-relaxed">
            {link.description}
          </p>

          <div className="bg-gradient-to-br from-trust-green/5 via-blue-50 to-purple-50 p-4 rounded-xl border-2 border-trust-green/20 shadow-inner mb-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-green-50 rounded-lg p-2 border border-green-200">
                <div className="flex items-center">
                  <Users className="w-4 h-4 text-green-700 mr-1" />
                  <span className="text-xs font-bold text-green-800">{buyers.toLocaleString()} bought</span>
                </div>
                <div className="text-xs text-gray-700">this week</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-2 border border-blue-200">
                <div className="flex items-center">
                  <TrendingUp className="w-4 h-4 text-blue-700 mr-1" />
                  <span className="text-xs font-bold text-blue-800">+{demandPct}%</span>
                </div>
                <div className="text-xs text-gray-700">demand ↗</div>
              </div>
              <div className="bg-yellow-50 rounded-lg p-2 border border-yellow-200">
                <div className="flex items-center">
                  <Star className="w-4 h-4 text-yellow-600 mr-1" />
                  <span className="text-xs font-bold text-yellow-800">{rating}/5</span>
                </div>
                <div className="text-xs text-gray-700">{reviews.toLocaleString()} reviews</div>
              </div>
              <div className="bg-pink-50 rounded-lg p-2 border border-pink-200">
                <div className="flex items-center">
                  <Heart className="w-4 h-4 text-pink-600 mr-1" />
                  <span className="text-xs font-bold text-pink-800">{wishlists}</span>
                </div>
                <div className="text-xs text-gray-700">wishlists</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-2xl font-bold text-trust-green">{price}</span>
              <span className="text-lg text-gray-400 line-through ml-2">
                ${originalPrice}
              </span>
            </div>
            <div className="text-right">
              <div className="text-sm text-urgency-red font-semibold">Save {discount}</div>
              <div className="text-xs text-gray-500">{discount} OFF</div>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 flex items-center justify-between mb-2">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <Award className="w-3 h-3" /> vs retail elsewhere
            </span>
            <span className="text-xs font-bold text-red-500 line-through">${retailPrice}</span>
          </div>

          <div className="text-center text-xs text-gray-500 italic mb-1">
            ✓ If you want quality, savings & verified deals — this is yours
          </div>

          <div className="space-y-3">
            <HoverPeek url={link.url} peekWidth={240} peekHeight={150}>
              <Button
                onClick={(e) => handleClick(e)}
                disabled={trackClickMutation.isPending}
                className={`w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-300 shadow-lg relative overflow-hidden cta-heartbeat ${link.isVerified ? 'verified-glow-button' : ''}`}
              >
                <span className="relative z-10 flex items-center justify-center text-lg">
                  {trackClickMutation.isPending ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <ShoppingCart className="w-5 h-5 mr-2" />
                      Claim This Deal Now
                      <Zap className="w-5 h-5 ml-2" />
                    </>
                  )}
                </span>
              </Button>
            </HoverPeek>

            {/* View Site pill — blurs in on hover (desktop) or touch (mobile) */}
            <div
              className="transition-all duration-300 ease-out group-hover:opacity-100 group-hover:[filter:blur(0px)] group-hover:translate-y-0 group-hover:scale-100"
              style={{
                opacity: isCardTouched ? 1 : undefined,
                filter: isCardTouched ? 'blur(0px)' : undefined,
                transform: isCardTouched ? 'translateY(0) scale(1)' : undefined,
              }}
            >
              <div
                className="opacity-0 [filter:blur(6px)] translate-y-1 scale-95 group-hover:opacity-100 group-hover:[filter:blur(0px)] group-hover:translate-y-0 group-hover:scale-100 transition-all duration-300 ease-out"
                style={isCardTouched ? { opacity: 1, filter: 'blur(0px)', transform: 'translateY(0) scale(1)' } : {}}
              >
                <button
                  onClick={(e) => handleClick(e as any)}
                  className="w-full flex items-center justify-center gap-2 text-white text-sm font-semibold py-2 px-4 rounded-full shadow-md hover:scale-105 active:scale-95 transition-transform duration-150"
                  style={{ background: "linear-gradient(135deg,#6366f1 0%,#8b5cf6 50%,#a855f7 100%)", boxShadow: "0 2px 14px rgba(139,92,246,0.45)" }}
                >
                  🌐 View Site
                </button>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1 text-xs text-gray-500">
              <Lock className="w-3 h-3 text-green-600" />
              <span>Secure • Verified • Instant access</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-center relative overflow-hidden">
                <div className="trust-shimmer absolute inset-0 pointer-events-none rounded-lg"></div>
                <div className="text-xs font-medium text-green-700 relative z-10">🔒 SSL Secured</div>
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-center relative overflow-hidden">
                <div className="trust-shimmer absolute inset-0 pointer-events-none rounded-lg"></div>
                <div className="text-xs font-medium text-blue-700 relative z-10">🛡️ Encrypted</div>
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2">
            {link.clicks > 0 ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 text-center">
                <div className="text-sm font-medium text-blue-700">
                  🏆 {(link.clicks + buyers).toLocaleString()} people claimed this deal
                </div>
              </div>
            ) : null}
          </div>

          {link.isVerified ? (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                <div className="flex items-center gap-1.5">
                  <svg width="18" height="20" viewBox="0 0 18 20" fill="none">
                    <path d="M9 1L2 4V10C2 14.418 5.134 18.522 9 19.5C12.866 18.522 16 14.418 16 10V4L9 1Z"
                      fill="url(#shield-gradient)" />
                    <path d="M6 10L8 12.5L12.5 7.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    <defs>
                      <linearGradient id="shield-gradient" x1="9" y1="1" x2="9" y2="19.5" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#1d4ed8"/>
                        <stop offset="100%" stopColor="#1e3a8a"/>
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className="text-xs font-semibold text-blue-800 tracking-wide">Verified Source</span>
                  <span style={{ padding: "1px", lineHeight: 0, display: "inline-flex" }}>
                    <Info className="w-3.5 h-3.5" style={{ color: "#3b82f6", opacity: 0.019 }} />
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-center gap-1.5 flex-wrap">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border"
                  style={{ background: "linear-gradient(135deg,#dcfce7,#bbf7d0)", borderColor: "#16a34a", color: "#15803d" }}>
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border"
                  style={{ background: "linear-gradient(135deg,#fef9c3,#fde68a)", borderColor: "#ca8a04", color: "#92400e" }}>
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border"
                  style={{ background: "linear-gradient(135deg,#ede9fe,#ddd6fe)", borderColor: "#7c3aed", color: "#5b21b6" }}>
                </span>
              </div>
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="max-w-md" aria-describedby="delete-description">
          <DialogHeader>
            <DialogTitle className="text-urgency-red">Delete Product</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDelete} className="space-y-4">
            <p id="delete-description" className="text-sm text-gray-600">
              Are you sure you want to permanently delete "{link.title}"? This action cannot be undone.
            </p>
            <div className="relative">
              <Label htmlFor="deletePassword">Enter Creator Password</Label>
              <div className="relative mt-1">
                <Input
                  id="deletePassword"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password to confirm deletion"
                  className="pr-10"
                />
                <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1 h-8 w-8 p-0" onClick={() => setShowPassword(!showPassword)}>
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="flex space-x-3 pt-4">
              <Button type="submit" className="flex-1 bg-urgency-red hover:bg-red-700" disabled={deleteLinkMutation.isPending}>
                {deleteLinkMutation.isPending ? "Deleting..." : "Delete Product"}
              </Button>
              <Button type="button" variant="outline" onClick={() => { setShowDeleteDialog(false); setPassword(""); }} className="flex-1">
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
