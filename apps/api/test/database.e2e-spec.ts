import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { Repository } from 'typeorm';
import { User, Reference, Bundle, KYCDocument } from '../src/database/entities';
import { UserRole, KYCStatus } from '../src/database/entities/user.entity';
import { ReferenceStatus, ReferenceFormat } from '../src/database/entities/reference.entity';
import { DatabaseModule } from '../src/database/database.module';
import * as bcrypt from 'bcrypt';

describe('Database Integration Tests (E2E)', () => {
  let app: INestApplication;
  let userRepository: Repository<User>;
  let referenceRepository: Repository<Reference>;
  let bundleRepository: Repository<Bundle>;
  let kycDocumentRepository: Repository<KYCDocument>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.TEST_DATABASE_HOST || 'localhost',
          port: parseInt(process.env.TEST_DATABASE_PORT || '5432'),
          username: process.env.TEST_DATABASE_USERNAME || 'deepref_test',
          password: process.env.TEST_DATABASE_PASSWORD || 'test_password',
          database: process.env.TEST_DATABASE_NAME || 'deepref_test',
          entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
          synchronize: true,
          dropSchema: true,
          logging: false,
        }),
        DatabaseModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    userRepository = moduleFixture.get('UserRepository');
    referenceRepository = moduleFixture.get('ReferenceRepository');
    bundleRepository = moduleFixture.get('BundleRepository');
    kycDocumentRepository = moduleFixture.get('KYCDocumentRepository');
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(async () => {
    // Clean up database after each test
    if (kycDocumentRepository) {
      await kycDocumentRepository.query('TRUNCATE TABLE kyc_documents RESTART IDENTITY CASCADE;');
    }
    if (bundleRepository) {
      await bundleRepository.query('TRUNCATE TABLE bundle_references CASCADE;');
      await bundleRepository.query('TRUNCATE TABLE bundles RESTART IDENTITY CASCADE;');
    }
    if (referenceRepository) {
      await referenceRepository.query('TRUNCATE TABLE references RESTART IDENTITY CASCADE;');
    }
    if (userRepository) {
      await userRepository.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE;');
    }
  });

  describe('User Entity CRUD Operations', () => {
    it('should create a new user', async () => {
      const user = userRepository.create({
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        password: await bcrypt.hash('password123', 10),
        role: UserRole.SEEKER,
      });

      const savedUser = await userRepository.save(user);

      expect(savedUser.id).toBeDefined();
      expect(savedUser.firstName).toBe('John');
      expect(savedUser.lastName).toBe('Doe');
      expect(savedUser.email).toBe('john.doe@example.com');
      expect(savedUser.role).toBe(UserRole.SEEKER);
      expect(savedUser.emailVerified).toBe(false);
      expect(savedUser.kycStatus).toBe(KYCStatus.PENDING);
      expect(savedUser.createdAt).toBeInstanceOf(Date);
      expect(savedUser.updatedAt).toBeInstanceOf(Date);
    });

    it('should retrieve user by email', async () => {
      const user = userRepository.create({
        firstName: 'Jane',
        lastName: 'Smith',
        email: 'jane.smith@example.com',
        password: await bcrypt.hash('password123', 10),
        role: UserRole.REFERRER,
      });

      await userRepository.save(user);

      const foundUser = await userRepository.findOne({
        where: { email: 'jane.smith@example.com' },
      });

      expect(foundUser).toBeDefined();
      expect(foundUser?.firstName).toBe('Jane');
      expect(foundUser?.email).toBe('jane.smith@example.com');
    });

    it('should retrieve user by ID', async () => {
      const user = userRepository.create({
        firstName: 'Bob',
        lastName: 'Johnson',
        email: 'bob.johnson@example.com',
        password: await bcrypt.hash('password123', 10),
        role: UserRole.EMPLOYER,
      });

      const savedUser = await userRepository.save(user);

      const foundUser = await userRepository.findOne({
        where: { id: savedUser.id },
      });

      expect(foundUser).toBeDefined();
      expect(foundUser?.id).toBe(savedUser.id);
      expect(foundUser?.firstName).toBe('Bob');
    });

    it('should update user fields', async () => {
      const user = userRepository.create({
        firstName: 'Alice',
        lastName: 'Williams',
        email: 'alice.williams@example.com',
        password: await bcrypt.hash('password123', 10),
        role: UserRole.SEEKER,
      });

      const savedUser = await userRepository.save(user);

      savedUser.emailVerified = true;
      savedUser.kycStatus = KYCStatus.VERIFIED;
      savedUser.phoneNumber = '+1234567890';

      const updatedUser = await userRepository.save(savedUser);

      expect(updatedUser.emailVerified).toBe(true);
      expect(updatedUser.kycStatus).toBe(KYCStatus.VERIFIED);
      expect(updatedUser.phoneNumber).toBe('+1234567890');
    });

    it('should delete user', async () => {
      const user = userRepository.create({
        firstName: 'Charlie',
        lastName: 'Brown',
        email: 'charlie.brown@example.com',
        password: await bcrypt.hash('password123', 10),
        role: UserRole.SEEKER,
      });

      const savedUser = await userRepository.save(user);
      await userRepository.remove(savedUser);

      const foundUser = await userRepository.findOne({
        where: { id: savedUser.id },
      });

      expect(foundUser).toBeNull();
    });

    it('should enforce unique email constraint', async () => {
      const user1 = userRepository.create({
        firstName: 'User',
        lastName: 'One',
        email: 'duplicate@example.com',
        password: await bcrypt.hash('password123', 10),
        role: UserRole.SEEKER,
      });

      await userRepository.save(user1);

      const user2 = userRepository.create({
        firstName: 'User',
        lastName: 'Two',
        email: 'duplicate@example.com',
        password: await bcrypt.hash('password123', 10),
        role: UserRole.SEEKER,
      });

      await expect(userRepository.save(user2)).rejects.toThrow();
    });

    it('should handle different user roles', async () => {
      const seeker = userRepository.create({
        firstName: 'Seeker',
        lastName: 'User',
        email: 'seeker@example.com',
        password: await bcrypt.hash('password123', 10),
        role: UserRole.SEEKER,
      });

      const referrer = userRepository.create({
        firstName: 'Referrer',
        lastName: 'User',
        email: 'referrer@example.com',
        password: await bcrypt.hash('password123', 10),
        role: UserRole.REFERRER,
      });

      const employer = userRepository.create({
        firstName: 'Employer',
        lastName: 'User',
        email: 'employer@example.com',
        password: await bcrypt.hash('password123', 10),
        role: UserRole.EMPLOYER,
      });

      await userRepository.save([seeker, referrer, employer]);

      const users = await userRepository.find();
      expect(users).toHaveLength(3);

      const roles = users.map(u => u.role);
      expect(roles).toContain(UserRole.SEEKER);
      expect(roles).toContain(UserRole.REFERRER);
      expect(roles).toContain(UserRole.EMPLOYER);
    });
  });

  describe('Reference Entity CRUD Operations', () => {
    let testSeeker: User;
    let testReferrer: User;

    beforeEach(async () => {
      testSeeker = await userRepository.save(
        userRepository.create({
          firstName: 'Test',
          lastName: 'Seeker',
          email: 'test.seeker@example.com',
          password: await bcrypt.hash('password123', 10),
          role: UserRole.SEEKER,
        })
      );

      testReferrer = await userRepository.save(
        userRepository.create({
          firstName: 'Test',
          lastName: 'Referrer',
          email: 'test.referrer@example.com',
          password: await bcrypt.hash('password123', 10),
          role: UserRole.REFERRER,
        })
      );
    });

    it('should create a new reference', async () => {
      const reference = referenceRepository.create({
        seekerId: testSeeker.id,
        referrerId: testReferrer.id,
        referrerName: 'Test Referrer',
        referrerEmail: 'test.referrer@example.com',
        company: 'Tech Corp',
        role: 'Senior Developer',
        questions: ['Question 1', 'Question 2'],
        allowedFormats: [ReferenceFormat.VIDEO, ReferenceFormat.TEXT],
        allowEmployerReachback: true,
      });

      const savedReference = await referenceRepository.save(reference);

      expect(savedReference.id).toBeDefined();
      expect(savedReference.seekerId).toBe(testSeeker.id);
      expect(savedReference.referrerId).toBe(testReferrer.id);
      expect(savedReference.status).toBe(ReferenceStatus.PENDING);
      expect(savedReference.questions).toEqual(['Question 1', 'Question 2']);
      expect(savedReference.allowedFormats).toEqual([ReferenceFormat.VIDEO, ReferenceFormat.TEXT]);
    });

    it('should retrieve references by seeker ID', async () => {
      await referenceRepository.save([
        referenceRepository.create({
          seekerId: testSeeker.id,
          referrerId: testReferrer.id,
          referrerName: 'Referrer 1',
          referrerEmail: 'ref1@example.com',
          company: 'Company 1',
          role: 'Role 1',
          questions: ['Q1'],
          allowedFormats: [ReferenceFormat.TEXT],
          allowEmployerReachback: false,
        }),
        referenceRepository.create({
          seekerId: testSeeker.id,
          referrerId: testReferrer.id,
          referrerName: 'Referrer 2',
          referrerEmail: 'ref2@example.com',
          company: 'Company 2',
          role: 'Role 2',
          questions: ['Q2'],
          allowedFormats: [ReferenceFormat.VIDEO],
          allowEmployerReachback: false,
        }),
      ]);

      const references = await referenceRepository.find({
        where: { seekerId: testSeeker.id },
      });

      expect(references).toHaveLength(2);
    });

    it('should update reference status', async () => {
      const reference = await referenceRepository.save(
        referenceRepository.create({
          seekerId: testSeeker.id,
          referrerId: testReferrer.id,
          referrerName: 'Test Referrer',
          referrerEmail: 'test.referrer@example.com',
          company: 'Tech Corp',
          role: 'Developer',
          questions: ['Question 1'],
          allowedFormats: [ReferenceFormat.TEXT],
          allowEmployerReachback: false,
        })
      );

      reference.status = ReferenceStatus.COMPLETED;
      reference.submittedAt = new Date();
      reference.responses = { 'Question 1': 'Answer 1' };

      const updatedReference = await referenceRepository.save(reference);

      expect(updatedReference.status).toBe(ReferenceStatus.COMPLETED);
      expect(updatedReference.submittedAt).toBeInstanceOf(Date);
      expect(updatedReference.responses).toEqual({ 'Question 1': 'Answer 1' });
    });

    it('should handle reference with AI scores', async () => {
      const reference = await referenceRepository.save(
        referenceRepository.create({
          seekerId: testSeeker.id,
          referrerId: testReferrer.id,
          referrerName: 'Test Referrer',
          referrerEmail: 'test.referrer@example.com',
          company: 'Tech Corp',
          role: 'Developer',
          questions: ['Question 1'],
          allowedFormats: [ReferenceFormat.VIDEO],
          allowEmployerReachback: false,
          rcsScore: 85.5,
          aiAuthenticityScore: 92.3,
          deepfakeProbability: 0.05,
        })
      );

      expect(reference.rcsScore).toBe(85.5);
      expect(reference.aiAuthenticityScore).toBe(92.3);
      expect(reference.deepfakeProbability).toBe(0.05);
    });

    it('should load reference with seeker relationship', async () => {
      const reference = await referenceRepository.save(
        referenceRepository.create({
          seekerId: testSeeker.id,
          referrerId: testReferrer.id,
          referrerName: 'Test Referrer',
          referrerEmail: 'test.referrer@example.com',
          company: 'Tech Corp',
          role: 'Developer',
          questions: ['Question 1'],
          allowedFormats: [ReferenceFormat.TEXT],
          allowEmployerReachback: false,
        })
      );

      const foundReference = await referenceRepository.findOne({
        where: { id: reference.id },
        relations: ['seeker'],
      });

      expect(foundReference?.seeker).toBeDefined();
      expect(foundReference?.seeker.id).toBe(testSeeker.id);
      expect(foundReference?.seeker.firstName).toBe('Test');
    });
  });

  describe('Bundle Entity CRUD Operations', () => {
    let testSeeker: User;
    let testReferences: Reference[];

    beforeEach(async () => {
      testSeeker = await userRepository.save(
        userRepository.create({
          firstName: 'Test',
          lastName: 'Seeker',
          email: 'test.seeker@example.com',
          password: await bcrypt.hash('password123', 10),
          role: UserRole.SEEKER,
        })
      );

      const referrer = await userRepository.save(
        userRepository.create({
          firstName: 'Test',
          lastName: 'Referrer',
          email: 'test.referrer@example.com',
          password: await bcrypt.hash('password123', 10),
          role: UserRole.REFERRER,
        })
      );

      testReferences = await referenceRepository.save([
        referenceRepository.create({
          seekerId: testSeeker.id,
          referrerId: referrer.id,
          referrerName: 'Ref 1',
          referrerEmail: 'ref1@example.com',
          company: 'Company 1',
          role: 'Role 1',
          questions: ['Q1'],
          allowedFormats: [ReferenceFormat.TEXT],
          allowEmployerReachback: false,
        }),
        referenceRepository.create({
          seekerId: testSeeker.id,
          referrerId: referrer.id,
          referrerName: 'Ref 2',
          referrerEmail: 'ref2@example.com',
          company: 'Company 2',
          role: 'Role 2',
          questions: ['Q2'],
          allowedFormats: [ReferenceFormat.VIDEO],
          allowEmployerReachback: false,
        }),
      ]);
    });

    it('should create a new bundle', async () => {
      const bundle = bundleRepository.create({
        seekerId: testSeeker.id,
        title: 'Test Bundle',
        description: 'Test Description',
        shareLink: 'unique-share-link-123',
        references: testReferences,
      });

      const savedBundle = await bundleRepository.save(bundle);

      expect(savedBundle.id).toBeDefined();
      expect(savedBundle.seekerId).toBe(testSeeker.id);
      expect(savedBundle.title).toBe('Test Bundle');
      expect(savedBundle.shareLink).toBe('unique-share-link-123');
      expect(savedBundle.viewCount).toBe(0);
      expect(savedBundle.isActive).toBe(true);
    });

    it('should load bundle with references', async () => {
      const bundle = await bundleRepository.save(
        bundleRepository.create({
          seekerId: testSeeker.id,
          title: 'Test Bundle',
          description: 'Test Description',
          shareLink: 'unique-share-link-456',
          references: testReferences,
        })
      );

      const foundBundle = await bundleRepository.findOne({
        where: { id: bundle.id },
        relations: ['references'],
      });

      expect(foundBundle?.references).toBeDefined();
      expect(foundBundle?.references).toHaveLength(2);
    });

    it('should retrieve bundle by share link', async () => {
      const shareLink = 'unique-share-link-789';

      await bundleRepository.save(
        bundleRepository.create({
          seekerId: testSeeker.id,
          title: 'Test Bundle',
          description: 'Test Description',
          shareLink,
          references: testReferences,
        })
      );

      const foundBundle = await bundleRepository.findOne({
        where: { shareLink },
      });

      expect(foundBundle).toBeDefined();
      expect(foundBundle?.shareLink).toBe(shareLink);
    });

    it('should update bundle view count', async () => {
      const bundle = await bundleRepository.save(
        bundleRepository.create({
          seekerId: testSeeker.id,
          title: 'Test Bundle',
          description: 'Test Description',
          shareLink: 'unique-share-link-012',
          references: testReferences,
        })
      );

      bundle.viewCount += 1;
      const updatedBundle = await bundleRepository.save(bundle);

      expect(updatedBundle.viewCount).toBe(1);
    });

    it('should handle bundle with password', async () => {
      const hashedPassword = await bcrypt.hash('SecurePassword123!', 10);

      const bundle = await bundleRepository.save(
        bundleRepository.create({
          seekerId: testSeeker.id,
          title: 'Protected Bundle',
          description: 'Protected',
          shareLink: 'unique-share-link-345',
          password: hashedPassword,
          references: testReferences,
        })
      );

      expect(bundle.password).toBeDefined();
      expect(bundle.password).not.toBe('SecurePassword123!');
    });

    it('should handle bundle with expiry date', async () => {
      const expiryDate = new Date();
      expiryDate.setDate(expiryDate.getDate() + 30);

      const bundle = await bundleRepository.save(
        bundleRepository.create({
          seekerId: testSeeker.id,
          title: 'Expiring Bundle',
          description: 'Expires in 30 days',
          shareLink: 'unique-share-link-678',
          expiryDate,
          references: testReferences,
        })
      );

      expect(bundle.expiryDate).toBeInstanceOf(Date);
    });

    it('should enforce unique share link constraint', async () => {
      const shareLink = 'duplicate-link';

      await bundleRepository.save(
        bundleRepository.create({
          seekerId: testSeeker.id,
          title: 'Bundle 1',
          description: 'Description 1',
          shareLink,
          references: [testReferences[0]],
        })
      );

      const duplicateBundle = bundleRepository.create({
        seekerId: testSeeker.id,
        title: 'Bundle 2',
        description: 'Description 2',
        shareLink,
        references: [testReferences[1]],
      });

      await expect(bundleRepository.save(duplicateBundle)).rejects.toThrow();
    });
  });

  describe('KYC Document Entity Operations', () => {
    let testUser: User;

    beforeEach(async () => {
      testUser = await userRepository.save(
        userRepository.create({
          firstName: 'Test',
          lastName: 'User',
          email: 'test.user@example.com',
          password: await bcrypt.hash('password123', 10),
          role: UserRole.SEEKER,
        })
      );
    });

    it('should create KYC document', async () => {
      const kycDoc = kycDocumentRepository.create({
        userId: testUser.id,
        documentType: 'passport',
        frontImageUrl: 'https://example.com/front.jpg',
        backImageUrl: 'https://example.com/back.jpg',
        verificationStatus: 'pending',
      });

      const savedDoc = await kycDocumentRepository.save(kycDoc);

      expect(savedDoc.id).toBeDefined();
      expect(savedDoc.userId).toBe(testUser.id);
      expect(savedDoc.documentType).toBe('passport');
      expect(savedDoc.verificationStatus).toBe('pending');
    });

    it('should retrieve KYC documents by user', async () => {
      await kycDocumentRepository.save([
        kycDocumentRepository.create({
          userId: testUser.id,
          documentType: 'passport',
          frontImageUrl: 'https://example.com/passport-front.jpg',
          verificationStatus: 'pending',
        }),
        kycDocumentRepository.create({
          userId: testUser.id,
          documentType: 'drivers_license',
          frontImageUrl: 'https://example.com/license-front.jpg',
          verificationStatus: 'verified',
        }),
      ]);

      const docs = await kycDocumentRepository.find({
        where: { userId: testUser.id },
      });

      expect(docs).toHaveLength(2);
    });
  });

  describe('Complex Database Operations', () => {
    it('should handle cascade operations', async () => {
      const seeker = await userRepository.save(
        userRepository.create({
          firstName: 'Cascade',
          lastName: 'Test',
          email: 'cascade@example.com',
          password: await bcrypt.hash('password123', 10),
          role: UserRole.SEEKER,
        })
      );

      const referrer = await userRepository.save(
        userRepository.create({
          firstName: 'Referrer',
          lastName: 'Test',
          email: 'referrer-cascade@example.com',
          password: await bcrypt.hash('password123', 10),
          role: UserRole.REFERRER,
        })
      );

      // Create references
      const references = await referenceRepository.save([
        referenceRepository.create({
          seekerId: seeker.id,
          referrerId: referrer.id,
          referrerName: 'Ref',
          referrerEmail: 'ref@example.com',
          company: 'Company',
          role: 'Role',
          questions: ['Q1'],
          allowedFormats: [ReferenceFormat.TEXT],
          allowEmployerReachback: false,
        }),
      ]);

      // Create bundle
      await bundleRepository.save(
        bundleRepository.create({
          seekerId: seeker.id,
          title: 'Cascade Bundle',
          description: 'Test',
          shareLink: 'cascade-link',
          references,
        })
      );

      // Verify all data exists
      const foundReferences = await referenceRepository.find({
        where: { seekerId: seeker.id },
      });
      const foundBundles = await bundleRepository.find({
        where: { seekerId: seeker.id },
      });

      expect(foundReferences).toHaveLength(1);
      expect(foundBundles).toHaveLength(1);
    });

    it('should handle transactions', async () => {
      await userRepository.manager.transaction(async transactionalEntityManager => {
        const user = transactionalEntityManager.create(User, {
          firstName: 'Transaction',
          lastName: 'Test',
          email: 'transaction@example.com',
          password: await bcrypt.hash('password123', 10),
          role: UserRole.SEEKER,
        });

        await transactionalEntityManager.save(user);

        const foundUser = await transactionalEntityManager.findOne(User, {
          where: { email: 'transaction@example.com' },
        });

        expect(foundUser).toBeDefined();
      });
    });
  });

  describe('Performance Tests', () => {
    it('should handle batch operations efficiently', async () => {
      const users = Array.from({ length: 50 }, (_, index) =>
        userRepository.create({
          firstName: `User${index}`,
          lastName: `Test${index}`,
          email: `user${index}@example.com`,
          password: 'hashed-password',
          role: UserRole.SEEKER,
        })
      );

      const startTime = Date.now();
      await userRepository.save(users);
      const endTime = Date.now();

      const savedUsers = await userRepository.find();
      expect(savedUsers.length).toBeGreaterThanOrEqual(50);
      expect(endTime - startTime).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});
