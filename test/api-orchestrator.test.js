import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  PROVIDERS,
  RateLimiter,
  ModelRouter,
  MemoryManager,
  ApiError,
  RateLimitError
} from '../api-orchestrator.js';
import RoadCommandOrchestrator from '../api-orchestrator.js';

// Mock KV store
function createMockKV() {
  const store = new Map();
  return {
    get: vi.fn(async (key, opts) => {
      const val = store.get(key);
      if (!val) return null;
      if (opts?.type === 'json') return JSON.parse(val);
      return val;
    }),
    put: vi.fn(async (key, value) => {
      store.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    }),
    _store: store
  };
}

describe('PROVIDERS config', () => {
  it('has all three providers', () => {
    expect(PROVIDERS).toHaveProperty('google');
    expect(PROVIDERS).toHaveProperty('openai');
    expect(PROVIDERS).toHaveProperty('anthropic');
  });

  it('has current model names', () => {
    expect(PROVIDERS.anthropic.models).toContain('claude-sonnet-4-6');
    expect(PROVIDERS.openai.models).toContain('gpt-4o');
    expect(PROVIDERS.google.models).toContain('gemini-2.0-flash');
  });

  it('has valid endpoints', () => {
    expect(PROVIDERS.google.endpoint).toMatch(/^https:\/\//);
    expect(PROVIDERS.openai.endpoint).toMatch(/^https:\/\//);
    expect(PROVIDERS.anthropic.endpoint).toMatch(/^https:\/\//);
  });

  it('has pricing for all providers', () => {
    for (const provider of Object.values(PROVIDERS)) {
      expect(provider.pricing).toHaveProperty('input');
      expect(provider.pricing).toHaveProperty('output');
      expect(provider.pricing.input).toBeGreaterThan(0);
      expect(provider.pricing.output).toBeGreaterThan(0);
    }
  });
});

describe('ModelRouter', () => {
  let router;

  beforeEach(() => {
    router = new ModelRouter();
  });

  it('routes code tasks to anthropic', () => {
    const result = router.route({ prompt: 'Write a function to sort an array' });
    expect(result.provider).toBe('anthropic');
  });

  it('routes creative tasks to openai', () => {
    const result = router.route({ prompt: 'Write a story about a dragon' });
    expect(result.provider).toBe('openai');
  });

  it('routes data analysis to google', () => {
    const result = router.route({ prompt: 'Analyze this data set' });
    expect(result.provider).toBe('google');
  });

  it('routes vision tasks to openai', () => {
    const result = router.route({ prompt: 'Describe this', images: ['img.png'] });
    expect(result.provider).toBe('openai');
  });

  it('routes fast priority to haiku', () => {
    const result = router.route({ prompt: 'Hello', priority: 'fast' });
    expect(result.model).toBe('claude-haiku-4-5');
  });

  it('routes cost priority to gpt-4o-mini', () => {
    const result = router.route({ prompt: 'Hello', priority: 'cost' });
    expect(result.model).toBe('gpt-4o-mini');
  });

  it('routes reasoning tasks to o1', () => {
    const result = router.route({ prompt: 'Think through this math problem' });
    expect(result.model).toBe('o1');
  });

  it('defaults to claude-sonnet for unknown tasks', () => {
    const result = router.route({ prompt: 'Hello world' });
    expect(result.provider).toBe('anthropic');
    expect(result.model).toBe('claude-sonnet-4-6');
  });

  it('returns endpoint and pricing with route result', () => {
    const result = router.route({ prompt: 'Write code' });
    expect(result).toHaveProperty('endpoint');
    expect(result).toHaveProperty('pricing');
    expect(result.endpoint).toBeTruthy();
    expect(result.pricing.input).toBeGreaterThan(0);
  });
});

describe('RateLimiter', () => {
  let limiter;
  let kv;

  beforeEach(() => {
    kv = createMockKV();
    limiter = new RateLimiter(kv);
  });

  it('allows requests under limit', async () => {
    const result = await limiter.check('client-1');
    expect(result.allowed).toBe(true);
  });

  it('increments counters', async () => {
    await limiter.increment('client-1');
    expect(kv.put).toHaveBeenCalled();
  });

  it('blocks when per-minute limit exceeded', async () => {
    // Simulate 60 requests already made
    const now = Date.now();
    const minuteKey = `ratelimit:client-1:min:${Math.floor(now / 60000)}`;
    kv._store.set(minuteKey, '60');

    const result = await limiter.check('client-1');
    expect(result.allowed).toBe(false);
    expect(result.reason).toContain('60 requests/minute');
    expect(result.retryAfter).toBe(60);
  });

  it('blocks when per-hour limit exceeded', async () => {
    const now = Date.now();
    const hourKey = `ratelimit:client-1:hr:${Math.floor(now / 3600000)}`;
    kv._store.set(hourKey, '500');

    const result = await limiter.check('client-1');
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBe(3600);
  });
});

describe('MemoryManager', () => {
  let memory;
  let kv;

  beforeEach(() => {
    kv = createMockKV();
    memory = new MemoryManager(kv);
  });

  it('stores messages', async () => {
    await memory.store('session-1', {
      role: 'user',
      content: 'Hello',
      model: 'claude-sonnet-4-6',
      provider: 'anthropic'
    });

    expect(kv.put).toHaveBeenCalled();
  });

  it('retrieves stored sessions', async () => {
    await memory.store('session-1', {
      role: 'user',
      content: 'Hello',
      model: 'claude-sonnet-4-6',
      provider: 'anthropic'
    });

    const result = await memory.retrieve('session-1');
    expect(result).not.toBeNull();
    expect(result.messages).toHaveLength(1);
    expect(result.messages[0].content).toBe('Hello');
  });

  it('returns null for unknown sessions', async () => {
    const result = await memory.retrieve('unknown');
    expect(result).toBeNull();
  });

  it('builds context from memory', async () => {
    await memory.store('session-1', { role: 'user', content: 'Hello', model: 'test', provider: 'test' });
    await memory.store('session-1', { role: 'assistant', content: 'Hi there', model: 'test', provider: 'test' });

    const context = await memory.buildContext('session-1');
    expect(context).toHaveLength(2);
    expect(context[0].role).toBe('user');
    expect(context[1].role).toBe('assistant');
  });

  it('returns empty array for unknown session context', async () => {
    const context = await memory.buildContext('unknown');
    expect(context).toEqual([]);
  });

  it('estimates tokens roughly at 4 chars per token', () => {
    expect(memory.estimateTokens('Hello world!')).toBe(3); // 12/4 = 3
  });
});

describe('Error classes', () => {
  it('ApiError has status and retryAfter', () => {
    const err = new ApiError('test error', 500, 30);
    expect(err.message).toBe('test error');
    expect(err.status).toBe(500);
    expect(err.retryAfter).toBe(30);
    expect(err.name).toBe('ApiError');
  });

  it('RateLimitError defaults to 429', () => {
    const err = new RateLimitError('too many', 60);
    expect(err.status).toBe(429);
    expect(err.retryAfter).toBe(60);
    expect(err.name).toBe('RateLimitError');
  });
});

describe('RoadCommandOrchestrator', () => {
  let orchestrator;
  let mockEnv;

  beforeEach(() => {
    mockEnv = { KV_MEMORY: createMockKV() };
    orchestrator = new RoadCommandOrchestrator(mockEnv);
  });

  it('rejects requests without API keys', async () => {
    const request = new Request('http://localhost/api/process', {
      method: 'POST',
      body: JSON.stringify({ prompt: 'test', sessionId: 'test' })
    });

    const response = await orchestrator.handleRequest(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('API keys required');
  });

  it('rejects requests without a prompt', async () => {
    const request = new Request('http://localhost/api/process', {
      method: 'POST',
      body: JSON.stringify({
        apiKeys: { anthropic: 'test-key' },
        sessionId: 'test'
      })
    });

    const response = await orchestrator.handleRequest(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('prompt');
  });

  it('rejects requests without a sessionId', async () => {
    const request = new Request('http://localhost/api/process', {
      method: 'POST',
      body: JSON.stringify({
        prompt: 'test',
        apiKeys: { anthropic: 'test-key' }
      })
    });

    const response = await orchestrator.handleRequest(request);
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toContain('sessionId');
  });

  it('returns proper error response format', () => {
    const response = orchestrator.errorResponse('test error', 400);
    expect(response.status).toBe(400);
    expect(response.headers.get('Content-Type')).toBe('application/json');
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  });
});

describe('Worker integration', () => {
  it('exports default handler with fetch method', async () => {
    const worker = await import('../worker.js');
    expect(worker.default).toHaveProperty('fetch');
    expect(typeof worker.default.fetch).toBe('function');
  });
});
