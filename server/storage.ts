import { users, affiliateLinks, referralCodes, userStats, userIdeas, aiConversations, smsMessages, userSmsPreferences, reviews, contactMessages, type User, type InsertUser, type AffiliateLink, type InsertAffiliateLink, type ReferralCode, type UserStats, type UserIdea, type InsertUserIdea, type AiConversation, type InsertAiConversation, type SmsMessage, type InsertSmsMessage, type UserSmsPreferences, type InsertUserSmsPreferences, type ContactMessage } from "@shared/schema";
import { db } from "./db";
import { eq, desc, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Affiliate Links
  getAllAffiliateLinks(): Promise<AffiliateLink[]>;
  getPublishedAffiliateLinks(): Promise<AffiliateLink[]>;
  getDraftAffiliateLinks(): Promise<AffiliateLink[]>;
  getAffiliateLinkById(id: number): Promise<AffiliateLink | undefined>;
  createAffiliateLink(link: InsertAffiliateLink): Promise<AffiliateLink>;
  updateAffiliateLink(id: number, link: Partial<AffiliateLink>): Promise<AffiliateLink | undefined>;
  deleteAffiliateLink(id: number): Promise<boolean>;
  publishDraft(id: number): Promise<AffiliateLink | undefined>;
  publishAllDrafts(): Promise<AffiliateLink[]>;
  incrementLinkClicks(id: number): Promise<AffiliateLink | undefined>;
  
  // Referral System
  generateReferralCode(userId: string): Promise<ReferralCode>;
  useReferralCode(code: string, deviceId: string): Promise<{ vipUnlocked: boolean; usedCount: number }>;
  getReferralStatus(userId: string): Promise<{ myCode?: string; usedCount: number; isVip: boolean }>;
  
  // User Stats & Leaderboard
  updateUserStats(userId: string, savings: number): Promise<void>;
  updateSavingsProgress(userId: string, amount: number): Promise<{ hasReward: boolean; newProgress: number }>;
  updateUsername(userId: string, username: string): Promise<void>;
  getLeaderboard(): Promise<{ topSavers: any[]; topReferrers: any[] }>;
  
  // User Ideas
  submitUserIdea(deviceId: string, idea: string): Promise<UserIdea>;
  getAllUserIdeas(): Promise<UserIdea[]>;
  deleteAllUserIdeas(): Promise<void>;
  deleteAllReviewedUserIdeas(): Promise<void>;
  deleteAllContactMessages(): Promise<void>;
  deleteAllResolvedContactMessages(): Promise<void>;
  
  // AI Conversations
  saveAiConversation(conversation: InsertAiConversation): Promise<AiConversation>;
  getAiConversationHistory(sessionId: string, limit?: number): Promise<AiConversation[]>;
  getUserAiConversations(userId: string, limit?: number): Promise<AiConversation[]>;
  
  // SMS Messaging
  createSmsMessage(smsData: InsertSmsMessage): Promise<SmsMessage>;
  updateSmsStatus(id: number, status: string, externalId?: string, sentAt?: Date): Promise<void>;
  getPendingSmsMessages(): Promise<SmsMessage[]>;
  getUserSmsPreferences(userId: string): Promise<UserSmsPreferences | undefined>;
  createUserSmsPreferences(preferences: InsertUserSmsPreferences): Promise<UserSmsPreferences>;
  updateUserSmsPreferences(userId: string, preferences: Partial<UserSmsPreferences>): Promise<void>;
  optOutFromSms(userId: string): Promise<void>;
  markIdeaAsReviewed(id: number): Promise<UserIdea | undefined>;

  // Contact Messages
  submitContactMessage(name: string | undefined, message: string, deviceId: string | undefined): Promise<ContactMessage>;
  getAllContactMessages(): Promise<ContactMessage[]>;
  markContactMessageResolved(id: number, aiResponse?: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async getAllAffiliateLinks(): Promise<AffiliateLink[]> {
    const links = await db.select().from(affiliateLinks);
    return links;
  }

  async getPublishedAffiliateLinks(): Promise<AffiliateLink[]> {
    const links = await db.select().from(affiliateLinks).where(eq(affiliateLinks.isDraft, 0));
    return links;
  }

  async getDraftAffiliateLinks(): Promise<AffiliateLink[]> {
    const links = await db.select().from(affiliateLinks).where(eq(affiliateLinks.isDraft, 1));
    return links;
  }

  async getAffiliateLinkById(id: number): Promise<AffiliateLink | undefined> {
    const [link] = await db.select().from(affiliateLinks).where(eq(affiliateLinks.id, id));
    return link || undefined;
  }

  async createAffiliateLink(insertLink: any): Promise<AffiliateLink> {
    const [link] = await db
      .insert(affiliateLinks)
      .values({
        title: insertLink.title,
        url: insertLink.url,
        description: insertLink.description,
        category: insertLink.category,
        imageUrl: insertLink.imageUrl || null,
        imageUrls: insertLink.imageUrls || null,
        price: insertLink.price || null,
        clicks: 0,
        stock: insertLink.stock || 0,
        isElitePick: insertLink.isElitePick || 0,
        isVerified: insertLink.isVerified || 0,
        isDraft: insertLink.isDraft || 0,
        scheduledPublishAt: insertLink.scheduledPublishAt || null,
        scheduledDeleteAt: insertLink.scheduledDeleteAt || null,
        aiPrivateInfo: insertLink.aiPrivateInfo || null
      })
      .returning();
    return link;
  }

  async publishDraft(id: number): Promise<AffiliateLink | undefined> {
    const [updated] = await db
      .update(affiliateLinks)
      .set({ isDraft: 0 })
      .where(eq(affiliateLinks.id, id))
      .returning();
    return updated || undefined;
  }

  async publishAllDrafts(): Promise<AffiliateLink[]> {
    const updated = await db
      .update(affiliateLinks)
      .set({ isDraft: 0 })
      .where(eq(affiliateLinks.isDraft, 1))
      .returning();
    return updated;
  }

  async updateAffiliateLink(id: number, updateData: Partial<AffiliateLink>): Promise<AffiliateLink | undefined> {
    const [updated] = await db
      .update(affiliateLinks)
      .set({
        ...updateData,
        scheduledDeleteAt: updateData.scheduledDeleteAt || null,
      })
      .where(eq(affiliateLinks.id, id))
      .returning();
    return updated || undefined;
  }

  async deleteAffiliateLink(id: number): Promise<boolean> {
    const result = await db
      .delete(affiliateLinks)
      .where(eq(affiliateLinks.id, id))
      .returning();
    return result.length > 0;
  }

  async incrementLinkClicks(id: number): Promise<AffiliateLink | undefined> {
    const current = await this.getAffiliateLinkById(id);
    if (!current) return undefined;
    
    const [updated] = await db
      .update(affiliateLinks)
      .set({ clicks: current.clicks + 1 })
      .where(eq(affiliateLinks.id, id))
      .returning();
    return updated || undefined;
  }

  // Referral System Methods
  async generateReferralCode(userId: string): Promise<ReferralCode> {
    // Check if this device already has a regular code
    const [existingCode] = await db.select().from(referralCodes)
      .where(sql`${referralCodes.userId} = ${userId} AND ${referralCodes.codeType} = 'regular'`)
      .limit(1);
    
    if (existingCode) {
      return existingCode;
    }
    
    // Generate unique code with device-specific prefix
    const devicePrefix = userId.slice(-4).toUpperCase();
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const code = devicePrefix + randomSuffix;
    
    const [referralCode] = await db
      .insert(referralCodes)
      .values({
        code,
        userId,
        usedCount: 0,
        usedDevices: [],
        isVip: 0,
        isDoublePoints: 0,
        codeType: "regular"
      })
      .returning();
    return referralCode;
  }

  async useReferralCode(code: string, deviceId: string): Promise<{ vipUnlocked: boolean; usedCount: number }> {
    const [referralCode] = await db.select().from(referralCodes).where(eq(referralCodes.code, code));
    
    if (!referralCode) {
      throw new Error('Invalid referral code');
    }

    // Check if device already used THIS SPECIFIC code (prevent duplicate uses of same code)
    if (referralCode.usedDevices && referralCode.usedDevices.includes(deviceId)) {
      throw new Error('This device has already used this referral code');
    }

    // Determine points to add based on code type
    const pointsToAdd = referralCode.isDoublePoints ? 2 : 1;
    const newUsedDevices = [...(referralCode.usedDevices || []), deviceId];
    const newUsedCount = (referralCode.usedCount || 0) + 1;
    const vipUnlocked = newUsedCount >= 3 && !referralCode.isVip;

    // Update referral code
    await db
      .update(referralCodes)
      .set({
        usedCount: newUsedCount,
        usedDevices: newUsedDevices,
        isVip: vipUnlocked ? 1 : referralCode.isVip
      })
      .where(eq(referralCodes.code, code));

    // Update user stats - add referral points (1 or 2 based on code type)
    await this.updateUserReferralCount(referralCode.userId, pointsToAdd);
    
    // CRITICAL: When bonus codes are used, increment the ORIGINAL code owner's leaderboard invites
    // This ensures that $1000 reward codes properly boost the owner's leaderboard ranking
    await this.incrementCodeOwnerLeaderboardInvites(referralCode.userId, pointsToAdd);
    
    // Update VIP status if needed
    if (vipUnlocked) {
      await this.updateUserVipStatus(referralCode.userId, true);
    }

    return { vipUnlocked, usedCount: newUsedCount };
  }

  async getReferralStatus(userId: string): Promise<{ myCode?: string; usedCount: number; isVip: boolean; username?: string; totalCodesShared?: number; invitesUsedCount?: number; rewardCodes?: any[] }> {
    // Get primary referral code (first regular code)
    const [referralCode] = await db.select().from(referralCodes)
      .where(sql`${referralCodes.userId} = ${userId} AND ${referralCodes.codeType} = 'regular'`)
      .orderBy(referralCodes.createdAt)
      .limit(1);
    
    const [userStat] = await db.select().from(userStats).where(eq(userStats.userId, userId));
    
    // Always ensure users with $1000+ saved have bonus codes available
    if (userStat && userStat.savingsProgress && userStat.savingsProgress >= 1000) {
      const existingBonusCodes = await db.select().from(referralCodes)
        .where(sql`${referralCodes.userId} = ${userId} AND ${referralCodes.codeType} IN ('bonus_2x', 'bonus_regular')`);
      
      // Always generate bonus codes if none exist
      if (existingBonusCodes.length === 0) {
        await this.generateRewardCodes(userId);
      }
    }
    
    // Get all user's codes including reward codes
    const allUserCodes = await db.select().from(referralCodes).where(eq(referralCodes.userId, userId));
    const rewardCodes = allUserCodes.filter(code => code.codeType && code.codeType !== "regular");
    
    // Calculate total codes shared: sum of all codes usage
    const totalUsageCount = allUserCodes.reduce((sum, code) => sum + (code.usedCount || 0), 0);
    
    return {
      myCode: referralCode?.code,
      usedCount: referralCode?.usedCount || 0,
      isVip: Boolean(userStat?.isVip || referralCode?.isVip),
      username: userStat?.username || undefined,
      totalCodesShared: totalUsageCount,
      invitesUsedCount: userStat?.invitesUsedCount || 0,
      rewardCodes
    };
  }

  private async updateUserVipStatus(userId: string, isVip: boolean): Promise<void> {
    const [existingStats] = await db.select().from(userStats).where(eq(userStats.userId, userId));
    
    if (existingStats) {
      await db
        .update(userStats)
        .set({ 
          isVip: isVip ? 1 : 0,
          lastActive: new Date()
        })
        .where(eq(userStats.userId, userId));
    } else {
      await db
        .insert(userStats)
        .values({
          userId,
          totalSavings: 0,
          referralCount: 0,
          totalCodesShared: 0,
          isVip: isVip ? 1 : 0
        });
    }
  }

  private async updateUserReferralCount(userId: string, pointsToAdd: number): Promise<void> {
    const [existingStats] = await db.select().from(userStats).where(eq(userStats.userId, userId));
    
    if (existingStats) {
      await db
        .update(userStats)
        .set({ 
          referralCount: (existingStats.referralCount || 0) + pointsToAdd,
          lastActive: new Date()
        })
        .where(eq(userStats.userId, userId));
    } else {
      await db
        .insert(userStats)
        .values({
          userId,
          referralCount: pointsToAdd,
          totalSavings: 0,
          totalCodesShared: 0,
          invitesUsedCount: 0,
          isVip: 0
        });
    }
  }

  private async incrementUserInviteUsageCount(deviceId: string): Promise<void> {
    const [existingStats] = await db.select().from(userStats).where(eq(userStats.userId, deviceId));
    
    if (existingStats) {
      await db
        .update(userStats)
        .set({ 
          invitesUsedCount: (existingStats.invitesUsedCount || 0) + 1,
          lastActive: new Date()
        })
        .where(eq(userStats.userId, deviceId));
    } else {
      await db
        .insert(userStats)
        .values({
          userId: deviceId,
          referralCount: 0,
          totalSavings: 0,
          totalCodesShared: 0,
          invitesUsedCount: 1,
          isVip: 0
        });
    }
  }

  async updateUserStats(userId: string, savings: number): Promise<void> {
    const [existingStats] = await db.select().from(userStats).where(eq(userStats.userId, userId));
    
    if (existingStats) {
      await db
        .update(userStats)
        .set({ 
          totalSavings: (existingStats.totalSavings || 0) + savings,
          lastActive: new Date()
        })
        .where(eq(userStats.userId, userId));
    } else {
      await db
        .insert(userStats)
        .values({
          userId,
          totalSavings: savings,
          referralCount: 0,
          isVip: 0
        });
    }
  }

  async updateSavingsProgress(userId: string, amount: number): Promise<{ hasReward: boolean; newProgress: number }> {
    const [existingStats] = await db.select().from(userStats).where(eq(userStats.userId, userId));
    const currentProgress = existingStats?.savingsProgress || 0;
    const newProgress = currentProgress + amount;
    const hasReward = newProgress >= 1000 && currentProgress < 1000 && !existingStats?.hasSeinfeldCode;

    // Generate reward codes when hitting $1000 milestone for first time
    if (hasReward) {
      await this.generateRewardCodes(userId);
    }

    // Also ensure bonus codes exist for anyone above $1000
    if (newProgress >= 1000) {
      const existingBonusCodes = await db.select().from(referralCodes)
        .where(sql`${referralCodes.userId} = ${userId} AND ${referralCodes.codeType} IN ('bonus_2x', 'bonus_regular')`);
      
      if (existingBonusCodes.length === 0) {
        await this.generateRewardCodes(userId);
      }
    }

    if (existingStats) {
      await db
        .update(userStats)
        .set({
          savingsProgress: newProgress,
          hasSeinfeldCode: hasReward ? 1 : existingStats.hasSeinfeldCode,
          lastActive: new Date()
        })
        .where(eq(userStats.userId, userId));
    } else {
      await db
        .insert(userStats)
        .values({
          userId,
          savingsProgress: newProgress,
          hasSeinfeldCode: hasReward ? 1 : 0,
          totalSavings: 0,
          referralCount: 0,
          totalCodesShared: 0,
          invitesUsedCount: 0,
          isVip: 0
        });
    }

    return { hasReward, newProgress };
  }

  async updateUsername(userId: string, username: string): Promise<void> {
    const [existingStats] = await db.select().from(userStats).where(eq(userStats.userId, userId));
    
    if (existingStats) {
      await db
        .update(userStats)
        .set({ 
          username,
          lastActive: new Date()
        })
        .where(eq(userStats.userId, userId));
    } else {
      await db
        .insert(userStats)
        .values({
          userId,
          username,
          totalSavings: 0,
          referralCount: 0,
          totalCodesShared: 0,
          invitesUsedCount: 0,
          isVip: 0
        });
    }
  }



  async getLeaderboard(): Promise<{ topSavers: any[]; topReferrers: any[] }> {
    // Auto-promote users who qualify for leaderboard
    await this.autoPromoteQualifyingUsers();
    
    // Top savers: Only VIP users with usernames and savings progress > 0
    const topSavers = await db
      .select({
        username: userStats.username,
        totalSavings: userStats.savingsProgress,
        isVip: userStats.isVip
      })
      .from(userStats)
      .where(sql`${userStats.savingsProgress} > 0 AND ${userStats.isVip} = 1 AND ${userStats.username} IS NOT NULL`)
      .orderBy(desc(userStats.savingsProgress))
      .limit(10);

    // Top referrers: Only VIP users with usernames and 3+ invites used  
    const topReferrers = await db
      .select({
        username: userStats.username,
        referralCount: userStats.invitesUsedCount,
        isVip: userStats.isVip
      })
      .from(userStats)
      .where(sql`${userStats.invitesUsedCount} >= 3 AND ${userStats.isVip} = 1 AND ${userStats.username} IS NOT NULL`)
      .orderBy(desc(userStats.invitesUsedCount))
      .limit(10);

    return { topSavers, topReferrers };
  }

  // Generate reward codes when user has $1000+ saved
  private async generateRewardCodes(userId: string): Promise<void> {
    // Check if bonus codes already exist for this device
    const existingBonusCodes = await db.select().from(referralCodes)
      .where(sql`${referralCodes.userId} = ${userId} AND ${referralCodes.codeType} IN ('bonus_2x', 'bonus_regular')`);
    
    if (existingBonusCodes.length >= 2) {
      return; // Already has both bonus codes
    }
    
    // Generate unique device-specific reward codes
    const devicePrefix = userId.slice(-4).toUpperCase();
    const bonusCode1 = devicePrefix + "B2X" + Math.random().toString(36).substring(2, 4).toUpperCase();
    const bonusCode2 = devicePrefix + "B1X" + Math.random().toString(36).substring(2, 4).toUpperCase();
    
    // Insert both reward codes as additional invite codes
    await db.insert(referralCodes).values([
      {
        code: bonusCode1,
        userId,
        usedCount: 0,
        usedDevices: [],
        isVip: 0,
        isDoublePoints: 1,
        codeType: "bonus_2x"
      },
      {
        code: bonusCode2,
        userId,
        usedCount: 0,
        usedDevices: [],
        isVip: 0,
        isDoublePoints: 0,
        codeType: "bonus_regular"
      }
    ]);
  }

  // Method to regenerate bonus codes for existing users with $1000+
  async regenerateBonusCodesIfNeeded(userId: string): Promise<void> {
    const [userStat] = await db.select().from(userStats).where(eq(userStats.userId, userId));
    
    if (userStat && userStat.savingsProgress && userStat.savingsProgress >= 1000) {
      // Delete existing bonus codes
      await db.delete(referralCodes)
        .where(sql`${referralCodes.userId} = ${userId} AND ${referralCodes.codeType} IN ('bonus_2x', 'bonus_regular')`);
      
      // Generate fresh bonus codes
      await this.generateRewardCodes(userId);
    }
  }

  private async incrementCodeOwnerLeaderboardInvites(userId: string, pointsToAdd: number): Promise<void> {
    const [existingStats] = await db.select().from(userStats).where(eq(userStats.userId, userId));
    
    if (existingStats) {
      await db
        .update(userStats)
        .set({ 
          invitesUsedCount: (existingStats.invitesUsedCount || 0) + pointsToAdd,
          lastActive: new Date()
        })
        .where(eq(userStats.userId, userId));
    } else {
      await db
        .insert(userStats)
        .values({
          userId,
          totalSavings: 0,
          referralCount: 0,
          totalCodesShared: 0,
          invitesUsedCount: pointsToAdd,
          isVip: 0
        });
    }
  }

  private async autoPromoteQualifyingUsers(): Promise<void> {
    // Get current leaderboard (top 10 VIP users)
    const currentTopReferrers = await db
      .select({
        userId: userStats.userId,
        username: userStats.username,
        referralCount: userStats.invitesUsedCount,
        isVip: userStats.isVip
      })
      .from(userStats)
      .where(sql`${userStats.invitesUsedCount} >= 3 AND ${userStats.isVip} = 1 AND ${userStats.username} IS NOT NULL`)
      .orderBy(desc(userStats.invitesUsedCount))
      .limit(10);

    // Find the minimum invite count to qualify for leaderboard
    const minQualifyingInvites = currentTopReferrers.length === 10 
      ? (currentTopReferrers[9]?.referralCount || 3)
      : 3; // Default to 3 invites minimum

    // Find users with usernames and 3+ invites who could qualify
    const potentialQualifiers = await db
      .select()
      .from(userStats)
      .where(sql`${userStats.invitesUsedCount} >= 3 AND ${userStats.username} IS NOT NULL`);

    // Process each potential qualifier
    for (const user of potentialQualifiers) {
      const userInvites = user.invitesUsedCount || 0;
      
      // If user has more invites than minimum threshold
      if (userInvites > minQualifyingInvites) {
        
        // Check if user is already VIP
        if (!user.isVip) {
          // Promote to VIP
          await db
            .update(userStats)
            .set({ 
              isVip: 1,
              lastActive: new Date()
            })
            .where(eq(userStats.userId, user.userId));
        }

        // If leaderboard is full (10 members), demote the lowest member
        if (currentTopReferrers.length === 10 && currentTopReferrers[9] && userInvites > (currentTopReferrers[9].referralCount || 0)) {
          const lowestMember = currentTopReferrers[9];
          
          // Demote the lowest member from VIP status
          await db
            .update(userStats)
            .set({ 
              isVip: 0,
              lastActive: new Date()
            })
            .where(eq(userStats.userId, lowestMember.userId));
        }
      }
    }

    // Ensure all devices with usernames have stats entries
    await this.ensureStatsForUsernameDevices();
  }

  private async ensureStatsForUsernameDevices(): Promise<void> {
    // Get all devices that have usernames but might not have user_stats entries
    const allUsernames = await db
      .select({ userId: userStats.userId })
      .from(userStats)
      .where(sql`${userStats.username} IS NOT NULL`);

    // Create stats entries for any device that doesn't have one yet
    const deviceIds = allUsernames.map(u => u.userId);
    
    for (const deviceId of deviceIds) {
      const [existingStats] = await db.select().from(userStats).where(eq(userStats.userId, deviceId));
      
      if (!existingStats) {
        await db
          .insert(userStats)
          .values({
            userId: deviceId,
            totalSavings: 0,
            referralCount: 0,
            totalCodesShared: 0,
            invitesUsedCount: 0,
            isVip: 0
          });
      }
    }
  }
  // User Ideas Methods
  async submitUserIdea(deviceId: string, idea: string): Promise<UserIdea> {
    // Check if device already submitted an idea
    const existing = await db.select().from(userIdeas).where(eq(userIdeas.deviceId, deviceId));
    if (existing.length > 0) {
      throw new Error("Device has already submitted an idea");
    }

    const [newIdea] = await db
      .insert(userIdeas)
      .values({
        deviceId,
        idea,
        isReviewed: 0,
      })
      .returning();
    return newIdea;
  }

  async getAllUserIdeas(): Promise<UserIdea[]> {
    const ideas = await db.select().from(userIdeas).orderBy(desc(userIdeas.createdAt));
    return ideas;
  }

  async markIdeaAsReviewed(id: number): Promise<UserIdea | undefined> {
    const [updated] = await db
      .update(userIdeas)
      .set({ isReviewed: 1 })
      .where(eq(userIdeas.id, id))
      .returning();
    return updated || undefined;
  }

  // AI Conversation Methods
  async saveAiConversation(conversation: InsertAiConversation): Promise<AiConversation> {
    const [savedConversation] = await db
      .insert(aiConversations)
      .values(conversation)
      .returning();
    return savedConversation;
  }

  async getAiConversationHistory(sessionId: string, limit: number = 50): Promise<AiConversation[]> {
    return await db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.sessionId, sessionId))
      .orderBy(desc(aiConversations.createdAt))
      .limit(limit);
  }

  async getUserAiConversations(userId: string, limit: number = 100): Promise<AiConversation[]> {
    return await db
      .select()
      .from(aiConversations)
      .where(eq(aiConversations.userId, userId))
      .orderBy(desc(aiConversations.createdAt))
      .limit(limit);
  }

  // SMS Messaging Methods
  async createSmsMessage(smsData: InsertSmsMessage): Promise<SmsMessage> {
    const [smsMessage] = await db
      .insert(smsMessages)
      .values(smsData)
      .returning();
    return smsMessage;
  }

  async updateSmsStatus(id: number, status: string, externalId?: string, sentAt?: Date): Promise<void> {
    const updateData: Partial<SmsMessage> = { status };
    if (externalId) updateData.externalId = externalId;
    if (sentAt) updateData.sentAt = sentAt;

    await db
      .update(smsMessages)
      .set(updateData)
      .where(eq(smsMessages.id, id));
  }

  async getPendingSmsMessages(): Promise<SmsMessage[]> {
    return await db
      .select()
      .from(smsMessages)
      .where(eq(smsMessages.status, "pending"))
      .orderBy(smsMessages.scheduledAt || smsMessages.createdAt);
  }

  async getUserSmsPreferences(userId: string): Promise<UserSmsPreferences | undefined> {
    const [preferences] = await db
      .select()
      .from(userSmsPreferences)
      .where(eq(userSmsPreferences.userId, userId));
    return preferences || undefined;
  }

  async createUserSmsPreferences(preferences: InsertUserSmsPreferences): Promise<UserSmsPreferences> {
    const [smsPreferences] = await db
      .insert(userSmsPreferences)
      .values(preferences)
      .returning();
    return smsPreferences;
  }

  async updateUserSmsPreferences(userId: string, preferences: Partial<UserSmsPreferences>): Promise<void> {
    await db
      .update(userSmsPreferences)
      .set(preferences)
      .where(eq(userSmsPreferences.userId, userId));
  }

  async optOutFromSms(userId: string): Promise<void> {
    await db
      .update(userSmsPreferences)
      .set({ 
        isOptedIn: 0, 
        optOutDate: new Date() 
      })
      .where(eq(userSmsPreferences.userId, userId));
  }

  async submitReview(name: string, rating: number, message: string, deviceId: string) {
    const [review] = await db.insert(reviews).values({ name, rating, message, deviceId, isApproved: 1 }).returning();
    return review;
  }

  async getApprovedReviews() {
    return db.select().from(reviews).where(eq(reviews.isApproved, 1)).orderBy(desc(reviews.createdAt));
  }

  async getAllReviews() {
    return db.select().from(reviews).orderBy(desc(reviews.createdAt));
  }

  async deleteAllUserIdeas(): Promise<void> {
    await db.delete(userIdeas);
  }

  async deleteAllReviewedUserIdeas(): Promise<void> {
    await db.delete(userIdeas).where(eq(userIdeas.isReviewed, 1));
  }

  async deleteAllContactMessages(): Promise<void> {
    await db.delete(contactMessages);
  }

  async deleteAllResolvedContactMessages(): Promise<void> {
    await db.delete(contactMessages).where(eq(contactMessages.isResolved, 1));
  }

  async submitContactMessage(name: string | undefined, message: string, deviceId: string | undefined): Promise<ContactMessage> {
    const [msg] = await db.insert(contactMessages).values({ name: name || null, message, deviceId: deviceId || null }).returning();
    return msg;
  }

  async getAllContactMessages(): Promise<ContactMessage[]> {
    return db.select().from(contactMessages).orderBy(desc(contactMessages.createdAt));
  }

  async markContactMessageResolved(id: number, aiResponse?: string): Promise<void> {
    await db.update(contactMessages)
      .set({ isResolved: 1, ...(aiResponse ? { aiResponse } : {}) })
      .where(eq(contactMessages.id, id));
  }
}

export const storage = new DatabaseStorage();
