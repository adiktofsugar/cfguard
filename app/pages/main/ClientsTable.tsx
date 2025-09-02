import { type Signal, signal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { Client } from "./interfaces";

const apiError = signal("");
const isLoading = signal(false);

interface Props {
    clients: Signal<Client[] | null>;
}

export function ClientsTable({ clients }: Props) {
    useEffect(() => {
        loadExistingClients();
    }, []);

    const loadExistingClients = async () => {
        isLoading.value = true;
        try {
            const response = await fetch("/api/clients");
            if (response.ok) {
                const data = await response.json<{ clients: Client[] }>();
                clients.value = data.clients;
            }
        } catch (error) {
            console.error("Failed to load existing clients:", error);
            apiError.value = String(error);
        } finally {
            isLoading.value = false;
        }
    };

    if (isLoading.value) {
        return <progress />;
    }
    if (apiError.value) {
        return <article class="pico-background-red-500 pico-color-white">{apiError.value}</article>;
    }

    return clients.value?.length ? (
        <article>
            <h3>Existing Clients</h3>
            <table>
                <thead>
                    <tr>
                        <th>Client ID</th>
                        <th>Redirect URIs</th>
                        <th>Created</th>
                    </tr>
                </thead>
                <tbody>
                    {clients.value.map((client) => (
                        <tr key={client.client_id}>
                            <td>
                                <code>{client.client_id}</code>
                            </td>
                            <td>
                                {client.redirect_uris.map((uri) => (
                                    <div>
                                        <code>{uri}</code>
                                    </div>
                                ))}
                            </td>
                            <td>{new Date(client.created_at).toLocaleDateString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </article>
    ) : (
        <article>No existing clients</article>
    );
}
