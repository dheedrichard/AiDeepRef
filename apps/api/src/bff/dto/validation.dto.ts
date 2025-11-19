import {
  IsString,
  IsEmail,
  IsEnum,
  IsArray,
  ValidateNested,
  IsOptional,
  IsBoolean,
  MaxLength,
  MinLength,
  Matches,
  ArrayMinSize,
  ArrayMaxSize,
  IsUUID,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ReferenceFormat } from '../../database/entities';

/**
 * Enhanced referrer information with comprehensive validation
 */
export class ReferrerInfoDto {
  @ApiProperty({ example: 'Jane' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'First name must be at least 2 characters' })
  @MaxLength(100, { message: 'First name cannot exceed 100 characters' })
  @Matches(/^[a-zA-Z\s'-]+$/, {
    message: 'First name can only contain letters, spaces, hyphens, and apostrophes',
  })
  firstName: string;

  @ApiProperty({ example: 'Smith' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Last name must be at least 2 characters' })
  @MaxLength(100, { message: 'Last name cannot exceed 100 characters' })
  @Matches(/^[a-zA-Z\s'-]+$/, {
    message: 'Last name can only contain letters, spaces, hyphens, and apostrophes',
  })
  lastName: string;

  @ApiProperty({ example: 'jane.smith@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @MaxLength(255, { message: 'Email cannot exceed 255 characters' })
  email: string;

  @ApiProperty({ example: 'Acme Corporation' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Company name must be at least 2 characters' })
  @MaxLength(200, { message: 'Company name cannot exceed 200 characters' })
  company: string;

  @ApiProperty({ example: 'Senior Software Engineer' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2, { message: 'Role must be at least 2 characters' })
  @MaxLength(100, { message: 'Role cannot exceed 100 characters' })
  role: string;

  @ApiProperty({ required: false, example: '+1234567890' })
  @IsString()
  @IsOptional()
  @Matches(/^\+?[1-9]\d{1,14}$/, {
    message: 'Invalid phone number format. Use international format (e.g., +1234567890)',
  })
  phone?: string;

  @ApiProperty({ required: false, example: 'Manager' })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  relationship?: string;
}

/**
 * Custom question with validation
 */
export class CustomQuestionDto {
  @ApiProperty({ example: 'How did this person handle difficult situations?' })
  @IsString()
  @IsNotEmpty()
  @MinLength(10, { message: 'Question must be at least 10 characters' })
  @MaxLength(500, { message: 'Question cannot exceed 500 characters' })
  question: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  required: boolean;

  @ApiProperty({ required: false, example: 'leadership' })
  @IsString()
  @IsOptional()
  @MaxLength(50)
  category?: string;
}

/**
 * Enhanced reference request with comprehensive validation
 * Replaces the basic CreateReferenceRequestDto
 */
export class CreateReferenceRequestDto {
  @ApiProperty({ type: ReferrerInfoDto })
  @ValidateNested()
  @Type(() => ReferrerInfoDto)
  referrer: ReferrerInfoDto;

  @ApiProperty({
    example: ['q1-uuid', 'q2-uuid', 'q3-uuid'],
    description: 'AI-generated question IDs',
  })
  @IsArray()
  @ArrayMinSize(3, { message: 'At least 3 questions are required' })
  @ArrayMaxSize(10, { message: 'Cannot exceed 10 questions' })
  @IsUUID('4', { each: true })
  questionIds: string[];

  @ApiProperty({ type: [CustomQuestionDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomQuestionDto)
  @IsOptional()
  @ArrayMaxSize(5, { message: 'Cannot exceed 5 custom questions' })
  customQuestions?: CustomQuestionDto[];

  @ApiProperty({ enum: ReferenceFormat, isArray: true })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one format must be allowed' })
  @IsEnum(ReferenceFormat, { each: true })
  allowedFormats: ReferenceFormat[];

  @ApiProperty({ example: true })
  @IsBoolean()
  allowEmployerReachBack: boolean;

  @ApiProperty({ required: false, example: 'This reference is for a senior developer position' })
  @IsString()
  @IsOptional()
  @MaxLength(1000, { message: 'Context cannot exceed 1000 characters' })
  context?: string;

  @ApiProperty({ required: false, example: 7, description: 'Days until expiry' })
  @IsNumber()
  @IsOptional()
  @Min(1)
  @Max(30)
  @Type(() => Number)
  expiryDays?: number = 7;
}

/**
 * Bundle creation with validation
 */
export class CreateBundleDto {
  @ApiProperty({ example: 'Software Engineering References' })
  @IsString()
  @IsNotEmpty()
  @MinLength(3, { message: 'Bundle name must be at least 3 characters' })
  @MaxLength(100, { message: 'Bundle name cannot exceed 100 characters' })
  name: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  description?: string;

  @ApiProperty({ example: ['ref-uuid-1', 'ref-uuid-2'] })
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one reference is required' })
  @ArrayMaxSize(20, { message: 'Cannot exceed 20 references per bundle' })
  @IsUUID('4', { each: true })
  referenceIds: string[];

  @ApiProperty({ example: false })
  @IsBoolean()
  @IsOptional()
  isPublic?: boolean = false;
}

/**
 * Profile update with validation
 */
export class UpdateProfileDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[a-zA-Z\s'-]+$/)
  firstName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MinLength(2)
  @MaxLength(100)
  @Matches(/^[a-zA-Z\s'-]+$/)
  lastName?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @Matches(/^\+?[1-9]\d{1,14}$/)
  phoneNumber?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  bio?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  currentCompany?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  @MaxLength(100)
  currentRole?: string;
}

/**
 * Form validation result
 */
export class FormValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export class ValidationError {
  field: string;
  message: string;
  code?: string;
}
