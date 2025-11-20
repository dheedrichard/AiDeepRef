import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';

// Entities
import { AIPrompt, AISession, AIInteraction, FineTuneExport } from './entities';

// Providers
import { AnthropicProvider } from './providers/anthropic.provider';
import { GoogleProvider } from './providers/google.provider';
import { OpenAIProvider } from './providers/openai.provider';

// Strategies
import { FallbackStrategy } from './strategies/fallback.strategy';

// Legacy Services
import { ReferenceCoachService } from './services/reference-coach.service';
import { VerificationOrchestratorService } from './services/verification-orchestrator.service';
import { AuthenticityAnalyzerService } from './services/authenticity-analyzer.service';
import { ReferenceIntelligenceService } from './services/reference-intelligence.service';

// New Secure AI Services
import { PromptManagerService } from './services/prompt-manager.service';
import { SessionManagerService } from './services/session-manager.service';
import { InteractionLoggerService } from './services/interaction-logger.service';
import { BulkProcessorService } from './services/bulk-processor.service';
import { SecureAIChatService } from './services/secure-ai-chat.service';
import { AICacheService } from './services/ai-cache.service';

// Controllers
import {
  AiSessionsController,
  AiChatController,
  AiBatchController,
  AiAdminController,
} from './controllers';

// Guards
import { AgentSessionGuard } from './guards/agent-session.guard';
import { RateLimitByAgentGuard } from './guards/rate-limit-by-agent.guard';

// Configuration
import aiModelsConfig from './config/ai-models.config';

@Module({
  imports: [
    ConfigModule.forFeature(aiModelsConfig),
    TypeOrmModule.forFeature([
      AIPrompt,
      AISession,
      AIInteraction,
      FineTuneExport,
    ]),
    ScheduleModule.forRoot(),
  ],
  controllers: [
    // Legacy controller
    AiController,

    // New secure API controllers
    AiSessionsController,
    AiChatController,
    AiBatchController,
    AiAdminController,
  ],
  providers: [
    // Legacy service (for backward compatibility)
    AiService,

    // AI Providers (Priority order: Anthropic -> Google -> OpenAI)
    AnthropicProvider,
    GoogleProvider,
    OpenAIProvider,

    // Strategies
    FallbackStrategy,

    // Legacy AI-Powered Services
    ReferenceCoachService,
    VerificationOrchestratorService,
    AuthenticityAnalyzerService,
    ReferenceIntelligenceService,

    // New Secure AI Services
    PromptManagerService,
    SessionManagerService,
    InteractionLoggerService,
    BulkProcessorService,
    SecureAIChatService,
    AICacheService,

    // Guards
    AgentSessionGuard,
    RateLimitByAgentGuard,
  ],
  exports: [
    // Export legacy services for backward compatibility
    AiService,
    FallbackStrategy,
    ReferenceCoachService,
    VerificationOrchestratorService,
    AuthenticityAnalyzerService,
    ReferenceIntelligenceService,

    // Export new secure services
    PromptManagerService,
    SessionManagerService,
    InteractionLoggerService,
    BulkProcessorService,
    SecureAIChatService,
    AICacheService,

    // Export guards
    AgentSessionGuard,
    RateLimitByAgentGuard,
  ],
})
export class AiModule {}
