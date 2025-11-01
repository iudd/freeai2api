# Dockerfile for FreeAI2API
FROM denoland/deno:1.38.0

# 设置工作目录
WORKDIR /app

# 复制项目文件
COPY . .

# 设置权限
RUN deno cache --reload main.ts

# 暴露端口
EXPOSE 8000

# 健康检查
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

# 启动命令
CMD ["deno", "run", "--allow-net", "--allow-env", "--allow-read", "main.ts"]