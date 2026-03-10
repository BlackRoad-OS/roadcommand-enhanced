/**
 * RoadCommand API Orchestrator
 * The Platform That Enables Companies to Operate Exclusively by AI
 *
 * API Layer Above: Google AI, OpenAI, Anthropic
 * Manages: 30,000+ agents, model memory, continuity
 *
 * BlackRoad OS, Inc. © 2026
 */

// Model providers configuration - current models as of 2026
const PROVIDERS = {
  google: {
    name: 'Google AI (Gemini)',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    models: ['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-1.5-pro'],
    capabilities: ['text', 'vision', 'multimodal', 'long-context'],
    pricing: { input: 0.00025, output: 0.0005 }
  },
  openai: {
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1',
    models: ['gpt-4o', 'gpt-4o-mini', 'o1', 'o1-mini'],
    capabilities: ['text', 'vision', 'function-calling', 'reasoning'],
    pricing: { input: 0.0025, output: 0.01 }
  },
  anthropic: {
    name: 'Anthropic (Claude)',
    endpoint: 'https://api.anthropic.com/v1',
    models: ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5'],
    capabilities: ['text', 'vision', 'long-context', 'coding'],
    pricing: { input: 0.003, output: 0.015 }
  }
};

/**
 * Rate Limiter
 * Prevents API abuse and respects provider rate limits
 */
class RateLimiter {
  constructor(kv) {
    this.kv = kv;
    this.limits = {
      perMinute: 60,
      perHour: 500,
      perDay: 5000
    };
  }

  async check(clientId) {
    const now = Date.now();
    const minuteKey = `ratelimit:${clientId}:min:${Math.floor(now / 60000)}`;
    const hourKey = `ratelimit:${clientId}:hr:${Math.floor(now / 3600000)}`;
    const dayKey = `ratelimit:${clientId}:day:${Math.floor(now / 86400000)}`;

    const [minuteCount, hourCount, dayCount] = await Promise.all([
      this.kv.get(minuteKey, { type: 'text' }).then(v => parseInt(v) || 0),
      this.kv.get(hourKey, { type: 'text' }).then(v => parseInt(v) || 0),
      this.kv.get(dayKey, { type: 'text' }).then(v => parseInt(v) || 0)
    ]);

    if (minuteCount >= this.limits.perMinute) {
      return { allowed: false, reason: 'Rate limit exceeded: max 60 requests/minute', retryAfter: 60 };
    }
    if (hourCount >= this.limits.perHour) {
      return { allowed: false, reason: 'Rate limit exceeded: max 500 requests/hour', retryAfter: 3600 };
    }
    if (dayCount >= this.limits.perDay) {
      return { allowed: false, reason: 'Rate limit exceeded: max 5000 requests/day', retryAfter: 86400 };
    }

    return { allowed: true };
  }

  async increment(clientId) {
    const now = Date.now();
    const minuteKey = `ratelimit:${clientId}:min:${Math.floor(now / 60000)}`;
    const hourKey = `ratelimit:${clientId}:hr:${Math.floor(now / 3600000)}`;
    const dayKey = `ratelimit:${clientId}:day:${Math.floor(now / 86400000)}`;

    const [minuteCount, hourCount, dayCount] = await Promise.all([
      this.kv.get(minuteKey, { type: 'text' }).then(v => parseInt(v) || 0),
      this.kv.get(hourKey, { type: 'text' }).then(v => parseInt(v) || 0),
      this.kv.get(dayKey, { type: 'text' }).then(v => parseInt(v) || 0)
    ]);

    await Promise.all([
      this.kv.put(minuteKey, String(minuteCount + 1), { expirationTtl: 120 }),
      this.kv.put(hourKey, String(hourCount + 1), { expirationTtl: 7200 }),
      this.kv.put(dayKey, String(dayCount + 1), { expirationTtl: 172800 })
    ]);
  }
}

/**
 * Intelligent Model Router
 * Routes requests to the best model based on task requirements
 */
class ModelRouter {
  constructor() {
    this.routingRules = {
      'code-generation': { provider: 'anthropic', model: 'claude-sonnet-4-6' },
      'creative-writing': { provider: 'openai', model: 'gpt-4o' },
      'data-analysis': { provider: 'google', model: 'gemini-2.0-pro' },
      'vision-tasks': { provider: 'openai', model: 'gpt-4o' },
      'long-context': { provider: 'google', model: 'gemini-1.5-pro' },
      'fast-responses': { provider: 'anthropic', model: 'claude-haiku-4-5' },
      'cost-optimized': { provider: 'openai', model: 'gpt-4o-mini' },
      'reasoning': { provider: 'openai', model: 'o1' }
    };
  }

  route(task) {
    const taskType = this.analyzeTask(task);

    const rule = this.routingRules[taskType] || {
      provider: 'anthropic',
      model: 'claude-sonnet-4-6'
    };

    return {
      provider: rule.provider,
      model: rule.model,
      endpoint: PROVIDERS[rule.provider].endpoint,
      pricing: PROVIDERS[rule.provider].pricing
    };
  }

