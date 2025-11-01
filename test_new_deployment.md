# 🧪 测试新部署

## 📋 部署后测试步骤

### 1. 确认部署成功
访问您的部署URL，应该看到类似：
```
https://your-project-name.deno.dev
```

### 2. 健康检查测试
```bash
curl https://your-project-name.deno.dev/health
```

**期望响应**：
```json
{
  "status": "healthy",
  "service": "freeai2api-deno-deploy",
  "version": "1.0.0-fixed",
  "timestamp": "2025-11-01T06:25:00.000Z",
  "deploy_type": "deno_deploy"
}
```

### 3. 图片生成测试
```bash
curl -X POST https://your-project-name.deno.dev/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "一只可爱的小猫", "size": "512x512", "n": 1}'
```

**期望响应**：
```json
{
  "success": true,
  "data": {
    "images": [
      "https://cdnfy.foxai.me/xxx_0.png"
    ],
    "prompt": "一只可爱的小猫",
    "task_id": "019a3dde-xxx"
  }
}
```

## 🔧 如果测试失败

### 问题1：部署失败
**解决**：
- 确保主入口文件是 `deno_deploy_fixed.ts`
- 检查是否还有Deno.exit()调用
- 查看部署日志

### 问题2：健康检查失败
**解决**：
- 等待30秒让部署完成
- 检查部署状态是否为 "Active"
- 确认URL正确

### 问题3：图片生成失败
**解决**：
- 检查网络连接
- 确认 freeaiimage.net 可访问
- 查看部署日志中的错误信息

## ✅ 成功后配置LLM软件

### Lobe Chat配置
```
基础URL: https://your-project-name.deno.dev
API Key: 任意值（如：test-key）
模型: freeai-image
```

### ChatGPT-Next-Web配置
```
API URL: https://your-project-name.deno.dev
API Key: 任意值
模型: gpt-image
```

## 🎯 支持的API端点

- `GET /health` - 健康检查
- `POST /generate` - 直接生成图片（推荐）
- `POST /v1/images/generations` - OpenAI兼容接口
- `POST /chat/completions` - 对话模式兼容

现在您的API应该可以正常工作了！