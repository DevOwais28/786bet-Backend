// Simple QR code generator using QR Code API
export const generateQRCode = async (text, size = 200) => {
  try {
    // Using a free QR code API service
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}`;
    return qrUrl;
  } catch (error) {
    console.error('Error generating QR code:', error);
    return null;
  }
};

// Alternative: Generate QR code locally using a library
// This would require adding qrcode.react or similar library
export const getQRCodeForAddress = async (address, amount, currency) => {
  const paymentData = `${address}?amount=${amount}&currency=${currency}`;
  return generateQRCode(paymentData);
};
