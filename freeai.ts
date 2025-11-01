import { CONFIG } from './config.ts';
import {
  FreeAIResponse,
  FreeAICreateResponse,
  CreateImageRequest,
  ImageGenerationResult
} from './types.ts';

/**
 * FreeAIimage.net API 客户端
 */
export class FreeAIClient {
  private baseUrl: string;
  private timeout: number;
  private pollInterval: number;
  private maxAttempts: number;

  constructor() {
    this.baseUrl = CONFIG.freeai.baseUrl;
    this.timeout = CONFIG.freeai.timeoutMs;
    this.pollInterval = CONFIG.freeai.pollIntervalMs;
    this.maxAttempts = CONFIG.freeai.maxPollingAttempts;
  }

  /**
   * 创建图片生成任务
   */
  async createImageTask(request: CreateImageRequest): Promise<string> {
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
  async waitForCompletion(taskId: string): Promise<ImageGenerationResult> {
    const startTime = Date.now();
    let attempts = 0;
    let lastError: Error | null = null;

    while (attempts < this.maxAttempts) {
      try {
        attempts++;
        
        if (CONFIG.debug.enabled) {
          console.log(`🔍 Polling attempt ${attempts} for task ${taskId}`);
        }

        const taskResponse = await this.getTaskStatus(taskId);
        
        if (taskResponse.status === 'completed' && taskResponse.data) {
          const responseTime = Date.now() - startTime;
          
          return {
            task_id: taskResponse.task_id,
            prompt: taskResponse.params.prompt,
            status: taskResponse.status,
            images: taskResponse.data,
            parameters: {
              width: taskResponse.params.width,
              height: taskResponse.params.height,
              batch_size: taskResponse.params.batch_size,
              negative_prompt: taskResponse.params.negative_prompt
            },
            created_at: taskResponse.created_at,
            completed_at: new Date().toISOString(),
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
        
        if (CONFIG.debug.enabled) {
          console.log(`⚠️ Polling error: ${error.message}`);
        }

        // 短暂延迟后重试
        await this.sleep(this.pollInterval);
      }
    }

    throw new Error(`Task polling timeout after ${this.maxAttempts} attempts. Last error: ${lastError?.message}`);
  }

  /**
   * 获取任务状态
   */
  async getTaskStatus(taskId: string): Promise<FreeAIResponse> {
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
          'User-Agent': 'freeai2api/1.0',
          'Accept': 'application/json',
        },
        signal: controller.signal
      };

      if (data && (method === 'POST' || method === 'PUT')) {
        requestOptions.body = JSON.stringify(data);
      }

      if (CONFIG.debug.logRequests) {
        console.log(`📤 ${method} ${url}`);
        if (data) console.log('📤 Payload:', data);
      }

      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (CONFIG.debug.logResponses) {
        console.log('📥 Response:', result);
      }

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