import { useState } from "preact/hooks";
import AuthorizeApp from "../authorize/AuthorizeApp";
import AuthorizeExternalApp from "../authorize-external/AuthorizeExternalApp";
import CallbackApp from "../callback/CallbackApp";
import RoutePreview from "./RoutePreview";

export default function DevApp() {
    const [currentRoute, setCurrentRoute] = useState<"menu" | "authorize" | "authorize-external" | "callback">("menu");

    // Sample data for each route
    const sessionId = "sample-session-id-123";
    const authorizeData = {
        sessionId,
        clientId: "example-client-id",
        redirectUri: "https://example.com/callback",
        state: "random-state-123",
        responseType: "code",
        externalUrl: `https://example.com/authorize/${sessionId}/external?client_id=example-client-id&redirect_uri=${encodeURIComponent("https://example.com/callback")}&state=random-state-123`,
    };

    const authorizeExternalData = {
        sessionId,
        clientId: "example-client-id",
        redirectUri: "https://example.com/callback",
        state: "random-state-123",
    };

    const callbackData = {
        code: "sample-auth-code-abc123",
        state: "random-state-123",
    };

    if (currentRoute === "authorize") {
        return (
            <RoutePreview
                title="Authorize Route"
                subtitle="/authorize/:id - Primary device login with QR code"
                data={authorizeData}
                onBack={() => setCurrentRoute("menu")}
            >
                <AuthorizeApp backendData={authorizeData} />
            </RoutePreview>
        );
    }

    if (currentRoute === "authorize-external") {
        return (
            <RoutePreview
                title="Authorize External Route"
                subtitle="/authorize/:id/external - External device login"
                data={authorizeExternalData}
                onBack={() => setCurrentRoute("menu")}
            >
                <AuthorizeExternalApp backendData={authorizeExternalData} />
            </RoutePreview>
        );
    }

    if (currentRoute === "callback") {
        return (
            <RoutePreview
                title="Callback Route"
                subtitle="/callback - Success page"
                data={callbackData}
                onBack={() => setCurrentRoute("menu")}
            >
                <CallbackApp data={callbackData} />
            </RoutePreview>
        );
    }

    return (
        <>
            <nav class="container-fluid">
                <ul>
                    <li>
                        <strong>CFGuard Dev Preview</strong>
                    </li>
                </ul>
            </nav>

            <main class="container">
                <article>
                    <header>
                        <h1>Route Preview</h1>
                        <p>Select a route to preview with sample data</p>
                    </header>

                    <div class="grid">
                        <button onClick={() => setCurrentRoute("authorize")} class="outline">
                            <strong>Authorize Route</strong>
                            <br />
                            <small>/authorize/:id - Primary device</small>
                        </button>

                        <button onClick={() => setCurrentRoute("authorize-external")} class="outline">
                            <strong>Authorize External</strong>
                            <br />
                            <small>/authorize/:id/external - External device</small>
                        </button>

                        <button onClick={() => setCurrentRoute("callback")} class="outline">
                            <strong>Callback Route</strong>
                            <br />
                            <small>/callback - Success page</small>
                        </button>
                    </div>

                    <hr />

                    <h2>Sample Data</h2>
                    <details>
                        <summary>Authorize Route Data</summary>
                        <pre>
                            <code>{JSON.stringify(authorizeData, null, 2)}</code>
                        </pre>
                    </details>
                    <details>
                        <summary>Authorize External Route Data</summary>
                        <pre>
                            <code>{JSON.stringify(authorizeExternalData, null, 2)}</code>
                        </pre>
                    </details>
                    <details>
                        <summary>Callback Route Data</summary>
                        <pre>
                            <code>{JSON.stringify(callbackData, null, 2)}</code>
                        </pre>
                    </details>
                </article>
            </main>
        </>
    );
}
