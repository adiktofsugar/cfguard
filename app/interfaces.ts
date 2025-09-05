export type WebSocketStatusDisconnected = {
    type: "disconnected";
};
export type WebSocketStatusConnecting = {
    type: "connecting";
};
export type WebSocketStatusConnected = {
    type: "connected";
};
export type WebSocketStatus =
    | WebSocketStatusDisconnected
    | WebSocketStatusConnecting
    | WebSocketStatusConnected;
