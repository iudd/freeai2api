// 配置管理

export const CONFIG = {
  // FreeAI镜像网站配置
  freeai: {
    baseUrl: 'https://freeaiimage.net',
    timeoutMs: 30000,
    pollIntervalMs: 2000,
    maxPollingAttempts: 300, // 10分钟超时
  },
  
  // API服务器配置
  server: {
    port: Number(Deno.env.get('PORT') || 8000),
    hostname: Deno.env.get('HOST') || '0.0.0.0',
    maxConcurrentTasks: 10,
  },
  
  // CORS配置
  cors: {
    allowedOrigins: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://localhost:8000',
      Deno.env.get('ALLOWED_ORIGIN') || '*'
    ].filter(Boolean),
  },
  
  // API限制配置
  limits: {
    maxPromptLength: 1000,
    maxBatchSize: 4,
    minWidth: 256,
    minHeight: 256,
    maxWidth: 1024,
    maxHeight: 1024,
  },
  
  // 调试配置
  debug: {
    enabled: Deno.env.get('DEBUG') === 'true',
    logRequests: Deno.env.get('LOG_REQUESTS') === 'true',
    logResponses: Deno.env.get('LOG_RESPONSES') === 'true',
  }
};

// 验证配置
export function validateConfig(): void {
  if (!CONFIG.freeai.baseUrl) {
    throw new Error('FREEAI_BASE_URL is required');
  }
  
  if (!CONFIG.server.port || CONFIG.server.port < 1 || CONFIG.server.port > 65535) {
    throw new Error('Invalid server port');
  }
  
  console.log('✅ Configuration validated successfully');
  console.log(`🚀 Server will run on ${CONFIG.server.hostname}:${CONFIG.server.port}`);
  console.log(`🎯 Target API: ${CONFIG.freeai.baseUrl}`);
}