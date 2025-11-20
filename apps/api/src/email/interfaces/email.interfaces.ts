/**
 * Email Service Interfaces
 *
 * Defines types and interfaces for the email system
 */

export enum EmailProvider {
  SENDGRID = 'sendgrid',
  SES = 'ses',
  SMTP = 'smtp',
  STUB = 'stub',
}

export enum EmailPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 10,
  CRITICAL = 15,
}

export enum EmailType {
  VERIFICATION = 'verification',
  MAGIC_LINK = 'magic_link',
  PASSWORD_RESET = 'password_reset',
  MFA_CODE = 'mfa_code',
  SECURITY_ALERT = 'security_alert',
  WELCOME = 'welcome',
  REFERENCE_REQUEST = 'reference_request',
  REFERENCE_SUBMITTED = 'reference_submitted',
  REFERENCE_REMINDER = 'reference_reminder',
  KYC_STATUS = 'kyc_status',
  ACCOUNT_LOCKOUT = 'account_lockout',
  SUSPICIOUS_LOGIN = 'suspicious_login',
  SYSTEM_NOTIFICATION = 'system_notification',
  MARKETING = 'marketing',
}

export interface EmailAddress {
  email: string;
  name?: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType?: string;
  encoding?: string;
}

export interface EmailOptions {
  to: string | EmailAddress | EmailAddress[];
  from?: string | EmailAddress;
  replyTo?: string | EmailAddress;
  subject: string;
  html: string;
  text?: string;
  cc?: string | EmailAddress | EmailAddress[];
  bcc?: string | EmailAddress | EmailAddress[];
  attachments?: EmailAttachment[];
  headers?: Record<string, string>;
  tags?: string[];
  metadata?: Record<string, any>;
}

export interface EmailJobData {
  options: EmailOptions;
  type: EmailType;
  userId?: string;
  priority: EmailPriority;
  metadata?: Record<string, any>;
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  provider: EmailProvider;
  error?: string;
  timestamp: Date;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text: string;
}

export interface EmailTemplateContext {
  [key: string]: any;
  // Common fields
  recipientName?: string;
  recipientEmail?: string;
  companyName?: string;
  supportEmail?: string;
  supportUrl?: string;
  unsubscribeUrl?: string;
  privacyUrl?: string;
  termsUrl?: string;
  baseUrl?: string;
  logoUrl?: string;
  year?: number;
}

export interface EmailDeliveryStatus {
  emailLogId: string;
  status: 'pending' | 'sent' | 'delivered' | 'bounced' | 'complained' | 'failed';
  provider: EmailProvider;
  messageId?: string;
  error?: string;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  bouncedAt?: Date;
  complainedAt?: Date;
}

export interface EmailRateLimitInfo {
  userId?: string;
  emailType: EmailType;
  count: number;
  limit: number;
  windowMs: number;
  resetAt: Date;
}

export interface EmailProviderConfig {
  provider: EmailProvider;
  apiKey?: string;
  region?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  password?: string;
  from?: string | EmailAddress;
  replyTo?: string | EmailAddress;
}

export interface EmailWebhookEvent {
  provider: EmailProvider;
  eventType: 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'failed';
  messageId: string;
  email: string;
  timestamp: Date;
  reason?: string;
  metadata?: Record<string, any>;
}

export interface IEmailProvider {
  send(options: EmailOptions): Promise<EmailSendResult>;
  verifyConnection(): Promise<boolean>;
}

export interface EmailStats {
  sent: number;
  delivered: number;
  bounced: number;
  complained: number;
  failed: number;
  deliveryRate: number;
  bounceRate: number;
  complaintRate: number;
}
