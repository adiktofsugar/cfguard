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

export interface LoginResult {
    success: boolean;
    code?: string;
    error?: string;
}

export interface OIDCParams {
    clientId: string;
    redirectUri: string;
    state?: string;
}

export interface AuthorizeBackendData {
    sessionId: string;
    clientId: string;
    redirectUri: string;
    state?: string;
    responseType: string;
    externalUrl: string;
}

export interface AuthorizeExternalBackendData {
    sessionId: string;
}

export interface CallbackBackendData {
    code?: string;
    state?: string;
}

export interface MainBackendData {
    message: string;
    isLocalR2: boolean;
    r2BucketName: string;
}
