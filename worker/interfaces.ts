export interface Env {
    LOGIN_STORAGE: R2Bucket;
    ASSETS: Fetcher;
    R2_BUCKET_NAME: string;
    LOG_LEVEL?: string;
}

export interface UserData {
    sub: string;
    username: string;
    passwordHash: string;
    name: string;
    email: string;
    email_verified: boolean;
}

export interface JWTPayload {
    sub: string;
    name: string;
    email: string;
    email_verified: boolean;
    iat: number;
    exp: number;
    iss: string;
    aud: string;
    nonce?: string;
    preferred_username?: string;
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
