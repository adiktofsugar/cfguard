import { computed, type Signal, signal } from "@preact/signals";
import { useMemo } from "preact/hooks";
import type { Client } from "./interfaces";

const clientName = signal("");
const redirectUri = signal("");
const clientJson = signal<Client | null>(null);

interface Props {
    r2BucketName: string;
    isLocalR2: boolean;
    clients: Signal<Client[] | null>;
}

export default function ClientsForm({ r2BucketName, isLocalR2, clients }: Props) {
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

    const clientExists = computed(() => {
        if (!clients.value || !clients.value?.length || !clientId.value) {
            return false;
        }
        return clients.value.some((c) => c.client_id === clientId.value);
    });

    const filename = computed(() => `clients/${clientId.value}.json`);

    const wranglerUploadCommand = computed(() =>
        clientId.value
            ? `npx wrangler r2 object put ${r2BucketName}/${filename.value} --file ${clientId.value}.json${isLocalR2 ? " --local" : ""}`
            : "",
    );

    const wranglerDeleteCommand = computed(() =>
        clientId.value
            ? `npx wrangler r2 object delete ${r2BucketName}/${filename.value}${isLocalR2 ? " --local" : "--remote"}`
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
        // clientId.value && clientSecret && redirectUri.value
        clientJson.value = {
            client_id: clientId.value,
            client_secret: clientSecret,
            redirect_uris: [redirectUri.value],
            created_at: new Date().toISOString(),
        };
    };

    return (
        <div>
            <h3>Create New Client</h3>
            <form class="generator-form" onSubmit={handleSubmit}>
                <div class="form-group">
                    <label for="clientName">Client ID / Application Name</label>
                    <input
                        id="clientName"
                        value={clientName.value}
                        onInput={(e) => {
                            clientName.value = (e.target as HTMLInputElement).value;
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
                <button type="submit" disabled={!clientId.value || !redirectUri.value}>
                    Generate Client
                </button>
            </form>

            {clientExists.value && (
                <div class="error-message">
                    <h3>⚠️ Client Already Exists</h3>
                    <p>
                        The client <code>{clientId.value}</code> already exists. To delete it:
                    </p>

                    <div>
                        <pre>{wranglerDeleteCommand.value}</pre>
                        <button
                            onClick={() =>
                                navigator.clipboard.writeText(wranglerDeleteCommand.value)
                            }
                        >
                            📋 Copy
                        </button>
                    </div>
                </div>
            )}

            {clientJson.value ? (
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
                                <div>
                                    <pre>{wranglerUploadCommand.value}</pre>
                                    <button
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
