import { Test, TestingModule } from '@nestjs/testing';
import { AiService } from './ai.service';
import { VerifyAuthenticityDto } from './dto/verify-authenticity.dto';
import { GenerateQuestionsDto } from './dto/generate-questions.dto';

describe('AiService', () => {
  let service: AiService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AiService],
    }).compile();

    service = module.get<AiService>(AiService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyAuthenticity', () => {
    const verifyAuthenticityDto: VerifyAuthenticityDto = {
      mediaUrl: 'https://example.com/video.mp4',
      mediaType: 'video' as any,
    };

    it('should return authenticity verification result', async () => {
      const result = await service.verifyAuthenticity(verifyAuthenticityDto);

      expect(result).toBeDefined();
      expect(result.authenticityScore).toBeDefined();
      expect(result.deepfakeProbability).toBeDefined();
      expect(typeof result.authenticityScore).toBe('number');
      expect(typeof result.deepfakeProbability).toBe('number');
    });

    it('should return scores between 0 and 100', async () => {
      // Test multiple times to ensure randomness is in range
      for (let i = 0; i < 10; i++) {
        const result = await service.verifyAuthenticity(verifyAuthenticityDto);

        expect(result.authenticityScore).toBeGreaterThanOrEqual(0);
        expect(result.authenticityScore).toBeLessThanOrEqual(100);
        expect(result.deepfakeProbability).toBeGreaterThanOrEqual(0);
        expect(result.deepfakeProbability).toBeLessThanOrEqual(100);
      }
    });

    it('should handle different media URLs', async () => {
      const dto1 = { ...verifyAuthenticityDto, mediaUrl: 'https://example.com/video1.mp4' };
      const dto2 = { ...verifyAuthenticityDto, mediaUrl: 'https://example.com/video2.mp4' };

      const result1 = await service.verifyAuthenticity(dto1);
      const result2 = await service.verifyAuthenticity(dto2);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
      // Both should return valid results (may be different due to randomness)
    });

    it('should handle different media types', async () => {
      const dto1 = { ...verifyAuthenticityDto, mediaType: 'video' as any };
      const dto2 = { ...verifyAuthenticityDto, mediaType: 'audio' as any };

      const result1 = await service.verifyAuthenticity(dto1);
      const result2 = await service.verifyAuthenticity(dto2);

      expect(result1).toBeDefined();
      expect(result2).toBeDefined();
    });

    it('should return numeric values for scores', async () => {
      const result = await service.verifyAuthenticity(verifyAuthenticityDto);

      expect(Number.isFinite(result.authenticityScore)).toBe(true);
      expect(Number.isFinite(result.deepfakeProbability)).toBe(true);
    });
  });

  describe('generateQuestions', () => {
    const generateQuestionsDto: GenerateQuestionsDto = {
      role: 'Senior Software Engineer',
      jobDescription: 'Senior Full Stack Developer with React and Node.js',
    };

    it('should return generated questions', async () => {
      const result = await service.generateQuestions(generateQuestionsDto);

      expect(result).toBeDefined();
      expect(result.questions).toBeDefined();
      expect(Array.isArray(result.questions)).toBe(true);
    });

    it('should return 5 questions', async () => {
      const result = await service.generateQuestions(generateQuestionsDto);

      expect(result.questions.length).toBe(5);
    });

    it('should include role-specific question', async () => {
      const result = await service.generateQuestions(generateQuestionsDto);

      const roleQuestion = result.questions.find(q =>
        q.includes(generateQuestionsDto.role)
      );
      expect(roleQuestion).toBeDefined();
    });

    it('should include all expected question types', async () => {
      const result = await service.generateQuestions(generateQuestionsDto);

      const questionTexts = result.questions.join(' ');
      expect(questionTexts).toContain("How would you describe Senior Software Engineer's technical skills?");
      expect(questionTexts).toContain('Can you provide specific examples of their work?');
      expect(questionTexts).toContain('How did they collaborate with team members?');
      expect(questionTexts).toContain('What were their main strengths and areas for improvement?');
      expect(questionTexts).toContain('Would you work with them again?');
    });

    it('should handle different roles', async () => {
      const dto1 = { ...generateQuestionsDto, role: 'Product Manager' };
      const dto2 = { ...generateQuestionsDto, role: 'Data Scientist' };

      const result1 = await service.generateQuestions(dto1);
      const result2 = await service.generateQuestions(dto2);

      expect(result1.questions[0]).toContain('Product Manager');
      expect(result2.questions[0]).toContain('Data Scientist');
    });

    it('should return questions as strings', async () => {
      const result = await service.generateQuestions(generateQuestionsDto);

      result.questions.forEach(question => {
        expect(typeof question).toBe('string');
        expect(question.length).toBeGreaterThan(0);
      });
    });

    it('should handle different job descriptions', async () => {
      const dto1 = { ...generateQuestionsDto, jobDescription: 'Backend Engineer with Python' };
      const dto2 = { ...generateQuestionsDto, jobDescription: 'Frontend Developer with Vue.js' };

      const result1 = await service.generateQuestions(dto1);
      const result2 = await service.generateQuestions(dto2);

      // Both should return valid questions
      expect(result1.questions.length).toBe(5);
      expect(result2.questions.length).toBe(5);
    });
  });
});