  analyzeTask(task) {
    const text = task.prompt.toLowerCase();

    if (text.includes('code') || text.includes('program') || text.includes('function') || text.includes('debug')) {
      return 'code-generation';
    }
    if (text.includes('write') || text.includes('story') || text.includes('creative') || text.includes('poem')) {
      return 'creative-writing';
    }
    if (text.includes('analyze') || text.includes('data') || text.includes('chart') || text.includes('statistics')) {
      return 'data-analysis';
    }
    if (text.includes('reason') || text.includes('think') || text.includes('logic') || text.includes('math')) {
      return 'reasoning';
    }
    if (task.images && task.images.length > 0) {
      return 'vision-tasks';
    }
    if (task.context && task.context.length > 50000) {
      return 'long-context';
    }
    if (task.priority === 'fast') {
      return 'fast-responses';
    }
    if (task.priority === 'cost') {
      return 'cost-optimized';
    }

    return 'default';
  }
}

/**
 * Memory & Continuity Manager
 * Maintains conversation context across sessions and models
 */
class MemoryManager {
  constructor(kv) {
    this.kv = kv;
  }

  async store(sessionId, message) {
    const key = `memory:${sessionId}`;

    const existing = await this.kv.get(key, { type: 'json' }) || {
      session_id: sessionId,
      messages: [],
      created_at: new Date().toISOString(),
      last_active: new Date().toISOString()
    };

    existing.messages.push({
      timestamp: new Date().toISOString(),
      role: message.role,
      content: message.content,
      model: message.model,
      provider: message.provider
    });

    // Cap message history at 100 messages to prevent unbounded growth
    if (existing.messages.length > 100) {
      existing.messages = existing.messages.slice(-100);
    }

    existing.last_active = new Date().toISOString();

    await this.kv.put(key, JSON.stringify(existing), {
      expirationTtl: 60 * 60 * 24 * 30
    });

    return existing;
  }

  async retrieve(sessionId) {
    const key = `memory:${sessionId}`;
    const memory = await this.kv.get(key, { type: 'json' });
    return memory || null;
  }

  async buildContext(sessionId, maxTokens = 10000) {
    const memory = await this.retrieve(sessionId);
    if (!memory) return [];

    const context = [];
    let tokenCount = 0;

    for (let i = memory.messages.length - 1; i >= 0; i--) {
      const msg = memory.messages[i];
      const msgTokens = this.estimateTokens(msg.content);

      if (tokenCount + msgTokens > maxTokens) break;

      context.unshift({
        role: msg.role,
        content: msg.content
      });

      tokenCount += msgTokens;
    }

    return context;
  }

  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }
}

/**
 * Agent Orchestrator
 * Manages fleet of 30,000+ AI agents
 */
class AgentOrchestrator {
  constructor(kv) {
    this.kv = kv;
    this.router = new ModelRouter();
    this.memory = new MemoryManager(kv);
    this.rateLimiter = new RateLimiter(kv);
  }

  async process(request) {
    const {
      sessionId,
      prompt,
      images,
      context,
      priority,
      agentId
    } = request;

    // Check rate limit
    const clientId = sessionId || 'anonymous';
    const rateCheck = await this.rateLimiter.check(clientId);
    if (!rateCheck.allowed) {
      throw new RateLimitError(rateCheck.reason, rateCheck.retryAfter);
    }

    // Route to best model
    const routing = this.router.route({ prompt, images, context, priority });

    // Build conversation context from memory
    const memoryContext = await this.memory.buildContext(sessionId);

    // Prepare API request based on provider
    const apiRequest = this.buildApiRequest(routing, memoryContext, request);

    // Call provider with retry logic
    const response = await this.callWithRetry(routing, apiRequest, request.apiKeys);

    // Increment rate limit counter
    await this.rateLimiter.increment(clientId);

    // Store in memory
    await this.memory.store(sessionId, {
      role: 'user',
      content: prompt,
      model: routing.model,
      provider: routing.provider
    });

    await this.memory.store(sessionId, {
      role: 'assistant',
      content: response.content,
      model: routing.model,
      provider: routing.provider
    });

    // Calculate cost
    const cost = this.calculateCost(
      routing.pricing,
      response.usage.input_tokens,
      response.usage.output_tokens
    );

    return {
      content: response.content,
      model: routing.model,
      provider: routing.provider,
      usage: response.usage,
      cost,
      sessionId,
      agentId,
      timestamp: new Date().toISOString()
    };
  }

  buildApiRequest(routing, memoryContext, request) {
    const messages = [
      ...memoryContext,
      { role: 'user', content: request.prompt }
    ];

    if (routing.provider === 'anthropic') {
      return {
        model: routing.model,
        messages,
        max_tokens: request.maxTokens || 4096
      };
    }

    return {
      model: routing.model,
      messages,
      temperature: request.temperature || 0.7,
      max_tokens: request.maxTokens || 4096
    };
  }

