import type { WebSocketStatus as TWebSocketStatus } from "../interfaces";

export default function WebSocketStatus({ wsStatus }: { wsStatus: TWebSocketStatus }) {
    if (wsStatus.type === "connecting")
        return <article class="pico-background-yellow-500">Connecting...</article>;
    if (wsStatus.type === "disconnected")
        return <article class="pico-background-red-500">Disconnected</article>;
    return null;
}
