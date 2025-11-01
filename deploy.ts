import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { CONFIG } from './config.ts';
import handler from './api.ts';

/**
 * Deno Deploy 部署配置
 * 
 * 使用方法：
 *   deno run --allow-net deploy.ts
 * 
 * 对于 Deno Deploy：
 *   deno run -A --unstable deploy.ts
 */

// Deno Deploy 配置
export const deployConfig = {
  // 保留配置对象供 Deno Deploy 使用
  config: CONFIG,
  
  // 启动函数
  start: () => {
    console.log('🚀 Deno Deploy 启动 FreeAI2API...');
    
    serve(handler, {
      port: CONFIG.server.port,
      hostname: CONFIG.server.hostname
    });
  }
};

// Deno Deploy 入口点
if (import.meta.main) {
  console.log('🌍 运行在 Deno Deploy 环境中');
  deployConfig.start();
}

export default deployConfig;