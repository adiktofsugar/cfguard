import { useState } from "preact/hooks";
import AuthorizeApp from "../app/routes/authorize/AuthorizeApp";
import CallbackApp from "../app/routes/callback/CallbackApp";
import RoutePreview from "./RoutePreview";

export default function DevApp() {
    const [currentRoute, setCurrentRoute] = useState<"menu" | "authorize" | "callback">("menu");

    // Sample data for each route
    const authorizeData = {
        clientId: "example-client-id",
        redirectUri: "https://example.com/callback",
        state: "random-state-123",
        responseType: "code",
    };

    const callbackData = {
        code: "sample-auth-code-abc123",
        state: "random-state-123",
    };

    if (currentRoute === "authorize") {
        return (
            <RoutePreview
                title="Authorize Route"
                subtitle="/authorize - Login form"
                data={authorizeData}
                onBack={() => setCurrentRoute("menu")}
            >
                <AuthorizeApp data={authorizeData} />
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
                            <small>/authorize - Login form</small>
                        </button>

                        <button onClick={() => setCurrentRoute("callback")} class="outline">
                            <strong>Callback Route</strong>
                            <br />
                            <small>/callback - Success page</small>
                        </button>
                    </div>

                    <hr />

                    <h2>Sample Data</h2>
                    <div class="grid">
                        <div>
                            <h3>Authorize Route Data</h3>
                            <pre><code>{JSON.stringify(authorizeData, null, 2)}</code></pre>
                        </div>
                        <div>
                            <h3>Callback Route Data</h3>
                            <pre><code>{JSON.stringify(callbackData, null, 2)}</code></pre>
                        </div>
                    </div>
                </article>
            </main>
        </>
    );
}