import { useEffect, useState } from "preact/hooks";
import QRCode from "qrcode";

interface QRCodeDisplayProps {
    url: string;
}

export default function QRCodeDisplay({ url }: QRCodeDisplayProps) {
    const [qrCodeUrl, setQrCodeUrl] = useState<string>("");

    useEffect(() => {
        QRCode.toDataURL(url, {
            width: 256,
            margin: 2,
            color: {
                dark: "#000000",
                light: "#FFFFFF",
            },
        })
            .then((url) => {
                setQrCodeUrl(url);
            })
            .catch((err) => {
                console.error("Failed to generate QR code:", err);
            });
    }, [url]);

    if (!qrCodeUrl) return null;

    return (
        <div class="mb-6">
            <p class="text-center mb-4">Scan this QR code with another device to sign in there</p>
            <div class="flex justify-center">
                <img src={qrCodeUrl} alt="QR Code for external device login" />
            </div>
            <div class="mt-4 relative">
                <div class="absolute inset-0 flex items-center">
                    <div class="w-full border-t" />
                </div>
                <div class="relative flex justify-center text-sm">
                    <span class="px-2 bg-white">Or sign in here</span>
                </div>
            </div>
        </div>
    );
}
