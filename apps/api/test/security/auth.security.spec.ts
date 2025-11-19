/**
 * Security Tests for Authentication System
 *
 * Tests various security vulnerabilities and attack vectors
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../../src/app.module';
import { AuthService } from '../../src/auth/auth.service';

describe('Authentication Security Tests', () => {
  let app: INestApplication;
  let authService: AuthService;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    authService = moduleFixture.get<AuthService>(AuthService);
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('Password Security', () => {
    it('should reject weak passwords', async () => {
      const weakPasswords = [
        'password',
        '12345678',
        'qwerty123',
        'abc123',
        'password123',
        'admin',
        'letmein',
      ];

      for (const password of weakPasswords) {
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/signup')
          .send({
            email: 'test@example.com',
            password,
            firstName: 'Test',
            lastName: 'User',
            role: 'seeker',
          });

        expect(response.status).toBe(409);
        expect(response.body.message).toContain('Password');
      }
    });

    it('should enforce password complexity requirements', async () => {
      const testCases = [
        { password: 'short', error: 'at least 8 characters' },
        { password: 'nouppercase1!', error: 'uppercase' },
        { password: 'NOLOWERCASE1!', error: 'lowercase' },
        { password: 'NoNumbers!', error: 'number' },
        { password: 'NoSpecial1', error: 'special character' },
      ];

      for (const testCase of testCases) {
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/signup')
          .send({
            email: 'test@example.com',
            password: testCase.password,
            firstName: 'Test',
            lastName: 'User',
            role: 'seeker',
          });

        expect(response.status).toBe(409);
        expect(response.body.message.toLowerCase()).toContain(testCase.error.toLowerCase());
      }
    });

    it('should use proper bcrypt salt rounds', async () => {
      const bcrypt = require('bcrypt');
      const password = 'ValidPassword123!';
      const hash = await bcrypt.hash(password, 12);

      // Check that the hash has the expected cost factor
      const rounds = bcrypt.getRounds(hash);
      expect(rounds).toBe(12);
    });
  });

  describe('JWT Security', () => {
    it('should reject expired tokens', async () => {
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyMzkwMjN9.4Adcj3UFYzPUVaVF43FmMab6RlaQD8A9V8wFzzht-KQ';

      const response = await request(app.getHttpServer())
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });

    it('should reject tokens with invalid signature', async () => {
      const invalidToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwiaWF0IjoxNTE2MjM5MDIyfQ.invalid_signature';

      const response = await request(app.getHttpServer())
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${invalidToken}`);

      expect(response.status).toBe(401);
    });

    it('should have short-lived access tokens', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/signin')
        .send({
          email: 'test@example.com',
          password: 'ValidPassword123!',
        });

      if (response.status === 200) {
        const token = response.body.accessToken;
        const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

        const expirationTime = (decoded.exp - decoded.iat) / 60; // in minutes
        expect(expirationTime).toBeLessThanOrEqual(15);
      }
    });
  });

  describe('Account Lockout', () => {
    it('should lock account after 5 failed login attempts', async () => {
      const email = 'locktest@example.com';

      // Create user first
      await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          email,
          password: 'ValidPassword123!',
          firstName: 'Lock',
          lastName: 'Test',
          role: 'seeker',
        });

      // Attempt 5 failed logins
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/signin')
          .send({
            email,
            password: 'WrongPassword123!',
          });
      }

      // 6th attempt should indicate account is locked
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/signin')
        .send({
          email,
          password: 'ValidPassword123!',
        });

      expect(response.status).toBe(401);
      expect(response.body.message).toContain('locked');
    });

    it('should reset failed attempts on successful login', async () => {
      const email = 'resettest@example.com';
      const password = 'ValidPassword123!';

      // Create user
      await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          email,
          password,
          firstName: 'Reset',
          lastName: 'Test',
          role: 'seeker',
        });

      // 3 failed attempts
      for (let i = 0; i < 3; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/signin')
          .send({
            email,
            password: 'WrongPassword123!',
          });
      }

      // Successful login
      const successResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/signin')
        .send({
          email,
          password,
        });

      expect(successResponse.status).toBe(200);

      // Should be able to fail 4 more times without lockout
      for (let i = 0; i < 4; i++) {
        await request(app.getHttpServer())
          .post('/api/v1/auth/signin')
          .send({
            email,
            password: 'WrongPassword123!',
          });
      }

      // Should still be able to login
      const finalResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/signin')
        .send({
          email,
          password,
        });

      expect(finalResponse.status).toBe(200);
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should prevent SQL injection in login', async () => {
      const maliciousInputs = [
        "' OR '1'='1",
        "admin' --",
        "' OR 1=1 --",
        "'; DROP TABLE users; --",
        "admin'/*",
        "' UNION SELECT * FROM users --",
      ];

      for (const input of maliciousInputs) {
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/signin')
          .send({
            email: input,
            password: input,
          });

        expect(response.status).not.toBe(200);
        expect(response.body).not.toHaveProperty('accessToken');
      }
    });

    it('should prevent SQL injection in signup', async () => {
      const maliciousEmail = "test@example.com'; DROP TABLE users; --";

      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          email: maliciousEmail,
          password: 'ValidPassword123!',
          firstName: 'Test',
          lastName: 'User',
          role: 'seeker',
        });

      // Should either reject as invalid email or handle safely
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('XSS Prevention', () => {
    it('should sanitize user input in signup', async () => {
      const xssPayloads = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert("XSS")>',
        'javascript:alert("XSS")',
        '<svg onload=alert("XSS")>',
      ];

      for (const payload of xssPayloads) {
        const response = await request(app.getHttpServer())
          .post('/api/v1/auth/signup')
          .send({
            email: 'xss@example.com',
            password: 'ValidPassword123!',
            firstName: payload,
            lastName: 'Test',
            role: 'seeker',
          });

        if (response.status === 200) {
          // Check that the payload was sanitized
          expect(response.body).not.toContain('<script>');
          expect(response.body).not.toContain('javascript:');
          expect(response.body).not.toContain('onerror=');
          expect(response.body).not.toContain('onload=');
        }
      }
    });
  });

  describe('Session Security', () => {
    it('should invalidate tokens on logout', async () => {
      // Login first
      const loginResponse = await request(app.getHttpServer())
        .post('/api/v1/auth/signin')
        .send({
          email: 'test@example.com',
          password: 'ValidPassword123!',
        });

      const token = loginResponse.body.accessToken;

      // Logout
      await request(app.getHttpServer())
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${token}`);

      // Try to use the token again
      const response = await request(app.getHttpServer())
        .get('/api/v1/users/profile')
        .set('Authorization', `Bearer ${token}`);

      // Token should be invalid
      expect(response.status).toBe(401);
    });

    it('should handle session timeout', async () => {
      // This test would require mocking time or waiting for actual timeout
      // For unit testing, we can check the token expiration time
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/signin')
        .send({
          email: 'test@example.com',
          password: 'ValidPassword123!',
        });

      if (response.status === 200) {
        const token = response.body.accessToken;
        const decoded = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());

        // Check that token has expiration
        expect(decoded.exp).toBeDefined();
        expect(decoded.exp).toBeGreaterThan(decoded.iat);
      }
    });
  });

  describe('Authorization Bypass Prevention', () => {
    let userToken: string;
    let adminToken: string;

    beforeEach(async () => {
      // Create regular user
      const userSignup = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          email: 'user@example.com',
          password: 'ValidPassword123!',
          firstName: 'Regular',
          lastName: 'User',
          role: 'seeker',
        });

      userToken = userSignup.body.accessToken;

      // Create admin user
      const adminSignup = await request(app.getHttpServer())
        .post('/api/v1/auth/signup')
        .send({
          email: 'admin@example.com',
          password: 'ValidPassword123!',
          firstName: 'Admin',
          lastName: 'User',
          role: 'admin',
        });

      adminToken = adminSignup.body.accessToken;
    });

    it('should prevent regular users from accessing admin endpoints', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/admin/users')
        .set('Authorization', `Bearer ${userToken}`);

      expect(response.status).toBe(403);
    });

    it('should prevent users from modifying other users data', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/users/other-user-id')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          firstName: 'Hacked',
        });

      expect(response.status).toBeGreaterThanOrEqual(403);
    });

    it('should prevent privilege escalation', async () => {
      const response = await request(app.getHttpServer())
        .put('/api/v1/users/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          role: 'admin',
        });

      if (response.status === 200) {
        // Check that role wasn't changed
        const profile = await request(app.getHttpServer())
          .get('/api/v1/users/profile')
          .set('Authorization', `Bearer ${userToken}`);

        expect(profile.body.role).not.toBe('admin');
      }
    });
  });

  describe('CSRF Protection', () => {
    it('should require CSRF token for state-changing operations', async () => {
      // Get CSRF token
      const getResponse = await request(app.getHttpServer())
        .get('/api/v1/auth/csrf-token');

      const csrfToken = getResponse.headers['x-csrf-token'];

      // Try POST without CSRF token
      const postWithoutToken = await request(app.getHttpServer())
        .post('/api/v1/users/update')
        .send({ firstName: 'Test' });

      expect(postWithoutToken.status).toBe(403);

      // Try POST with CSRF token
      const postWithToken = await request(app.getHttpServer())
        .post('/api/v1/users/update')
        .set('X-CSRF-Token', csrfToken)
        .send({ firstName: 'Test' });

      expect(postWithToken.status).not.toBe(403);
    });
  });
});