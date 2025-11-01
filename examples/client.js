#!/usr/bin/env node
/**
 * FreeAI2API 客户端示例
 * 
 * 使用方法:
 *   node examples/client.js
 */

const BASE_URL = 'http://localhost:8000';

/**
 * FreeAI2API 客户端
 */
class FreeAI2APIClient {
  constructor(baseUrl = BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * 健康检查
   */
  async health() {
    const response = await fetch(`${this.baseUrl}/health`);
    return response.json();
  }

  /**
   * 异步生成图片
   */
  async generateImage(prompt, options = {}) {
    const payload = {
      prompt,
      width: options.width || 512,
      height: options.height || 512,
      batch_size: options.batchSize || 1,
      negative_prompt: options.negativePrompt || '模糊，变形，畸形'
    };

    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    return response.json();
  }

  /**
   * 查询任务状态
   */
  async getTaskStatus(taskId) {
    const response = await fetch(`${this.baseUrl}/api/task/${taskId}`);
    return response.json();
  }

  /**
   * 同步生成图片
   */
  async generateImageSync(prompt, options = {}) {
    const payload = {
      prompt,
      width: options.width || 512,
      height: options.height || 512,
      batch_size: options.batchSize || 1,
      negative_prompt: options.negativePrompt || '模糊，变形，畸形'
    };

    const response = await fetch(`${this.baseUrl}/api/generate-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    return response.json();
  }

  /**
   * 等待任务完成
   */
  async waitForCompletion(taskId, maxAttempts = 300) {
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      const status = await this.getTaskStatus(taskId);
      
      if (status.success && status.data.status === 'completed') {
        return status.data;
      }
      
      if (status.success && status.data.status === 'failed') {
        throw new Error('Task failed');
      }
      
      // 等待 2 秒后重试
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }
    
    throw new Error('Task timeout');
  }
}

/**
 * 示例函数
 */
async function runExamples() {
  console.log('🚀 FreeAI2API 客户端示例');
  console.log('='.repeat(50));
  
  const client = new FreeAI2APIClient();
  
  try {
    // 1. 健康检查
    console.log('\n1. 检查服务器状态...');
    const health = await client.health();
    console.log('✅ 服务器状态:', health.data.status);
    
    // 2. 异步生成示例
    console.log('\n2. 异步生成图片示例...');
    const asyncResult = await client.generateImage(
      'A beautiful landscape with mountains and lakes',
      { width: 512, height: 512, batchSize: 2 }
    );
    console.log('✅ 任务创建成功:');
    console.log('   任务ID:', asyncResult.data.task_id);
    console.log('   状态:', asyncResult.data.status);
    
    // 3. 等待任务完成
    console.log('\n3. 等待任务完成...');
    const completedTask = await client.waitForCompletion(asyncResult.data.task_id);
    console.log('✅ 任务完成:');
    console.log('   图片数量:', completedTask.images.length);
    console.log('   图片链接:', completedTask.images.slice(0, 2));
    
    // 4. 同步生成示例
    console.log('\n4. 同步生成图片示例...');
    const syncResult = await client.generateImageSync(
      'A futuristic city with flying cars',
      { width: 768, height: 768, batchSize: 1 }
    );
    console.log('✅ 同步生成完成:');
    console.log('   图片数量:', syncResult.data.images.length);
    console.log('   图片链接:', syncResult.data.images[0]);
    
    console.log('\n🎉 所有示例运行完成！');
    
  } catch (error) {
    console.error('❌ 示例运行失败:', error.message);
  }
}

/**
 * 交互式测试
 */
async function interactiveTest() {
  console.log('\n🎆 交互式测试模式');
  console.log('输入提示词生成图片，输入 "quit" 退出');
  
  const client = new FreeAI2APIClient();
  const readline = require('readline');
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  async function askForPrompt() {
    rl.question('请输入提示词: ', async (prompt) => {
      if (prompt.toLowerCase() === 'quit') {
        rl.close();
        return;
      }
      
      try {
        console.log('🚀 开始生成...');
        const result = await client.generateImageSync(prompt);
        
        if (result.success && result.data.images.length > 0) {
          console.log('✅ 生成成功！');
          console.log('   提示词:', result.data.prompt);
          console.log('   图片链接:');
          result.data.images.forEach((url, index) => {
            console.log(`   ${index + 1}. ${url}`);
          });
        } else {
          console.log('⚠️ 生成失败或未返回图片');
        }
      } catch (error) {
        console.error('❌ 生成失败:', error.message);
      }
      
      askForPrompt();
    });
  }
  
  askForPrompt();
}

// 主程序
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--interactive') || args.includes('-i')) {
    await interactiveTest();
  } else {
    await runExamples();
  }
}

// 运行示例
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { FreeAI2APIClient };