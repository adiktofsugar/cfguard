import { signal } from "@preact/signals";

export default class AppStore {
    pending = signal(false);
    data = signal<unknown | null>(null);
    error = signal<string | null>(null);
    clear() {
        this.data.value = null;
        this.error.value = null;
        this.fetch();
    }
    async fetch() {
        this.pending.value = true;
        try {
            const response = await fetch("/api/awesome");
            if (!response.ok) {
                throw new Error(`Response not ok: Status ${response.status}`);
            }
            this.data.value = await response.text();
        } catch (e) {
            console.error(e);
            this.error.value = String(e);
        } finally {
            this.pending.value = false;
        }
    }
}
