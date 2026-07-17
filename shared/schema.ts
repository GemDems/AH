import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const affiliateLinks = pgTable("affiliate_links", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  url: text("url").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  imageUrls: text("image_urls").array(),
  price: text("price"),
  clicks: integer("clicks").notNull().default(0),
  stock: integer("stock").default(0),
  isElitePick: integer("is_elite_pick").default(0), // Using integer for boolean compatibility
  isVerified: integer("is_verified").default(0), // Verified source badge (Amazon/Walmart/etc)
  isDraft: integer("is_draft").default(0), // Draft status - 0 = published, 1 = draft
  scheduledPublishAt: timestamp("scheduled_publish_at"), // When to auto-publish draft
  scheduledDeleteAt: timestamp("scheduled_delete_at"), // When to auto-delete product
  // Private field for AI - not shown to users anywhere, only for AI analysis
  aiPrivateInfo: text("ai_private_info"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const referralCodes = pgTable("referral_codes", {
  id: serial("id").primaryKey(),
  code: text("code").unique().notNull(),
  userId: text("user_id").notNull(),
  usedCount: integer("used_count").default(0),
  usedDevices: text("used_devices").array().default([]),
  isVip: integer("is_vip").default(0), // Using integer for boolean compatibility
  isDoublePoints: integer("is_double_points").default(0), // Double referral points code
  codeType: text("code_type").default("regular"), // "regular", "seinfeld", "double_points"
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const userStats = pgTable("user_stats", {
  id: serial("id").primaryKey(),
  userId: text("user_id").unique().notNull(),
  username: text("username"), // Display name for leaderboard (Name/F format)
  totalSavings: integer("total_savings").default(0),
  referralCount: integer("referral_count").default(0),
  totalCodesShared: integer("total_codes_shared").default(0), // Total referral codes shared in lifetime
  isVip: integer("is_vip").default(0), // Using integer for boolean compatibility
  savingsProgress: integer("savings_progress").default(0), // Tracks click savings progress toward $1000
  hasSeinfeldCode: integer("has_seinfeld_code").default(0), // Level 1 reward unlock
  invitesUsedCount: integer("invites_used_count").default(0), // How many different invite codes this user has used
  lastActive: timestamp("last_active").defaultNow().notNull(),
});

export const userIdeas = pgTable("user_ideas", {
  id: serial("id").primaryKey(),
  deviceId: text("device_id").notNull(),
  idea: text("idea").notNull(), // 2 words max, 20 characters max
  isReviewed: integer("is_reviewed").default(0), // 0 = new, 1 = reviewed
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// AI Conversation History for tracking user interactions with AI chatbot
export const aiConversations = pgTable("ai_conversations", {
  id: serial("id").primaryKey(),
  sessionId: text("session_id").notNull(), // User session identifier
  userId: text("user_id"), // Optional user ID if logged in
  userMessage: text("user_message").notNull(),
  aiResponse: text("ai_response").notNull(),
  intent: text("intent"), // Detected user intent (JSON string)
  productRecommended: integer("product_recommended"), // ID of recommended product
  conversationContext: text("conversation_context"), // Previous context (JSON string)
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// SMS Messages for sending promotional and alert messages
export const smsMessages = pgTable("sms_messages", {
  id: serial("id").primaryKey(),
  phoneNumber: text("phone_number").notNull(),
  message: text("message").notNull(),
  messageType: text("message_type").default("promotional"), // "promotional", "alert", "deal_notification"
  status: text("status").default("pending"), // "pending", "sent", "failed", "delivered"
  externalId: text("external_id"), // SMS service provider message ID
  productId: integer("product_id"), // Related product for deal notifications
  userId: text("user_id"), // User who should receive the message
  scheduledAt: timestamp("scheduled_at"), // When to send the message
  sentAt: timestamp("sent_at"), // When the message was actually sent
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User SMS Preferences for managing opt-ins and preferences
export const userSmsPreferences = pgTable("user_sms_preferences", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  phoneNumber: text("phone_number").notNull(),
  isOptedIn: integer("is_opted_in").default(1), // 0 = opted out, 1 = opted in
  dealNotifications: integer("deal_notifications").default(1), // Receive deal alerts
  priceDropAlerts: integer("price_drop_alerts").default(1), // Receive price drop alerts
  weeklyDigest: integer("weekly_digest").default(0), // Receive weekly deal digest
  optInDate: timestamp("opt_in_date").defaultNow().notNull(),
  optOutDate: timestamp("opt_out_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  rating: integer("rating").notNull().default(5),
  message: text("message").notNull(),
  deviceId: text("device_id").notNull(),
  isApproved: integer("is_approved").default(1),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const contactMessages = pgTable("contact_messages", {
  id: serial("id").primaryKey(),
  name: text("name"),
  message: text("message").notNull(),
  deviceId: text("device_id"),
  aiResponse: text("ai_response"),
  isResolved: integer("is_resolved").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertAffiliateLinkSchema = z.object({
  title: z.string().min(1, "Title is required"),
  url: z.string().url("Valid URL is required"),
  description: z.string().min(1, "Description is required"),
  category: z.string().min(1, "Category is required"),
  imageUrl: z.string().optional().or(z.null()),
  imageUrls: z.array(z.string()).optional().or(z.null()),
  price: z.string().optional().or(z.null()),
  stock: z.number().optional().default(0),
  isElitePick: z.number().optional().default(0),
  isVerified: z.number().optional().default(0),
  isDraft: z.number().optional().default(0),
  scheduledPublishAt: z.date().optional().or(z.null()),
  scheduledDeleteAt: z.date().optional().or(z.null()),
  aiPrivateInfo: z.string().optional().or(z.null()),
});

// Zod schemas for AI and SMS tables
export const insertAiConversationSchema = createInsertSchema(aiConversations).pick({
  sessionId: true,
  userId: true,
  userMessage: true,
  aiResponse: true,
  intent: true,
  productRecommended: true,
  conversationContext: true,
});

export const insertSmsMessageSchema = createInsertSchema(smsMessages).pick({
  phoneNumber: true,
  message: true,
  messageType: true,
  productId: true,
  userId: true,
  scheduledAt: true,
});

export const insertUserSmsPreferencesSchema = createInsertSchema(userSmsPreferences).pick({
  userId: true,
  phoneNumber: true,
  dealNotifications: true,
  priceDropAlerts: true,
  weeklyDigest: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type AffiliateLink = typeof affiliateLinks.$inferSelect;
export type InsertAffiliateLink = z.infer<typeof insertAffiliateLinkSchema>;
export type ReferralCode = typeof referralCodes.$inferSelect;
export type UserStats = typeof userStats.$inferSelect;
export type UserIdea = typeof userIdeas.$inferSelect;
export type InsertUserIdea = typeof userIdeas.$inferInsert;
export type AiConversation = typeof aiConversations.$inferSelect;
export type InsertAiConversation = z.infer<typeof insertAiConversationSchema>;
export type SmsMessage = typeof smsMessages.$inferSelect;
export type InsertSmsMessage = z.infer<typeof insertSmsMessageSchema>;
export type UserSmsPreferences = typeof userSmsPreferences.$inferSelect;
export type InsertUserSmsPreferences = z.infer<typeof insertUserSmsPreferencesSchema>;
export type Review = typeof reviews.$inferSelect;
export type ContactMessage = typeof contactMessages.$inferSelect;
