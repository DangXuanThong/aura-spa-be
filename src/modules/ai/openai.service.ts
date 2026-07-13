import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AiInvocationLog } from './entities/ai-invocation-log.entity';

export type ChatMessage = { role: 'system' | 'user' | 'assistant' | 'tool'; content: string; name?: string; tool_call_id?: string };

export type ToolDefinition = {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>;
  };
};

export type ChatCompletionResult = {
  content: string | null;
  toolCalls: Array<{ id: string; name: string; arguments: string }>;
  model: string;
  promptTokens: number;
  completionTokens: number;
  raw?: unknown;
};

@Injectable()
export class OpenAiService {
  private readonly logger = new Logger(OpenAiService.name);
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly enabled: boolean;

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(AiInvocationLog)
    private readonly logRepo: Repository<AiInvocationLog>,
  ) {
    this.apiKey = this.config.get<string>('OPENAI_API_KEY', '');
    this.model = this.config.get<string>('OPENAI_MODEL', 'gpt-4o-mini');
    this.baseUrl = this.config.get<string>('OPENAI_BASE_URL', 'https://api.openai.com/v1');
    this.enabled = this.config.get<string>('AI_ENABLED', 'true') !== 'false';
  }

  isConfigured(): boolean {
    return this.enabled && Boolean(this.apiKey);
  }

  getDefaultModel(): string {
    return this.model;
  }

  async chat(params: {
    messages: ChatMessage[];
    tools?: ToolDefinition[];
    toolChoice?: 'auto' | 'none' | { type: 'function'; function: { name: string } };
    temperature?: number;
    maxTokens?: number;
    responseFormat?: { type: 'json_object' } | { type: 'text' };
    feature: string;
    userId?: string | null;
    branchId?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<ChatCompletionResult> {
    if (!this.enabled) {
      throw new ServiceUnavailableException('AI features are disabled');
    }

    if (!this.apiKey) {
      throw new ServiceUnavailableException('OPENAI_API_KEY is not configured — use heuristic fallbacks');
    }

    const started = Date.now();
    const body: Record<string, unknown> = {
      model: this.model,
      messages: params.messages,
      temperature: params.temperature ?? 0.4,
      max_tokens: params.maxTokens ?? 1200,
    };
    if (params.tools?.length) {
      body.tools = params.tools;
      body.tool_choice = params.toolChoice ?? 'auto';
    }
    if (params.responseFormat) {
      body.response_format = params.responseFormat;
    }

    try {
      const res = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(25_000),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`OpenAI HTTP ${res.status}: ${errText.slice(0, 300)}`);
      }

      const json = (await res.json()) as {
        model?: string;
        choices?: Array<{
          message?: {
            content?: string | null;
            tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
          };
        }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };

      const message = json.choices?.[0]?.message;
      const toolCalls =
        message?.tool_calls?.map((tc) => ({
          id: tc.id,
          name: tc.function.name,
          arguments: tc.function.arguments,
        })) ?? [];

      const promptTokens = json.usage?.prompt_tokens ?? 0;
      const completionTokens = json.usage?.completion_tokens ?? 0;
      const model = json.model ?? this.model;
      const latencyMs = Date.now() - started;

      await this.writeLog({
        feature: params.feature,
        userId: params.userId ?? null,
        branchId: params.branchId ?? null,
        model,
        promptTokens,
        completionTokens,
        success: true,
        latencyMs,
        metadata: params.metadata ?? null,
      });

      return {
        content: message?.content ?? null,
        toolCalls,
        model,
        promptTokens,
        completionTokens,
        raw: json,
      };
    } catch (err) {
      const latencyMs = Date.now() - started;
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(`OpenAI call failed [${params.feature}]: ${errorMessage}`);
      await this.writeLog({
        feature: params.feature,
        userId: params.userId ?? null,
        branchId: params.branchId ?? null,
        model: this.model,
        promptTokens: 0,
        completionTokens: 0,
        success: false,
        errorMessage,
        latencyMs,
        metadata: params.metadata ?? null,
      });
      throw err;
    }
  }

  private async writeLog(input: {
    feature: string;
    userId: string | null;
    branchId: string | null;
    model: string;
    promptTokens: number;
    completionTokens: number;
    success: boolean;
    errorMessage?: string;
    latencyMs: number;
    metadata: Record<string, unknown> | null;
  }): Promise<void> {
    // Rough gpt-4o-mini pricing estimate
    const estimated = (input.promptTokens * 0.15 + input.completionTokens * 0.6) / 1_000_000;
    try {
      await this.logRepo.save(
        this.logRepo.create({
          feature: input.feature,
          userId: input.userId,
          branchId: input.branchId,
          model: input.model,
          promptTokens: input.promptTokens,
          completionTokens: input.completionTokens,
          estimatedCostUsd: estimated,
          success: input.success,
          errorMessage: input.errorMessage ?? null,
          latencyMs: input.latencyMs,
          metadata: input.metadata,
        }),
      );
    } catch (e) {
      this.logger.warn(`Failed to write AI log: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}
