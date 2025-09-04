export interface JWKWithKid extends JsonWebKey {
    kid?: string;
}

async function generateRSAKeyPair(): Promise<CryptoKeyPair> {
    return await crypto.subtle.generateKey(
        {
            name: "RSASSA-PKCS1-v1_5",
            modulusLength: 2048,
            publicExponent: new Uint8Array([1, 0, 1]),
            hash: "SHA-256",
        },
        true,
        ["sign", "verify"],
    );
}

async function exportJWK(key: CryptoKey): Promise<JWKWithKid> {
    const jwk = (await crypto.subtle.exportKey("jwk", key)) as JWKWithKid;
    jwk.kid = crypto.randomUUID();
    jwk.use = "sig";
    jwk.alg = "RS256";
    return jwk;
}

export async function getOrCreateKeyPair(
    env: Env,
): Promise<{ privateKey: CryptoKey; publicJwk: JWKWithKid }> {
    const storedKey = await env.LOGIN_STORAGE.get("signing-key.json");

    if (storedKey) {
        const keyData = JSON.parse(await storedKey.text());
        const privateKey = await crypto.subtle.importKey(
            "jwk",
            keyData.privateJwk,
            { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
            true,
            ["sign"],
        );
        return { privateKey, publicJwk: keyData.publicJwk };
    }

    const keyPair = await generateRSAKeyPair();
    const privateJwk = await exportJWK(keyPair.privateKey);
    const publicJwk = await exportJWK(keyPair.publicKey);

    await env.LOGIN_STORAGE.put(
        "signing-key.json",
        JSON.stringify({
            privateJwk,
            publicJwk,
        }),
    );

    return { privateKey: keyPair.privateKey, publicJwk };
}
