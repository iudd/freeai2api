import { createRequestHandler } from "https://deno.land/std@0.208.0/http/server.ts";
import { CONFIG } from './config.ts';
import { FreeAIClient } from './freeai.ts';
import {
  GenerateImagesRequest,
  GenerateImagesResponse,
  StandardAPIResponse,
  APIError
} from './types.ts';

/**
 * 处理CORS预检请求
 */
function handleCORS(request: Request): Response | null {
  const origin = request.headers.get('Origin');
  
  if (request.method === 'OPTIONS') {
    const headers = new Headers();
    
    // CORS headers
    headers.set('Access-Control-Allow-Origin', CONFIG.cors.allowedOrigins.includes('*') || 
      CONFIG.cors.allowedOrigins.includes(origin || '') ? (origin || '*') : 'null');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    headers.set('Access-Control-Max-Age', '86400');
    
    return new Response(null, { status: 204, headers });
  }
  
  return null;
}

/**
 * 创建标准API响应
 */
function createSuccessResponse<T>(data: T): StandardAPIResponse<T> {
  return {
    success: true,
    data,
    timestamp: new Date().toISOString()
  };
}

/**
 * 创建错误响应
 */
function createErrorResponse(code: string, message: string, details?: any): Response {
  const error: APIError = { code, message, details };
  const response: StandardAPIResponse<null> = {
    success: false,
    error,
    timestamp: new Date().toISOString()
  };
  
  return new Response(JSON.stringify(response), {
    status: 400,
    headers: { 
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    }
  });
}

/**
 * 验证请求数据
 */
function validateRequest(data: any): string[] {
  const errors: string[] = [];
  
  if (!data.prompt || typeof data.prompt !== 'string') {
    errors.push('prompt is required and must be a string');
  } else if (data.prompt.length > CONFIG.limits.maxPromptLength) {
    errors.push(`prompt too long (max ${CONFIG.limits.maxPromptLength} characters)`);
  }
  
  if (data.width && (data.width < CONFIG.limits.minWidth || data.width > CONFIG.limits.maxWidth)) {
    errors.push(`width must be between ${CONFIG.limits.minWidth} and ${CONFIG.limits.maxWidth}`);
  }
  
  if (data.height && (data.height < CONFIG.limits.minHeight || data.height > CONFIG.limits.maxHeight)) {
    errors.push(`height must be between ${CONFIG.limits.minHeight} and ${CONFIG.limits.maxHeight}`);
  }
  
  if (data.batch_size && (data.batch_size < 1 || data.batch_size > CONFIG.limits.maxBatchSize)) {
    errors.push(`batch_size must be between 1 and ${CONFIG.limits.maxBatchSize}`);
  }
  
  return errors;
}

/**
 * API请求处理器
 */
const freeaiClient = new FreeAIClient();

