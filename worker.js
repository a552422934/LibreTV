/**
 * 极简 Worker 入口：仅将请求转发到静态资源。
 * 存在此 Worker 后，即可在 Cloudflare 仪表盘中配置环境变量。
 */
export default {
  async fetch(request, env, _ctx) {
    if (!env.ASSETS || typeof env.ASSETS.fetch !== "function") {
      return new Response(
        "ASSETS binding not available. Ensure wrangler.jsonc has assets.binding and run_worker_first.",
        { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } }
      );
    }
    return env.ASSETS.fetch(request);
  },
};
