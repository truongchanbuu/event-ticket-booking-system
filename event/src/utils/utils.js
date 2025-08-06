/**
 * Tạo một URL để sinh ra ảnh QR code.
 * @param {string} attendeeID - ID độc nhất của attendee.
 * @param {string} eventID - ID của sự kiện.
 * @returns {string} URL trỏ đến ảnh QR code.
 */
function generateQrCodeUrl(attendeeID, eventID) {
    // Cách 1: Mã hóa một URL trỏ về ứng dụng của bạn (Khuyến khích)
    // Khi quét QR này, nó sẽ mở ra trang web của bạn để xử lý check-in
    const checkInUrl = `https://your-app.com/check-in?event=${eventID}&attendee=${attendeeID}`;

    // Sử dụng một API để biến URL trên thành ảnh QR
    // encodeURIComponent là rất quan trọng để đảm bảo URL hợp lệ
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(checkInUrl)}`;

    // Cách 2: Đơn giản là mã hóa ID (ít linh hoạt hơn)
    // return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${attendeeID}`;
}
