#!/usr/bin/env deno run --allow-net
/**
 * FreeAI2API 极简版本 - 专门为 Deno Deploy 设计
 * 修复了根路径问题 - 支持 / 路径返回服务信息
 */

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";

// FreeAI客户端 - 简化版本
class SimpleFreeAIClient {
  private baseUrl: string = 'https://freeaiimage.net';
  private timeout: number = 30000;
  private pollInterval: number = 2000;

  /**
   * 创建图片生成任务
   */
  async createImageTask(request: any): Promise<string> {
    const { prompt, width = 512, height = 512, batch_size = 1, negative_prompt } = request;

    const payload = {
      prompt: prompt.trim(),
      width,
      height,
      batch_size,
      negative_prompt: negative_prompt || '模糊，变形，畸形'
    };

    const response = await this.makeRequest('/api/services/create-qwen-image', 'POST', payload);

    if (!response.success || !response.task_id) {
      throw new Error(`Failed to create task: ${JSON.stringify(response)}`);
    }

    return response.task_id;
  }

  /**
   * 轮询任务状态直到完成
   */
  async waitForCompletion(taskId: string): Promise<any> {
    const startTime = Date.now();
    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < 300) {
      try {
        attempts++;

        const taskResponse = await this.getTaskStatus(taskId);

        if (taskResponse.status === 'completed' && taskResponse.data) {
          const responseTime = Date.now() - startTime;

          return {
            task_id: taskResponse.task_id,
            prompt: taskResponse.params.prompt,
            status: taskResponse.status,
            images: taskResponse.data,
            response_time_ms: responseTime
          };
        }

        if (taskResponse.status === 'failed') {
          throw new Error(`Task failed with status: failed`);
        }

        // 等待轮询间隔
        await this.sleep(this.pollInterval);

      } catch (error) {
        lastError = error as Error;

        // 短暂延迟后重试
        await this.sleep(this.pollInterval);
      }
    }

    throw new Error(`Task polling timeout after ${attempts} attempts. Last error: ${lastError?.message}`);
  }

  /**
   * 获取任务状态
   */
  async getTaskStatus(taskId: string): Promise<any> {
    const url = `/api/services/aigc/task?taskId=${taskId}&taskType=qwen_image`;
    const response = await this.makeRequest(url, 'GET');

    return response;
  }

  /**
   * 发送HTTP请求
   */
  private async makeRequest(path: string, method: string, data?: any): Promise<any> {
    const url = this.baseUrl + path;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const requestOptions: RequestInit = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'freeai2api-deno-deploy/1.0',
          'Accept': 'application/json',
        },
        signal: controller.signal
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        requestOptions.body = JSON.stringify(data);
      }

      const response = await fetch(url, requestOptions);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return result;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * 等待指定时间
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// 创建OpenAI风格错误响应
function createErrorResponse(error: string, code: string = "invalid_request_error") {
  return {
    error: {
      message: error,
      type: code,
      code: code
    }
  };
}

// 处理CORS预检请求
function handleCORS(request: Request): Response | null {
  if (request.method === 'OPTIONS') {
    const headers = new Headers();
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');

    return new Response(null, { status: 204, headers });
  }
  return null;
}

/**
 * 主要API处理器
 */
