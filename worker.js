/**
 * Worker 入口：转发静态资源，并对 HTML 注入 PASSWORD 的 SHA-256 哈希。
 * 与 server.mjs / Netlify inject-env 行为一致，前端据此判断是否已设置密码。
 */
const HTML_PATHS = ["/", "/index.html", "/player.html"];

function isHtmlRequest(pathname) {
  const p = pathname === "/" ? pathname : pathname.replace(/\/$/, "");
  return HTML_PATHS.some((h) => h === p || (h === "/" && p === ""));
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

    const url = new URL(request.url);
    const pathname = url.pathname || "/";

    // 根路径显式请求 index.html，确保拿到可注入的 HTML
    let assetRequest = request;
    if (pathname === "/" || pathname === "") {
      assetRequest = new Request(new URL("/index.html", url.origin), request);
    }

    const response = await env.ASSETS.fetch(assetRequest);

    if (!isHtmlRequest(pathname)) return response;
    if (!response.ok) return response;

    const contentType = response.headers.get("Content-Type") || "";
    if (!contentType.toLowerCase().includes("text/html")) return response;

    let html = await response.text();
    const password = env.PASSWORD != null ? String(env.PASSWORD) : "";
    const replacement = password !== "" ? await sha256Hex(password) : "";
    html = html.replace(/\{\{PASSWORD\}\}/g, replacement);

    const headers = new Headers(response.headers);
    headers.set("Cache-Control", "private, no-store, max-age=0");

    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  },
};
