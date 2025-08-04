// // Collection: 'events'

// // Document ID: eventID (e.g., auto-generated)

// {

//     // --- Thông tin cơ bản ---

//     "organizer": {

//         "organizerID": "string", // ID của người dùng/tổ chức tạo sự kiện

//         "name": "string",        // Tên của người tổ chức (sao chép để truy vấn nhanh)

//         "avatar": "string"       // URL ảnh đại diện của người tổ chức (sao chép)

//     },

//     "title": "string",

//     "description": "string",

//     "images": [string],

//     "categories": ["string"],    // Mảng các danh mục/tags (e.g., ["music", "live_concert"])

//     // --- Thời gian ---

//     "startTime": "string",    // Sử dụng string của Firestore

//     "endTime": "string",      // Sử dụng string của Firestore

//     "timezone": "string",        // e.g., "Asia/Ho_Chi_Minh" (lưu múi giờ của sự kiện)

//     // --- Địa điểm ---

//     "location": {

//         "address": "string",     // Địa chỉ đầy đủ (e.g., "123 Nguyễn Huệ, Quận 1, TP.HCM")

//         "coordinates": "GeoPoint"// Sử dụng GeoPoint của Firestore cho truy vấn địa lý

//     },

//     // --- Trạng thái và hiển thị ---

//     "status": "draft" | "published" | "cancelled" | "completed",

//     "isFeatured": "boolean",     // Đánh dấu sự kiện nổi bật

//     // --- Thống kê (cập nhật bằng Cloud Functions) ---

//     "stats": {

//         "participantCount": "number",

//         "checkInCount": "number",

//         "ticketSoldCount": "number"

//     },

//     // --- Dấu thời gian hệ thống ---

//     "createdAt": "string",    // Thời gian tạo

//     "updatedAt": "string"     // Thời gian cập nhật lần cuối

// }

// // Subcollection: 'ticketTypes' (lồng trong mỗi document sự kiện)

// // Document ID: ticketTypeID (e.g., auto-generated)

// {

//     "name": "string",            // e.g., "Vé VIP", "Vé Thường"

//     "description": "string",

//     "price": "number",

//     "currency": "string",        // e.g., "VND", "USD"

//     "totalQuantity": "number",   // Tổng số lượng vé

//     "soldQuantity": "number",// Số lượng còn lại (cập nhật bằng transactions)

//     "creationStatus": "string", // FAILED | SUCCESS

// }

// // Subcollection: 'attendees' (lồng trong mỗi document sự kiện)

// // Document ID: userID của người tham gia

// {

//     "userID": "string",

//     "displayName": "string",     // Tên người tham gia (sao chép)

//     "email": "string",           // Email người tham gia (sao chép)

//     "tickets": [

//         {

//             "ticketTypeID": "string",

//             "ticketTypeName": "string",

//             "quantity": "number",

//             "purchaseDate": "string"

//             "status": "string"  // ACTIVE | CANCELLED | USED | EXPIRED

//         }

//     ],

//     "isCheckedIn": "boolean",

//     "checkInTime": "string"

//  "cancelledAt": "2025-08-03T13:00:00Z",
//   "cancelledBy": "user_456",
//   "cancelledReason": "Sự kiện không đủ người đăng ký",
//   "isRefundable": true,
//   "cancelNotificationSent": false,
// }
