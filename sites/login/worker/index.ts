import { Hono } from "hono";
import type { Env } from "./interfaces";
import authorize from "./routes/authorize";
import token from "./routes/token";
import discovery from "./routes/discovery";
import userinfo from "./routes/userinfo";
import callback from "./routes/callback";

const app = new Hono<{ Bindings: Env }>();

app.route("/", authorize);
app.route("/", token);
app.route("/", discovery);
app.route("/", userinfo);
app.route("/", callback);

app.notFound((c) => c.text("Not Found", 404));

export default app;