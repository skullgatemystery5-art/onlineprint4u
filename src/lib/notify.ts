import type { Order } from './database';
import { siteConfig } from './site-config';
import { isValidWhatsAppPhone } from './whatsapp';

export async function sendOwnerNotifications(order: Order): Promise<void> {
  const ownerPhone = siteConfig.contact.phoneRaw;
  if (!isValidWhatsAppPhone(ownerPhone)) return;
  const ownerWhatsAppUrl = `https://wa.me/${ownerPhone}?text=${encodeURIComponent(buildOwnerWhatsAppMessage(order))}`;
  window.open(ownerWhatsAppUrl, '_blank', 'noopener,noreferrer');
}

function buildOwnerWhatsAppMessage(order: Order): string {
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
    return `${i + 1}. ${item.fileName}\n   ${item.pages}pg x ${item.copies} copies | ${typeLabel} ${sideLabel} | ${item.paperGsm}GSM | ${item.binding} - Rs. ${item.price.toFixed(2)}`;
  }).join('\n');

  const paymentLabel =
    order.payment_method === 'cod'
      ? '50% Advance Paid & 50% on Delivery'
      : order.payment_method === 'advance'
      ? '50% Advance Paid (Online)'
      : '100% Full Online Payment';

  return (
    `*NEW ORDER RECEIVED - ONLINE PRINT 4U*\n\n` +
    `Order: ${order.order_number}\n` +
    `Customer: ${order.shipping_name}\n` +
    `Phone: ${order.shipping_phone}\n` +
    `Address: ${order.shipping_address} - ${order.shipping_pincode}\n` +
    `Payment: ${paymentLabel}\n\n` +
    `*Items:*\n${itemLines}\n\n` +
    `Subtotal: Rs. ${order.subtotal.toFixed(2)}\n` +
    (order.discount > 0 ? `Discount: -Rs. ${order.discount.toFixed(2)}\n` : '') +
    `Shipping: Rs. ${order.shipping_cost.toFixed(2)}\n` +
    `*Total: Rs. ${order.total.toFixed(2)}*\n\n` +
    `Please process this order promptly.`
  );
}
