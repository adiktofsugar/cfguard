import { signal } from "@preact/signals";

interface LoginFormProps {
    clientId: string;
    redirectUri: string;
    state?: string;
    disabled: boolean;
}

const email = signal("");
const password = signal("");
const error = signal("");
const loading = signal(false);

export default function LoginForm({ clientId, redirectUri, state, disabled }: LoginFormProps) {
    const handleSubmit = async (e: Event) => {
        e.preventDefault();
        error.value = "";
        loading.value = true;

        const formData = new FormData();
        formData.append("email", email.value);
        formData.append("password", password.value);
        formData.append("client_id", clientId);
        formData.append("redirect_uri", redirectUri);
        if (state) {
            formData.append("state", state);
        }

        try {
            const response = await fetch("/login", {
                method: "POST",
                body: formData,
            });

            if (response.redirected) {
                window.location.href = response.url;
            } else if (!response.ok) {
                const text = await response.text();
                error.value = text || "Login failed";
                loading.value = false;
            }
        } catch (err) {
            console.error("Login error:", err);
            error.value = "An error occurred during login";
            loading.value = false;
        }
    };

    if (disabled) {
        return (
            <div class="text-center py-8">
                <div class="mb-4">
                    <i class="fas fa-spinner fa-spin fa-2x text-indigo-600"></i>
                </div>
                <p>Waiting for external device to complete login...</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} class="space-y-6">
            <div>
                <label htmlFor="email">Email</label>
                <input
                    id="email"
                    name="email"
                    type="text"
                    required
                    value={email}
                    onInput={(e) => {
                        email.value = (e.target as HTMLInputElement).value;
                    }}
                    class="mt-1 block w-full px-3 py-2 border rounded-md"
                />
            </div>

            <div>
                <label htmlFor="password">Password</label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    required
                    value={password}
                    onInput={(e) => {
                        password.value = (e.target as HTMLInputElement).value;
                    }}
                    class="mt-1 block w-full px-3 py-2 border rounded-md"
                />
            </div>

            {error.value && (
                <div class="bg-red-50 p-4 rounded-md">
                    <p class="text-red-800">{error}</p>
                </div>
            )}

            <button
                type="submit"
                disabled={loading.value}
                class="w-full py-2 px-4 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
                {loading.value ? "Signing in..." : "Sign in"}
            </button>
        </form>
    );
}
