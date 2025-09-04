export interface User {
    email: string;
    created_at: string;
}
export interface Client {
    client_id: string;
    redirect_uris: string[];
    created_at: string;
    client_secret: string;
}

export interface BackendData {
    message: string;
    isLocalR2: boolean;
    r2BucketName: string;
}