const handler = async (request: Request): Promise<Response> => {
  // 处理CORS
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;

  const url = new URL(request.url);
  const path = url.pathname;

  // 设置CORS头
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
  });

  try {
    // 健康检查
    if (path === '/health' || path === '/') {
      const health = {
        status: 'healthy',
        service: 'freeai2api',
        version: '1.0.0',
        timestamp: new Date().toISOString()
      };
      
      return new Response(JSON.stringify(createSuccessResponse(health)), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // 生成图片API
    if (path === '/api/generate' && request.method === 'POST') {
      const requestData = await request.json();
      
      // 验证请求
      const validationErrors = validateRequest(requestData);
      if (validationErrors.length > 0) {
        return createErrorResponse('VALIDATION_ERROR', 'Invalid request data', validationErrors);
      }

      const generateRequest: GenerateImagesRequest = {
        prompt: requestData.prompt,
        width: requestData.width || 512,
        height: requestData.height || 512,
        batch_size: requestData.batch_size || 1,
        negative_prompt: requestData.negative_prompt
      };

      console.log(`🎨 Starting image generation: ${generateRequest.prompt.substring(0, 50)}...`);

      // 创建任务
      const taskId = await freeaiClient.createImageTask({
        prompt: generateRequest.prompt,
        width: generateRequest.width,
        height: generateRequest.height,
        batch_size: generateRequest.batch_size,
        negative_prompt: generateRequest.negative_prompt
      });

      // 立即返回任务信息
      const immediateResponse: GenerateImagesResponse = {
        task_id: taskId,
        status: 'processing',
        prompt: generateRequest.prompt,
        estimated_time_seconds: 30
      };

      return new Response(JSON.stringify(createSuccessResponse(immediateResponse)), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // 查询任务状态API
    if (path.startsWith('/api/task/') && request.method === 'GET') {
      const taskId = path.split('/').pop();
      if (!taskId) {
        return createErrorResponse('MISSING_TASK_ID', 'Task ID is required');
      }

      const taskStatus = await freeaiClient.getTaskStatus(taskId);
      
      let response: GenerateImagesResponse;
      
      if (taskStatus.status === 'completed' && taskStatus.data) {
        response = {
          task_id: taskStatus.task_id,
          status: 'completed',
          prompt: taskStatus.params.prompt,
          images: taskStatus.data
        };
      } else {
        response = {
          task_id: taskStatus.task_id,
          status: taskStatus.status as any,
          prompt: taskStatus.params.prompt,
          estimated_time_seconds: 30
        };
      }

      return new Response(JSON.stringify(createSuccessResponse(response)), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // 生成图片并等待完成API
    if (path === '/api/generate-sync' && request.method === 'POST') {
      const requestData = await request.json();
      
      // 验证请求
      const validationErrors = validateRequest(requestData);
      if (validationErrors.length > 0) {
        return createErrorResponse('VALIDATION_ERROR', 'Invalid request data', validationErrors);
      }

      const generateRequest: GenerateImagesRequest = {
        prompt: requestData.prompt,
        width: requestData.width || 512,
        height: requestData.height || 512,
        batch_size: requestData.batch_size || 1,
        negative_prompt: requestData.negative_prompt
      };

      console.log(`🎨 Starting sync image generation: ${generateRequest.prompt.substring(0, 50)}...`);

      // 创建任务并等待完成
      const taskId = await freeaiClient.createImageTask({
        prompt: generateRequest.prompt,
        width: generateRequest.width,
        height: generateRequest.height,
        batch_size: generateRequest.batch_size,
        negative_prompt: generateRequest.negative_prompt
      });

      const result = await freeaiClient.waitForCompletion(taskId);
      
      const response: GenerateImagesResponse = {
        task_id: result.task_id,
        status: 'completed',
        prompt: result.prompt,
        images: result.images
      };

      console.log(`✅ Image generation completed: ${result.images.length} images generated`);

      return new Response(JSON.stringify(createSuccessResponse(response)), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // 404 - 路由未找到
    return new Response(JSON.stringify(createErrorResponse('NOT_FOUND', 'API endpoint not found')), {
      status: 404,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ API Error:', error);
    
    return createErrorResponse('INTERNAL_ERROR', error.message, {
      stack: error.stack
    });
  }
};

// 启动服务器
if (import.meta.main) {
  console.log('🚀 Starting freeai2api server...');
  
  try {
    CONFIG.validateConfig();
    
    console.log('✅ Configuration loaded');
    console.log(`🎯 Server will listen on ${CONFIG.server.hostname}:${CONFIG.server.port}`);
    console.log('📡 Available endpoints:');
    console.log('   GET  /health - Health check');
    console.log('   POST /api/generate - Create generation task (async)');
    console.log('   GET  /api/task/:id - Get task status');
    console.log('   POST /api/generate-sync - Generate and wait (sync)');
    
    await serve(handler, {
      port: CONFIG.server.port,
      hostname: CONFIG.server.hostname
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    Deno.exit(1);
  }
}

export default handler;