// {
//   "eventID": "evt_future_tech_2025",

//   // =======================================================
//   // ==  DOCUMENT CHÍNH TRONG COLLECTION 'events'          ==
//   // =======================================================
//   "eventData": {
//     "organizer": {
//       "organizerID": "org_tech_events_vn",
//       "name": "Tech Events Vietnam",
//       "avatar": "https://example.com/avatars/org_tech_events_vn.png"
//     },
//     "title": "Hội nghị Công nghệ Tương lai 2025",
//     "description": "Cập nhật những xu hướng công nghệ đột phá nhất về AI, Blockchain và Web3. Cơ hội giao lưu cùng các chuyên gia hàng đầu trong ngành.",
//     "images": [
//       "https://example.com/images/event_banner_1.jpg",
//       "https://example.com/images/event_venue_2.jpg"
//     ],
//     "categories": [
//       "technology",
//       "conference",
//       "networking",
//       "ai"
//     ],
//     "startTime": "2025-10-26T09:00:00+07:00",
//     "endTime": "2025-10-26T21:00:00+07:00",
//     "timezone": "Asia/Ho_Chi_Minh",
//     "location": {
//       "address": "Trung tâm Hội nghị Quốc gia, Mễ Trì, Nam Từ Liêm, Hà Nội",
//       "coordinates": { // Đây là cách mô phỏng GeoPoint của Firestore trong JSON
//         "latitude": 21.0062,
//         "longitude": 105.7828
//       }
//     },
//     "status": "published",
//     "isFeatured": true,
//     "stats": {
//       "participantCount": 2,
//       "checkInCount": 1,
//       "ticketSoldCount": 3
//     },
//     // --- Các trường về việc hủy sự kiện (sẽ là null nếu chưa bị hủy) ---
//     "cancelledAt": null,
//     "cancelledBy": null,
//     "cancelledReason": null,
//     "isRefundable": null,
//     "cancelNotificationSent": false,
//     // --- Dấu thời gian hệ thống ---
//     "createdAt": "2025-08-01T10:00:00Z",
//     "updatedAt": "2025-08-03T11:30:00Z"
//   },

//   // ============================================================
//   // ==  SUBCOLLECTION: 'eventContributors' (lồng trong event)  ==
//   // ============================================================
//   "eventContributors": [
//     {
//       "contributorID": "contr_expert_ai",
//       "name": "GS. Hồ Tú Bảo",
//       "profilePicture": "https://example.com/avatars/contr_expert_ai.png",
//       "role": "Keynote Speaker",
//       "isHeadliner": true // QUAN TRỌNG: Đây là diễn giả chính
//     },
//     {
//       "contributorID": "contr_blockchain_guru",
//       "name": "Mr. Lynn Hoang",
//       "profilePicture": "https://example.com/avatars/contr_blockchain_guru.png",
//       "role": "Speaker",
//       "isHeadliner": false
//     },
//     {
//       "contributorID": "contr_mc_vtv",
//       "name": "BTV. Quốc Khánh",
//       "profilePicture": "https://example.com/avatars/contr_mc_vtv.png",
//       "role": "Host",
//       "isHeadliner": false
//     }
//   ],

//   // ========================================================
//   // ==  SUBCOLLECTION: 'ticketTypes' (lồng trong event)   ==
//   // ========================================================
//   "ticketTypes": [
//     {
//       "ticketTypeID": "tkt_vip_01",
//       "name": "Vé VIP",
//       "description": "Bao gồm hàng ghế đầu, bữa trưa networking cùng diễn giả, và bộ quà tặng.",
//       "price": 5000000,
//       "currency": "VND",
//       "totalQuantity": 50,
//       "soldQuantity": 1,
//     },
//     {
//       "ticketTypeID": "tkt_std_02",
//       "name": "Vé Tiêu Chuẩn",
//       "description": "Tham dự tất cả các phiên trình bày.",
//       "price": 2000000,
//       "currency": "VND",
//       "totalQuantity": 200,
//       "soldQuantity": 1,
//     },
//     {
//       "ticketTypeID": "tkt_online_03",
//       "name": "Vé Online",
//       "description": "Truy cập livestream và bản ghi của tất cả các phiên.",
//       "price": 500000,
//       "currency": "VND",
//       "totalQuantity": 1000,
//       "soldQuantity": 1,
//     }
//   ],

//   // ======================================================
//   // ==  SUBCOLLECTION: 'attendees' (lồng trong event)   ==
//   // ======================================================
//   "attendees": [
//     {
//       "attendeeID": "user_12345",
//       "displayName": "Nguyễn Văn An",
//       "email": "nguyen.van.an@example.com",
//       "tickets": [
//         {
//           "ticketID": "unique_ticket_code_001",
//           "ticketTypeID": "tkt_vip_01",
//           "ticketTypeName": "Vé VIP",
//           "purchaseDate": "2025-08-02T14:20:10Z",
//           "status": "ACTIVE"
//         }
//       ],
//       "isCheckedIn": false,
//       "checkInTime": null
//     },
//     {
//       "attendeeID": "user_67890",
//       "displayName": "Trần Thị Bình",
//       "email": "tran.thi.binh@example.com",
//       "tickets": [
//         {
//           "ticketID": "unique_ticket_code_002",
//           "ticketTypeID": "tkt_std_02",
//           "ticketTypeName": "Vé Tiêu Chuẩn",
//           "purchaseDate": "2025-08-03T09:05:30Z",
//           "status": "USED"
//         },
//         {
//           "ticketID": "unique_ticket_code_003",
//           "ticketTypeID": "tkt_online_03",
//           "ticketTypeName": "Vé Online",
//           "purchaseDate": "2025-08-03T09:05:30Z",
//           "status": "ACTIVE"
//         }
//       ],
//       "isCheckedIn": true,
//       "checkInTime": "2025-10-26T08:45:15+07:00"
//     }
//   ]
// }
