const http = require("node:http");
const { readFile } = require("node:fs/promises");
const { existsSync, readFileSync } = require("node:fs");
const path = require("node:path");

const rootDir = __dirname;
if (process.env.SKIP_DOTENV !== "1") loadDotEnv();

const port = Number(process.env.PORT || 4173);
const apiBaseUrl = process.env.IMAGE_API_BASE_URL || "https://xiaoji.baziapi.site/v1";
const imageModel = process.env.IMAGE_MODEL || "gpt-image-1";
const requestTimeoutMs = Number(process.env.IMAGE_REQUEST_TIMEOUT_MS || 180000);
const maxBodyBytes = Number(process.env.MAX_UPLOAD_BYTES || 12 * 1024 * 1024);

function loadDotEnv() {
  const envPath = path.join(rootDir, ".env");
  if (!existsSync(envPath)) return;

  const lines = readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator === -1) continue;
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (key && !process.env[key]) process.env[key] = value;
  }
}

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

const server = http.createServer(async (request, response) => {
  try {
    if (request.method === "GET" && request.url === "/api/health") {
      sendJson(response, 200, { ok: true, model: imageModel, upstream: apiBaseUrl });
      return;
    }

    if (request.method === "POST" && request.url === "/api/render") {
      await handleRender(request, response);
      return;
    }

    if (request.method === "GET") {
      await serveStatic(request, response);
      return;
    }

    sendJson(response, 405, { error: { message: "不支持的请求方法。" } });
  } catch (error) {
    sendJson(response, 500, { error: { message: error.message || "服务器处理失败。" } });
  }
});

server.listen(port, () => {
  console.log(`Renovation studio running at http://localhost:${port}`);
});

async function handleRender(request, response) {
  const apiKey = process.env.IMAGE_API_KEY;
  if (!apiKey) {
    sendJson(response, 500, {
      error: { message: "缺少 IMAGE_API_KEY，请在 .env 中配置后再生成。" },
    });
    return;
  }

  const payload = JSON.parse(await readRequestBody(request));
  validatePayload(payload);

  const imageFile = dataUrlToBlob(payload.image, payload.fileName || "floor-plan.png");
  const prompt = buildRenovationPrompt(payload);
  const formData = new FormData();
  formData.append("model", imageModel);
  formData.append("prompt", prompt);
  formData.append("image", imageFile.blob, imageFile.fileName);
  formData.append("size", process.env.IMAGE_SIZE || "1024x1024");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

  try {
    const upstream = await fetch(`${apiBaseUrl}/images/edits`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
      body: formData,
      signal: controller.signal,
    });

    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) {
      const message = data?.error?.message || "上游图像接口返回失败。";
      sendJson(response, upstream.status, { error: { message } });
      return;
    }

    const firstImage = data?.data?.[0] || {};
    sendJson(response, 200, {
      imageUrl: firstImage.url,
      b64: firstImage.b64_json,
      prompt,
      note: "生成完成。建议保留原平面图，再用同一参数多生成几版做风格比较。",
    });
  } catch (error) {
    const message =
      error.name === "AbortError"
        ? "图像生成超时，请稍后重试或把 IMAGE_REQUEST_TIMEOUT_MS 调大。"
        : error.message || "图像生成失败。";
    sendJson(response, 502, { error: { message } });
  } finally {
    clearTimeout(timeout);
  }
}

function validatePayload(payload) {
  if (!payload || typeof payload !== "object") throw new Error("请求体格式无效。");
  if (!payload.image || typeof payload.image !== "string") throw new Error("请上传平面图。");
  if (!payload.image.startsWith("data:image/")) throw new Error("只支持图片文件。");
}

function dataUrlToBlob(dataUrl, fileName) {
  const match = dataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
  if (!match) throw new Error("图片数据格式无效。");
  const [, mimeType, encoded] = match;
  const buffer = Buffer.from(encoded, "base64");
  if (buffer.byteLength > maxBodyBytes) throw new Error("图片过大，请上传 12MB 以内的文件。");
  return {
    blob: new Blob([buffer], { type: mimeType }),
    fileName: sanitizeFileName(fileName),
  };
}

function sanitizeFileName(fileName) {
  const safeName = String(fileName || "floor-plan.png").replace(/[^\w.-]+/g, "-");
  return safeName || "floor-plan.png";
}

function buildRenovationPrompt(payload) {
  const priorities = Array.isArray(payload.priorities) ? payload.priorities.join(", ") : "storage, lighting";
  const needs = payload.needs ? `User needs: ${payload.needs}.` : "User needs: practical family living.";
  return [
    "Create a realistic interior renovation concept render from the uploaded floor plan.",
    "Preserve the original layout logic, walls, doors, windows, circulation, and room proportions.",
    `Room scope: ${payload.roomType || "whole home"}.`,
    `Interior style: ${payload.style || "modern warm minimalism"}.`,
    `Budget level: ${payload.budget || "balanced"}.`,
    `Optimization priorities: ${priorities}.`,
    needs,
    "Show furniture placement, material palette, lighting atmosphere, storage strategy, and soft decor.",
    "The result should look like a polished residential design visualization, not a technical blueprint.",
    "Avoid impossible structural changes and avoid adding text labels or watermarks.",
  ].join(" ");
}

async function readRequestBody(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > maxBodyBytes * 1.5) throw new Error("请求体过大。");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function serveStatic(request, response) {
  const url = new URL(request.url, `http://${request.headers.host}`);
  const safePath = url.pathname === "/" ? "/index.html" : decodeURIComponent(url.pathname);
  const filePath = path.normalize(path.join(rootDir, safePath));

  if (!filePath.startsWith(rootDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const file = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes[path.extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    response.end(file);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}
