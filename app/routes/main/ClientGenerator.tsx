import { useMemo } from "preact/hooks";
import { signal, computed } from "@preact/signals";

const clientName = signal("");
const redirectUri = signal("");
const isSubmitted = signal(false);
const clientExists = signal(false);
const isChecking = signal(false);
const apiError = signal("");

interface ClientGeneratorProps {
    isLocalR2: boolean;
    r2BucketName: string;
}

export function ClientGenerator({ isLocalR2, r2BucketName }: ClientGeneratorProps) {
    const clientId = computed(() => {
        return clientName.value
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-")
            .replace(/^-|-$/g, "");
    });
    const clientSecret = useMemo(() => {
        const array = new Uint8Array(32);
        crypto.getRandomValues(array);
        return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
    }, []);

    const filename = computed(() => `clients/${clientId.value}.json`);

    const clientJson = computed(() =>
        clientId.value && clientSecret && redirectUri.value
            ? {
                  client_id: clientId.value,
                  client_secret: clientSecret,
                  redirect_uris: [redirectUri.value],
                  grant_types: ["authorization_code", "refresh_token"],
                  response_types: ["code"],
                  token_endpoint_auth_method: "client_secret_post",
                  created_at: new Date().toISOString(),
              }
            : null,
    );

    const wranglerUploadCommand = computed(() =>
        clientId.value
            ? `npx wrangler r2 object put ${r2BucketName}/${filename.value} --file ${clientId.value}.json${isLocalR2 ? " --local" : ""}`
            : "",
    );

    const wranglerDeleteCommand = computed(() =>
        clientId.value
            ? `npx wrangler r2 object delete ${r2BucketName}/${filename.value}${isLocalR2 ? " --local" : ""}`
            : "",
    );

    const handleDownload = () => {
        if (!clientJson.value) return;

        const blob = new Blob([JSON.stringify(clientJson.value, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${clientId.value}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        if (!clientId.value || !redirectUri.value) return;

        isChecking.value = true;
        clientExists.value = false;
        apiError.value = "";

        try {
            const response = await fetch(`/api/client-check/${clientId.value}`);

            if (!response.ok) {
                throw new Error(`API request failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json<{ exists: boolean; clientId: string }>();

            if (data.exists) {
                clientExists.value = true;
                isSubmitted.value = false;
            } else {
                isSubmitted.value = true;
                clientExists.value = false;
            }
        } catch (error) {
            console.error("Error checking client:", error);
            apiError.value =
                error instanceof Error ? error.message : "Failed to check client availability";
            isSubmitted.value = false;
        } finally {
            isChecking.value = false;
        }
    };

    const handleRetry = () => {
        clientExists.value = false;
        handleSubmit(new Event("submit"));
    };

    return (
        <div class="generator-container">
            <h2>🔧 Client Registration Generator</h2>
            <form class="generator-form" onSubmit={handleSubmit}>
                <div class="form-group">
                    <label for="clientName">Client ID / Application Name</label>
                    <input
                        id="clientName"
                        value={clientName.value}
                        onInput={(e) => {
                            clientName.value = (e.target as HTMLInputElement).value;
                            isSubmitted.value = false;
                            clientExists.value = false;
                            apiError.value = "";
                        }}
                        placeholder="my-app-name"
                        required
                    />
                    {clientName.value && (
                        <div class="filename-preview">
                            Client ID: <code>{clientId.value}</code>
                        </div>
                    )}
                </div>
                <div class="form-group">
                    <label for="redirectUri">Redirect URI</label>
                    <input
                        id="redirectUri"
                        value={redirectUri.value}
                        onInput={(e) => {
                            redirectUri.value = (e.target as HTMLInputElement).value;
                        }}
                        placeholder="https://example.com/callback"
                        required
                    />
                </div>
                <button
                    type="submit"
                    disabled={isChecking.value || !clientId.value || !redirectUri.value}
                >
                    {isChecking.value ? "Checking..." : "Generate Client"}
                </button>
            </form>

            {apiError.value && (
                <div class="error-message">
                    <h3>❌ Error</h3>
                    <p>{apiError.value}</p>
                </div>
            )}

            {clientExists.value && (
                <div class="error-message">
                    <h3>⚠️ Client Already Exists</h3>
                    <p>
                        The client <code>{clientId.value}</code> already exists. To update it:
                    </p>
                    <ol>
                        <li>Download the updated configuration</li>
                        <li>
                            Either upload the updated JSON with:
                            <div class="command-output">
                                <pre>{wranglerUploadCommand.value}</pre>
                                <button
                                    class="copy-button"
                                    onClick={() =>
                                        navigator.clipboard.writeText(wranglerUploadCommand.value)
                                    }
                                >
                                    📋 Copy
                                </button>
                            </div>
                        </li>
                        <li>
                            Or delete the existing client and retry:
                            <div class="command-output">
                                <pre>{wranglerDeleteCommand.value}</pre>
                                <button
                                    class="copy-button"
                                    onClick={() =>
                                        navigator.clipboard.writeText(wranglerDeleteCommand.value)
                                    }
                                >
                                    📋 Copy
                                </button>
                            </div>
                            <button onClick={handleRetry} class="retry-button">
                                🔄 Retry
                            </button>
                        </li>
                    </ol>
                </div>
            )}

            {isSubmitted.value && !clientExists.value && clientJson.value ? (
                <div class="generated-output">
                    <div class="output-section">
                        <h3>Generated Client Configuration</h3>
                        <div class="filename-preview">
                            Filename: <code>{clientId.value}.json</code>
                        </div>
                        <button onClick={handleDownload} class="download-button">
                            💾 Download JSON
                        </button>
                        <div class="json-output">
                            <pre>{JSON.stringify(clientJson.value, null, 2)}</pre>
                        </div>
                    </div>

                    <div class="output-section">
                        <h3>Upload Instructions</h3>
                        <ol>
                            <li>Download the JSON file using the button above</li>
                            <li>
                                Upload to R2 with this command:
                                <div class="command-output">
                                    <pre>{wranglerUploadCommand.value}</pre>
                                    <button
                                        class="copy-button"
                                        onClick={() =>
                                            navigator.clipboard.writeText(
                                                wranglerUploadCommand.value,
                                            )
                                        }
                                    >
                                        📋 Copy Command
                                    </button>
                                </div>
                            </li>
                        </ol>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
