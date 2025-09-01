interface BackendData {
    clientId: string;
    redirectUri: string;
    state?: string;
    responseType: string;
}

interface AuthorizeAppProps {
    data: BackendData;
}

export default function AuthorizeApp({ data }: AuthorizeAppProps) {
    return (
        <main class="container">
            <article>
                <header>
                    <h1>Sign In</h1>
                    <p>
                        Signing in to <strong>{data.clientId}</strong>
                    </p>
                </header>

                <form method="POST" action="/login">
                    <input type="hidden" name="client_id" value={data.clientId} />
                    <input type="hidden" name="redirect_uri" value={data.redirectUri} />
                    {data.state && <input type="hidden" name="state" value={data.state} />}

                    <label htmlFor="username">
                        Username
                        <input
                            type="text"
                            id="username"
                            name="username"
                            placeholder="Enter your username"
                            required
                        />
                    </label>

                    <label htmlFor="password">
                        Password
                        <input
                            type="password"
                            id="password"
                            name="password"
                            placeholder="Enter your password"
                            required
                        />
                    </label>

                    <button type="submit">Sign In</button>
                </form>
            </article>
        </main>
    );
}
