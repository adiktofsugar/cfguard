import { faShield } from "@fortawesome/free-solid-svg-icons";
import { useEffect, useState } from "preact/hooks";
import { FontAwesomeIcon } from "../../components/FontAwesomeIcon";
import type { MainBackendData } from "../../interfaces";
import { ClientGenerator } from "./ClientGenerator";
import { UserGenerator } from "./UserGenerator";

interface AppProps {
    backendData: MainBackendData;
}

export default function App({ backendData }: AppProps) {
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
                            <FontAwesomeIcon title="CFGuard" icon={faShield} size={24} />
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
                        <strong>CFGuard</strong> manages authentication for your applications
                        through OpenID Connect. Register clients by creating JSON configuration
                        files in the R2 bucket.
                    </p>

                    <div class="grid">
                        <UserGenerator
                            r2BucketName={backendData.r2BucketName}
                            isLocalR2={backendData.isLocalR2}
                        />

                        <ClientGenerator
                            r2BucketName={backendData.r2BucketName}
                            isLocalR2={backendData.isLocalR2}
                        />
                    </div>

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
                                        GET {location.origin}/.well-known/openid-configuration
                                    </code>
                                </td>
                                <td>Provider metadata and endpoint URLs</td>
                            </tr>
                            <tr>
                                <td>
                                    <strong>Authorization</strong>
                                </td>
                                <td>
                                    <code>GET {location.origin}/authorize</code>
                                </td>
                                <td>User authentication</td>
                            </tr>
                            <tr>
                                <td>
                                    <strong>Token</strong>
                                </td>
                                <td>
                                    <code>POST {location.origin}/token</code>
                                </td>
                                <td>Exchange authorization codes for tokens</td>
                            </tr>
                            <tr>
                                <td>
                                    <strong>JWKS</strong>
                                </td>
                                <td>
                                    <code>GET {location.origin}/.well-known/jwks.json</code>
                                </td>
                                <td>Public keys for JWT verification</td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </main>
        </>
    );
}
