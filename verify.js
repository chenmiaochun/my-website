const assert = require("node:assert/strict");
const http = require("node:http");
const { readFileSync } = require("node:fs");
const { spawn } = require("node:child_process");

const files = {
  html: readFileSync("index.html", "utf8"),
  css: readFileSync("styles.css", "utf8"),
  server: readFileSync("server.js", "utf8"),
  readme: readFileSync("README.md", "utf8"),
};

assert.match(files.html, /id="planInput"/);
assert.match(files.html, /name="sourceType"/);
assert.match(files.html, /name="homeArea"/);
assert.match(files.html, /name="keepItems"/);
assert.match(files.html, /id="insightPanel"/);
assert.match(files.html, /id="basisList"/);
assert.match(files.html, /id="shoppingList"/);
assert.match(files.html, /id="nextStepList"/);
assert.match(files.html, /apiPath\("\/api\/render"\)/);
assert.match(files.html, /\/api\/health/);
assert.equal(/id="planInput"[^>]+required/.test(files.html), false, "file input should use visible JS validation");

assert.match(files.css, /\.studio-panel/);
assert.match(files.css, /\.mode-set/);
assert.match(files.css, /\.insight-panel/);
assert.match(files.css, /@media \(max-width: 680px\)/);

assert.match(files.server, /IMAGE_API_KEY/);
assert.match(files.server, /\/images\/edits/);
assert.match(files.server, /Access-Control-Allow-Origin/);
assert.match(files.server, /MOCK_RENDER/);
assert.match(files.server, /buildDesignMeta/);
assert.match(files.server, /shoppingListFor/);
assert.match(files.server, /IMAGE_REQUEST_TIMEOUT_MS \|\| 180000/);

assert.match(files.readme, /GET \/api\/health/);
assert.match(files.readme, /MOCK_RENDER/);

for (const [name, content] of Object.entries(files)) {
  const keyMatches = content.match(/sk-jp-[A-Za-z0-9]{24,}/g) || [];
  assert.deepEqual(keyMatches, [], `${name} contains a likely real API key`);
}

const port = String(5200 + Math.floor(Math.random() * 1000));
const child = spawn(process.execPath, ["server.js"], {
  env: { ...process.env, PORT: port, SKIP_DOTENV: "1", IMAGE_API_KEY: "" },
  stdio: ["ignore", "pipe", "pipe"],
});

const baseUrl = `http://localhost:${port}`;

async function waitForServer(url = baseUrl) {
  const deadline = Date.now() + 8000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${url}/api/health`);
      if (response.ok) return response.json();
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 150));
    }
  }
  throw new Error("server did not start in time");
}

function createMockUpstream() {
  const calls = [];
  const server = http.createServer((request, response) => {
    if (request.method !== "POST" || request.url !== "/v1/images/edits") {
      response.writeHead(404);
      response.end();
      return;
    }

    const chunks = [];
    request.on("data", (chunk) => chunks.push(chunk));
    request.on("end", () => {
      calls.push({
        authorization: request.headers.authorization,
        contentType: request.headers["content-type"],
        body: Buffer.concat(chunks).toString("latin1"),
      });
      response.writeHead(200, { "Content-Type": "application/json" });
      response.end(JSON.stringify({ data: [{ b64_json: "mock-image-base64" }] }));
    });
  });

  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve({ server, calls, url: `http://127.0.0.1:${address.port}/v1` });
    });
  });
}

async function postRender(url, overrides = {}) {
  return fetch(`${url}/api/render`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      image: "data:image/png;base64,iVBORw0KGgo=",
      fileName: "plan.png",
      sourceType: "floor plan",
      roomType: "living room",
      style: "modern warm minimalism",
      budget: "balanced",
      homeArea: "89 sqm",
      needs: "family of three",
      keepItems: "load-bearing walls",
      priorities: ["storage", "lighting"],
      ...overrides,
    }),
  });
}

async function verifyMockedSuccessPath() {
  const mock = await createMockUpstream();
  const renderPort = String(6200 + Math.floor(Math.random() * 1000));
  const renderServer = spawn(process.execPath, ["server.js"], {
    env: {
      ...process.env,
      PORT: renderPort,
      SKIP_DOTENV: "1",
      IMAGE_API_KEY: "fake-test-key",
      IMAGE_API_BASE_URL: mock.url,
      IMAGE_MODEL: "test-image-model",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const renderBaseUrl = `http://localhost:${renderPort}`;

  try {
    await waitForServer(renderBaseUrl);
    const response = await postRender(renderBaseUrl);
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.equal(data.b64, "mock-image-base64");
    assert.ok(data.designBasis.length >= 4);
    assert.ok(data.shoppingList.length >= 4);
    assert.ok(data.nextSteps.length >= 3);
    assert.equal(mock.calls.length, 1);
    assert.equal(mock.calls[0].authorization, "Bearer fake-test-key");
    assert.match(mock.calls[0].contentType, /multipart\/form-data/);
    assert.match(mock.calls[0].body, /test-image-model/);
    assert.match(mock.calls[0].body, /Input type: floor plan/);
    assert.match(mock.calls[0].body, /Home size or layout note: 89 sqm/);
  } finally {
    renderServer.kill();
    mock.server.close();
  }
}

async function verifyDemoMode() {
  const renderPort = String(7200 + Math.floor(Math.random() * 1000));
  const renderServer = spawn(process.execPath, ["server.js"], {
    env: {
      ...process.env,
      PORT: renderPort,
      SKIP_DOTENV: "1",
      IMAGE_API_KEY: "fake-test-key",
      MOCK_RENDER: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const renderBaseUrl = `http://localhost:${renderPort}`;

  try {
    const health = await waitForServer(renderBaseUrl);
    assert.equal(health.mock, true);
    const response = await postRender(renderBaseUrl, { sourceType: "room photo", roomType: "bedroom" });
    assert.equal(response.status, 200);
    const data = await response.json();
    assert.ok(data.b64.length > 20);
    assert.ok(data.designBasis.some((item) => item.includes("房间实拍")));
    assert.ok(data.shoppingList.some((item) => item.includes("床")));
  } finally {
    renderServer.kill();
  }
}

(async () => {
  try {
    const health = await waitForServer();
    assert.equal(health.ok, true);
    assert.equal(health.upstream, "https://xiaoji.baziapi.site/v1");
    assert.equal(health.mock, false);

    const home = await fetch(`${baseUrl}/`);
    assert.equal(home.status, 200);
    assert.match(await home.text(), /insightPanel/);

    const options = await fetch(`${baseUrl}/api/render`, {
      method: "OPTIONS",
      headers: { "Access-Control-Request-Method": "POST" },
    });
    assert.equal(options.status, 204);
    assert.equal(options.headers.get("access-control-allow-origin"), "*");

    const render = await postRender(baseUrl);
    assert.equal(render.status, 500);
    const error = await render.json();
    assert.match(error.error.message, /IMAGE_API_KEY/);

    await verifyMockedSuccessPath();
    await verifyDemoMode();

    console.log("Verification passed");
  } finally {
    child.kill();
  }
})().catch((error) => {
  child.kill();
  console.error(error);
  process.exit(1);
});
