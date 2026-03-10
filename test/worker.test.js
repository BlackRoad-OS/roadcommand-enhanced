import { describe, it, expect, beforeEach } from 'vitest';
import worker from '../worker.js';

function createMockKV() {
  const store = new Map();
  return {
    get: async (key, opts) => {
      const val = store.get(key);
      if (!val) return null;
      if (opts?.type === 'json') return JSON.parse(val);
      return val;
    },
    put: async (key, value) => {
      store.set(key, typeof value === 'string' ? value : JSON.stringify(value));
    }
  };
}

function createEnv() {
  return { KV_MEMORY: createMockKV() };
}

describe('Worker routes', () => {
  let env;

  beforeEach(() => {
    env = createEnv();
  });

  it('GET / returns HTML', async () => {
    const request = new Request('http://localhost/');
    const response = await worker.fetch(request, env, {});
    expect(response.status).toBe(200);
    expect(response.headers.get('Content-Type')).toBe('text/html');
    const html = await response.text();
    expect(html).toContain('RoadCommand');
    expect(html).toContain('<!DOCTYPE html>');
  });

  it('GET /api/providers returns provider list', async () => {
    const request = new Request('http://localhost/api/providers');
    const response = await worker.fetch(request, env, {});
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.providers).toEqual(['google', 'openai', 'anthropic']);
    expect(data.models.anthropic).toContain('claude-sonnet-4-6');
    expect(data.models.openai).toContain('gpt-4o');
    expect(data.models.google).toContain('gemini-2.0-flash');
    expect(data.capabilities.rate_limiting).toBe(true);
  });

  it('GET /api/health returns status', async () => {
    const request = new Request('http://localhost/api/health');
    const response = await worker.fetch(request, env, {});
    expect(response.status).toBe(200);

    const data = await response.json();
    expect(data.status).toBe('operational');
    expect(data.version).toBe('2.1.0');
    expect(data.platform).toBe('RoadCommand');
    expect(data.timestamp).toBeTruthy();
  });

  it('GET /unknown returns 404', async () => {
    const request = new Request('http://localhost/not-a-route');
    const response = await worker.fetch(request, env, {});
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Not found');
  });

  it('OPTIONS returns CORS headers', async () => {
    const request = new Request('http://localhost/api/process', { method: 'OPTIONS' });
    const response = await worker.fetch(request, env, {});
    expect(response.status).toBe(200);
    expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
  });

  it('GET /api/process returns 405', async () => {
    const request = new Request('http://localhost/api/process', { method: 'GET' });
    const response = await worker.fetch(request, env, {});
    expect(response.status).toBe(405);
  });

  it('POST /api/process without keys returns 400', async () => {
    const request = new Request('http://localhost/api/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: 'test', sessionId: 'test' })
    });
    const response = await worker.fetch(request, env, {});
    expect(response.status).toBe(400);
  });

  it('all responses have CORS headers', async () => {
    const routes = ['/', '/api/providers', '/api/health', '/nonexistent'];
    for (const path of routes) {
      const request = new Request(`http://localhost${path}`);
      const response = await worker.fetch(request, env, {});
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
    }
  });

  it('homepage has current model references', async () => {
    const request = new Request('http://localhost/');
    const response = await worker.fetch(request, env, {});
    const html = await response.text();
    expect(html).toContain('Rate Limiting');
    expect(html).toContain('API Reference');
    expect(html).toContain('v2.1.0');
  });
});
