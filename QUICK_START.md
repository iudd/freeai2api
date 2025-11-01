# 🚀 FreeAI2API 快速入门指南

## 📋 一分钟快速启动

### 步骤1：运行服务器

```bash
# 进入项目目录
cd freeai2api

# 运行服务器
deno run --allow-net --allow-env main.ts
```

如果成功启动，您会看到：
```
🚀 FreeAI2API 启动中...
==================================================
✅ 配置验证通过
📍 服务器地址: 0.0.0.0:8000
🎯 目标API: https://freeaiimage.net
📡 API 端点:
   GET  /health - 健康检查
   POST /api/generate - 创建生成任务（异步）
   GET  /api/task/:id - 查询任务状态
   POST /api/generate-sync - 生成并等待（同步）
==================================================
🎉 服务器已启动: http://localhost:8000
```

### 步骤2：测试API

在新的终端窗口中测试：

```bash
# 1. 健康检查
curl http://localhost:8000/health

# 2. 生成图片（同步方式，简单）
curl -X POST http://localhost:8000/api/generate-sync \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "一只可爱的小猫在花园里玩耍",
    "width": 512,
    "height": 512,
    "batch_size": 1
  }'
```

## 📡 API端点详解

### 1. 健康检查
```
GET /health
```
- **用途**: 检查服务器是否正常运行
- **返回**: 服务器状态和版本信息

### 2. 异步生成图片
```
POST /api/generate
```
- **用途**: 创建图片生成任务，立即返回任务ID
- **参数**: 
  ```json
  {
    "prompt": "你的图片描述",
    "width": 512,        // 可选，默认512
    "height": 512,       // 可选，默认512
    "batch_size": 1,     // 可选，1-4张图片
    "negative_prompt": "负面描述"  // 可选
  }
  ```
- **返回**: 任务ID和状态

### 3. 查询任务状态
```
GET /api/task/{task_id}
```
- **用途**: 查询指定任务的状态和结果
- **返回**: 任务状态和图片URL（如果完成）

### 4. 同步生成图片
```
POST /api/generate-sync
```
- **用途**: 创建任务并等待完成，直接返回图片
- **参数**: 同 `/api/generate`
- **返回**: 完成的图片URL列表

## 💻 代码示例

### JavaScript/Node.js

```javascript
// 基本用法
async function generateImage() {
  // 方式1：同步生成（简单）
  const response = await fetch('http://localhost:8000/api/generate-sync', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: "一只可爱的小猫",
      width: 512,
      height: 512
    })
  });
  
  const result = await response.json();
  if (result.success) {
    console.log('图片链接:', result.data.images);
  }
  
  // 方式2：异步生成（推荐）
  // 1. 创建任务
  const taskResponse = await fetch('http://localhost:8000/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      prompt: "一只可爱的小猫",
      width: 512,
      height: 512
    })
  });
  
  const task = await taskResponse.json();
  const taskId = task.data.task_id;
  
  // 2. 轮询查询状态
  let status;
  do {
    await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒
    const statusResponse = await fetch(`http://localhost:8000/api/task/${taskId}`);
    status = await statusResponse.json();
  } while (status.data.status !== 'completed');
  
  console.log('图片链接:', status.data.images);
}

generateImage();
```

### Python

```python
import requests
import time

def generate_image_sync(prompt):
    """同步生成图片"""
    response = requests.post('http://localhost:8000/api/generate-sync', json={
        'prompt': prompt,
        'width': 512,
        'height': 512,
        'batch_size': 1
    })
    
    result = response.json()
    if result['success']:
        print(f"生成的图片数量: {len(result['data']['images'])}")
        for i, url in enumerate(result['data']['images']):
            print(f"图片{i+1}: {url}")
    else:
        print(f"生成失败: {result['error']['message']}")

