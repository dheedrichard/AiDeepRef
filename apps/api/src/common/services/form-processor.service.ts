import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reference, User } from '../../database/entities';

export interface FormValidationError {
  field: string;
  message: string;
  code?: string;
}

export interface FormValidationResult {
  valid: boolean;
  errors: FormValidationError[];
}

export interface EnrichedReferenceRequest {
  referrerName: string;
  referrerEmail: string;
  company: string;
  role: string;
  questions: string[];
  allowedFormats: string[];
  allowEmployerReachback: boolean;
  userId: string;
  createdAt: Date;
  expiresAt: Date;
  estimatedCompletionTime: string;
  aiGeneratedFollowUps?: string[];
}

/**
 * Form Processor Service
 *
 * Purpose: Move ALL form validation and processing to server-side
 * Benefits:
 * - Consistent validation across all clients
 * - Business logic validation (not just data types)
 * - Server-side data enrichment
 * - Protection against client-side tampering
 */
@Injectable()
export class FormProcessorService {
  private readonly logger = new Logger(FormProcessorService.name);

  constructor(
    @InjectRepository(Reference)
    private readonly referenceRepo: Repository<Reference>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  /**
   * Server-side multi-step form validation
   * Validates both data format AND business logic
   */
  async validateReferenceRequestForm(
    data: any,
    userId: string,
  ): Promise<FormValidationResult> {
    const errors: FormValidationError[] = [];

    try {
      // Business logic validation - check for duplicate requests
      const existingRequest = await this.referenceRepo.findOne({
        where: {
          seekerId: userId,
          referrerEmail: data.referrerEmail,
          status: 'pending',
        },
      });

      if (existingRequest) {
        errors.push({
          field: 'referrerEmail',
          message: 'You already have a pending request for this referrer',
          code: 'DUPLICATE_REQUEST',
        });
      }

      // Validate minimum question count
      const totalQuestions =
        (data.questionIds?.length || 0) + (data.customQuestions?.length || 0);
      if (totalQuestions < 3) {
        errors.push({
          field: 'questions',
          message: 'At least 3 questions are required',
          code: 'INSUFFICIENT_QUESTIONS',
        });
      }

      // Check user quota
      const userQuota = await this.getUserQuota(userId);
      if (userQuota.used >= userQuota.limit) {
        errors.push({
          field: 'quota',
          message: `You have reached your monthly request limit (${userQuota.limit})`,
          code: 'QUOTA_EXCEEDED',
        });
      }

      // Validate referrer email is not the same as user
      const user = await this.userRepo.findOne({ where: { id: userId } });
      if (user && user.email === data.referrerEmail) {
        errors.push({
          field: 'referrerEmail',
          message: 'You cannot request a reference from yourself',
          code: 'SELF_REFERENCE',
        });
      }

      // Check if user has verified their email
      if (user && !user.emailVerified) {
        errors.push({
          field: 'user',
          message: 'Please verify your email before requesting references',
          code: 'EMAIL_NOT_VERIFIED',
        });
      }

      // Validate expiry days (if provided)
      if (data.expiryDays && (data.expiryDays < 1 || data.expiryDays > 30)) {
        errors.push({
          field: 'expiryDays',
          message: 'Expiry days must be between 1 and 30',
          code: 'INVALID_EXPIRY',
        });
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      this.logger.error('Error validating reference request form', error);
      return {
        valid: false,
        errors: [
          {
            field: 'system',
            message: 'An error occurred during validation',
            code: 'VALIDATION_ERROR',
          },
        ],
      };
    }
  }

  /**
   * Server-side data enrichment
   * Add calculated fields, defaults, and metadata
   */
  async enrichReferenceRequest(
    data: any,
    userId: string,
  ): Promise<EnrichedReferenceRequest> {
    const expiryDays = data.expiryDays || 7;
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiryDays);

    // Combine question IDs and custom questions
    const allQuestions = [
      ...(data.questionIds || []),
      ...(data.customQuestions?.map((q: any) => q.question) || []),
    ];

    return {
      referrerName: `${data.referrer.firstName} ${data.referrer.lastName}`,
      referrerEmail: data.referrer.email,
      company: data.referrer.company,
      role: data.referrer.role,
      questions: allQuestions,
      allowedFormats: data.allowedFormats,
      allowEmployerReachback: data.allowEmployerReachBack,
      userId,
      createdAt: new Date(),
      expiresAt,
      estimatedCompletionTime: this.estimateCompletionTime(data),
      aiGeneratedFollowUps: [], // Could integrate with AI service here
    };
  }

  /**
   * Validate bundle creation form
   */
  async validateBundleForm(
    data: any,
    userId: string,
  ): Promise<FormValidationResult> {
    const errors: FormValidationError[] = [];

    try {
      // Validate that all references belong to the user
      const references = await this.referenceRepo.findByIds(
        data.referenceIds || [],
      );

      const invalidRefs = references.filter((ref) => ref.seekerId !== userId);
      if (invalidRefs.length > 0) {
        errors.push({
          field: 'referenceIds',
          message: 'Some references do not belong to you',
          code: 'INVALID_REFERENCES',
        });
      }

      // Validate all references are completed
      const incompleteRefs = references.filter(
        (ref) => ref.status !== 'completed',
      );
      if (incompleteRefs.length > 0) {
        errors.push({
          field: 'referenceIds',
          message: 'All references must be completed before creating a bundle',
          code: 'INCOMPLETE_REFERENCES',
        });
      }

      // Check bundle name uniqueness
      // In real implementation, check against bundle repository

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      this.logger.error('Error validating bundle form', error);
      return {
        valid: false,
        errors: [
          {
            field: 'system',
            message: 'An error occurred during validation',
            code: 'VALIDATION_ERROR',
          },
        ],
      };
    }
  }

  /**
   * Server-side profile update validation
   */
  async validateProfileUpdate(
    data: any,
    userId: string,
  ): Promise<FormValidationResult> {
    const errors: FormValidationError[] = [];

    try {
      // Validate email uniqueness if email is being updated
      if (data.email) {
        const existingUser = await this.userRepo.findOne({
          where: { email: data.email },
        });

        if (existingUser && existingUser.id !== userId) {
          errors.push({
            field: 'email',
            message: 'This email is already in use',
            code: 'EMAIL_IN_USE',
          });
        }
      }

      // Validate phone number format if provided
      if (data.phoneNumber && !this.isValidPhoneNumber(data.phoneNumber)) {
        errors.push({
          field: 'phoneNumber',
          message: 'Invalid phone number format',
          code: 'INVALID_PHONE',
        });
      }

      return {
        valid: errors.length === 0,
        errors,
      };
    } catch (error) {
      this.logger.error('Error validating profile update', error);
      return {
        valid: false,
        errors: [
          {
            field: 'system',
            message: 'An error occurred during validation',
            code: 'VALIDATION_ERROR',
          },
        ],
      };
    }
  }

  // Private helper methods

  private async getUserQuota(
    userId: string,
  ): Promise<{ used: number; limit: number }> {
    // In real implementation, fetch from quota service or database
    const count = await this.referenceRepo.count({
      where: { seekerId: userId },
    });

    return {
      used: count,
      limit: 50, // Could be based on user's subscription tier
    };
  }

  private estimateCompletionTime(data: any): string {
    // Simple estimation based on format
    // Video references typically take longer
    if (data.allowedFormats?.includes('video')) {
      return '3-5 days';
    } else if (data.allowedFormats?.includes('audio')) {
      return '2-4 days';
    } else {
      return '1-3 days';
    }
  }

  private isValidPhoneNumber(phone: string): boolean {
    // Simple phone validation - in production, use libphonenumber
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }
}
