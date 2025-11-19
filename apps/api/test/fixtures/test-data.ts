import { UserRole, KYCStatus } from '../../src/database/entities/user.entity';
import { ReferenceStatus, ReferenceFormat } from '../../src/database/entities/reference.entity';

export const testUsers = {
  seeker1: {
    firstName: 'John',
    lastName: 'Doe',
    email: 'john.doe@example.com',
    password: 'SecurePassword123!',
    role: UserRole.SEEKER,
  },
  seeker2: {
    firstName: 'Jane',
    lastName: 'Smith',
    email: 'jane.smith@example.com',
    password: 'SecurePassword456!',
    role: UserRole.SEEKER,
  },
  referrer1: {
    firstName: 'Alice',
    lastName: 'Johnson',
    email: 'alice.johnson@example.com',
    password: 'SecurePassword789!',
    role: UserRole.REFERRER,
  },
  referrer2: {
    firstName: 'Bob',
    lastName: 'Williams',
    email: 'bob.williams@example.com',
    password: 'SecurePassword012!',
    role: UserRole.REFERRER,
  },
  employer1: {
    firstName: 'Charlie',
    lastName: 'Brown',
    email: 'charlie.brown@acmecorp.com',
    password: 'SecurePassword345!',
    role: UserRole.EMPLOYER,
  },
};

export const testReferenceRequest = {
  referrerName: 'Alice Johnson',
  referrerEmail: 'alice.johnson@example.com',
  company: 'Tech Corp',
  role: 'Senior Software Engineer',
  questions: [
    'How was their technical performance?',
    'Would you hire them again?',
    'What are their strengths and weaknesses?',
  ],
  allowedFormats: [ReferenceFormat.VIDEO, ReferenceFormat.TEXT],
  allowEmployerReachback: true,
};

export const testReferenceSubmission = {
  format: ReferenceFormat.TEXT,
  responses: {
    'How was their technical performance?': 'Excellent, very strong coding skills',
    'Would you hire them again?': 'Yes, absolutely',
    'What are their strengths and weaknesses?': 'Strength: problem-solving, Weakness: documentation',
  },
};

export const testBundle = {
  title: 'Software Engineer References',
  description: 'Collection of references for software engineering positions',
  shareLink: 'unique-share-link-123',
  password: null,
};

export const invalidEmailData = {
  firstName: 'Test',
  lastName: 'User',
  email: 'invalid-email',
  password: 'SecurePassword123!',
  role: UserRole.SEEKER,
};

export const invalidPasswordData = {
  firstName: 'Test',
  lastName: 'User',
  email: 'test@example.com',
  password: 'short',
  role: UserRole.SEEKER,
};

export const missingFieldData = {
  firstName: 'Test',
  email: 'test@example.com',
  password: 'SecurePassword123!',
  // Missing lastName and role
};