def generate_image_async(prompt):
    """异步生成图片（推荐）"""
    # 1. 创建任务
    response = requests.post('http://localhost:8000/api/generate', json={
        'prompt': prompt,
        'width': 512,
        'height': 512
    })
    
    task = response.json()
    task_id = task['data']['task_id']
    print(f"任务已创建: {task_id}")
    
    # 2. 轮询查询状态
    while True:
        status_response = requests.get(f'http://localhost:8000/api/task/{task_id}')
        status = status_response.json()
        
        if status['data']['status'] == 'completed':
            print(f"生成完成! 图片数量: {len(status['data']['images'])}")
            for i, url in enumerate(status['data']['images']):
                print(f"图片{i+1}: {url}")
            break
        elif status['data']['status'] == 'failed':
            print("生成失败")
            break
        else:
            print(f"状态: {status['data']['status']}, 等待2秒...")
            time.sleep(2)

# 使用示例
generate_image_async("一只可爱的小猫在花园里玩耍")
```

### cURL 示例

```bash
# 简单同步生成
curl -X POST http://localhost:8000/api/generate-sync \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "一只可爱的小猫在花园里玩耍",
    "width": 512,
    "height": 512
  }'

# 异步生成（更推荐）
# 1. 创建任务
curl -X POST http://localhost:8000/api/generate \
  -H "Content-Type: application/json" \
  -d '{"prompt": "一只可爱的小猫"}'

# 2. 查询状态（替换task_id为你获得的ID）
curl http://localhost:8000/api/task/019a3dde-9c5f-7000-9abf-21d1b347172f
```

## ⚙️ 常用参数说明

| 参数 | 含义 | 范围 | 默认值 |
|------|------|------|--------|
| `prompt` | 图片描述 | 必填 | - |
| `width` | 图片宽度 | 256-1024 | 512 |
| `height` | 图片高度 | 256-1024 | 512 |
| `batch_size` | 生成数量 | 1-4 | 1 |
| `negative_prompt` | 负面提示词 | 文本 | "模糊，变形，畸形" |

## 🔧 部署方式

### 1. 本地运行（推荐测试）
```bash
deno run --allow-net --allow-env main.ts
```

### 2. Docker部署
```bash
# 构建镜像
docker build -t freeai2api .

# 运行容器
docker run -p 8000:8000 freeai2api
```

### 3. Docker Compose（推荐生产）
```bash
docker-compose up -d
```

## 📝 完整示例

```javascript
// 完整的图片生成流程
async function completeExample() {
  try {
    // 1. 检查服务器状态
    const health = await fetch('http://localhost:8000/health').then(r => r.json());
    if (!health.success) {
      throw new Error('服务器不可用');
    }
    
    // 2. 创建生成任务
    const response = await fetch('http://localhost:8000/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt: "一只可爱的小猫在花园里玩耍，阳光明媚，水彩风格",
        width: 512,
        height: 512,
        batch_size: 2  // 生成2张图片
      })
    });
    
    const result = await response.json();
    const taskId = result.data.task_id;
    
    // 3. 等待完成
    let attempts = 0;
    while (attempts < 100) {
      const status = await fetch(`http://localhost:8000/api/task/${taskId}`).then(r => r.json());
      
      if (status.data.status === 'completed') {
        console.log('✅ 生成成功！');
        console.log(`📸 共生成 ${status.data.images.length} 张图片:`);
        status.data.images.forEach((url, i) => {
          console.log(`   ${i+1}. ${url}`);
        });
        break;
      }
      
      if (status.data.status === 'failed') {
        console.log('❌ 生成失败');
        break;
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
      attempts++;
    }
    
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

completeExample();
```

## 🎯 快速测试链接

您可以直接在浏览器中测试：
- 健康检查: `http://localhost:8000/health`
- 简单的生成请求可以用Postman或其他HTTP客户端

## 📞 常见问题

**Q: 服务器启动失败？**
A: 确保已安装Deno，并使用正确权限：`deno run --allow-net --allow-env main.ts`

**Q: 生成的图片链接无法访问？**
A: 图片链接可能有时效性，建议立即下载或保存

**Q: 如何调整生成参数？**
A: 修改API请求中的参数，如调整width、height、batch_size等

**Q: 支持批量生成吗？**
A: 是的，通过batch_size参数可以生成1-4张图片

---

🎉 **现在您可以开始使用FreeAI2API了！** 试试生成您的第一张AI图片吧！