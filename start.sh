#!/bin/bash

# FreeAI2API 一键启动脚本
# 支持两种模式：标准API模式和OpenAI兼容模式

set -e

echo "🚀 FreeAI2API 启动脚本"
echo "=" * 50

# 检查Deno是否安装
if ! command -v deno &> /dev/null; then
    echo "❌ 未检测到Deno，请先安装Deno"
    echo "   安装命令: curl -fsSL https://deno.land/x/install/install.sh | sh"
    exit 1
fi

echo "✅ Deno已安装: $(deno --version)"

# 选择启动模式
echo ""
echo "请选择启动模式："
echo "1) 标准API模式 (默认: main.ts)"
echo "2) OpenAI兼容模式 (推荐: openai_adapter.ts)"
echo "3) 直接测试API (不启动服务器)"
echo ""

read -p "请输入选择 (1-3): " choice
choice=${choice:-1}

# 检查环境变量
export PORT=${PORT:-8000}
export HOST=${HOST:-0.0.0.0}
export FREEAI_BASE_URL=${FREEAI_BASE_URL:-https://freeaiimage.net}

echo ""
echo "🔧 配置信息："
echo "   端口: $PORT"
echo "   主机: $HOST"
echo "   目标API: $FREEAI_BASE_URL"

case $choice in
    1)
        echo ""
        echo "🚀 启动标准API模式..."
        echo "   访问地址: http://localhost:$PORT"
        echo "   API文档: http://localhost:$PORT/health"
        deno run --allow-net --allow-env main.ts
        ;;
    2)
        echo ""
        echo "🚀 启动OpenAI兼容模式..."
        echo "   访问地址: http://localhost:$PORT"
        echo "   支持Lobe Chat, ChatGPT-Next-Web等"
        echo "   配置Base URL: http://localhost:$PORT"
        deno run --allow-net --allow-env openai_adapter.ts
        ;;
    3)
        echo ""
        echo "🧪 测试API..."
        
        # 启动后台服务器
        echo "   启动临时服务器..."
        deno run --allow-net --allow-env openai_adapter.ts &
        server_pid=$!
        
        # 等待服务器启动
        sleep 3
        
        # 测试健康检查
        echo "   测试健康检查..."
        curl -s http://localhost:$PORT/health | python3 -m json.tool || echo "❌ 健康检查失败"
        
        # 测试图片生成
        echo "   测试图片生成..."
        curl -s -X POST http://localhost:$PORT/generate \
            -H "Content-Type: application/json" \
            -d '{"prompt": "一只可爱的小猫", "size": "512x512", "n": 1}' | python3 -m json.tool || echo "❌ 图片生成测试失败"
        
        # 清理
        kill $server_pid 2>/dev/null || true
        echo "   测试完成，服务器已停止"
        ;;
    *)
        echo "❌ 无效选择"
        exit 1
        ;;
esac