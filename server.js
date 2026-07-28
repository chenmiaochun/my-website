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
const mockRender = process.env.MOCK_RENDER === "1";
const renderWindowMs = Number(process.env.RENDER_RATE_WINDOW_MS || 60 * 60 * 1000);
const renderRequestLimit = Number(process.env.RENDER_REQUEST_LIMIT || 6);
const maxConcurrentRenders = Number(process.env.MAX_CONCURRENT_RENDERS || 2);
const renderUsage = new Map();
let activeRenderRequests = 0;

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
    if (request.method === "OPTIONS") {
      sendCors(response, 204);
      return;
    }

    if (request.method === "GET" && request.url === "/api/health") {
      sendJson(response, 200, {
        ok: true,
        ready: Boolean(process.env.IMAGE_API_KEY),
        model: imageModel,
        upstream: apiBaseUrl,
        mock: mockRender,
        variantsPerRender: 3,
        activeRenders: activeRenderRequests,
      });
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

server.listen(port, "0.0.0.0", () => {
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

  if (activeRenderRequests >= maxConcurrentRenders) {
    response.setHeader("Retry-After", "30");
    sendJson(response, 429, { error: { message: "当前生成任务较多，请约 30 秒后重试。" } });
    return;
  }

  const quota = reserveRenderQuota(request);
  if (!quota.allowed) {
    response.setHeader("Retry-After", String(quota.retryAfterSeconds));
    sendJson(response, 429, { error: { message: `生成次数已达上限，请约 ${quota.retryAfterSeconds} 秒后重试。` } });
    return;
  }

  activeRenderRequests += 1;
  try {

  const payload = JSON.parse(await readRequestBody(request));
  validatePayload(payload);

  const imageFile = dataUrlToBlob(payload.image, payload.fileName || "floor-plan.png");
  const variantStyles = chooseVariantStyles(payload.style);
  const designMeta = buildDesignMeta(payload);

  if (mockRender) {
    const variants = variantStyles.map((style, index) => buildMockVariant(payload, style, index));
    sendJson(response, 200, {
      variants,
      b64: variants[0].b64,
      prompt: variants[0].prompt,
      ...designMeta,
      note: "已使用本地演示模式生成 3 个风格方案。配置真实模型后会返回 AI 装修效果图。",
    });
    return;
  }

  const results = await Promise.allSettled(
    variantStyles.map((style, index) => requestImageVariant(payload, style, index, imageFile, apiKey)),
  );
  const variants = results.filter((result) => result.status === "fulfilled").map((result) => result.value);
  const failedCount = results.length - variants.length;

  if (variants.length === 0) {
    const firstFailure = results.find((result) => result.status === "rejected");
    sendJson(response, 502, { error: { message: firstFailure?.reason?.message || "三个风格方案均生成失败，请稍后重试。" } });
    return;
  }

  sendJson(response, 200, {
    variants,
    imageUrl: variants[0].imageUrl,
    b64: variants[0].b64,
    prompt: variants[0].prompt,
    ...designMeta,
    note: failedCount
      ? `已生成 ${variants.length} 个方案，另有 ${failedCount} 个方案生成失败，可稍后重试补齐。`
      : "3 个风格方案已生成完成，请选择最接近客户预期的一版。",
  });
  } finally {
    activeRenderRequests -= 1;
  }
}

function reserveRenderQuota(request) {
  const now = Date.now();
  const clientId = getClientId(request);
  const recentRequests = (renderUsage.get(clientId) || []).filter((timestamp) => now - timestamp < renderWindowMs);

  if (recentRequests.length >= renderRequestLimit) {
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((renderWindowMs - (now - recentRequests[0])) / 1000)),
    };
  }

  recentRequests.push(now);
  renderUsage.set(clientId, recentRequests);
  if (renderUsage.size > 5000) pruneRenderUsage(now);
  return { allowed: true, retryAfterSeconds: 0 };
}

function getClientId(request) {
  const forwardedFor = String(request.headers["x-forwarded-for"] || "").split(",")[0].trim();
  return forwardedFor || request.socket.remoteAddress || "unknown";
}

function pruneRenderUsage(now) {
  for (const [clientId, timestamps] of renderUsage) {
    const recent = timestamps.filter((timestamp) => now - timestamp < renderWindowMs);
    if (recent.length) renderUsage.set(clientId, recent);
    else renderUsage.delete(clientId);
  }
}

