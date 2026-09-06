/**
 * One Elysia app: the JSON API + swagger (src/cron/server.ts) and the SVG
 * card routes (src/server.ts) on the same port.
 */
import type { AppConfig } from "./env";
import type { StatsProvider } from "./types";
import { createServer as createApiServer } from "./cron/server";
import { createServer as createCardServer } from "./card/routes";

export function createApp(config: AppConfig, provider: StatsProvider) {
  const api = createApiServer({
    corsOrigin: config.corsOrigin,
    username: config.username,
    token: config.token,
    apiSecret: config.apiSecret,
    refreshSecret: config.refreshSecret,
    apiBase: config.githubApiBase,
    apiUrl: config.githubApiUrl,
    includePrivate: config.includePrivate,
    startedAt: new Date(),
  });
  const card = createCardServer(provider, config.theme);
  return api.use(card);
}
