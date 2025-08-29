import { useState } from "preact/hooks";

export function ClientGenerator() {
    const [clientName, setClientName] = useState("");
    const [redirectUris, setRedirectUris] = useState("");
    const [generated, setGenerated] = useState(false);

    const generateClientId = () => {
        const array = new Uint8Array(16);
        crypto.getRandomValues(array);
        return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
    };

    const generateClientSecret = () => {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
    };

    const normalizeClientName = (name: string) => {
        return name
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-");
    };

    const handleGenerate = () => {
        if (!clientName.trim()) return;
        setGenerated(true);
    };

    const clientId = generated ? generateClientId() : "";
    const clientSecret = generated ? generateClientSecret() : "";
    const filename = generated ? `clients/${normalizeClientName(clientName)}.json` : "";
    const uriArray = redirectUris
        .split("\n")
        .map((uri) => uri.trim())
        .filter((uri) => uri.length > 0);

    const clientJson = generated
        ? JSON.stringify(
              {
                  client_id: clientId,
                  client_secret: clientSecret,
                  client_name: clientName,
                  redirect_uris: uriArray,
                  grant_types: ["authorization_code", "refresh_token"],
                  response_types: ["code"],
                  token_endpoint_auth_method: "client_secret_post",
                  created_at: new Date().toISOString(),
              },
              null,
              2
          )
        : "";

    const wranglerCommand = generated
        ? `echo '${clientJson.replace(/'/g, "'\\''")}' | wrangler r2 object put login/${filename}`
        : "";

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
                            setGenerated(false);
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
                    <label for="redirectUris">Redirect URIs (one per line):</label>
                    <textarea
                        id="redirectUris"
                        value={redirectUris}
                        onInput={(e) => {
                            setRedirectUris((e.target as HTMLTextAreaElement).value);
                            setGenerated(false);
                        }}
                        placeholder="https://example.com/callback&#10;https://example.com/auth/callback"
                        rows={4}
                    />
                </div>

                <button onClick={handleGenerate} disabled={!clientName.trim()}>
                    Generate Client Configuration
                </button>
            </div>

            {generated && (
                <div class="generated-output">
                    <div class="output-section">
                        <h3>Generated Client Configuration</h3>
                        <div class="json-output">
                            <pre>{clientJson}</pre>
                            <button
                                class="copy-button"
                                onClick={() => navigator.clipboard.writeText(clientJson)}
                            >
                                📋 Copy JSON
                            </button>
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
            )}
        </div>
    );
}