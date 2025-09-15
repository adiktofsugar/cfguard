export interface LoginErrorResponse {
    success: false;
    error: string;
}
export interface LoginSuccessResponse {
    success: true;
    redirectUrl: string;
}

export type LoginResponse = LoginErrorResponse | LoginSuccessResponse;
