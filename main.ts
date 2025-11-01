#!/usr/bin/env deno run --allow-net --allow-env
/**
 * FreeAI2API - 将freeaiimage.net转换为标准API服务
 * 
 * 使用方法：
 *   deno run --allow-net --allow-env main.ts
 *   deno run --allow-net --allow-env --port=8080 main.ts
 *   deno run --allow-net --allow-env --allow-read main.ts
 */

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { CONFIG, validateConfig } from './config.ts';
import handler from './api.ts';

/**
 * 启动服务器
 */
async function startServer() {
  console.log('🚀 FreeAI2API 启动中...');
  console.log('='.repeat(50));
  
  try {
    // 验证配置
    validateConfig();
    
    console.log('✅ 配置验证通过');
    console.log(`📍 服务器地址: ${CONFIG.server.hostname}:${CONFIG.server.port}`);
    console.log(`🎯 目标API: ${CONFIG.freeai.baseUrl}`);
    console.log('📡 API 端点:');
    console.log('   GET  /health - 健康检查');
    console.log('   POST /api/generate - 创建生成任务（异步）');
    console.log('   GET  /api/task/:id - 查询任务状态');
    console.log('   POST /api/generate-sync - 生成并等待（同步）');
    console.log('='.repeat(50));
    
    // 启动服务器
    await serve(handler, {
      port: CONFIG.server.port,
      hostname: CONFIG.server.hostname,
      onListen: ({ hostname, port }) => {
        console.log(`🎉 服务器已启动: http://${hostname}:${port}`);
        console.log('🔥 按 Ctrl+C 停止服务器');
      }
    });
    
  } catch (error) {
    console.error('❌ 启动失败:', error.message);
    
    if (CONFIG.debug.enabled) {
      console.error('错误详情:', error);
    }
    
    Deno.exit(1);
  }
}

// 全局错误处理
addEventListener('unhandledrejection', (event) => {
  console.error('🚫 未处理的Promise拒绝:', event.reason);
  event.preventDefault();
});

addEventListener('error', (event) => {
  console.error('🚫 全局错误:', event.error);
});

// 如果是主模块，启动服务器
if (import.meta.main) {
  startServer();
}

export { startServer };