async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const path = url.pathname;

  // 设置CORS头
  const headers = new Headers({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With'
  });

  try {
    // 根路径 - 返回服务信息
    if (path === '/') {
      return new Response(JSON.stringify({
        name: "FreeAI2API",
        version: "1.0.0",
        description: "FreeAI Image API Service for Deno Deploy",
        endpoints: {
          root: "/ - Service information",
          health: "/health - Health check",
          generate: "/generate (POST) - Direct image generation",
          openai: "/v1/images/generations (POST) - OpenAI compatible"
        },
        status: "running",
        timestamp: new Date().toISOString(),
        deploy_type: "deno_deploy"
      }), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // 健康检查
    if (path === '/health' || path === '/v1/health') {
      return new Response(JSON.stringify({
        status: "healthy",
        service: "freeai2api-deno-deploy-simple",
        version: "1.0.0",
        timestamp: new Date().toISOString(),
        deploy_type: "deno_deploy"
      }), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // 简化的直接生成接口
    if (path === '/generate' && request.method === 'POST') {
      const requestData = await request.json();
      const { prompt, size = "512x512", n = 1 } = requestData;

      if (!prompt) {
        return new Response(JSON.stringify(createErrorResponse("Missing prompt parameter")), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }

      // 解析参数
      const [width, height] = size.split('x').map(Number);

      console.log(`🎨 开始生成图片: ${prompt?.substring(0, 50)}...`);

      const client = new SimpleFreeAIClient();
      const taskId = await client.createImageTask({
        prompt: prompt,
        width: width || 512,
        height: height || 512,
        batch_size: Math.min(n, 4),
        negative_prompt: "blurry, distorted, low quality"
      });

      const result = await client.waitForCompletion(taskId);

      return new Response(JSON.stringify({
        success: true,
        data: {
          images: result.images,
          prompt: result.prompt,
          task_id: taskId
        }
      }), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // OpenAI兼容的图片生成接口
    if ((path === '/v1/images/generations' || path === '/images/generations') && request.method === 'POST') {
      const openaiRequest = await request.json();
      const { prompt, n = 1, size = "512x512" } = openaiRequest;

      if (!prompt) {
        return new Response(JSON.stringify(createErrorResponse("Missing required parameter: prompt")), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }

      console.log(`🎨 OpenAI兼容生成: ${prompt?.substring(0, 50)}...`);

      // 解析size参数
      const [width, height] = size.split('x').map(Number);

      const client = new SimpleFreeAIClient();
      const taskId = await client.createImageTask({
        prompt: prompt,
        width: width || 512,
        height: height || 512,
        batch_size: Math.min(n, 4),
        negative_prompt: "blurry, distorted, low quality, bad anatomy"
      });

      const result = await client.waitForCompletion(taskId);

      // 创建OpenAI格式响应
      const openaiResponse = {
        id: `img_${Date.now()}`,
        object: "list",
        data: result.images.map((url: string, index: number) => ({
          id: `${prompt.replace(/\s+/g, '_')}_${index}`,
          object: "image",
          created: Math.floor(Date.now() / 1000),
          data: {
            url: url,
            revised_prompt: result.prompt
          }
        }))
      };

      return new Response(JSON.stringify(openaiResponse), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // 404 - 未支持的路径
    return new Response(JSON.stringify(createErrorResponse(`Unsupported path: ${path}`)), {
      status: 404,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ API错误:', error);

    return new Response(JSON.stringify(createErrorResponse(error.message, "internal_error")), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }
}

// 主处理器
const handler = async (request: Request): Promise<Response> => {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;

  return handleRequest(request);
};

// 启动函数
async function startServer() {
  console.log('🚀 FreeAI2API Deno Deploy 极简版启动中...');
  console.log('='.repeat(50));
  console.log('📍 服务器地址: 0.0.0.0:8080');
  console.log('🎯 目标API: https://freeaiimage.net');
  console.log('🔗 支持的端点:');
  console.log('   GET  / - 服务信息 (新增)');
  console.log('   GET  /health - 健康检查');
  console.log('   POST /generate - 直接生成图片 (推荐)');
  console.log('   POST /v1/images/generations - OpenAI图片生成');
  console.log('='.repeat(50));

  // Deno Deploy环境启动
  await serve(handler, {
    port: 8080,
    hostname: "0.0.0.0"
  });
}

// 主入口点
if (import.meta.main) {
  startServer().catch(error => {
    console.error('❌ 服务器启动失败:', error.message);
    throw error;
  });
}

export default handler;