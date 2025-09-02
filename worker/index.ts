import { Hono } from "hono";
import Logger from "js-logger";
import type { Env } from "./interfaces";
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
    const logLevel = c.env.LOG_LEVEL || "INFO";

    Logger.useDefaults({
        defaultLevel: Logger[logLevel as keyof typeof Logger] || Logger.INFO,
        formatter: (messages, context) => {
            const timestamp = new Date().toISOString();
            const level = context.level.name;

            messages.unshift(`[${timestamp}] [${level}]`);
        },
    });

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

export default app;
export { AuthorizationSession } from "./durable-objects";
