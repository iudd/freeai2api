# 🚀 Deno Deploy 部署指南

## 🎯 步骤一：选择部署文件

**请根据您的需求选择：**

### 选项A：OpenAI兼容模式（推荐给LLM软件）
```
文件：openai_adapter.ts
端口：8080（默认Deno Deploy端口）
支持：Lobe Chat、ChatGPT-Next-Web、Dify等
```

### 选项B：标准API模式（推荐给开发者）
```
文件：main.ts
端口：8080
支持：通用API调用
```

## 🎯 步骤二：部署到Deno Deploy

### 方法1：使用GitHub集成（推荐）
1. 访问 [deno.com/deploy](https://deno.com/deploy)
2. 点击 "Import Project"
3. 选择您的GitHub仓库：`iudd/freeai2api`
4. 配置部署：
   ```
   项目名：freeai2api
   主入口文件：`openai_adapter.ts` 或 `main.ts`
   端口：8080（默认）
   ```
5. 点击 "Deploy"

### 方法2：使用Deno Deploy CLI
```bash
# 安装Deno Deploy CLI
deno install -A -r https://deno.com/deploy

# 部署（选择其中一个）
deno deploy --project=freeai2api --entrypoint=openai_adapter.ts
# 或
deno deploy --project=freeai2api --entrypoint=main.ts
```

## 🎯 步骤三：获取部署URL

部署成功后，您会获得一个类似这样的URL：
```
https://your-project-name.deno.dev
```

## 🎯 步骤四：测试部署

### 1. 健康检查
```bash
curl https://your-project-name.deno.dev/health
```

### 2. 测试图片生成
```bash
curl -X POST https://your-project-name.deno.dev/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "一只小猫", "size": "512x512", "n": 1}'
```

## 🎯 步骤五：配置LLM软件

### 如果使用 `openai_adapter.ts`:
```
基础URL: https://your-project-name.deno.dev
API Key: 任意值（如：test-key）
模型: freeai-image
```

### 如果使用 `main.ts`:
```
基础URL: https://your-project-name.deno.dev
API Key: 任意值
模型: gpt-image
```

## 🔧 解决连接问题

如果遇到连接超时，检查：

### 1. 部署状态
- 确保部署在Deno Deploy控制台中显示为 "Active"
- 查看部署日志是否有错误

### 2. 端口配置
Deno Deploy自动分配端口，通常是：
- 主入口：8080（标准端口）
- OpenAI兼容：8080

### 3. 网络问题
```bash
# 测试连接
curl -I https://your-project-name.deno.dev/health
```

## ⚡ 快速测试代码

```javascript
// 复制这个代码测试您的部署
async function testDeployment() {
  const url = 'https://your-project-name.deno.dev/health';
  
  try {
    const response = await fetch(url);
    const result = await response.json();
    
    if (result.success) {
      console.log('✅ 部署成功！');
      console.log('部署信息：', result.data);
      
      // 测试图片生成
      const generateResponse = await fetch(url.replace('/health', '/generate'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: "一只可爱的小猫",
          size: "512x512",
          n: 1
        })
      });
      
      const generateResult = await generateResponse.json();
      console.log('✅ 生成测试：', generateResult.success ? '成功' : '失败');
      
    } else {
      console.log('❌ 部署失败：', result.error);
    }
  } catch (error) {
    console.log('❌ 连接错误：', error.message);
  }
}

testDeployment();
```

## 📋 部署检查清单

- [ ] 选择合适的部署文件（openai_adapter.ts或main.ts）
- [ ] 成功部署到Deno Deploy
- [ ] 健康检查返回正常
- [ ] 图片生成API测试通过
- [ ] LLM软件配置完成
- [ ] 生成测试图片成功

## 🎉 部署成功后

您的API地址格式：
```
https://your-project-name.deno.dev/
```

支持的端点：
- `/health` - 健康检查
- `/generate` - 直接生成图片（openai_adapter.ts）
- `/api/generate` - 异步生成（main.ts）
- `/v1/images/generations` - OpenAI兼容（openai_adapter.ts）

现在您可以在任何支持OpenAI API的软件中使用这个地址了！