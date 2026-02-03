/**
 * Worker 入口：转发静态资源，并对 HTML 注入 PASSWORD 的 SHA-256 哈希。
 * 与 server.mjs / Netlify inject-env 行为一致，前端据此判断是否已设置密码。
 */
const HTML_PATHS = ["/", "/index.html", "/player.html"];

function isHtmlRequest(url) {
  const path = new URL(url).pathname;
  return HTML_PATHS.some((p) => p === path || (p === "/" && path === "/"));
}

async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export default {
  async fetch(request, env, _ctx) {
    if (!env.ASSETS || typeof env.ASSETS.fetch !== "function") {
      return new Response(
        "ASSETS binding not available. Ensure wrangler.jsonc has assets.binding and run_worker_first.",
        { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
      );
    }

    const response = await env.ASSETS.fetch(request);

    if (!isHtmlRequest(request.url)) return response;

    const contentType = response.headers.get("Content-Type") || "";
    if (!contentType.includes("text/html")) return response;

    let html = await response.text();
    const password = env.PASSWORD != null ? String(env.PASSWORD) : "";
    const replacement =
      password !== "" ? await sha256Hex(password) : "";
    html = html.replace(/\{\{PASSWORD\}\}/g, replacement);

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    });
  },
};
