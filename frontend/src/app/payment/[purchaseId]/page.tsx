"use client";

import { useState, useEffect } from "react";
import {
  Check,
  CheckCircle,
  Clock,
  FileText,
  Info,
  Loader2,
  User,
  X,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { PAYMENT_STATUS, PaymentStatus, PaymentStatusEnum } from "@/schema";

const MoMoPaymentDemo = () => {
  const [paymentData, setPaymentData] = useState(null);
  const [qrCode, setQrCode] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>(
    PAYMENT_STATUS.PENDING
  );
  const [loading, setLoading] = useState(false);

  // Mock data từ backend
  const mockPaymentData = {
    orderId: "ORDER_20241201_001",
    amount: 299000,
    orderInfo: "Thanh toán khóa học ReactJS Advanced",
    customerName: "Nguyễn Văn Minh",
    customerPhone: "0987654321",
    customerEmail: "minh.nguyen@email.com",
    merchantName: "TechEdu Academy",
    payUrl:
      "https://test-payment.momo.vn/pay/store/techEduAcademy?t=bW9tb180MzIxNzY1NDMyMTA",
    qrCodeUrl:
      "https://test-payment.momo.vn/pay/store/techEduAcademy?t=bW9tb180MzIxNzY1NDMyMTA",
    expireTime: "2024-12-01 15:30:00",
    createdAt: "2024-12-01 15:00:00",
  };

  // Simulate nhận data từ backend
  const fetchPaymentData = async () => {
    setLoading(true);

    // Simulate API call
    setTimeout(() => {
      setPaymentData(mockPaymentData);
      setQrCode(mockPaymentData.qrCodeUrl);
      setLoading(false);
    }, 1500);
  };

  useEffect(() => {
    fetchPaymentData();
  }, []);

  const getStatusColor = () => {
    switch (paymentStatus) {
      case PAYMENT_STATUS.SUCCESS:
        return "text-green-600 bg-green-50 border-green-200";
      case PAYMENT_STATUS.FAILED:
        return "text-red-600 bg-red-50 border-red-200";
      case PAYMENT_STATUS.PENDING:
        return "text-blue-600 bg-blue-50 border-blue-200";
      default:
        return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getStatusText = () => {
    switch (paymentStatus) {
      case PAYMENT_STATUS.SUCCESS:
        return "Payment Successfully!";
      case PAYMENT_STATUS.FAILED:
        return "Payment Failed";
      case PAYMENT_STATUS.PENDING:
        return "Payment Loading...";
      default:
        return "QR Scanning...";
    }
  };

  const getStatusIcon = () => {
    switch (paymentStatus) {
      case PAYMENT_STATUS.SUCCESS:
        return <Check className="w-5 h-5 text-current" />;
      case PAYMENT_STATUS.FAILED:
        return <X className="w-5 h-5 text-current" />;
      case PAYMENT_STATUS.PENDING:
        return <Loader2 className="w-5 h-5 animate-spin text-current" />;
      default:
        return <Clock className="w-5 h-5 text-current" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-pink-500 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">
            Đang tải thông tin thanh toán...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-50 to-purple-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* QR Code Section */}
          <div className="bg-white rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-gray-800 mb-6">
                Payment QR
              </h2>

              {qrCode ? (
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <div className="bg-white p-6 rounded-2xl shadow-lg border-4 border-pink-100">
                      <img
                        src={qrCode}
                        alt={`Momo QR Payment for ${paymentData.eventName}`}
                        className="w-64 h-64 mx-auto"
                      />
                    </div>
                  </div>

                  {/* Payment Status */}
                  <div
                    className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full border ${getStatusColor()}`}
                  >
                    {getStatusIcon()}
                    <span className="font-semibold">{getStatusText()}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                    <button
                      onClick={() => window.open(paymentData.payUrl, "_blank")}
                      className="flex-1 bg-gradient-to-r from-pink-500 to-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-pink-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center space-x-2"
                    >
                      <CheckCircle className="w-5 h-5 text-white-500" />
                      <span>Open MoMo</span>
                    </button>
                  </div>
                  <button
                    onClick={() => {}}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-lg font-semibold hover:bg-gray-200 transition-colors"
                  >
                    Demo trạng thái
                  </button>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto mb-4"></div>
                  <p className="text-gray-600">QR Generating...</p>
                </div>
              )}
            </div>
          </div>

          {/* Payment Info Section */}
          <div className="space-y-6">
            {/* Order Information */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center space-x-2">
                <FileText className="w-6 h-6 text-pink-500" />
                <span>Purchase Information</span>
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">Purchase Code:</span>
                  <span className="font-semibold text-gray-800">
                    {paymentData?.orderId}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">Event:</span>
                  <span className="font-medium text-gray-800 text-right max-w-64">
                    {paymentData?.orderInfo}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">Organizer:</span>
                  <span className="font-medium text-gray-800">
                    {paymentData?.merchantName}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-gray-600 text-lg">Tổng tiền:</span>
                  <span className="font-bold text-2xl text-pink-600">
                    {formatCurrency(paymentData?.amount)}
                  </span>
                </div>
              </div>
            </div>

            {/* Customer Information */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center space-x-2">
                <User className="w-6 h-6 text-purple-500" />
                <span>Customer Information</span>
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">Họ tên:</span>
                  <span className="font-semibold text-gray-800">
                    {paymentData?.customerName}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">Số điện thoại:</span>
                  <span className="font-medium text-gray-800">
                    {paymentData?.customerPhone}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-gray-600">Email:</span>
                  <span className="font-medium text-gray-800">
                    {paymentData?.customerEmail}
                  </span>
                </div>
              </div>
            </div>

            {/* Time Information */}
            <div className="bg-white rounded-2xl shadow-xl p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center space-x-2">
                <Clock className="w-6 h-6 text-orange-500" />
                <span>Thời gian</span>
              </h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-100">
                  <span className="text-gray-600">Thời gian tạo:</span>
                  <span className="font-medium text-gray-800">
                    {formatDateTime(paymentData?.createdAt)}
                  </span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-gray-600">Hết hạn:</span>
                  <span className="font-medium text-orange-600">
                    {formatDateTime(paymentData?.expireTime)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-white rounded-2xl shadow-xl p-6">
          <h3 className="text-xl font-semibold text-gray-800 mb-6 flex items-center space-x-2">
            <Info className="w-6 h-6 text-blue-500" />
            <span>Payment Guide</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center space-y-3">
              <div className="bg-pink-100 text-pink-600 rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mx-auto">
                1
              </div>
              <p className="text-gray-700 font-medium">Open Momo</p>
              <p className="text-sm text-gray-500">
                Start Momo app on your smartphone
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="bg-purple-100 text-purple-600 rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mx-auto">
                2
              </div>
              <p className="text-gray-700 font-medium">Choose "Scan QR"</p>
              <p className="text-sm text-gray-500">
                Find and select QR scan feature
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="bg-blue-100 text-blue-600 rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mx-auto">
                3
              </div>
              <p className="text-gray-700 font-medium">QR Scan</p>
              <p className="text-sm text-gray-500">
                Scan the QR code on the screen
              </p>
            </div>
            <div className="text-center space-y-3">
              <div className="bg-green-100 text-green-600 rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold mx-auto">
                4
              </div>
              <p className="text-gray-700 font-medium">Payment Confirmation</p>
              <p className="text-sm text-gray-500">
                Check payment information and complete
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MoMoPaymentDemo;
