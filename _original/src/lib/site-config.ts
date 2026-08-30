// ============================================================
// SITE CONFIGURATION — Edit these values to customize your store
// ============================================================

export const siteConfig = {
  brandName: 'Online Print 4U',

  // Contact details
  contact: {
    email: 'contact@onlineprint4u.in',
    phone: '+91 7858093865',
    phoneRaw: '917858093865',
    address: 'Partliputra Colony, Near Ruban Hospital, Patna-800013',
  },

  // UPI / QR Payment settings
  // Replace upiId with your personal UPI ID (e.g. yourname@okhdfcbank)
  // Replace qrCodeImage with the path to your QR code image in /public folder
  // To add your QR code: save your QR image as "qr-code.png" in the public/ folder
  payment: {
    upiId: 'yourname@okhdfcbank',
    qrCodeImage: '/qr-code.png',
    payeeName: 'Online Print 4U',
  },
};

export const advancePercentage = 0.5; // 50% advance for the "Advance" payment option
