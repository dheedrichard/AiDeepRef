import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

// Providers
import { AnthropicProvider } from './providers/anthropic.provider';
import { GoogleProvider } from './providers/google.provider';
import { OpenAIProvider } from './providers/openai.provider';

// Strategies
import { FallbackStrategy } from './strategies/fallback.strategy';

// Services
import { ReferenceCoachService } from './services/reference-coach.service';
import { VerificationOrchestratorService } from './services/verification-orchestrator.service';
import { AuthenticityAnalyzerService } from './services/authenticity-analyzer.service';
import { ReferenceIntelligenceService } from './services/reference-intelligence.service';

// Configuration
import aiModelsConfig from './config/ai-models.config';

@Module({
  imports: [
    ConfigModule.forFeature(aiModelsConfig),
  ],
  controllers: [AiController],
  providers: [
    // Legacy service (for backward compatibility)
    AiService,

    // AI Providers (Priority order: Anthropic -> Google -> OpenAI)
    AnthropicProvider,
    GoogleProvider,
    OpenAIProvider,

    // Strategies
    FallbackStrategy,

    // AI-Powered Services
    ReferenceCoachService,
    VerificationOrchestratorService,
    AuthenticityAnalyzerService,
    ReferenceIntelligenceService,
  ],
  exports: [
    // Export services for use in other modules
    AiService,
    FallbackStrategy,
    ReferenceCoachService,
    VerificationOrchestratorService,
    AuthenticityAnalyzerService,
    ReferenceIntelligenceService,
  ],
})
export class AiModule {}
