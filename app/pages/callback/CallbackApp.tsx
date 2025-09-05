import type { CallbackBackendData } from "../../interfaces";

interface CallbackAppProps {
    data: CallbackBackendData;
}

export default function CallbackApp({ data }: CallbackAppProps) {
    return (
        <main class="container">
            <article>
                <header>
                    <h1>Authorization Successful</h1>
                </header>

                {data.code && (
                    <p>
                        <strong>Authorization Code:</strong>
                        <br />
                        <code>{data.code}</code>
                    </p>
                )}

                {data.state && (
                    <p>
                        <strong>State:</strong>
                        <br />
                        <code>{data.state}</code>
                    </p>
                )}

                <p>You may now close this window and return to your application.</p>
            </article>
        </main>
    );
}
