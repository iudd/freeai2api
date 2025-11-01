#!/usr/bin/env deno run --allow-net --allow-env
/**
 * OpenAI兼容适配器 - 让FreeAI2API兼容主流LLM软件
 * 
 * 支持以下软件：
 * - Lobe Chat
 * - ChatGPT-Next-Web  
 * - Dify
 * - FastGPT
 * - AnyLLM
 * - OpenAI接口的任何软件
 * 
 * 使用方法：
 *   deno run --allow-net --allow-env openai_adapter.ts
 */

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { CONFIG } from './config.ts';
import { FreeAIClient } from './freeai.ts';

// OpenAI兼容的接口
const OPENAI_COMPATIBLE_PATHS = [
  '/v1/chat/completions',
  '/v1/images/generations', 
  '/v1/completions',
  '/v1/embeddings',
  '/chat/completions',
  '/images/generations',
  '/generate' // 简化路径
];

// 转换OpenAI请求到FreeAI请求
function convertOpenAIRequest(openaiRequest: any) {
  const { prompt, n = 1, size = "512x512", style, quality } = openaiRequest;
  
  // 解析size参数
  const [width, height] = size.split('x').map(Number);
  
  return {
    prompt: prompt,
    width: width || 512,
    height: height || 512,
    batch_size: Math.min(n, 4), // 限制最多4张
    negative_prompt: "blurry, distorted, low quality, bad anatomy"
  };
}

// 创建OpenAI兼容响应
function createOpenAICompatibleResponse(result: any, originalRequest: any) {
  const images = result.images || [];
  
  return {
    id: `img_${Date.now()}`,
    object: "list",
    data: images.map((url: string, index: number) => ({
      id: `${originalRequest.id || 'img'}_${index}`,
      object: "image",
      created: Math.floor(Date.now() / 1000),
      data: {
        url: url,
        revised_prompt: result.prompt
      }
    }))
  };
}

// 创建OpenAI风格错误响应
function createOpenAIErrorResponse(error: string, code: string = "invalid_request_error") {
  return {
    error: {
      message: error,
      type: code,
      code: code
    }
  };
}

/**
 * OpenAI兼容的API处理器
 */
async function handleOpenAIRequest(request: Request): Promise<Response> {
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
    if (path === '/health' || path === '/v1/health') {
      return new Response(JSON.stringify({
        status: "healthy",
        service: "freeai2api-openai-compatible",
        version: "1.0.0",
        timestamp: new Date().toISOString()
      }), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // 简化的直接生成接口 (最常用)
    if (path === '/generate' && request.method === 'POST') {
      const requestData = await request.json();
      const { prompt, size = "512x512", n = 1 } = requestData;
      
      // 解析参数
      const [width, height] = size.split('x').map(Number);
      
      console.log(`🎨 开始生成图片: ${prompt?.substring(0, 50)}...`);
      
      const client = new FreeAIClient();
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
      const { prompt, n = 1, size = "512x512", style, quality } = openaiRequest;
      
      if (!prompt) {
        return new Response(JSON.stringify(createOpenAIErrorResponse("Missing required parameter: prompt")), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
      
      console.log(`🎨 OpenAI兼容生成: ${prompt?.substring(0, 50)}...`);
      
      const convertedRequest = convertOpenAIRequest(openaiRequest);
      const client = new FreeAIClient();
      const taskId = await client.createImageTask(convertedRequest);
      const result = await client.waitForCompletion(taskId);
      
      const openaiResponse = createOpenAICompatibleResponse(result, openaiRequest);
      
      return new Response(JSON.stringify(openaiResponse), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // Lobe Chat等工具的简化接口
    if (path === '/chat/completions' && request.method === 'POST') {
      const chatRequest = await request.json();
      const { messages, model, n = 1 } = chatRequest;
      
      // 从对话中提取最后一个用户消息作为图片描述
      const userMessage = messages?.filter((m: any) => m.role === 'user').pop();
      const prompt = userMessage?.content || '';
      
      if (!prompt) {
        return new Response(JSON.stringify(createOpenAIErrorResponse("No user message found")), {
          status: 400,
          headers: { ...headers, 'Content-Type': 'application/json' }
        });
      }
      
      console.log(`💬 对话生成: ${prompt?.substring(0, 50)}...`);
      
      const client = new FreeAIClient();
      const taskId = await client.createImageTask({
        prompt: prompt,
        width: 512,
        height: 512,
        batch_size: Math.min(n, 4)
      });
      const result = await client.waitForCompletion(taskId);
      
      return new Response(JSON.stringify({
        id: `chat_${Date.now()}`,
        object: "chat.completion",
        created: Math.floor(Date.now() / 1000),
        model: model || "freeai-image",
        choices: [{
          index: 0,
          message: {
            role: "assistant",
            content: "图片生成完成！以下是生成的图片链接：\n\n" + 
                    result.images.map((url: string, i: number) => `${i + 1}. ${url}`).join('\n')
          },
          finish_reason: "stop"
        }],
        usage: {
          prompt_tokens: prompt.length,
          completion_tokens: result.images.length,
          total_tokens: prompt.length + result.images.length
        }
      }), {
        headers: { ...headers, 'Content-Type': 'application/json' }
      });
    }

    // 404 - 未支持的路径
    return new Response(JSON.stringify(createOpenAIErrorResponse(`Unsupported path: ${path}`)), {
      status: 404,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('❌ OpenAI适配器错误:', error);
    
    return new Response(JSON.stringify(createOpenAIErrorResponse(error.message, "internal_error")), {
      status: 500,
      headers: { ...headers, 'Content-Type': 'application/json' }
    });
  }
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

// 主处理器
const handler = async (request: Request): Promise<Response> => {
  const corsResponse = handleCORS(request);
  if (corsResponse) return corsResponse;
  
  return handleOpenAIRequest(request);
};

// 启动服务器
if (import.meta.main) {
  console.log('🚀 FreeAI2API OpenAI兼容适配器启动中...');
  console.log('='.repeat(60));
  
  try {
    CONFIG.validateConfig();
    
    console.log('✅ 配置验证通过');
    console.log(`📍 服务器地址: ${CONFIG.server.hostname}:${CONFIG.server.port}`);
    console.log(`🎯 目标API: ${CONFIG.freeai.baseUrl}`);
    console.log('🔗 OpenAI兼容端点:');
    console.log('   GET  /health - 健康检查');
    console.log('   POST /generate - 直接生成图片 (推荐)');
    console.log('   POST /v1/images/generations - OpenAI图片生成');
    console.log('   POST /chat/completions - Lobe Chat兼容');
    console.log('='.repeat(60));
    
    await serve(handler, {
      port: CONFIG.server.port,
      hostname: CONFIG.server.hostname,
      onListen: ({ hostname, port }) => {
        console.log(`🎉 OpenAI兼容服务器已启动: http://${hostname}:${port}`);
        console.log('💡 支持Lobe Chat、ChatGPT-Next-Web等主流LLM软件');
      }
    });
    
  } catch (error) {
    console.error('❌ 启动失败:', error.message);
    Deno.exit(1);
  }
}

export default handler;