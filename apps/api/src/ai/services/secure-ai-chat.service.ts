import { Injectable, Logger } from '@nestjs/common';
import { PromptManagerService } from './prompt-manager.service';
import { SessionManagerService } from './session-manager.service';
import { InteractionLoggerService } from './interaction-logger.service';
import { FallbackStrategy } from '../strategies/fallback.strategy';
import { Observable, Subject } from 'rxjs';

export interface ChatResponse {
  message: string;
  interaction_id: string;
  tokens_used: number;
  model_used: string;
}

export interface StreamChunk {
  chunk: string;
  done: boolean;
  interaction_id?: string;
}

@Injectable()
export class SecureAIChatService {
  private readonly logger = new Logger(SecureAIChatService.name);

  constructor(
    private promptManager: PromptManagerService,
    private sessionManager: SessionManagerService,
    private interactionLogger: InteractionLoggerService,
    private fallbackStrategy: FallbackStrategy,
  ) {}

  /**
   * Main chat method - handles secure AI interaction
   * CRITICAL: System prompts are NEVER exposed to client
   */
  async chat(
    agentId: string,
    userMessage: string,
    userId: string,
  ): Promise<ChatResponse> {
    const startTime = Date.now();

    // 1. Validate session and user ownership
    const session = await this.sessionManager.getSessionByAgentId(agentId, userId);

    // 2. Get system prompt (NEVER send to client)
    const prompt = await this.promptManager.getPromptForSessionType(
      session.session_type,
    );
    const systemPrompt = await this.promptManager.getDecryptedPrompt(prompt.id);

    // 3. Build complete prompt (hidden from user)
    const fullPrompt = this.buildFullPrompt(systemPrompt, userMessage);

    // 4. Call LLM with fallback
    let aiResponse: string;
    let modelUsed: string;
    let tokensUsed: number;

    try {
      const response = await this.fallbackStrategy.execute(fullPrompt, {
        model: prompt.model_preference,
        ...prompt.model_config,
      });

      aiResponse = response;
      modelUsed = prompt.model_preference;
      tokensUsed = this.estimateTokens(userMessage + aiResponse);
    } catch (error) {
      this.logger.error('LLM call failed', error);
      throw error;
    }

    const latencyMs = Date.now() - startTime;

    // 5. Log interaction for fine-tuning
    const interaction = await this.interactionLogger.logInteraction({
      session_id: session.id,
      prompt_id: prompt.id,
      user_input: userMessage,
      ai_response: aiResponse,
      model_used: modelUsed,
      tokens_used: tokensUsed,
      latency_ms: latencyMs,
      metadata: {
        agent_id: agentId,
        session_type: session.session_type,
      },
    });

    // 6. Update session statistics
    await this.sessionManager.updateSessionStats(session.id, tokensUsed);

    // 7. Return ONLY AI response (NO system prompt)
    return {
      message: aiResponse,
      interaction_id: interaction.id,
      tokens_used: tokensUsed,
      model_used: modelUsed,
    };
  }

  /**
   * Streaming chat method - returns Observable for SSE
   * CRITICAL: System prompts are NEVER exposed to client
   */
  chatStream(
    agentId: string,
    userMessage: string,
    userId: string,
  ): Observable<StreamChunk> {
    const subject = new Subject<StreamChunk>();

    (async () => {
      try {
        const startTime = Date.now();

        // 1. Validate session and user ownership
        const session = await this.sessionManager.getSessionByAgentId(agentId, userId);

        // 2. Get system prompt (NEVER send to client)
        const prompt = await this.promptManager.getPromptForSessionType(
          session.session_type,
        );
        const systemPrompt = await this.promptManager.getDecryptedPrompt(prompt.id);

        // 3. Build complete prompt (hidden from user)
        const fullPrompt = this.buildFullPrompt(systemPrompt, userMessage);

        // 4. Stream LLM response
        let fullResponse = '';
        let interactionId: string;

        // Simulate streaming (in production, use actual LLM streaming API)
        const response = await this.fallbackStrategy.execute(fullPrompt, {
          model: prompt.model_preference,
          ...prompt.model_config,
        });

        // Split response into chunks for streaming
        const chunks = this.splitIntoChunks(response, 50);

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          fullResponse += chunk;

          subject.next({
            chunk,
            done: i === chunks.length - 1,
          });

          // Small delay to simulate streaming
          await new Promise(resolve => setTimeout(resolve, 50));
        }

        const latencyMs = Date.now() - startTime;
        const tokensUsed = this.estimateTokens(userMessage + fullResponse);

        // 5. Log interaction
        const interaction = await this.interactionLogger.logInteraction({
          session_id: session.id,
          prompt_id: prompt.id,
          user_input: userMessage,
          ai_response: fullResponse,
          model_used: prompt.model_preference,
          tokens_used: tokensUsed,
          latency_ms: latencyMs,
          metadata: {
            agent_id: agentId,
            session_type: session.session_type,
            streaming: true,
          },
        });

        // 6. Update session stats
        await this.sessionManager.updateSessionStats(session.id, tokensUsed);

        // Send final chunk with interaction ID
        subject.next({
          chunk: '',
          done: true,
          interaction_id: interaction.id,
        });

        subject.complete();
      } catch (error) {
        this.logger.error('Streaming chat failed', error);
        subject.error(error);
      }
    })();

    return subject.asObservable();
  }

  /**
   * Get chat history for a session
   * Returns only user and assistant messages (NO SYSTEM PROMPTS)
   */
  async getHistory(
    agentId: string,
    userId: string,
    limit: number = 50,
  ): Promise<Array<{ role: string; content: string; timestamp: Date }>> {
    // Validate session and user ownership
    const session = await this.sessionManager.getSessionByAgentId(agentId, userId);

    // Get sanitized history (no system prompts)
    return this.interactionLogger.getHistory(session.id, limit);
  }

  /**
   * Build full prompt (NEVER exposed to client)
   */
  private buildFullPrompt(systemPrompt: string, userMessage: string): string {
    // This NEVER leaves the server
    return `${systemPrompt}\n\nUser: ${userMessage}\n\nAssistant:`;
  }

  /**
   * Estimate tokens (rough approximation)
   * In production, use actual tokenizer
   */
  private estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Split response into chunks for streaming
   */
  private splitIntoChunks(text: string, chunkSize: number): string[] {
    const chunks: string[] = [];
    for (let i = 0; i < text.length; i += chunkSize) {
      chunks.push(text.substring(i, i + chunkSize));
    }
    return chunks;
  }

  /**
   * Validate that response doesn't contain system prompt
   */
  private validateResponseSafety(response: string, systemPrompt: string): void {
    // Check if system prompt somehow leaked into response
    if (response.includes(systemPrompt.substring(0, 100))) {
      this.logger.error('CRITICAL: System prompt detected in response!');
      throw new Error('System prompt exposure detected');
    }

    // Check for common system prompt indicators
    const suspiciousPatterns = [
      'system:',
      'You are a',
      'Your role is to',
      'You must follow',
    ];

    for (const pattern of suspiciousPatterns) {
      if (response.toLowerCase().includes(pattern.toLowerCase())) {
        this.logger.warn(
          `Response contains suspicious pattern: ${pattern}`,
        );
      }
    }
  }
}
