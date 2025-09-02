import { type Signal, signal } from "@preact/signals";
import { useEffect } from "preact/hooks";
import type { User } from "./interfaces";

const apiError = signal("");
const isLoading = signal(false);

interface Props {
    users: Signal<User[] | null>;
}

export function UserTable({ users }: Props) {
    useEffect(() => {
        loadExistingUsers();
    }, []);

    const loadExistingUsers = async () => {
        isLoading.value = true;
        try {
            const response = await fetch("/api/users");
            if (response.ok) {
                const data = await response.json<{ users: User[] }>();
                users.value = data.users;
            }
        } catch (error) {
            console.error("Failed to load existing users:", error);
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

    return users.value?.length ? (
        <article>
            <h3>Existing Users</h3>
            <table>
                <thead>
                    <tr>
                        <th>Email</th>
                        <th>Created</th>
                    </tr>
                </thead>
                <tbody>
                    {users.value.map((user) => (
                        <tr key={user.email}>
                            <td>{user.email}</td>
                            <td>{new Date(user.created_at).toLocaleDateString()}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </article>
    ) : (
        <article>No existing users</article>
    );
}
