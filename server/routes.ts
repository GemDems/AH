import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertAffiliateLinkSchema, insertAiConversationSchema, insertSmsMessageSchema, insertUserSmsPreferencesSchema } from "@shared/schema";
import { z } from "zod";
import { generateAIChatResponse } from "./cohere-service";
import { smsService } from "./sms-service";
import { ipKeyGenerator } from "express-rate-limit";
import fs from "fs";

// ── Map size cap helper (prevents unbounded growth under high traffic) ────────
const MAX_MAP_SIZE = 10_000;

function cappedSet<K, V>(map: Map<K, V>, key: K, value: V): void {
  if (!map.has(key) && map.size >= MAX_MAP_SIZE) {
    // Evict the oldest entry (Maps preserve insertion order)
    const firstKey = map.keys().next().value as K;
    map.delete(firstKey);
  }
  map.set(key, value);
}

// ── Affiliate-links cache (30 s TTL) ─────────────────────────────────────────
let _linksCache: { data: any[]; ts: number } | null = null;
const LINKS_CACHE_TTL = 30_000;

async function getCachedPublishedLinks() {
  const now = Date.now();
  if (_linksCache && now - _linksCache.ts < LINKS_CACHE_TTL) return _linksCache.data;
  const data = await storage.getPublishedAffiliateLinks();
  _linksCache = { data, ts: now };
  return data;
}

function invalidateLinksCache() {
  _linksCache = null;
}

// Per-IP minimum interval store (1.5 s between requests)
const lastIpRequestTime = new Map<string, number>();

// Prune stale interval entries every 5 minutes to prevent unbounded growth
setInterval(() => {
  const cutoff = Date.now() - 60_000;
  for (const [key, ts] of lastIpRequestTime) {
    if (ts < cutoff) lastIpRequestTime.delete(key);
  }
}, 5 * 60_000);

function enforceMinInterval(req: Request, res: Response, next: NextFunction) {
  const ip = ipKeyGenerator(req.ip || "");
  const now = Date.now();
  const last = lastIpRequestTime.get(ip) || 0;
  if (now - last < 1500) {
    return res.status(429).json({
      rateLimited: true,
      limitType: "too_fast",
      message: "You're typing faster than I can think! Give me 1-2 seconds between messages. ⚡"
    });
  }
  cappedSet(lastIpRequestTime, ip, now);
  next();
}

// Per-device daily cap (60 messages/day)
interface DailyRecord { count: number; resetAt: number; }
const deviceDailyCount = new Map<string, DailyRecord>();
const DAILY_CAP = 60;

function enforceDeviceDailyCap(req: Request, res: Response, next: NextFunction) {
  const deviceId: string = (req.body?.deviceId as string) || "unknown";
  const now = Date.now();
  const midnight = new Date(); midnight.setHours(24, 0, 0, 0);
  const resetAt = midnight.getTime();

  let record = deviceDailyCount.get(deviceId);
  if (!record || now >= record.resetAt) {
    record = { count: 0, resetAt };
  }

  if (record.count >= DAILY_CAP) {
    return res.status(429).json({
      rateLimited: true,
      limitType: "daily_limit",
      message: `You've used all ${DAILY_CAP} messages for today — come back tomorrow! I'll have plenty more deals waiting for you. 🌅`
    });
  }

  record.count += 1;
  cappedSet(deviceDailyCount, deviceId, record);
  next();
}

// ── Burst detector: 5 messages in 60 s → 5-minute block ─────────────────────
interface BurstRecord { timestamps: number[]; blockedUntil: number; }
const deviceBurstMap = new Map<string, BurstRecord>();
const BURST_WINDOW_MS  = 60_000;   // 60-second rolling window
const BURST_LIMIT      = 5;        // max messages before block
const BURST_BLOCK_MS   = 5 * 60_000; // 5-minute block

setInterval(() => {
  const now = Date.now();
  for (const [key, rec] of deviceBurstMap) {
    if (rec.blockedUntil < now && rec.timestamps.every(t => now - t > BURST_WINDOW_MS)) {
      deviceBurstMap.delete(key);
    }
  }
}, 5 * 60_000);

setInterval(() => {
  const nowWin = Date.now();
  for (const [key, _rec] of lastIpRequestTime) {
    if (nowWin - (_rec as number) > 60_000) lastIpRequestTime.delete(key);
  }
}, 5 * 60_000);

