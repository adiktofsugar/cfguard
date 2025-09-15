interface QRCodeDisplayProps {
    sessionId: string;
}

export default function QRCodeDisplay({ sessionId }: QRCodeDisplayProps) {
    return <img src={`/qrcode/${sessionId}`} alt="QR Code for external device login" />;
}
