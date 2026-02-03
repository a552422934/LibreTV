/**
 * 极简 Worker 入口：仅将请求转发到静态资源。
 * 存在此 Worker 后，即可在 Cloudflare 仪表盘中配置环境变量。
 */
export default {
  async fetch(request, env, _ctx) {
    return env.ASSETS.fetch(request);
  },
};
