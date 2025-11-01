# 🌐 Deno Deploy 配置指南

您的 FreeAI2API 已成功部署到 Deno Deploy！

## 📋 您的部署信息

**部署地址**: `https://iudd-freeai2api-37.deno.dev/`

**支持的接口模式**:
- ✅ 标准API模式
- ✅ OpenAI兼容模式  
- ✅ 简化生成模式

## 🎯 各软件配置

### 1. 🗣️ Lobe Chat
```
基础URL: https://iudd-freeai2api-37.deno.dev
API Key: any-key (随意填写任意值)
模型: freeai-image
```

**详细配置步骤**:
1. 打开 Lobe Chat 设置
2. 进入"语言模型"标签
3. 点击"添加自定义供应商"
4. 填写以上信息
5. 保存并测试

### 2. 💬 ChatGPT-Next-Web  
```
API URL: https://iudd-freeai2api-37.deno.dev
API Key: your-key (随意填写)
模型: gpt-image
```

### 3. 🔧 Dify
```
模型名称: freeai-image
基础URL: https://iudd-freeai2api-37.deno.dev  
API Key: any-key
```

### 4. ⚡ FastGPT
```
模型名: freeai-image
API地址: https://iudd-freeai2api-37.deno.dev
密钥: any-key
```

### 5. 🤖 AnyLLM
```
Endpoint: https://iudd-freeai2api-37.deno.dev
API Key: any-key
Model: freeai-image
```

### 6. 🛠️ 其他 OpenAI 兼容软件
```
Base URL: https://iudd-freeai2api-37.deno.dev
API Key: any-key (随意填写)
```

## 💬 使用方法

### 直接对话生成
在支持的软件中直接输入：
```
帮我生成一张图片：一只可爱的小猫在花园里玩耍，阳光明媚
```

### 使用工具调用
```
/generate prompt="美丽的日落海岸线，水彩风格"
```

## 📡 API 接口详解

### 1. 简化生成接口 (推荐)
```
POST https://iudd-freeai2api-37.deno.dev/generate
```

**请求示例**:
```json
{
  "prompt": "一只可爱的小猫",
  "size": "512x512",
  "n": 1
}
```

### 2. OpenAI兼容接口
```
POST https://iudd-freeai2api-37.deno.dev/v1/images/generations
```

**请求示例**:
```json
{
  "model": "dall-e-3",
  "prompt": "一只可爱的小猫",
  "n": 1,
  "size": "512x512"
}
```

### 3. 健康检查
```
GET https://iudd-freeai2api-37.deno.dev/health
```

## 🧪 测试您的部署

### cURL 测试
```bash
# 测试健康检查
curl https://iudd-freeai2api-37.deno.dev/health

# 测试图片生成
curl -X POST https://iudd-freeai2api-37.deno.dev/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "一只可爱的小猫在花园里玩耍",
    "size": "512x512",
    "n": 1
  }'
```

### JavaScript 测试
```javascript
// 测试配置
async function testDeployment() {
  try {
    // 1. 测试健康检查
    const health = await fetch('https://iudd-freeai2api-37.deno.dev/health');
    console.log('✅ 部署状态:', await health.json());
    
    // 2. 测试图片生成
    const response = await fetch('https://iudd-freeai2api-37.deno.dev/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: "一只可爱的小猫",
        size: "512x512",
        n: 1
      })
    });
    
    const result = await response.json();
    if (result.success) {
      console.log('✅ 生成成功!');
      console.log('图片链接:', result.data.images);
    } else {
      console.log('❌ 生成失败:', result.error);
    }
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

testDeployment();
```

## 🔧 常见配置问题

### 问题1: API Key 填写什么？
**答**: 大多数软件支持任意值，填写 `any-key`、123、test 等即可

### 问题2: 基础URL 最后要加斜杠吗？
**答**: 都可以，推荐加上：
- ✅ `https://iudd-freeai2api-37.deno.dev/`
- ✅ `https://iudd-freeai2api-37.deno.dev`

### 问题3: 模型名称填写什么？
**答**: 填写任意名称都可以，推荐：
- `freeai-image`
- `gpt-image`
- `dall-e-3`
- `gpt-4`

### 问题4: 软件找不到图片生成功能？
**答**: 大多数LLM软件默认只支持文本，需要手动启用图片生成功能：
1. 在设置中寻找"图片生成"或"图像生成"选项
2. 启用该功能
3. 重新配置API信息

## 🌟 高级使用

### 批量生成
```json
{
  "prompt": "美丽的日落海岸线",
  "size": "512x512",
  "n": 4  // 生成4张图片
}
```

### 指定尺寸
```json
{
  "prompt": "美丽的风景",
  "size": "1024x1024",  // 更大尺寸
  "n": 2
}
```

### 自定义负面提示词
```json
{
  "prompt": "一只可爱的小猫",
  "negative_prompt": "模糊, 变形, 畸形, 恐怖",
  "size": "512x512"
}
```

## 🚨 注意事项

1. **图片链接时效**: 生成的图片链接可能有时效性，建议及时下载
2. **网络延迟**: Deno Deploy 服务器响应可能比本地部署慢
3. **并发限制**: 可能有并发调用限制，请避免过于频繁的请求
4. **免费额度**: Deno Deploy 有免费使用额度，注意使用量

## 📞 如果遇到问题

1. **无法访问**: 检查 Deno Deploy 状态和您的部署URL
2. **生成失败**: 查看浏览器控制台是否有网络错误
3. **软件不识别**: 确认使用的是 OpenAI 兼容模式
4. **图片无法显示**: 图片链接可能过期，尝试重新生成

## 🎉 成功示例

配置成功后，您应该能够在LLM软件中：
- 直接对话生成图片
- 看到图片链接返回
- 批量生成多张图片
- 自定义生成参数

---

**您的部署地址**: `https://iudd-freeai2api-37.deno.dev/`

🎯 **立即配置您的LLM软件开始使用吧！**