function enforceBurstLimit(req: Request, res: Response, next: NextFunction) {
  const deviceId: string = (req.body?.deviceId as string) || "unknown";
  const now = Date.now();

  let rec = deviceBurstMap.get(deviceId);
  if (!rec) {
    rec = { timestamps: [], blockedUntil: 0 };
    cappedSet(deviceBurstMap, deviceId, rec);
  }

  if (now < rec.blockedUntil) {
    const minsLeft = Math.ceil((rec.blockedUntil - now) / 60_000);
    return res.status(429).json({
      rateLimited: true,
      limitType: "burst_blocked",
      message: `You've been sending messages too fast. You're temporarily blocked for ${minsLeft} more minute${minsLeft === 1 ? "" : "s"}. Take a breather and come back! ⏸️`
    });
  }

  // Prune old timestamps outside the rolling window
  rec.timestamps = rec.timestamps.filter(t => now - t < BURST_WINDOW_MS);

  if (rec.timestamps.length >= BURST_LIMIT) {
    rec.blockedUntil = now + BURST_BLOCK_MS;
    return res.status(429).json({
      rateLimited: true,
      limitType: "burst_blocked",
      message: "Whoa — that's 5 messages in under a minute! You've been blocked for 5 minutes. Slow down and I'll be ready when you are. ⏸️"
    });
  }

  rec.timestamps.push(now);
  next();
}

// ── Window limit: 10 messages per 30 minutes (persisted to disk) ─────────────
interface WindowRecord { timestamps: number[]; blockedUntil?: number; }
const deviceWindowMap = new Map<string, WindowRecord>();
const WINDOW_MS    = 30 * 60_000; // 30-minute rolling window
const WINDOW_LIMIT = 10;          // max messages in that window
const RATE_LIMIT_FILE = "/tmp/elite-rate-limits.json";

// Load persisted window data on startup so server restarts don't reset counters
try {
  const raw = fs.readFileSync(RATE_LIMIT_FILE, "utf8");
  const parsed = JSON.parse(raw) as { windowMap: Record<string, { timestamps: number[]; blockedUntil?: number }> };
  const now = Date.now();
  for (const [key, rec] of Object.entries(parsed.windowMap || {})) {
    const fresh = rec.timestamps.filter((t: number) => now - t < WINDOW_MS);
    const blockedUntil = rec.blockedUntil && rec.blockedUntil > now ? rec.blockedUntil : undefined;
    if (fresh.length > 0 || blockedUntil) deviceWindowMap.set(key, { timestamps: fresh, blockedUntil });
  }
} catch { /* first run — file doesn't exist yet */ }

// Save to disk every 15 seconds so data survives restarts
function saveWindowMap() {
  try {
    fs.writeFileSync(RATE_LIMIT_FILE, JSON.stringify({ windowMap: Object.fromEntries(deviceWindowMap) }));
  } catch { /* non-fatal */ }
}
setInterval(saveWindowMap, 15_000);

// Prune stale entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, rec] of deviceWindowMap) {
    const blockExpired = !rec.blockedUntil || now >= rec.blockedUntil;
    const tsStale = rec.timestamps.every(t => now - t > WINDOW_MS);
    if (blockExpired && tsStale) deviceWindowMap.delete(key);
  }
}, 5 * 60_000);

function enforceWindowLimit(req: Request, res: Response, next: NextFunction) {
  const deviceId: string = (req.body?.deviceId as string) || "unknown";
  const now = Date.now();

  let rec = deviceWindowMap.get(deviceId);
  if (!rec) { rec = { timestamps: [] }; cappedSet(deviceWindowMap, deviceId, rec); }

  // Still within a guaranteed hard block? Reject immediately.
  if (rec.blockedUntil && now < rec.blockedUntil) {
    return res.status(429).json({
      rateLimited: true,
      limitType: "window_limit",
      message: `Due to high traffic, messaging is paused. Try again soon. 🚦`
    });
  }

  // Hard block expired — clear it and let timestamps decide
  if (rec.blockedUntil && now >= rec.blockedUntil) {
    rec.blockedUntil = undefined;
    rec.timestamps = [];
  }

  rec.timestamps = rec.timestamps.filter(t => now - t < WINDOW_MS);

  if (rec.timestamps.length >= WINDOW_LIMIT) {
    // Set a guaranteed full 30-minute block from RIGHT NOW
    rec.blockedUntil = now + WINDOW_MS;
    rec.timestamps = [];
    saveWindowMap();
    return res.status(429).json({
      rateLimited: true,
      limitType: "window_limit",
      message: `Due to high traffic we're limiting requests right now — you've hit ${WINDOW_LIMIT} messages. Please wait 30 minutes and try again. 🚦`
    });
  }

  rec.timestamps.push(now);
  saveWindowMap();
  next();
}
// ─────────────────────────────────────────────────────────────────────────────

// Global live stats — single source of truth for ALL tabs/devices
// ---------------------------------------------------------------------------
// Live stats climb steadily through the day (never dip) so the site always
// looks like it's getting busier — then reset to a fresh, lower baseline at
// midnight so the count is never an unbounded/implausible incline.
// Deterministic per-day seed so every browser/device/restart agrees.
// ---------------------------------------------------------------------------

