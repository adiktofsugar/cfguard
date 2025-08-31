import { useMemo, useState } from "preact/hooks";

export function ClientGenerator() {
    const [clientName, setClientName] = useState("");
    const [redirectUri, setRedirectUri] = useState("");

    const normalizeClientName = (name: string) => {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-");
    };

    const clientId = useMemo(() => {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
    }, []);
    const clientSecret = useMemo(() => {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
    }, []);
    const filename = useMemo(() => `clients/${normalizeClientName(clientName)}.json`, [clientName]);

    const clientJson = useMemo(
        () =>
            clientId && clientSecret && clientName && redirectUri
                ? {
                      client_id: clientId,
                      client_secret: clientSecret,
                      client_name: clientName,
                      redirect_uris: [redirectUri],
                      grant_types: ["authorization_code", "refresh_token"],
                      response_types: ["code"],
                      token_endpoint_auth_method: "client_secret_post",
                      created_at: new Date().toISOString(),
                  }
                : null,
        [clientId, clientSecret, clientName, redirectUri],
    );

    const wranglerCommand = useMemo(
        () =>
            clientJson
                ? `echo '${JSON.stringify(clientJson).replace(/'/g, "'\\''")}' | npx wrangler r2 object put --pipe login/${filename}`
                : "",
        [clientJson],
    );

    return (
        <div class="generator-container">
            <h2>🔧 Client Registration Generator</h2>
            <div class="generator-form">
                <div class="form-group">
                    <label for="clientName">Client Name:</label>
                    <input
                        id="clientName"
                        type="text"
                        value={clientName}
                        onInput={(e) => {
                            setClientName((e.target as HTMLInputElement).value);
                        }}
                        placeholder="e.g., Sack of Rocks"
                    />
                    {clientName && (
                        <div class="filename-preview">
                            Filename: <code>clients/{normalizeClientName(clientName)}.json</code>
                        </div>
                    )}
                </div>

                <div class="form-group">
                    <label for="redirectUri">Redirect URI</label>
                    <input
                        id="redirectUri"
                        value={redirectUri}
                        onInput={(e) => {
                            setRedirectUri((e.target as HTMLInputElement).value);
                        }}
                        placeholder="https://example.com/callback"
                    />
                </div>
            </div>

            {clientJson ? (
                <div class="generated-output">
                    <div class="output-section">
                        <h3>Generated Client Configuration</h3>
                        <div class="json-output">
                            <pre>{JSON.stringify(clientJson, null, 2)}</pre>
                        </div>
                    </div>

                    <div class="output-section">
                        <h3>Wrangler R2 Upload Command</h3>
                        <div class="command-output">
                            <pre>{wranglerCommand}</pre>
                            <button
                                class="copy-button"
                                onClick={() => navigator.clipboard.writeText(wranglerCommand)}
                            >
                                📋 Copy Command
                            </button>
                        </div>
                    </div>

                    <div class="output-section credentials">
                        <h3>Save These Credentials</h3>
                        <div class="credential-item">
                            <strong>Client ID:</strong>
                            <code>{clientId}</code>
                        </div>
                        <div class="credential-item">
                            <strong>Client Secret:</strong>
                            <code>{clientSecret}</code>
                        </div>
                        <div class="warning">
                            ⚠️ Save these credentials immediately! The client secret cannot be
                            retrieved after this page is refreshed.
                        </div>
                    </div>
                </div>
            ) : (
                <div>Not enough information</div>
            )}
        </div>
    );
}
