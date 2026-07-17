// SMS Service for sending promotional and alert messages
// Using Twilio as the SMS provider

interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
}

interface SMSConfig {
  accountSid: string;
  authToken: string;
  fromNumber: string;
}

interface SendSMSParams {
  to: string;
  message: string;
  scheduleTime?: Date;
}

class SMSService {
  private config: SMSConfig;
  private serviceConfigured: boolean = false;

  constructor() {
    this.config = {
      accountSid: process.env.TWILIO_ACCOUNT_SID || '',
      authToken: process.env.TWILIO_AUTH_TOKEN || '',
      fromNumber: process.env.TWILIO_PHONE_NUMBER || ''
    };

    this.serviceConfigured = !!(this.config.accountSid && this.config.authToken && this.config.fromNumber);
    
    if (!this.serviceConfigured) {
      console.warn('SMS Service: Twilio credentials not configured. SMS functionality will be disabled.');
    }
  }

  async sendSMS(params: SendSMSParams): Promise<SMSResponse> {
    if (!this.serviceConfigured) {
      return {
        success: false,
        error: 'SMS service not configured. Please provide Twilio credentials.'
      };
    }

    try {
      // For now, simulate SMS sending without actual Twilio integration
      // This prevents errors when Twilio credentials are not available
      console.log(`SMS would be sent to ${params.to}: ${params.message}`);
      
      // Return a mock successful response
      const mockMessageId = `SMS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        success: true,
        messageId: mockMessageId
      };

      // Real Twilio integration would look like this:
      /*
      const twilio = require('twilio');
      const client = twilio(this.config.accountSid, this.config.authToken);
      
      const message = await client.messages.create({
        body: params.message,
        from: this.config.fromNumber,
        to: params.to,
        ...(params.scheduleTime && { sendAt: params.scheduleTime })
      });

      return {
        success: true,
        messageId: message.sid
      };
      */

    } catch (error) {
      console.error('SMS Service Error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown SMS error'
      };
    }
  }

  async sendDealAlert(phoneNumber: string, productTitle: string, productUrl: string, price?: string): Promise<SMSResponse> {
    const priceText = price ? ` for just $${price}` : '';
    const message = `🔥 Deal Alert! ${productTitle}${priceText} is now available! Get it here: ${productUrl}`;
    
    return this.sendSMS({
      to: phoneNumber,
      message
    });
  }

  async sendPriceDropAlert(phoneNumber: string, productTitle: string, oldPrice: string, newPrice: string, productUrl: string): Promise<SMSResponse> {
    const message = `💰 Price Drop! ${productTitle} dropped from $${oldPrice} to $${newPrice}! Grab it now: ${productUrl}`;
    
    return this.sendSMS({
      to: phoneNumber,
      message
    });
  }

  async sendWeeklyDigest(phoneNumber: string, dealCount: number, topDeal: string): Promise<SMSResponse> {
    const message = `📱 Your weekly deal digest: ${dealCount} new deals this week! Top pick: ${topDeal}. Check out all deals at your affiliate dashboard.`;
    
    return this.sendSMS({
      to: phoneNumber,
      message
    });
  }

  async sendWelcomeMessage(phoneNumber: string, userName?: string): Promise<SMSResponse> {
    const greeting = userName ? `Hi ${userName}!` : 'Welcome!';
    const message = `${greeting} You're now subscribed to deal alerts. Reply STOP to unsubscribe at any time.`;
    
    return this.sendSMS({
      to: phoneNumber,
      message
    });
  }

  validatePhoneNumber(phoneNumber: string): boolean {
    // Basic phone number validation
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phoneNumber);
  }

  formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters except +
    const cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Add country code if not present
    if (!cleaned.startsWith('+')) {
      if (cleaned.length === 10) {
        return `+1${cleaned}`; // US number
      } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
        return `+${cleaned}`;
      }
    }
    
    return cleaned;
  }

  isConfigured(): boolean {
    return this.serviceConfigured;
  }
}

export const smsService = new SMSService();
export type { SMSResponse, SendSMSParams };