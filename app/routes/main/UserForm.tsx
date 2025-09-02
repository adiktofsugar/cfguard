import { computed, signal, type Signal } from "@preact/signals";
import { useMemo } from "preact/hooks";
import type { User } from "./interfaces";

interface Props {
    r2BucketName: string;
    isLocalR2: boolean;
    users: Signal<User[] | null>;
}

interface UserJson {
    sub: string;
    hashFunction: "sha256";
    passwordHash: string;
    email: string;
}

const email = signal("");
const plaintextPassword = signal("");
const userJson = signal<UserJson | null>(null);
const isSubmitting = signal(false);

async function sha256(text: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(text);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return hashHex;
}

export default function UserForm({ r2BucketName, isLocalR2, users }: Props) {
    const sub = useMemo(() => crypto.randomUUID(), []);

    const userKey = computed(() => `user:${email.value}`);
    const userFilename = computed(() => `user_${email.value}.json`);

    const isValidEmail = computed(() => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email.value);
    });

    const wranglerUploadCommand = computed(() =>
        userKey.value
            ? `npx wrangler r2 object put ${r2BucketName}/${userKey.value} --file ${userFilename.value}${isLocalR2 ? " --local" : ""}`
            : "",
    );

    const wranglerDeleteCommand = computed(() =>
        userKey.value
            ? `npx wrangler r2 object delete ${r2BucketName}/${userKey.value}${isLocalR2 ? " --local" : ""}`
            : "",
    );

    const userExists = computed(() => {
        if (!users.value || !users.value?.length) return false;
        return users.value.some((u) => u.email === email.value);
    });

    const handleDownload = () => {
        if (!userJson.value) return;

        const blob = new Blob([JSON.stringify(userJson.value, null, 2)], {
            type: "application/json",
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = userFilename.value;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        if (isSubmitting.value || !email.value || !plaintextPassword.value || !isValidEmail.value)
            return;
        isSubmitting.value = true;
        userJson.value = {
            sub: sub,
            hashFunction: "sha256",
            passwordHash: await sha256(plaintextPassword.value),
            email: email.value,
        };
        isSubmitting.value = false;
    };

    return (
        <div>
            <h3>Create New User</h3>
            <form class="generator-form" onSubmit={handleSubmit}>
                <div class="form-group">
                    <label for="email">Email</label>
                    <input
                        id="email"
                        type="email"
                        value={email.value}
                        onInput={(e) => {
                            email.value = (e.target as HTMLInputElement).value;
                        }}
                        placeholder="john@example.com"
                        required
                    />
                    {email.value && !isValidEmail.value && (
                        <div class="error-text">Please enter a valid email address</div>
                    )}
                </div>

                <div class="form-group">
                    <label for="password">Password</label>
                    <input
                        id="password"
                        type="password"
                        value={plaintextPassword.value}
                        onInput={(e) => {
                            plaintextPassword.value = (e.target as HTMLInputElement).value;
                        }}
                        placeholder="Enter a secure password"
                        required
                    />
                </div>

                <button type="submit" disabled={!isValidEmail.value || isSubmitting.value}>
                    Generate User
                </button>
            </form>

            {isSubmitting.value && <progress />}

            {userExists.value && (
                <div class="error-message">
                    <h3>⚠️ User Already Exists</h3>
                    <p>
                        The user <code>{email.value}</code> already exists. To delete it:
                    </p>

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
                </div>
            )}

            {!userExists.value && userJson.value ? (
                <div class="generated-output">
                    <div class="output-section">
                        <h3>Generated User Configuration</h3>
                        <div class="filename-preview">
                            Storage Key: <code>{userKey.value}</code>
                        </div>
                        <button onClick={handleDownload} class="download-button">
                            💾 Download JSON
                        </button>
                        <div class="json-output">
                            <pre>{JSON.stringify(userJson.value, null, 2)}</pre>
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
