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

    return <img src={qrCodeUrl} alt="QR Code for external device login" />;
}