  async callWithRetry(routing, apiRequest, apiKeys, maxRetries = 2) {
    let lastError;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await this.callProvider(routing, apiRequest, apiKeys);
      } catch (error) {
        lastError = error;

        // Don't retry on auth errors or bad requests
        if (error.status === 401 || error.status === 400 || error.status === 403) {
          throw error;
        }

        // Rate limited by provider - respect retry-after
        if (error.status === 429) {
          throw new RateLimitError(
            `Provider ${routing.provider} rate limit hit. Try again shortly.`,
            error.retryAfter || 60
          );
        }

        // Wait before retry with exponential backoff
        if (attempt < maxRetries) {
          await new Promise(r => setTimeout(r, 1000 * Math.pow(2, attempt)));
        }
      }
    }

    throw lastError;
  }

  async callProvider(routing, request, apiKeys) {
    const provider = routing.provider;
    const endpoint = routing.endpoint;
    const apiKey = apiKeys[provider];

    if (!apiKey) {
      throw new ApiError(`API key not provided for ${provider}`, 400);
    }

    switch (provider) {
      case 'openai':
        return await this.callOpenAI(endpoint, apiKey, request);
      case 'anthropic':
        return await this.callAnthropic(endpoint, apiKey, request);
      case 'google':
        return await this.callGoogle(endpoint, apiKey, request);
      default:
        throw new ApiError(`Unknown provider: ${provider}`, 400);
    }
  }

  async callOpenAI(endpoint, apiKey, request) {
    const response = await fetch(`${endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new ApiError(
        `OpenAI API error: ${response.status} ${response.statusText}`,
        response.status,
        response.headers.get('retry-after')
      );
    }

    const data = await response.json();

    return {
      content: data.choices[0].message.content,
      usage: {
        input_tokens: data.usage.prompt_tokens,
        output_tokens: data.usage.completion_tokens
      }
    };
  }

  async callAnthropic(endpoint, apiKey, request) {
    const response = await fetch(`${endpoint}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      throw new ApiError(
        `Anthropic API error: ${response.status} ${response.statusText}`,
        response.status,
        response.headers.get('retry-after')
      );
    }

    const data = await response.json();

    return {
      content: data.content[0].text,
      usage: {
        input_tokens: data.usage.input_tokens,
        output_tokens: data.usage.output_tokens
      }
    };
  }

  async callGoogle(endpoint, apiKey, request) {
    const contents = request.messages.map(m => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }]
    }));

    const response = await fetch(`${endpoint}/${request.model}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents })
    });

    if (!response.ok) {
      throw new ApiError(
        `Google API error: ${response.status} ${response.statusText}`,
        response.status,
        response.headers.get('retry-after')
      );
    }

    const data = await response.json();

    return {
      content: data.candidates[0].content.parts[0].text,
      usage: {
        input_tokens: data.usageMetadata?.promptTokenCount || 0,
        output_tokens: data.usageMetadata?.candidatesTokenCount || 0
      }
    };
  }

  calculateCost(pricing, inputTokens, outputTokens) {
    const inputCost = (inputTokens / 1000) * pricing.input;
    const outputCost = (outputTokens / 1000) * pricing.output;
    return {
      input: inputCost,
      output: outputCost,
      total: inputCost + outputCost,
      currency: 'USD'
    };
  }
}

/**
 * Custom error classes
 */
class ApiError extends Error {
  constructor(message, status, retryAfter) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.retryAfter = retryAfter;
  }
}

class RateLimitError extends Error {
  constructor(message, retryAfter) {
    super(message);
    this.name = 'RateLimitError';
    this.status = 429;
    this.retryAfter = retryAfter;
  }
}

/**
 * RoadCommand API Orchestrator (Main Export)
 */
export default class RoadCommandOrchestrator {
  constructor(env) {
    this.orchestrator = new AgentOrchestrator(env.KV_MEMORY);
    this.env = env;
  }

  async handleRequest(request) {
    try {
      const body = await request.json();

      if (!body.apiKeys || (!body.apiKeys.openai && !body.apiKeys.anthropic && !body.apiKeys.google)) {
        return this.errorResponse('API keys required for at least one provider', 400);
      }

      if (!body.prompt || typeof body.prompt !== 'string' || body.prompt.trim().length === 0) {
        return this.errorResponse('A non-empty prompt string is required', 400);
      }

      if (!body.sessionId || typeof body.sessionId !== 'string') {
        return this.errorResponse('A sessionId string is required', 400);
      }

      const result = await this.orchestrator.process(body);

      return new Response(JSON.stringify(result), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });

    } catch (error) {
      if (error instanceof RateLimitError) {
        return new Response(JSON.stringify({
          error: error.message,
          retryAfter: error.retryAfter,
          status: 429
        }), {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Retry-After': String(error.retryAfter)
          }
        });
      }

      const status = error.status || 500;
      return this.errorResponse(error.message, status);
    }
  }

  errorResponse(message, status) {
    return new Response(JSON.stringify({
      error: message,
      status
    }), {
      status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

export { PROVIDERS, RateLimiter, ModelRouter, MemoryManager, AgentOrchestrator, ApiError, RateLimitError };
