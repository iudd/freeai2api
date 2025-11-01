# FreeAI2API 🚀

将 [freeaiimage.net](https://freeaiimage.net) 转换为标准API服务的 Deno 程序

## ✨ 特性

- 🌐 **轻量级**: 纯 Deno 实现，无外部依赖
- 🔄 **异步/同步**: 支持异步任务创建和同步等待模式
- 🚀 **易于部署**: 支持 Docker、docker-compose、本地运行
- 📊 **API 监控**: 完整的请求日志和错误处理
- 🌍 **CORS 支持**: 跨域访问友好
- ⚡ **高性能**: 基于 Deno 的现代运行时

## 🚀 快速开始

### 方式一：直接运行

```bash
# 克隆项目
git clone https://github.com/iudd/freeai2api.git
cd freeai2api

# 运行服务器
deno run --allow-net --allow-env main.ts

# 服务器将在 http://localhost:8000 启动
```

### 方式二：Docker 部署

```bash
# 使用 docker-compose
docker-compose up -d

# 或使用 Docker
docker build -t freeai2api .
docker run -p 8000:8000 freeai2api
```

## 📚 API 文档

### 基础 URL
```
http://localhost:8000
```

### 1. 健康检查

**GET** `/health`

返回服务器状态和版本信息。

**响应示例:**
```json
{
  "success": true,
  "data": {
    "status": "healthy",
    "service": "freeai2api",
    "version": "1.0.0",
    "timestamp": "2025-11-01T05:30:00.000Z"
  },
  "timestamp": "2025-11-01T05:30:00.000Z"
}
```

### 2. 异步生成图片

**POST** `/api/generate`

创建一个图片生成任务，立即返回任务 ID。

**请求体:**
```json
{
  "prompt": "A cute robot playing piano in space",
  "width": 512,
  "height": 512,
  "batch_size": 1,
  "negative_prompt": "blurry, distorted"
}
```

**响应示例:**
```json
{
  "success": true,
  "data": {
    "task_id": "019a3dde-9c5f-7000-9abf-21d1b347172f",
    "status": "processing",
    "prompt": "A cute robot playing piano in space",
    "estimated_time_seconds": 30
  },
  "timestamp": "2025-11-01T05:30:00.000Z"
}
```

### 3. 查询任务状态

**GET** `/api/task/{task_id}`

查询指定任务的状态和结果。

**响应示例 (进行中):**
```json
{
  "success": true,
  "data": {
    "task_id": "019a3dde-9c5f-7000-9abf-21d1b347172f",
    "status": "processing",
    "prompt": "A cute robot playing piano in space",
    "estimated_time_seconds": 30
  },
  "timestamp": "2025-11-01T05:30:00.000Z"
}
```

**响应示例 (已完成):**
```json
{
  "success": true,
  "data": {
    "task_id": "019a3dde-9c5f-7000-9abf-21d1b347172f",
    "status": "completed",
    "prompt": "A cute robot playing piano in space",
    "images": [
      "https://cdnfy.foxai.me/019a3dde-9c5f-7000-9abf-21d1b347172f_0.png",
      "https://cdnfy.foxai.me/019a3dde-9c5f-7000-9abf-21d1b347172f_1.png"
    ]
  },
  "timestamp": "2025-11-01T05:30:00.000Z"
}
```

### 4. 同步生成图片

**POST** `/api/generate-sync`

创建图片生成任务并等待完成，直到返回结果。

**请求体:** 与 `/api/generate` 相同

**响应示例:**
```json
{
  "success": true,
  "data": {
    "task_id": "019a3dde-9c5f-7000-9abf-21d1b347172f",
    "status": "completed",
    "prompt": "A cute robot playing piano in space",
    "images": [
      "https://cdnfy.foxai.me/019a3dde-9c5f-7000-9abf-21d1b347172f_0.png",
      "https://cdnfy.foxai.me/019a3dde-9c5f-7000-9abf-21d1b347172f_1.png"
    ]
  },
  "timestamp": "2025-11-01T05:30:00.000Z"
}
```

## 🔧 参数说明

| 参数 | 类型 | 必需 | 默认值 | 说明 |
|------|------|------|--------|------|
| `prompt` | string | ✅ | - | 图片描述提示词 |
| `width` | number | ❌ | 512 | 图片宽度 (256-1024) |
| `height` | number | ❌ | 512 | 图片高度 (256-1024) |
| `batch_size` | number | ❌ | 1 | 生成图片数量 (1-4) |
| `negative_prompt` | string | ❌ | "模糊，变形，畸形" | 负面提示词 |

## 🔍 使用示例

### cURL 示例

```bash
# 健康检查
curl -X GET http://localhost:8000/health

# 异步生成图片
curl -X POST http://localhost:8000/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A majestic dragon flying over snow-capped mountains",
    "width": 512,
    "height": 512,
    "batch_size": 2
  }'

# 查询任务状态
curl -X GET http://localhost:8000/api/task/019a3dde-9c5f-7000-9abf-21d1b347172f

# 同步生成图片
curl -X POST http://localhost:8000/api/generate-sync \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "A cyberpunk city at night with neon lights",
    "width": 768,
    "height": 1024
  }'
```

### JavaScript 示例

```javascript
// 异步生成
async function generateImage(prompt) {
  const response = await fetch('http://localhost:8000/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt })
  });
  
  const { data } = await response.json();
  return data.task_id;
}

// 查询状态
async function checkTaskStatus(taskId) {
  const response = await fetch(`http://localhost:8000/api/task/${taskId}`);
  const { data } = await response.json();
  return data;
}

