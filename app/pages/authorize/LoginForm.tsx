import { signal } from "@preact/signals";

interface LoginFormProps {
    clientId: string;
    redirectUri: string;
    state?: string;
}

const email = signal("");
const password = signal("");
const error = signal("");
const loading = signal(false);

export default function LoginForm({ clientId, redirectUri, state }: LoginFormProps) {
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

    return (
        <form onSubmit={handleSubmit}>
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
                />
            </div>

            {error.value && (
                <article class="pico-background-red-100 pico-color-red-600">{error}</article>
            )}

            <button type="submit" disabled={loading.value}>
                {loading.value ? "Signing in..." : "Sign in"}
            </button>
        </form>
    );
}