/** Simple seedable pseudo-random 0..1 (same input → same output always) */
function seededRand(seed: number): number {
  const x = Math.sin(seed * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

/** Day-index in local time (e.g. 19936 for a given calendar day) */
function dayKey(): number {
  const d = new Date();
  return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);
}

/** Fraction of the current day elapsed: 0 right after midnight, ~1 right before the next. */
function dayProgress(): number {
  const now = new Date();
  const secondsIntoDay = now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
  return Math.min(1, secondsIntoDay / 86400);
}

/** Deterministic start-of-day viewer count for a given day — 3200–4000. */
function baselineForDay(day: number): number {
  return 3200 + Math.floor(seededRand(day) * 800);
}

/** Deterministic end-of-day viewer ceiling for a given day — 7000–9500. */
function ceilingForDay(day: number): number {
  return 7000 + Math.floor(seededRand(day + 1000) * 2500);
}

let _dayKey        = dayKey();
let _dailyBaseline = baselineForDay(_dayKey);
let _dailyCeiling  = ceilingForDay(_dayKey);

let liveStats = {
  viewers:      _dailyBaseline + Math.floor(dayProgress() * (_dailyCeiling - _dailyBaseline)),
  hourlyBuyers: 0,
  lastDayKey:   _dayKey,
};
liveStats.hourlyBuyers = Math.floor(liveStats.viewers * (0.28 + seededRand(_dayKey + 2) * 0.08));

function checkHourlyReset() {
  const d = dayKey();
  if (d !== liveStats.lastDayKey) {
    // New day — fresh (lower) baseline and ceiling, growth starts over
    _dayKey        = d;
    _dailyBaseline = baselineForDay(d);
    _dailyCeiling  = ceilingForDay(d);
    liveStats.viewers      = _dailyBaseline;
    liveStats.hourlyBuyers = Math.floor(liveStats.viewers * (0.28 + seededRand(d + 2) * 0.08));
    liveStats.lastDayKey   = d;
  }
}

// Function to check and process scheduled operations
async function processScheduledOperations() {
  try {
    const now = new Date();
    
    // Check for scheduled publishes
    const allLinks = await storage.getAllAffiliateLinks();
    for (const link of allLinks) {
      // Auto-publish drafts that are scheduled for now
      if (link.isDraft && link.scheduledPublishAt && now >= link.scheduledPublishAt) {
        await storage.publishDraft(link.id);
        invalidateLinksCache();
        console.log(`Auto-published draft: ${link.title}`);
      }
      
      // Auto-delete products scheduled for deletion
      if (link.scheduledDeleteAt && now >= link.scheduledDeleteAt) {
        await storage.deleteAffiliateLink(link.id);
        invalidateLinksCache();
        console.log(`Auto-deleted product: ${link.title}`);
      }
    }
  } catch (error) {
    console.error("Error processing scheduled operations:", error);
  }
}

// Periodically update counters — drives ALL clients since they poll this.
// Viewers only ever climb during the day (toward a smoothly-rising target
// curve from the daily baseline to the daily ceiling) — never dip — and
// reset once at midnight via checkHourlyReset() so it's never an endless climb.
setInterval(() => {
  checkHourlyReset();
  processScheduledOperations();

  // Where viewers "should" be right now, given how far into the day we are.
  // Slightly front-loaded curve (busier earlier) while still monotonic.
  const eased = Math.pow(dayProgress(), 0.85);
  const currentTarget = Math.floor(_dailyBaseline + eased * (_dailyCeiling - _dailyBaseline));

  if (liveStats.viewers < currentTarget) {
    const step = Math.floor(Math.random() * 15) + 3; // climb 3-17 per tick
    liveStats.viewers = Math.min(currentTarget, liveStats.viewers + step);
  } else if (Math.random() < 0.25) {
    // Already caught up to today's target — the occasional tiny bump so it
    // never looks frozen, still never decreasing.
    liveStats.viewers += Math.floor(Math.random() * 3) + 1;
  }

  // Orders: small occasional uptick, but capped at ~38% of current viewers.
  // Never decreases — only resets at the daily boundary above.
  const orderCap = Math.floor(liveStats.viewers * 0.38);
  if (Math.random() < 0.40 && liveStats.hourlyBuyers < orderCap) {
    liveStats.hourlyBuyers += Math.floor(Math.random() * 2) + 1;
  }
}, 4000);

export async function registerRoutes(app: Express): Promise<Server> {
  // Get live statistics
  app.get("/api/live-stats", (req, res) => {
    checkHourlyReset();
    res.json({
      viewers: liveStats.viewers,
      hourlyBuyers: liveStats.hourlyBuyers,
      timestamp: Date.now()
    });
  });

  // AI Description Enhancement - 1000%+ Conversion Optimization
  app.post("/api/ai/enhance-description", async (req, res) => {
    console.log('AI Enhancement Route Hit:', req.body);
    const { description, title, category } = req.body;
    try {
      
      if (!description || !description.trim()) {
        return res.status(400).json({ error: "Description is required" });
      }

      // Ultra-advanced prompt for maximum conversion with extreme brevity and power
      const enhancementPrompt = `
You are the world's #1 conversion copywriter with 1000%+ guaranteed results. Transform this product description into a Batman-level precise, devastatingly powerful 9-13 word description that triggers infinite desire.

ORIGINAL: "${description}"
PRODUCT: ${title || "Product"}
CATEGORY: ${category || "General"}

TRANSFORMATION RULES:
1. EXTREME BREVITY: Exactly 9-13 words maximum - shorter is better
2. SUBCONSCIOUS TRIGGERS: Every word chosen for psychological impact
3. SILENT MANIPULATION: Influence without being obvious
4. BATMAN PRECISION: Dark, mysterious, powerful - zero wasted words
5. INFINITE DESIRE: Create uncontrollable want with minimal words
6. CONVERSION ADDICTION: Maximum buying compulsion in minimum space

CONSTRAINTS:
- MAXIMUM 9-13 words total - shorter is better!
- No fluff or filler words
- Every word must trigger desire
- Pure psychological mastery
- Simple but devastatingly effective
- Aim for 6-8 words if possible, 9-13 is the upper limit

Transform now with maximum conversion power in minimal words:`;

      const response = await generateAIChatResponse(enhancementPrompt, [], []);
      
      // Extract the enhanced description from AI response
      let enhancedDescription = response.response;
      
      // Clean up the response to get just the enhanced description
      if (enhancedDescription.includes('Transform now with maximum conversion power:')) {
        enhancedDescription = enhancedDescription.split('Transform now with maximum conversion power:')[1]?.trim();
      }
      
      // Remove any remaining formatting or system text
      enhancedDescription = enhancedDescription
        .replace(/^['"]+|['"]+$/g, '') // Remove quotes
        .replace(/^Enhanced Description:|^ENHANCED:|^TRANSFORMED:/gi, '') // Remove prefixes
        .trim();
      
      res.json({ 
        enhancedDescription: enhancedDescription || "Transform your product appeal with precision-crafted messaging that speaks directly to buyer psychology.",
        conversionBoost: "1000%+",
        techniques: ["Subconscious triggers", "Batman precision", "Infinite desire", "Silent manipulation"]
      });
      
    } catch (error) {
      console.error("AI Enhancement Error:", error);
      
      // Fallback enhancement system with Batman-level precision (shorter is better)
      const fallbackEnhancements = {
        "electronics": "Precision technology that transforms daily experience.",
        "home": "Quality that elevates everything instantly.",
        "fitness": "Built for results, not promises.",
        "beauty": "Pure transformation. Immediate difference.",
        "books": "Knowledge that changes everything.",
        "default": "Quality that speaks for itself."
      };
      
      const categoryKey = category?.toLowerCase().includes('electronic') ? 'electronics' :
                         category?.toLowerCase().includes('home') ? 'home' :
                         category?.toLowerCase().includes('fitness') ? 'fitness' :
                         category?.toLowerCase().includes('beauty') ? 'beauty' :
                         category?.toLowerCase().includes('book') ? 'books' : 'default';
      
      const fallbackDescription = fallbackEnhancements[categoryKey];
      
      res.json({ 
        enhancedDescription: fallbackDescription,
        conversionBoost: "1000%+",
        techniques: ["Subconscious triggers", "Batman precision", "Infinite desire", "Fallback optimization"],
        fallback: true
      });
    }
  });

  // Logo proxy — fetches real brand logos server-side (bypasses client sandbox restrictions)
  app.get("/api/logo/:domain", async (req, res) => {
    const { domain } = req.params;
    const allowed = ["forbes.com","cnn.com","businessinsider.com","techcrunch.com","wsj.com","bloomberg.com"];
    if (!allowed.includes(domain)) return res.status(400).end();
    try {
      const url = `https://logo.clearbit.com/${domain}`;
      const response = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
      if (!response.ok) return res.status(404).end();
      const buf = await response.arrayBuffer();
      res.set("Content-Type", response.headers.get("content-type") || "image/png");
      res.set("Cache-Control", "public, max-age=86400");
      res.send(Buffer.from(buf));
    } catch {
      res.status(502).end();
    }
  });

  // Get published affiliate links (public) — served from 30 s in-memory cache.
  // imageUrls (base64 blobs) are stripped here; fetch them on demand via /:id/images.
  app.get("/api/affiliate-links", async (req, res) => {
    try {
      const links = await getCachedPublishedLinks();
      const stripped = links.map(({ imageUrls: _dropped, ...rest }) => rest);
      res.json(stripped);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch affiliate links" });
    }
  });

  // Lazy images endpoint — returns full imageUrls (base64 ok) for one product
  app.get("/api/affiliate-links/:id/images", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const links = await getCachedPublishedLinks();
      const link = links.find((l) => l.id === id);
      if (!link) return res.status(404).json({ message: "Not found" });
      res.json({ imageUrls: link.imageUrls ?? [] });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch images" });
    }
  });

  // Admin routes for Creator Mode
  app.get("/api/admin/affiliate-links", async (req, res) => {
    try {
      const links = await storage.getAllAffiliateLinks();
      res.json(links);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch all affiliate links" });
    }
  });

  app.get("/api/admin/drafts", async (req, res) => {
    try {
      const drafts = await storage.getDraftAffiliateLinks();
      res.json(drafts);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch drafts" });
    }
  });

  app.post("/api/admin/publish/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const published = await storage.publishDraft(id);
      if (published) {
        invalidateLinksCache();
        res.json(published);
      } else {
        res.status(404).json({ message: "Draft not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to publish draft" });
    }
  });

  app.post("/api/admin/publish-all", async (req, res) => {
    try {
      const published = await storage.publishAllDrafts();
      invalidateLinksCache();
      res.json({ published: published.length, products: published });
    } catch (error) {
      res.status(500).json({ message: "Failed to publish all drafts" });
    }
  });

  app.put("/api/admin/schedule-delete/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { scheduledDeleteAt } = req.body;
      
      const updated = await storage.updateAffiliateLink(id, { 
        scheduledDeleteAt: scheduledDeleteAt ? new Date(scheduledDeleteAt) : null 
      });
      
      if (updated) {
        res.json(updated);
      } else {
        res.status(404).json({ message: "Product not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to schedule deletion" });
    }
  });

  // Schedule draft publishing
  app.put("/api/admin/schedule-publish/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { scheduledPublishAt } = req.body;
      
      const updated = await storage.updateAffiliateLink(id, { 
        scheduledPublishAt: scheduledPublishAt ? new Date(scheduledPublishAt) : null 
      });
      
      if (updated) {
        res.json(updated);
      } else {
        res.status(404).json({ message: "Draft not found" });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to schedule publishing" });
    }
  });

  // DELETE route for removing products
  app.delete("/api/admin/affiliate-links/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteAffiliateLink(id);
      if (deleted) {
        invalidateLinksCache();
        res.json({ message: "Product deleted successfully" });
      } else {
        res.status(404).json({ message: "Product not found" });
      }
    } catch (error) {
      console.error("Error deleting affiliate link:", error);
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Toggle verified status on a product
  app.put("/api/admin/affiliate-links/:id/verify", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const link = await storage.getAffiliateLinkById(id);
      if (!link) return res.status(404).json({ message: "Product not found" });
      const newVerified = link.isVerified ? 0 : 1;
      const updated = await storage.updateAffiliateLink(id, { isVerified: newVerified } as any);
      invalidateLinksCache();
      res.json(updated);
    } catch (error) {
      console.error("Error toggling verified status:", error);
      res.status(500).json({ message: "Failed to update verified status" });
    }
  });

  // Create new affiliate link
  app.post("/api/affiliate-links", async (req, res) => {
    try {
      console.log("Received data for:", req.body?.title);
      
      // Manual validation and conversion
      const { title, url, description, category } = req.body;
      
      if (!title || !url || !description || !category) {
        return res.status(400).json({ message: "Missing required fields" });
      }
      
      const linkData = {
        title: String(title),
        url: String(url),
        description: String(description),
        category: String(category),
        categories: Array.isArray(req.body.categories) ? req.body.categories.map(String) : [String(category)],
        imageUrl: req.body.imageUrl || null,
        imageUrls: req.body.imageUrls || null,
        price: req.body.price || null,
        stock: Number(req.body.stock) || 0,
        isElitePick: req.body.isElitePick ? 1 : 0,
        isVerified: req.body.isVerified ? 1 : 0,
        isDraft: req.body.isDraft ? 1 : 0,
        scheduledPublishAt: req.body.scheduledPublishAt ? new Date(req.body.scheduledPublishAt) : null,
        scheduledDeleteAt: req.body.scheduledDeleteAt ? new Date(req.body.scheduledDeleteAt) : null,
        aiPrivateInfo: req.body.aiPrivateInfo || null, // AI Assistant Info from creator dashboard
      };
      
      const newLink = await storage.createAffiliateLink(linkData);
      invalidateLinksCache();
      res.status(201).json(newLink);
    } catch (error) {
      console.error("Error creating affiliate link:", error);
      res.status(500).json({ message: "Failed to create affiliate link" });
    }
  });

  // Track link click and redirect
  app.post("/api/affiliate-links/:id/click", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const link = await storage.incrementLinkClicks(id);
      
      if (!link) {
        return res.status(404).json({ message: "Link not found" });
      }

      res.json({ url: link.url, clicks: link.clicks });
    } catch (error) {
      res.status(500).json({ message: "Failed to track click" });
    }
  });

  // Delete affiliate link with password protection
  app.delete("/api/affiliate-links/:id", async (req, res) => {
    try {
      const { password } = req.body;
      const ADMIN_PASSWORD = "9f$81r@V7#iwant";
      
      if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ message: "Incorrect password" });
      }
      
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteAffiliateLink(id);
      
      if (!deleted) {
        return res.status(404).json({ message: "Link not found" });
      }

      invalidateLinksCache();
      res.json({ message: "Link deleted successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete affiliate link" });
    }
  });

  // Referral system routes
  app.post("/api/referral/generate", async (req, res) => {
    try {
      // Generate a device-based user ID if not provided
      const userId = req.body.userId || `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const referralCode = await storage.generateReferralCode(userId);
      res.json(referralCode);
    } catch (error) {
      res.status(500).json({ message: "Failed to generate referral code" });
    }
  });

  app.post("/api/referral/use", async (req, res) => {
    try {
      const { code } = req.body;
      const deviceId = req.body.deviceId || `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const result = await storage.useReferralCode(code, deviceId);
      res.json(result);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to use referral code" });
    }
  });

  app.get("/api/referral/status", async (req, res) => {
    try {
      const userId = req.query.userId as string || `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const status = await storage.getReferralStatus(userId);
      res.json(status);
    } catch (error) {
      res.status(500).json({ message: "Failed to get referral status" });
    }
  });

  // Leaderboard route
  app.get("/api/leaderboard", async (req, res) => {
    try {
      const leaderboard = await storage.getLeaderboard();
      res.json(leaderboard);
    } catch (error) {
      res.status(500).json({ message: "Failed to get leaderboard" });
    }
  });

  // Update user stats (for tracking savings)
  app.post("/api/user-stats", async (req, res) => {
    try {
      const { userId, savings } = req.body;
      await storage.updateUserStats(userId, savings);
      res.json({ message: "Stats updated successfully" });
    } catch (error) {
      res.status(500).json({ message: "Failed to update user stats" });
    }
  });

  // Savings progress routes
  app.post('/api/savings/update', async (req, res) => {
    try {
      const { userId, amount } = req.body;
      if (!userId || !amount) {
        return res.status(400).json({ message: 'User ID and amount required' });
      }
      
      const result = await storage.updateSavingsProgress(userId, amount);
      res.json(result);
    } catch (error) {
      console.error('Error updating savings progress:', error);
      res.status(500).json({ message: 'Failed to update savings progress' });
    }
  });

  app.post('/api/username/update', async (req, res) => {
    try {
      const { userId, username } = req.body;
      if (!userId || !username) {
        return res.status(400).json({ message: 'User ID and username required' });
      }
      
      await storage.updateUsername(userId, username);
      res.json({ success: true });
    } catch (error) {
      console.error('Error updating username:', error);
      res.status(500).json({ message: 'Failed to update username' });
    }
  });

  // Test route to regenerate bonus codes
  app.post('/api/regenerate-bonus', async (req, res) => {
    try {
      const { userId } = req.body;
      if (!userId) {
        return res.status(400).json({ message: 'User ID required' });
      }
      
      await storage.regenerateBonusCodesIfNeeded(userId);
      res.json({ success: true, message: 'Bonus codes regenerated' });
    } catch (error) {
      console.error('Error regenerating bonus codes:', error);
      res.status(500).json({ message: 'Failed to regenerate bonus codes' });
    }
  });

  // Test route to simulate $1000 savings and generate reward codes
  app.post('/api/test/savings', async (req, res) => {
    try {
      const { userId, amount } = req.body;
      if (!userId) {
        return res.status(400).json({ message: 'User ID required' });
      }
      
      // Update savings progress to trigger reward generation
      const result = await storage.updateSavingsProgress(userId, amount || 1000);
      
      // Ensure bonus codes are available
      await storage.regenerateBonusCodesIfNeeded(userId);
      
      // Get updated referral status with reward codes
      const status = await storage.getReferralStatus(userId);
      
      res.json({ 
        success: true, 
        hasReward: result.hasReward,
        newProgress: result.newProgress,
        rewardCodes: status.rewardCodes 
      });
    } catch (error) {
      console.error('Error updating test savings:', error);
      res.status(500).json({ message: 'Failed to update savings' });
    }
  });

  // User Ideas endpoints
  app.post("/api/user-ideas", async (req, res) => {
    try {
      const { idea, deviceId } = req.body;
      
      if (!idea || !deviceId) {
        return res.status(400).json({ message: "Idea and deviceId are required" });
      }

      if (idea.length > 20) {
        return res.status(400).json({ message: "Idea must be 20 characters or less" });
      }

      const words = idea.trim().split(/\s+/);
      if (words.length > 2) {
        return res.status(400).json({ message: "Idea must be 2 words maximum" });
      }

      const newIdea = await storage.submitUserIdea(deviceId, idea.trim());
      res.json(newIdea);
    } catch (error) {
      if (error instanceof Error && error.message === "Device has already submitted an idea") {
        return res.status(409).json({ message: "You have already submitted an idea" });
      }
      console.error("Error submitting idea:", error);
      res.status(500).json({ message: "Failed to submit idea" });
    }
  });

  app.get("/api/admin/user-ideas", async (req, res) => {
    try {
      const ideas = await storage.getAllUserIdeas();
      res.json(ideas);
    } catch (error) {
      console.error("Error fetching user ideas:", error);
      res.status(500).json({ message: "Failed to fetch user ideas" });
    }
  });

  app.delete("/api/admin/user-ideas/all", async (req, res) => {
    try {
      await storage.deleteAllUserIdeas();
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete all ideas" });
    }
  });

  app.delete("/api/admin/user-ideas/reviewed", async (req, res) => {
    try {
      await storage.deleteAllReviewedUserIdeas();
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete reviewed ideas" });
    }
  });

  app.put("/api/admin/user-ideas/:id/review", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const updated = await storage.markIdeaAsReviewed(id);
      
      if (!updated) {
        return res.status(404).json({ message: "Idea not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error marking idea as reviewed:", error);
      res.status(500).json({ message: "Failed to mark idea as reviewed" });
    }
  });

  // OpenAI Chat API endpoint (rate-limited)
  app.post("/api/ai-chat", enforceMinInterval, enforceWindowLimit, enforceBurstLimit, enforceDeviceDailyCap, async (req, res) => {
    try {
      const { message, conversationHistory } = req.body;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ message: "Message is required" });
      }

      // Message length validation (500 char max)
      if (message.length > 500) {
        return res.status(400).json({
          rateLimited: false,
          limitType: "message_too_long",
          message: `Whoa, that's a lot of text! Please keep your message under 500 characters. You sent ${message.length} characters — try to shorten it a bit. ✂️`
        });
      }

      // Gibberish filter — reject keyboard mash / all-random-character messages
      const trimmed = message.trim();
      const distinctChars = new Set(trimmed.toLowerCase().replace(/\s/g, "")).size;
      const letterCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
      const isAllNonLetter = letterCount === 0 && trimmed.length > 0;
      const isSingleRepeatedChar = distinctChars <= 1 && trimmed.length > 2;
      const isFewDistinctChars = distinctChars < 2 && trimmed.length > 3;

      if (isAllNonLetter || isSingleRepeatedChar || isFewDistinctChars) {
        return res.status(400).json({
          rateLimited: false,
          limitType: "gibberish",
          message: "That doesn't look like a real question! 🤔 Try typing something like \"what deals do you have?\" or \"recommend a good product\" and I'll help you out."
        });
      }

      // Conversation turns cap (max 30 turns = 15 back-and-forth)
      const history = Array.isArray(conversationHistory) ? conversationHistory : [];
      if (history.length > 30) {
        return res.status(400).json({
          rateLimited: false,
          limitType: "session_full",
          message: "We've had a great conversation, but this chat session is full (30 messages)! Start a fresh chat to keep exploring deals — I'll be ready with new recommendations. 🔄"
        });
      }

      // Get available products for AI context (served from cache)
      const availableProducts = await getCachedPublishedLinks();
      
      // Generate AI response using Cohere
      const aiResult = await generateAIChatResponse(
        message, 
        conversationHistory || [], 
        availableProducts
      );

      // Safety net: if a product was matched but the response doesn't include the URL, append it
      let finalResponse = aiResult.response;
      if (aiResult.recommendedProduct) {
        const exactUrl = aiResult.recommendedProduct.url;
        if (!finalResponse.includes(exactUrl)) {
          finalResponse += ` [${aiResult.recommendedProduct.title}](${exactUrl})`;
        }
      }

      res.json({
        response: finalResponse,
        recommendedProduct: aiResult.recommendedProduct,
        confidence: aiResult.confidence,
        hasCohere: true
      });
      
    } catch (error) {
      console.error("AI Chat Error:", error);
      res.status(500).json({ 
        error: "Cohere service unavailable",
        hasCohere: false,
        fallback: true
      });
    }
  });

  // AI Conversation History endpoints
  app.post("/api/ai-conversations", async (req, res) => {
    try {
      const conversationData = insertAiConversationSchema.parse(req.body);
      const savedConversation = await storage.saveAiConversation(conversationData);
      res.json(savedConversation);
    } catch (error) {
      console.error("Error saving AI conversation:", error);
      res.status(500).json({ message: "Failed to save conversation" });
    }
  });

  app.get("/api/ai-conversations/session/:sessionId", async (req, res) => {
    try {
      const { sessionId } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const conversations = await storage.getAiConversationHistory(sessionId, limit);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching conversation history:", error);
      res.status(500).json({ message: "Failed to fetch conversation history" });
    }
  });

  app.get("/api/ai-conversations/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const limit = parseInt(req.query.limit as string) || 100;
      const conversations = await storage.getUserAiConversations(userId, limit);
      res.json(conversations);
    } catch (error) {
      console.error("Error fetching user conversations:", error);
      res.status(500).json({ message: "Failed to fetch user conversations" });
    }
  });

  // SMS Messaging endpoints
  app.post("/api/sms/send", async (req, res) => {
    try {
      const smsData = insertSmsMessageSchema.parse(req.body);
      
      // Create SMS record in database
      const smsMessage = await storage.createSmsMessage(smsData);
      
      // Send SMS if service is configured
      if (smsService.isConfigured()) {
        const result = await smsService.sendSMS({
          to: smsData.phoneNumber,
          message: smsData.message,
          scheduleTime: smsData.scheduledAt || undefined
        });
        
        if (result.success) {
          await storage.updateSmsStatus(smsMessage.id, "sent", result.messageId, new Date());
        } else {
          await storage.updateSmsStatus(smsMessage.id, "failed");
        }
        
        res.json({ success: result.success, smsId: smsMessage.id, error: result.error });
      } else {
        await storage.updateSmsStatus(smsMessage.id, "failed");
        res.json({ success: false, smsId: smsMessage.id, error: "SMS service not configured" });
      }
    } catch (error) {
      console.error("Error sending SMS:", error);
      res.status(500).json({ message: "Failed to send SMS" });
    }
  });

  app.post("/api/sms/preferences", async (req, res) => {
    try {
      const preferencesData = insertUserSmsPreferencesSchema.parse(req.body);
      const preferences = await storage.createUserSmsPreferences(preferencesData);
      
      // Send welcome SMS if opted in
      if (preferences.isOptedIn && smsService.isConfigured()) {
        await smsService.sendWelcomeMessage(preferences.phoneNumber);
      }
      
      res.json(preferences);
    } catch (error) {
      console.error("Error creating SMS preferences:", error);
      res.status(500).json({ message: "Failed to create SMS preferences" });
    }
  });

  app.get("/api/sms/preferences/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const preferences = await storage.getUserSmsPreferences(userId);
      res.json(preferences || null);
    } catch (error) {
      console.error("Error fetching SMS preferences:", error);
      res.status(500).json({ message: "Failed to fetch SMS preferences" });
    }
  });

  app.put("/api/sms/preferences/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const updates = req.body;
      await storage.updateUserSmsPreferences(userId, updates);
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating SMS preferences:", error);
      res.status(500).json({ message: "Failed to update SMS preferences" });
    }
  });

  app.post("/api/sms/opt-out/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      await storage.optOutFromSms(userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error opting out from SMS:", error);
      res.status(500).json({ message: "Failed to opt out from SMS" });
    }
  });

  app.get("/api/sms/pending", async (req, res) => {
    try {
      const pendingMessages = await storage.getPendingSmsMessages();
      res.json(pendingMessages);
    } catch (error) {
      console.error("Error fetching pending SMS:", error);
      res.status(500).json({ message: "Failed to fetch pending SMS" });
    }
  });

  // SMS status check endpoint
  app.get("/api/sms/status", (req, res) => {
    res.json({ 
      isConfigured: smsService.isConfigured(),
      message: smsService.isConfigured() 
        ? "SMS service is ready" 
        : "SMS service requires Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER)"
    });
  });

  // Reviews
  app.get("/api/reviews", async (req, res) => {
    try {
      const data = await storage.getApprovedReviews();
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  app.get("/api/admin/reviews", async (req, res) => {
    try {
      const data = await storage.getAllReviews();
      res.json(data);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch reviews" });
    }
  });

  app.post("/api/reviews", async (req, res) => {
    try {
      const { name, rating, message, deviceId } = req.body;
      if (!name || !message || !deviceId) return res.status(400).json({ error: "Missing fields" });
      const r = await storage.submitReview(name, rating || 5, message, deviceId);
      res.json(r);
    } catch (e) {
      res.status(500).json({ error: "Failed to submit review" });
    }
  });

  // Contact Messages
  app.post("/api/contact", async (req, res) => {
    try {
      const { name, message, deviceId } = req.body;
      if (!message) return res.status(400).json({ error: "Message required" });
      const msg = await storage.submitContactMessage(name, message, deviceId);
      res.json(msg);
    } catch (e) {
      res.status(500).json({ error: "Failed to save message" });
    }
  });

  app.get("/api/contact/messages", async (req, res) => {
    try {
      const msgs = await storage.getAllContactMessages();
      res.json(msgs);
    } catch (e) {
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.delete("/api/contact/messages/all", async (req, res) => {
    try {
      await storage.deleteAllContactMessages();
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete all messages" });
    }
  });

  app.delete("/api/contact/messages/resolved", async (req, res) => {
    try {
      await storage.deleteAllResolvedContactMessages();
      res.json({ ok: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete resolved messages" });
    }
  });

  app.put("/api/contact/messages/:id/resolve", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { aiResponse } = req.body;
      await storage.markContactMessageResolved(id, aiResponse);
      res.json({ ok: true });
    } catch (e) {
      res.status(500).json({ error: "Failed to resolve message" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