// 同步生成
async function generateImageSync(prompt) {
  const response = await fetch('http://localhost:8000/api/generate-sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, width: 512, height: 512 })
  });
  
  const { data } = await response.json();
  return data.images;
}
```

### Python 示例

```python
import requests
import time

def generate_image_async(prompt):
    response = requests.post('http://localhost:8000/api/generate', json={
        'prompt': prompt,
        'width': 512,
        'height': 512
    })
    return response.json()['data']['task_id']

def check_task_status(task_id):
    response = requests.get(f'http://localhost:8000/api/task/{task_id}')
    return response.json()['data']

def generate_image_sync(prompt):
    response = requests.post('http://localhost:8000/api/generate-sync', json={
        'prompt': prompt,
        'width': 512,
        'height': 512
    })
    return response.json()['data']

# 使用示例
task_id = generate_image_async("A beautiful sunset over the ocean")
print(f"Task created: {task_id}")

# 等待完成
while True:
    status = check_task_status(task_id)
    if status['status'] == 'completed':
        print(f"Images generated: {len(status['images'])}")
        break
    time.sleep(2)
```

## 📊 配置选项

通过环境变量配置：

```bash
# 服务器配置
PORT=8000                    # 端口号
HOST=0.0.0.0                # 主机地址

# API 配置
FREEAI_BASE_URL=https://freeaiimage.net  # 目标API地址
ALLOWED_ORIGIN=*             # 允许的CORS源

# 调试选项
DEBUG=false                  # 启用调试模式
LOG_REQUESTS=false          # 记录请求日志
LOG_RESPONSES=false         # 记录响应日志
```

## 🚀 部署指南

### 本地开发
```bash
deno run --allow-net --allow-env main.ts
```

### Docker 部署
```bash
docker-compose up -d
```

### Deno Deploy
```bash
# 部署到 Deno Deploy
deno deploy deploy.ts
```

### 其他平台
- **Vercel**: 支持 Deno Function
- **Netlify**: 支持 Deno Function
- **Railway**: 原生支持 Deno
- **Fly.io**: 支持 Deno 部署

## 🛠️ 开发指南

### 项目结构
```
freeai2api/
├── types.ts           # 类型定义
├── config.ts          # 配置管理
├── freeai.ts          # FreeAI 客户端
├── api.ts             # API 路由处理
├── main.ts            # 主程序入口
├── deploy.ts          # Deno Deploy 配置
├── Dockerfile         # Docker 配置
├── docker-compose.yml # Docker Compose 配置
└── nginx.conf         # Nginx 配置
```

### 测试
```bash
# 测试 API
curl -X GET http://localhost:8000/health

# 测试生成
curl -X POST http://localhost:8000/api/generate-sync \
  -H "Content-Type: application/json" \
  -d '{"prompt": "A test image"}'
```

## ⚠️ 注意事项

1. **性能**: 同步模式会阻塞线程，等待图片生成完成
2. **超时**: 默认超时时间为 10 分钟
3. **并发**: 默认最多支持 10 个并发任务
4. **缓存**: 生成的图片 URL 可能有过期时间，请及时保存
5. **访问**: 请确保 freeaiimage.net 网站可以正常访问

## 🐛 问题排查

### 常见问题

1. **连接超时**
   ```
   Error: Task polling timeout
   ```
   - 检查 freeaiimage.net 是否可访问
   - 增加超时时间配置

2. **CORS 错误**
   ```
   CORS policy: No 'Access-Control-Allow-Origin'
   ```
   - 使用 CORS 代理或设置 ALLOWED_ORIGIN

3. **权限错误**
   ```
   PermissionDenied
   ```
   - 确保使用 `--allow-net` 和 `--allow-env` 参数

### 调试模式

```bash
DEBUG=true deno run --allow-net --allow-env main.ts
```

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

**由 Deno + love 制作 ❤️**