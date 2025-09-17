import { Hono } from "hono";
import Logger from "js-logger";
import { setupLogger } from "./lib/logger";
import authorize from "./routes/authorize";
import callback from "./routes/callback";
import clientCheck from "./routes/client-check";
import dev from "./routes/dev";
import discovery from "./routes/discovery";
import main from "./routes/main";
import token from "./routes/token";
import userCheck from "./routes/user-check";
import userinfo from "./routes/userinfo";

const app = new Hono<{ Bindings: Env }>();

app.use("*", async (c, next) => {
    setupLogger(c.env);
    Logger.debug("Request received", c.req);
    await next();
});

app.route("/", main);
app.route("/", dev);
app.route("/", authorize);
app.route("/", token);
app.route("/", discovery);
app.route("/", userinfo);
app.route("/", callback);
app.route("/", clientCheck);
app.route("/", userCheck);

app.notFound((c) => c.text("Not Found", 404));

export default {
    fetch: app.fetch,
    async scheduled(event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
        setupLogger(env);
        Logger.info("Running scheduled cleanup", { cron: event.cron });

        try {
            const now = Date.now();
            let deletedCodes = 0;
            let deletedTokens = 0;

            // Clean up expired authorization codes (older than 1 day)
            const codesList = await env.LOGIN_STORAGE.list({ prefix: "codes/" });
            for (const item of codesList.objects) {
                try {
                    const codeDataObj = await env.LOGIN_STORAGE.get(item.key);
                    if (codeDataObj) {
                        const codeData = await codeDataObj.text();
                        const data = JSON.parse(codeData);
                        // Codes expire after 10 minutes normally, but clean up any older than 1 day
                        if (data.expires && data.expires < now - 86400000) {
                            await env.LOGIN_STORAGE.delete(item.key);
                            deletedCodes++;
                        }
                    }
                } catch (error) {
                    Logger.error("Failed to process code", { key: item.key, error });
                }
            }

            // Clean up expired access tokens
            const tokensList = await env.LOGIN_STORAGE.list({ prefix: "access_tokens/" });
            for (const item of tokensList.objects) {
                try {
                    const tokenDataObj = await env.LOGIN_STORAGE.get(item.key);
                    if (tokenDataObj) {
                        const tokenData = await tokenDataObj.text();
                        const data = JSON.parse(tokenData);
                        if (data.expires && data.expires < now) {
                            await env.LOGIN_STORAGE.delete(item.key);
                            deletedTokens++;
                        }
                    }
                } catch (error) {
                    Logger.error("Failed to process token", { key: item.key, error });
                }
            }

            Logger.info("Cleanup completed", {
                deletedCodes,
                deletedTokens,
                totalProcessed: codesList.objects.length + tokensList.objects.length,
            });
        } catch (error) {
            Logger.error("Scheduled cleanup failed", { error });
            throw error;
        }
    },
};
export { AuthorizationSession } from "./durable-objects";
