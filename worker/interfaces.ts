export interface Env {
    LOGIN_STORAGE: R2Bucket;
    ASSETS: Fetcher;
    R2_BUCKET_NAME: string;
    LOG_LEVEL?: string;
}

export interface UserData {
    sub: string;
    passwordHash: string;
    email: string;
}

export interface JWTPayload {
    sub: string;
    email: string;
    iat: number;
    exp: number;
    iss: string;
    aud: string;
    nonce?: string;
}

export interface ClientInfo {
    client_id: string;
    client_secret: string;
    redirect_uris: string[];
    [key: string]: any;
}

export interface ValidationResult {
    valid: boolean;
    error?: string;
}
