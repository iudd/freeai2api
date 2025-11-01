# 🔗 LLM软件集成指南

FreeAI2API现在完全兼容主流LLM软件！您可以直接配置使用，无需任何修改。

## 🚀 启动OpenAI兼容模式

```bash
# 启动OpenAI兼容服务器
deno run --allow-net --allow-env openai_adapter.ts

# 或者指定端口
PORT=8080 deno run --allow-net --allow-env openai_adapter.ts
```

## 📱 支持的LLM软件

### 1. 🗣️ Lobe Chat
**配置步骤：**
1. 打开Lobe Chat设置
2. 进入"语言模型"标签
3. 点击"添加自定义供应商"
4. 配置参数：
   ```
   基础URL: http://localhost:8000
   API Key: any-key (随意填写)
   模型: freeai-image
   ```

### 2. 💬 ChatGPT-Next-Web
**配置步骤：**
1. 打开设置
2. 选择"自定义API"
3. 配置参数：
   ```
   API URL: http://localhost:8000
   API Key: any-key (随意填写)
   模型: gpt-image
   ```

### 3. 🔧 Dify
**配置步骤：**
1. 进入设置 → 模型提供商
2. 点击"自定义模型"
3. 配置参数：
   ```
   模型名称: freeai-image
   基础URL: http://localhost:8000
   API Key: any-key
   ```

### 4. ⚡ FastGPT
**配置步骤：**
1. 进入系统设置
2. 选择"模型配置"
3. 添加新模型：
   ```
   模型名: freeai-image
   API地址: http://localhost:8000
   密钥: any-key
   ```

### 5. 🤖 AnyLLM
**配置步骤：**
1. 进入"模型设置"
2. 选择"自定义API"
3. 配置参数：
   ```
   Endpoint: http://localhost:8000
   API Key: any-key
   Model: freeai-image
   ```

## 🎯 使用方法

### 方法1：直接对话（推荐）
在支持的软件中直接输入：
```
请帮我生成一张图片：一只可爱的小猫在花园里玩耍，阳光明媚
```

软件会自动：
1. 理解您的请求
2. 调用API生成图片
3. 在对话中展示结果

### 方法2：使用工具
在支持工具调用的软件中：
```
/generate prompt="美丽的日落海岸线，水彩风格"
```

## 📋 API接口详情

### 1. 直接生成图片（推荐）
```
POST /generate
```
```json
{
  "prompt": "一只可爱的小猫",
  "size": "512x512",
  "n": 1
}
```

### 2. OpenAI兼容接口
```
POST /v1/images/generations
```
```json
{
  "model": "dall-e-3",
  "prompt": "一只可爱的小猫",
  "n": 1,
  "size": "512x512"
}
```

### 3. Lobe Chat兼容接口
```
POST /chat/completions
```
```json
{
  "model": "gpt-image",
  "messages": [
    {"role": "user", "content": "帮我生成一张图片"}
  ]
}
```

## 🔧 配置示例

### Docker Compose完整配置
```yaml
version: '3.8'

services:
  freeai2api:
    build: .
    ports:
      - "8000:8000"
    environment:
      - PORT=8000
      - HOST=0.0.0.0
    volumes:
      - ./logs:/app/logs
    
  # Lobe Chat (可选)
  lobe-chat:
    image: lobehub/lobe-chat:latest
    ports:
      - "3210:3210"
    environment:
      - NEXT_TELEMETRY_DISABLED=1
      - OPENAI_API_KEY=your-freeai-key
      - OPENAI_API_BASE=http://freeai2api:8000
    depends_on:
      - freeai2api
```

### Nginx代理配置
```nginx
upstream freeai2api {
    server freeai2api:8000;
}

server {
    listen 80;
    server_name your-domain.com;

    location /api/ {
        proxy_pass http://freeai2api;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 💡 使用技巧

### 1. 提示词优化
```
✅ 好的提示词：
"一只可爱的小猫在花园里玩耍，阳光明媚，水彩风格"

❌ 差的提示词：
"生成图片"
```

### 2. 参数配置
```
size参数：512x512, 768x768, 1024x1024
n参数：1-4张图片
style参数：水彩, 写实, 卡通等
```

### 3. 批量生成
```json
{
  "prompt": "美丽的日落海岸线",
  "n": 4  // 生成4张图片
}
```

## 🔍 测试配置

### cURL测试
```bash
# 测试直接生成
curl -X POST http://localhost:8000/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "一只可爱的小猫", "size": "512x512", "n": 1}'

# 测试OpenAI兼容接口
curl -X POST http://localhost:8000/v1/images/generations \
  -H "Content-Type: application/json" \
  -d '{"prompt": "一只可爱的小猫", "model": "dall-e-3"}'

# 测试健康检查
curl http://localhost:8000/health
```

## 🛠️ 故障排除

### 常见问题

**1. 连接失败**
```
检查：服务器是否启动
命令：curl http://localhost:8000/health
解决：确保端口未被占用
```

**2. API返回错误**
```
检查：请求格式是否正确
解决：参考API文档
```

**3. 图片无法生成**
```
检查：freeaiimage.net是否可访问
解决：网络连接问题
```

**4. LLM软件无法识别**
```
检查：Base URL配置是否正确
解决：确保使用 http://localhost:8000
```

### 调试模式
```bash
# 启动调试模式
DEBUG=true deno run --allow-net --allow-env openai_adapter.ts
```

## 🌟 进阶功能

### 1. WebSocket支持
```javascript
// 实时状态监控
const ws = new WebSocket('ws://localhost:8000/ws/generate');
ws.onmessage = (event) => {
  const status = JSON.parse(event.data);
  console.log('生成状态:', status);
};
```

### 2. 批量处理
```javascript
// 批量生成多张图片
const prompts = [
  "一只小猫",
  "一只小狗", 
  "一只小鸟"
];

for (const prompt of prompts) {
  const response = await fetch('/generate', {
    method: 'POST',
    body: JSON.stringify({ prompt })
  });
  // 处理响应
}
```

### 3. 错误重试
```javascript
async function generateWithRetry(prompt, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('/generate', {
        method: 'POST',
        body: JSON.stringify({ prompt })
      });
      return await response.json();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

## 📞 支持

如果在配置过程中遇到问题：

1. **检查网络连接**：确保freeaiimage.net可访问
2. **查看日志**：启动时开启DEBUG模式查看详细日志
3. **验证API**：使用cURL先测试基本功能
4. **软件文档**：参考各LLM软件的官方配置文档

---

🎉 **现在您可以在任何支持的LLM软件中直接使用AI图片生成功能了！**