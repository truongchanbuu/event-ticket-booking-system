// {
//   userID: string                        // Auto-ID hoặc UUID
//   provider: 'momo',                 // hoặc 'stripe', 'zalopay' về sau
//   type: 'ewallet',                  // 'card' / 'bank_account' trong tương lai
//   displayName: 'Ví Momo của Bửu',   // Tên hiện lên UI
//   linkedPhone: '09xxxxxxxx',        // (nếu có)
//   isDefault: boolean,
//   createdAt: Timestamp,
//   updatedAt: Timestamp,

//   // Momo-specific
//   momoPartnerClientId?: string,     // Mã client nếu được cấp
//   momoToken?: string,               // Nếu có hỗ trợ lưu token (hiếm)
//   momoExtraData?: any,              // Trả về từ Momo để dùng lại

//   // Tương lai
//   metadata?: object
// }
