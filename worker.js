/**
 * RoadCommand Cloudflare Worker
 * THE Platform - API Layer Above Google, OpenAI, Anthropic
 * BlackRoad OS, Inc. © 2026
 */

import RoadCommandOrchestrator from './api-orchestrator.js';

export default {
  async fetch(request, env, _ctx) {
    const url = new URL(request.url);

    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    switch (url.pathname) {
      case '/':
        return new Response(getHomePage(), {
          headers: { ...corsHeaders, 'Content-Type': 'text/html' }
        });

      case '/api/process': {
        if (request.method !== 'POST') {
          return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
        }
        const orchestrator = new RoadCommandOrchestrator(env);
        return await orchestrator.handleRequest(request);
      }

      case '/api/providers':
        return new Response(JSON.stringify({
          providers: ['google', 'openai', 'anthropic'],
          models: {
            google: ['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-1.5-pro'],
            openai: ['gpt-4o', 'gpt-4o-mini', 'o1', 'o1-mini'],
            anthropic: ['claude-sonnet-4-6', 'claude-opus-4-6', 'claude-haiku-4-5']
          },
          capabilities: {
            intelligent_routing: true,
            memory_continuity: true,
            cost_optimization: true,
            multi_model: true,
            agent_orchestration: true,
            rate_limiting: true
          }
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      case '/api/health':
        return new Response(JSON.stringify({
          status: 'operational',
          version: '2.1.0',
          platform: 'RoadCommand',
          timestamp: new Date().toISOString()
        }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

      default:
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  }
};

function getHomePage() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RoadCommand - AI Operations Platform | BlackRoad OS</title>
    <link href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --amber: #F5A623;
            --hot-pink: #FF1D6C;
            --electric-blue: #2979FF;
            --violet: #9C27B0;
            --gradient-brand: linear-gradient(135deg, var(--amber) 0%, var(--hot-pink) 38.2%, var(--violet) 61.8%, var(--electric-blue) 100%);
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'JetBrains Mono', monospace;
            background: #000;
            color: #fff;
            line-height: 1.6;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 89px 21px; }
        h1 {
            background: var(--gradient-brand);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            font-size: 55px;
            margin-bottom: 21px;
        }
        .tagline { font-size: 21px; color: rgba(255,255,255,0.7); margin-bottom: 55px; }
        .status-bar {
            display: flex;
            gap: 21px;
            margin-bottom: 34px;
            flex-wrap: wrap;
        }
        .status-item {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px;
            padding: 13px 21px;
            font-size: 12px;
        }
        .status-dot {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: #4CAF50;
            margin-right: 8px;
            animation: pulse 2s infinite;
        }
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .api-demo {
            background: rgba(255,255,255,0.03);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 13px;
            padding: 34px;
            margin-bottom: 34px;
        }
        textarea {
            width: 100%;
            min-height: 120px;
            background: rgba(0,0,0,0.5);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px;
            padding: 13px;
            color: #fff;
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
            margin-bottom: 13px;
            resize: vertical;
        }
        textarea:focus, input:focus { outline: none; border-color: var(--hot-pink); }
        input {
            width: 100%;
            background: rgba(0,0,0,0.5);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px;
            padding: 13px;
            color: #fff;
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
            margin-bottom: 13px;
        }
        select {
            background: rgba(0,0,0,0.5);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px;
            padding: 13px;
            color: #fff;
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
            margin-bottom: 13px;
            width: 100%;
        }
        button {
            background: var(--gradient-brand);
            border: none;
            border-radius: 8px;
            padding: 13px 34px;
            color: #fff;
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s, opacity 0.2s;
        }
        button:hover { transform: translateY(-2px); }
        button:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
        .response {
            background: rgba(0,0,0,0.5);
            border: 1px solid var(--hot-pink);
            border-radius: 8px;
            padding: 21px;
            margin-top: 21px;
            display: none;
        }
        .response.show { display: block; }
        .provider-badge {
            display: inline-block;
            padding: 5px 13px;
            border-radius: 13px;
            font-size: 11px;
            margin-right: 8px;
        }
        .provider-google { background: rgba(66, 133, 244, 0.2); color: #4285F4; }
        .provider-openai { background: rgba(16, 163, 127, 0.2); color: #10A37F; }
        .provider-anthropic { background: rgba(255, 29, 108, 0.2); color: var(--hot-pink); }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 21px; }
        .card {
            background: rgba(255,255,255,0.03);
            padding: 21px;
            border-radius: 13px;
            border: 1px solid rgba(255,255,255,0.05);
            transition: border-color 0.2s;
        }
        .card:hover { border-color: rgba(255,255,255,0.2); }
        .loading { display: inline-block; }
        .loading::after {
            content: '';
            animation: dots 1.5s steps(4, end) infinite;
        }
        @keyframes dots {
            0% { content: ''; }
            25% { content: '.'; }
            50% { content: '..'; }
            75% { content: '...'; }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>RoadCommand</h1>
        <div class="tagline">The Platform That Enables Companies to Operate Exclusively by AI</div>

        <div class="status-bar">
            <div class="status-item"><span class="status-dot"></span>System Operational</div>
            <div class="status-item">v2.1.0</div>
            <div class="status-item">3 Providers Active</div>
            <div class="status-item" id="latency">Latency: --</div>
        </div>

        <div class="api-demo">
            <h2 style="margin-bottom: 21px;">API Orchestration Layer</h2>
            <p style="margin-bottom: 21px; color: rgba(255,255,255,0.6);">
                RoadCommand intelligently routes your requests to the best AI model across Google, OpenAI, and Anthropic.
                Built-in rate limiting, conversation memory, and cost optimization.
            </p>

            <label style="display: block; margin-bottom: 8px; font-size: 13px;">Your Request:</label>
            <textarea id="prompt" placeholder="Enter your request... RoadCommand will route it to the optimal model.">Write a Python function to calculate Fibonacci numbers</textarea>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 13px;">
                <div>
                    <label style="display: block; margin-bottom: 8px; font-size: 13px;">Session ID:</label>
                    <input type="text" id="sessionId" placeholder="auto-generated" />
                </div>
                <div>
                    <label style="display: block; margin-bottom: 8px; font-size: 13px;">Priority:</label>
                    <select id="priority">
                        <option value="balanced">Balanced (Auto-Route)</option>
                        <option value="fast">Fast Response</option>
                        <option value="cost">Cost Optimized</option>
                    </select>
                </div>
            </div>

            <label style="display: block; margin-bottom: 8px; font-size: 13px;">API Keys (comma-separated: google,openai,anthropic):</label>
            <input type="password" id="apiKeys" placeholder="your-google-key,your-openai-key,your-anthropic-key" />

            <button id="sendBtn" onclick="processRequest()">Send to RoadCommand</button>

            <div id="response" class="response"></div>
        </div>

        <div style="margin-top: 55px;">
            <h2 style="margin-bottom: 21px;">How It Works</h2>
            <div class="grid">
                <div class="card">
                    <h3 style="color: var(--amber); margin-bottom: 13px;">1. Intelligent Routing</h3>
                    <p style="font-size: 13px; color: rgba(255,255,255,0.6);">
                        Analyzes your request and routes to the best model: Google Gemini for data analysis,
                        OpenAI for creative tasks, Anthropic Claude for code generation.
                    </p>
                </div>
                <div class="card">
                    <h3 style="color: var(--hot-pink); margin-bottom: 13px;">2. Memory & Continuity</h3>
                    <p style="font-size: 13px; color: rgba(255,255,255,0.6);">
                        Maintains conversation context across sessions. Switch between models
                        seamlessly without losing context.
                    </p>
                </div>
                <div class="card">
                    <h3 style="color: var(--violet); margin-bottom: 13px;">3. Rate Limiting</h3>
                    <p style="font-size: 13px; color: rgba(255,255,255,0.6);">
                        Built-in rate limiting protects against abuse and respects provider
                        limits. Automatic retry with exponential backoff.
                    </p>
                </div>
                <div class="card">
                    <h3 style="color: var(--electric-blue); margin-bottom: 13px;">4. Cost Optimization</h3>
                    <p style="font-size: 13px; color: rgba(255,255,255,0.6);">
                        Automatically selects the most cost-effective model for your task.
                        Real-time cost tracking per request.
                    </p>
                </div>
            </div>
        </div>

        <div style="margin-top: 55px;">
            <h2 style="margin-bottom: 21px;">API Reference</h2>
            <div class="grid">
                <div class="card">
                    <code style="color: var(--amber);">POST /api/process</code>
                    <p style="font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 8px;">
                        Route a prompt through the intelligent model selector.
                        Returns response with cost and usage data.
                    </p>
                </div>
                <div class="card">
                    <code style="color: var(--amber);">GET /api/providers</code>
                    <p style="font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 8px;">
                        List available providers, models, and platform capabilities.
                    </p>
                </div>
                <div class="card">
                    <code style="color: var(--amber);">GET /api/health</code>
                    <p style="font-size: 12px; color: rgba(255,255,255,0.5); margin-top: 8px;">
                        Health check endpoint. Returns platform status and version.
                    </p>
                </div>
            </div>
        </div>

        <div style="margin-top: 55px; padding: 34px; background: var(--gradient-brand); border-radius: 13px;">
            <h2 style="margin-bottom: 13px;">Enterprise Pricing</h2>
            <p style="margin-bottom: 21px;">
                For companies operating exclusively by AI, RoadCommand provides the complete
                infrastructure for model management, agent orchestration, and continuity.
            </p>
            <p style="font-size: 21px; font-weight: 600;">Contact: blackroad.systems@gmail.com</p>
        </div>
    </div>

    <script>
        // Generate session ID on load
        document.getElementById('sessionId').value = 'session-' + Date.now().toString(36);

        // Health check for latency display
        (async function checkLatency() {
            try {
                const start = performance.now();
                const res = await fetch('/api/health');
                const elapsed = Math.round(performance.now() - start);
                if (res.ok) {
                    document.getElementById('latency').textContent = 'Latency: ' + elapsed + 'ms';
                }
            } catch (_) {}
        })();

        async function processRequest() {
            const prompt = document.getElementById('prompt').value.trim();
            const sessionId = document.getElementById('sessionId').value.trim();
            const priority = document.getElementById('priority').value;
            const apiKeysInput = document.getElementById('apiKeys').value.trim();
            const responseDiv = document.getElementById('response');
            const sendBtn = document.getElementById('sendBtn');

            if (!prompt) {
                showError('Please enter a prompt.');
                return;
            }

            if (!apiKeysInput) {
                showError('Please provide at least one API key.');
                return;
            }

            const keys = apiKeysInput.split(',').map(k => k.trim());
            const apiKeys = {
                google: keys[0] || null,
                openai: keys[1] || null,
                anthropic: keys[2] || null
            };

            sendBtn.disabled = true;
            sendBtn.textContent = 'Processing...';
            responseDiv.innerHTML = '<p class="loading">Routing through RoadCommand</p>';
            responseDiv.classList.add('show');

            try {
                const response = await fetch('/api/process', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ sessionId, prompt, apiKeys, priority })
                });

                const data = await response.json();

                if (response.status === 429) {
                    showError('Rate limit reached. Retry after ' + (data.retryAfter || 60) + ' seconds.');
                    return;
                }

                if (!response.ok || data.error) {
                    showError(data.error || 'Request failed');
                    return;
                }

                const providerClass = 'provider-' + data.provider;
                responseDiv.innerHTML =
                    '<div>' +
                        '<span class="provider-badge ' + providerClass + '">' + data.provider.toUpperCase() + '</span>' +
                        '<span class="provider-badge" style="background: rgba(255,255,255,0.1);">' + escapeHtml(data.model) + '</span>' +
                    '</div>' +
                    '<div style="margin: 13px 0; padding: 13px; background: rgba(255,255,255,0.05); border-radius: 8px;">' +
                        '<pre style="white-space: pre-wrap; font-size: 13px;">' + escapeHtml(data.content) + '</pre>' +
                    '</div>' +
                    '<div style="font-size: 11px; color: rgba(255,255,255,0.4);">' +
                        'Cost: $' + data.cost.total.toFixed(4) + ' | ' +
                        'Input: ' + data.usage.input_tokens + ' tokens | ' +
                        'Output: ' + data.usage.output_tokens + ' tokens' +
                    '</div>';
            } catch (error) {
                showError('Network error: ' + error.message);
            } finally {
                sendBtn.disabled = false;
                sendBtn.textContent = 'Send to RoadCommand';
            }
        }

        function showError(msg) {
            const responseDiv = document.getElementById('response');
            responseDiv.innerHTML = '<p style="color: #ff6b6b;">' + escapeHtml(msg) + '</p>';
            responseDiv.classList.add('show');
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }
    </script>
</body>
</html>`;
}
