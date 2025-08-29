import { ClientGenerator } from "./ClientGenerator";
import { useEffect, useState } from "preact/hooks";
import { FaShield } from "react-icons/fa6";

export default function App() {
    const [isDarkMode, setIsDarkMode] = useState(true);

    useEffect(() => {
        const savedTheme = localStorage.getItem("theme");
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const shouldBeDark = savedTheme ? savedTheme === "dark" : prefersDark;
        setIsDarkMode(shouldBeDark);
        document.documentElement.setAttribute("data-theme", shouldBeDark ? "dark" : "light");
    }, []);

    const toggleDarkMode = () => {
        const newTheme = !isDarkMode;
        setIsDarkMode(newTheme);
        document.documentElement.setAttribute("data-theme", newTheme ? "dark" : "light");
        localStorage.setItem("theme", newTheme ? "dark" : "light");
    };

    return (
        <>
            <header class="container">
                <nav>
                    <ul>
                        <li>
                            <FaShield />
                        </li>
                    </ul>
                    <ul>
                        <li>
                            <button
                                onClick={toggleDarkMode}
                                class="contrast outline"
                                aria-label="Toggle dark mode"
                            >
                                {isDarkMode ? "Light Mode" : "Dark Mode"}
                            </button>
                        </li>
                    </ul>
                </nav>
            </header>
            <main>
                <div class="container">
                    <h1 class="pico-color-pink-350">CFGuard OIDC Provider</h1>
                    <p>
                        OpenID Connect authentication provider for Cloudflare Workers applications
                    </p>
                    <h2>Quick Start</h2>
                    <p>
                        <strong>CFGuard</strong> manages authentication for your applications
                        through OpenID Connect. Register clients by creating JSON configuration
                        files in the R2 bucket.
                    </p>

                    <h3>Three Easy Steps</h3>
                    <ol>
                        <li>
                            <strong>Generate</strong> a client configuration using the tool below
                        </li>
                        <li>
                            <strong>Upload</strong> the configuration to R2 using wrangler
                        </li>
                        <li>
                            <strong>Configure</strong> your application with the client credentials
                        </li>
                    </ol>

                    <hr />

                    <h2>Provider Endpoints</h2>
                    <table>
                        <thead>
                            <tr>
                                <th>Endpoint</th>
                                <th>URL</th>
                                <th>Purpose</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>
                                    <strong>Discovery</strong>
                                </td>
                                <td>
                                    <code>
                                        https://login.sackof.rocks/.well-known/openid-configuration
                                    </code>
                                </td>
                                <td>Provider metadata and endpoint URLs</td>
                            </tr>
                            <tr>
                                <td>
                                    <strong>Authorization</strong>
                                </td>
                                <td>
                                    <code>https://login.sackof.rocks/authorize</code>
                                </td>
                                <td>User authentication</td>
                            </tr>
                            <tr>
                                <td>
                                    <strong>Token</strong>
                                </td>
                                <td>
                                    <code>https://login.sackof.rocks/token</code>
                                </td>
                                <td>Exchange authorization codes for tokens</td>
                            </tr>
                            <tr>
                                <td>
                                    <strong>JWKS</strong>
                                </td>
                                <td>
                                    <code>https://login.sackof.rocks/jwks</code>
                                </td>
                                <td>Public keys for JWT verification</td>
                            </tr>
                        </tbody>
                    </table>

                    <hr />

                    <h2>Client Configuration Generator</h2>
                    <p>
                        Use this interactive tool to generate a complete client configuration with
                        secure credentials:
                    </p>

                    <ClientGenerator />

                    <hr />

                    <h2>Manual Configuration</h2>
                    <p>
                        If you prefer to create configurations manually, follow this specification:
                    </p>

                    <h3>JSON Structure</h3>
                    <pre>
                        <code>
                            {JSON.stringify(
                                {
                                    client_id: "unique-client-id-here",
                                    client_secret: "secure-secret-here",
                                    client_name: "Your Application Name",
                                    redirect_uris: [
                                        "https://your-app.com/callback",
                                        "https://your-app.com/auth/callback",
                                    ],
                                    grant_types: ["authorization_code", "refresh_token"],
                                    response_types: ["code"],
                                    token_endpoint_auth_method: "client_secret_post",
                                    created_at: "2024-01-01T00:00:00Z",
                                },
                                null,
                                2,
                            )}
                        </code>
                    </pre>

                    <h3>Upload to R2</h3>
                    <pre>
                        <code>{`wrangler r2 object put login/clients/your-client-name.json --file ./client-config.json`}</code>
                    </pre>

                    <h3>File Naming Rules</h3>
                    <ul>
                        <li>
                            <strong>Location:</strong> Store in <code>clients/</code> directory
                        </li>
                        <li>
                            <strong>Format:</strong> Use lowercase with hyphens (e.g.,{" "}
                            <code>my-app.json</code>)
                        </li>
                        <li>
                            <strong>Content:</strong> Valid JSON with all required fields
                        </li>
                    </ul>
                </div>
            </main>
        </>
    );
}
