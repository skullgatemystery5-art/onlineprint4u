import type { Order } from './database';

function formatINR(amount: number): string {
  return `Rs. ${amount.toFixed(2)}`;
}

export function isValidWhatsAppPhone(phone: string | null | undefined): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/\D/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15;
}

export function buildWhatsAppBillURL(order: Order): string | null {
  let phone = order.shipping_phone?.replace(/\D/g, '') ?? '';
  if (!isValidWhatsAppPhone(phone)) return null;
  if (phone.startsWith('91') && phone.length === 12) {
    phone = phone.slice(2);
  }
  const items = order.items as Array<{
    fileName: string;
    pages: number;
    copies: number;
    printType: string;
    side: string;
    paperGsm: string;
    binding: string;
    price: number;
  }>;

  const itemLines = items.map((item, i) => {
    const typeLabel = item.printType === 'bw' ? 'B&W' : 'Color';
    const sideLabel = item.side === 'double' ? 'Double' : 'Single';
    return `${i + 1}. ${item.fileName}\n   ${item.pages}pg x ${item.copies} copies | ${typeLabel} ${sideLabel} | ${item.paperGsm}GSM | ${item.binding} - ${formatINR(item.price)}`;
  }).join('\n');

  const discountLine = order.discount > 0
    ? `Discount${order.coupon_code ? ` (${order.coupon_code})` : ''}: -${formatINR(order.discount)}\n`
    : '';

  const message =
    `*ONLINE PRINT 4U - Order Confirmation*\n\n` +
    `Order: ${order.order_number}\n` +
    `Name: ${order.shipping_name}\n` +
    `Address: ${order.shipping_address} - ${order.shipping_pincode}\n` +
    `Payment: ${order.payment_method === 'cod' ? '50% Advance Paid & 50% on Delivery' : order.payment_method === 'advance' ? '50% Advance Paid (Online)' : '100% Full Online Payment'}\n\n` +
    `*Items:*\n${itemLines}\n\n` +
    `Subtotal: ${formatINR(order.subtotal)}\n` +
    discountLine +
    `Shipping: ${formatINR(order.shipping_cost)}\n` +
    `*Total: ${formatINR(order.total)}*\n\n` +
    `Track your order anytime from your dashboard. Thank you for choosing ONLINE PRINT 4U!`;

  return `https://wa.me/91${phone}?text=${encodeURIComponent(message)}`;
}

export function openWhatsAppBill(order: Order): boolean {
  const url = buildWhatsAppBillURL(order);
  if (!url) return false;
  window.open(url, '_blank', 'noopener,noreferrer');
  return true;
}
