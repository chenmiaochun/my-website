# 尚品居 AI 装修效果图

这是一个面向家具/装修业务的静态前端 + 本地 Node 代理服务。用户上传自己的平面图，选择空间、风格、预算和重点优化项后，浏览器请求本地 `/api/render`，服务端再安全调用 OpenAI 兼容图像接口生成装修效果图。

## 本地启动

1. 复制 `.env.example` 为 `.env`。
2. 在 `.env` 中填写 `IMAGE_API_KEY`。
3. 启动服务：

```powershell
& 'C:\Users\apple\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' server.js
```

4. 打开 `http://localhost:4173`。

## 环境变量

- `IMAGE_API_KEY`：图像接口密钥，只在服务端读取。
- `IMAGE_API_BASE_URL`：默认 `https://xiaoji.baziapi.site/v1`。
- `IMAGE_MODEL`：图像编辑模型名，默认 `gpt-image-1`，如平台要求其他模型名可直接替换。
- `IMAGE_SIZE`：生成尺寸，默认 `1024x1024`。
- `IMAGE_REQUEST_TIMEOUT_MS`：上游超时，默认 180 秒。
- `MOCK_RENDER`：设为 `1` 时返回本地演示图，用于验证前端点击流程，不会调用上游。
- `PORT`：本地端口，默认 4173。

## 接口

`GET /api/health`

返回本地代理状态、模型名和上游 Base URL，可用于确认服务已经启动。

`POST /api/render`

请求体为 JSON：

```json
{
  "image": "data:image/png;base64,...",
  "fileName": "floor-plan.png",
  "roomType": "whole home",
  "style": "modern warm minimalism",
  "budget": "balanced",
  "needs": "三口之家，收纳多",
  "priorities": ["storage", "lighting"]
}
```

响应会返回 `imageUrl` 或 `b64`，前端会自动展示并提供下载。

## 安全约定

- 不把真实 API key 写入 HTML、JS、CSS 或提交历史。
- `.env` 已加入 `.gitignore`。
- 浏览器只访问本地代理，不能直接看到上游密钥。