async function requestImageVariant(payload, style, index, imageFile, apiKey) {
  const variantPayload = { ...payload, style };
  const prompt = buildRenovationPrompt(variantPayload, index);
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
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
      signal: controller.signal,
    });
    const data = await upstream.json().catch(() => ({}));
    if (!upstream.ok) throw new Error(data?.error?.message || `${styleLabelFor(style)}方案生成失败。`);

    const firstImage = data?.data?.[0] || {};
    if (!firstImage.url && !firstImage.b64_json) throw new Error(`${styleLabelFor(style)}方案没有返回图片。`);
    return buildVariantResponse(variantPayload, style, index, prompt, firstImage);
  } catch (error) {
    if (error.name === "AbortError") throw new Error(`${styleLabelFor(style)}方案生成超时。`);
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function buildVariantResponse(payload, style, index, prompt, image = {}) {
  return {
    id: `variant-${index + 1}`,
    style,
    styleLabel: styleLabelFor(style),
    concept: styleConceptFor(style),
    imageUrl: image.url,
    b64: image.b64_json,
    prompt,
    designBasis: buildDesignMeta(payload).designBasis,
  };
}

function buildMockVariant(payload, style, index) {
  const variantPayload = { ...payload, style };
  return buildVariantResponse(variantPayload, style, index, buildRenovationPrompt(variantPayload, index), {
    b64_json: mockPreviewImage(index),
  });
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

function buildRenovationPrompt(payload, variantIndex = 0) {
  const priorities = Array.isArray(payload.priorities) ? payload.priorities.join(", ") : "storage, lighting";
  const needs = payload.needs ? `User needs: ${payload.needs}.` : "User needs: practical family living.";
  const keepItems = payload.keepItems ? `Elements to preserve: ${payload.keepItems}.` : "Preserve structural constraints and useful existing furniture when visible.";
  const homeArea = payload.homeArea ? `Home size or layout note: ${payload.homeArea}.` : "Infer the layout scale from the uploaded image.";
  return [
    "Create a realistic interior renovation concept render from the uploaded floor plan or room photo.",
    `This is comparison option ${variantIndex + 1} of 3. Keep the viewpoint, room boundaries, doors, windows, and scale consistent across options so the styles can be compared fairly.`,
    "First infer the layout logic from the image: walls, doors, windows, circulation, room proportions, lighting direction, and visible constraints.",
    `Input type: ${payload.sourceType || "floor plan"}.`,
    `Room scope: ${payload.roomType || "whole home"}.`,
    `Interior style: ${payload.style || "modern warm minimalism"}.`,
    `Budget level: ${payload.budget || "balanced"}.`,
    homeArea,
    `Optimization priorities: ${priorities}.`,
    needs,
    keepItems,
    "Show furniture placement, material palette, lighting atmosphere, storage strategy, and soft decor.",
    "Make the render suitable for a furniture shopping journey: include sofa, tables, cabinets, lighting, curtains, rugs, and storage opportunities when relevant.",
    "The result should look like a polished residential design visualization, not a technical blueprint.",
    "Avoid impossible structural changes and avoid adding text labels or watermarks.",
  ].join(" ");
}

function chooseVariantStyles(selectedStyle) {
  const combinations = {
    "modern warm minimalism": ["modern warm minimalism", "french cream", "new chinese"],
    "japanese wabi-sabi": ["japanese wabi-sabi", "modern warm minimalism", "new chinese"],
    "french cream": ["french cream", "modern warm minimalism", "japanese wabi-sabi"],
    "new chinese": ["new chinese", "modern warm minimalism", "japanese wabi-sabi"],
    "industrial loft": ["industrial loft", "modern warm minimalism", "new chinese"],
  };
  return combinations[selectedStyle] || combinations["modern warm minimalism"];
}

function buildDesignMeta(payload) {
  const sourceLabel = payload.sourceType === "room photo" ? "房间实拍" : "户型/平面图";
  const roomLabel = roomTypeLabel(payload.roomType);
  const styleLabel = styleLabelFor(payload.style);
  const budgetLabel = budgetLabelFor(payload.budget);
  const priorities = Array.isArray(payload.priorities) && payload.priorities.length > 0 ? payload.priorities : ["storage", "lighting"];
  const priorityText = priorities.map(priorityLabel).join("、");

  return {
    designBasis: [
      `输入依据：${sourceLabel}，优先保留门窗、墙体、动线和可见空间比例。`,
      `方案范围：${roomLabel}${payload.homeArea ? `，面积/户型备注为 ${payload.homeArea}` : "，面积由上传图辅助判断"}。`,
      `风格与预算：${styleLabel}，${budgetLabel}，重点优化 ${priorityText}。`,
      `生活需求：${payload.needs || "默认按日常家庭居住、收纳和舒适动线处理"}。`,
      `保留元素：${payload.keepItems || "默认不做明显结构拆改，保留图片中的关键限制" }。`,
    ],
    shoppingList: shoppingListFor(payload),
    nextSteps: [
      "补充房屋尺寸、层高、门窗位置后，可以把效果图升级成更可信的平面布置方案。",
      "比较当前 3 个风格方案，记录客户对色彩、材质、采光和收纳的具体偏好。",
      "把满意方案拆成家具清单，再对接沙发、柜体、灯具、窗帘和地毯商品。",
    ],
  };
}

function shoppingListFor(payload) {
  const room = payload.roomType || "whole home";
  const base = {
    "living room": ["模块沙发或三人位沙发", "圆角茶几/边几", "电视柜或整墙收纳柜", "落地灯与主灯", "地毯、窗帘、抱枕"],
    bedroom: ["软包床或木质床架", "床头柜与阅读灯", "衣柜/斗柜收纳", "遮光窗帘", "床品与地毯"],
    kitchen: ["橱柜与高柜收纳", "餐桌或岛台", "餐椅", "操作照明", "墙面与台面材料"],
    bathroom: ["浴室柜", "镜柜与照明", "干湿分区五金", "收纳架", "防滑地面材料"],
    "whole home": ["客厅沙发组合", "餐桌椅与餐边柜", "卧室床具与衣柜", "全屋灯光", "窗帘、地毯和软装"],
  };
  return base[room] || base["whole home"];
}

function roomTypeLabel(roomType) {
  const labels = {
    "whole home": "整屋",
    "living room": "客厅",
    bedroom: "卧室",
    kitchen: "厨房",
    bathroom: "卫浴",
  };
  return labels[roomType] || "整屋";
}

function styleLabelFor(style) {
  const labels = {
    "modern warm minimalism": "现代暖调极简",
    "japanese wabi-sabi": "日式侘寂",
    "french cream": "法式奶油",
    "new chinese": "新中式",
    "industrial loft": "工业 Loft",
  };
  return labels[style] || "现代暖调极简";
}

function styleConceptFor(style) {
  const concepts = {
    "modern warm minimalism": "温暖木色、简洁线条、耐看实用",
    "japanese wabi-sabi": "自然肌理、低饱和色、安静松弛",
    "french cream": "柔和奶油色、精致线条、明亮浪漫",
    "new chinese": "东方比例、现代木作、克制雅致",
    "industrial loft": "深色金属、原始材质、利落个性",
  };
  return concepts[style] || concepts["modern warm minimalism"];
}

function budgetLabelFor(budget) {
  const labels = {
    practical: "实用经济预算",
    balanced: "品质平衡预算",
    premium: "高端质感预算",
  };
  return labels[budget] || "品质平衡预算";
}

function priorityLabel(priority) {
  const labels = {
    storage: "收纳",
    lighting: "采光",
    "traffic flow": "动线",
    "child friendly": "儿童友好",
  };
  return labels[priority] || priority;
}

function mockPreviewImage(index = 0) {
  void index;
  return "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAp0lEQVR4nO3ZsQ2AMAwFQfv/p7sJkJQKjIixdCrwSKnznCQ9fN91n+8AoJ8YQABBAAEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAwHcBQ0NDn+8k5ZyZz16UZXg1eM2x9ys0bP5hFwEEEEAAAQQQQAABBBBAAAEEEEAAAQQQQAABBBBAAAEEEEAAAc4FAAA5fZkxL1aBAAAAAElFTkSuQmCC";
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
      ...corsHeaders(),
    });
    response.end(file);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8", ...corsHeaders() });
    response.end("Not found");
  }
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...corsHeaders(),
  });
  response.end(JSON.stringify(payload));
}

function sendCors(response, statusCode) {
  response.writeHead(statusCode, corsHeaders());
  response.end();
}

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type,Authorization",
  };
}
