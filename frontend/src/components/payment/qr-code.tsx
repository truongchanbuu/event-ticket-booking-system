import { QRCODE_SIZE } from "@/constants/payment";
import QRCode from "react-qr-code";

interface QRCodeProps {
  value: string;
  size?: number;
  className?: string;
  bgColor?: string;
  fgColor?: string;
}

export default function TicketQRCode({
  value,
  size = QRCODE_SIZE,
  bgColor = "#ffffff",
  fgColor = "#000000",
  className = "rounded-md border",
}: QRCodeProps) {
  return (
    <QRCode
      value={value}
      size={size}
      bgColor={bgColor}
      fgColor={fgColor}
      className={className}
    />
  );
}
