import type { JWTPayload } from "../interfaces";
import { base64UrlEncode } from "./crypto";

export async function signJWT(
    payload: JWTPayload,
    privateKey: CryptoKey,
    kid: string,
): Promise<string> {
    const header = {
        alg: "RS256",
        typ: "JWT",
        kid,
    };

    const encodedHeader = base64UrlEncode(new TextEncoder().encode(JSON.stringify(header)).buffer);
    const encodedPayload = base64UrlEncode(
        new TextEncoder().encode(JSON.stringify(payload)).buffer,
    );

    const message = `${encodedHeader}.${encodedPayload}`;
    const signature = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        privateKey,
        new TextEncoder().encode(message),
    );

    return `${message}.${base64UrlEncode(signature)}`;
}
