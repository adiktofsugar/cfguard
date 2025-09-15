import type { WebSocketStatus as TWebSocketStatus } from "../interfaces";

export default function WebSocketStatus({ wsStatus }: { wsStatus: TWebSocketStatus }) {
    if (wsStatus.type === "connecting") return <article>Connecting...</article>;
    if (wsStatus.type === "disconnected") return <article>Disconnected</article>;
    return null;
}
