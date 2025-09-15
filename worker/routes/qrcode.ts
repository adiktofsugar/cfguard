import { Hono } from "hono";
import qrcode from "qrcode-generator";

const qrcodeRoute = new Hono<{ Bindings: Env }>();

qrcodeRoute.get("/qrcode/:sessionId", async (c) => {
    const sessionId = c.req.param("sessionId");

    if (!sessionId) {
        return c.text("Missing session ID", 400);
    }

    const origin = new URL(c.req.url).origin;
    const url = `${origin}/authorize/${sessionId}/external`;

    try {
        // Create QR code instance
        const qr = qrcode(0, "L");
        qr.addData(url);
        qr.make();

        // Generate SVG string
        const svgString = qr.createSvgTag({
            cellSize: 8,
            margin: 2,
        });

        return new Response(svgString, {
            headers: {
                "Content-Type": "image/svg+xml",
                "Cache-Control": "public, max-age=3600",
            },
        });
    } catch (error) {
        console.error("Failed to generate QR code:", error);
        return c.text("Failed to generate QR code", 500);
    }
});

export default qrcodeRoute;
