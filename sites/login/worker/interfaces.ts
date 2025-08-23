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
