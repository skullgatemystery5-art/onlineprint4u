import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

admin.initializeApp();



interface OrderItem {
  fileName: string;
  fileType?: string;
  fileSize?: number;
  pages: number;
  copies: number;
  printType: string;
  side: string;
  paperGsm: string;
  binding: string;
  lamination?: string;
  premiumPhoto?: boolean;
  notes?: string;
  price: number;
  fileUrl?: string;
}

interface OrderData {
  order_number: string;
  created_at?: unknown;
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_pincode: string;
  customer_email?: string | null;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  coupon_code?: string | null;
  shipping_cost: number;
  total: number;
  payment_method: string;
  payment_status: string;
  notes?: string | null;
}

function buildItemLines(items: OrderItem[]): string {
  return (items || [])
    .map((item, i) => {
      const typeLabel = item.printType === "bw" ? "B&W" : "Color";
      const sideLabel = item.side === "double" ? "Double" : "Single";
      const bindingLabel = item.binding && item.binding !== "none" ? ` | ${item.binding}` : "";
      const fileLink = item.fileUrl ? `\n   File: ${item.fileUrl}` : "";
      return `${i + 1}. ${item.fileName}\n   ${item.pages}pg x ${item.copies} copies | ${typeLabel} ${sideLabel} | ${item.paperGsm}GSM${bindingLabel} - Rs. ${item.price.toFixed(2)}${fileLink}`;
    })
    .join("\n");
}

function getPaymentLabel(method: string): string {
  if (method === "advance") return "50% Advance Paid (Online)";
  if (method === "full_upi") return "100% Full Online Payment";
  if (method === "cod") return "50% Advance & 50% on Delivery";
  return method;
}

function buildEmailBody(order: OrderData, timestamp: string): string {
  const itemLines = buildItemLines(order.items);
  return (
    `NEW ORDER RECEIVED — ONLINE PRINT 4U\n\n` +
    `Order Number: ${order.order_number}\n` +
    `Date & Time: ${timestamp}\n` +
    `Customer Name: ${order.shipping_name}\n` +
    `Mobile: ${order.shipping_phone}\n` +
    `Email: ${order.customer_email || "N/A"}\n` +
    `Delivery Address: ${order.shipping_address} — ${order.shipping_pincode}\n\n` +
    `PRINTING REQUIREMENTS:\n${itemLines}\n\n` +
    `Subtotal: Rs. ${order.subtotal?.toFixed(2)}\n` +
    (order.discount > 0 ? `Discount${order.coupon_code ? ` (${order.coupon_code})` : ""}: -Rs. ${order.discount?.toFixed(2)}\n` : "") +
    `Shipping: Rs. ${order.shipping_cost?.toFixed(2)}\n` +
    `TOTAL: Rs. ${order.total?.toFixed(2)}\n` +
    `Payment: ${getPaymentLabel(order.payment_method)} (${order.payment_status})\n\n` +
    (order.notes ? `Notes: ${order.notes}\n\n` : "") +
    `Please process this order promptly.`
  );
}

function buildWhatsAppMessage(order: OrderData, timestamp: string): string {
  const itemLines = buildItemLines(order.items);
  return (
    `*NEW ORDER — ONLINE PRINT 4U*\n\n` +
    `Order: ${order.order_number}\n` +
    `Time: ${timestamp}\n` +
    `Customer: ${order.shipping_name}\n` +
    `Mobile: ${order.shipping_phone}\n` +
    `Address: ${order.shipping_address} — ${order.shipping_pincode}\n` +
    `Payment: ${getPaymentLabel(order.payment_method)} (${order.payment_status})\n\n` +
    `*Items:*\n${itemLines}\n\n` +
    `Subtotal: Rs. ${order.subtotal?.toFixed(2)}\n` +
    (order.discount > 0 ? `Discount: -Rs. ${order.discount?.toFixed(2)}\n` : "") +
    `Shipping: Rs. ${order.shipping_cost?.toFixed(2)}\n` +
    `*Total: Rs. ${order.total?.toFixed(2)}*\n\n` +
    `Process this order promptly.`
  );
}

async function sendEmail(to: string, subject: string, body: string): Promise<string> {
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  if (!smtpUser || !smtpPass) {
    console.log("[MAIL] SMTP_USER/SMTP_PASS not set. Email body:\n" + body);
    return "skipped";
  }
  try {
    const smtpHost = process.env.SMTP_HOST || "smtp.zoho.in";
    const smtpPort = parseInt(process.env.SMTP_PORT || "465", 10);
    const smtpFrom = process.env.SMTP_FROM || `Online Print 4U <${smtpUser}>`;
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    });

    await transporter.sendMail({
      from: smtpFrom,
      to,
      subject,
      text: body,
    });
    return "sent";
  } catch (e) {
    return `error:${String(e)}`;
  }
}

async function sendWhatsApp(to: string, message: string): Promise<string> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId || !to) {
    console.log("[WA] WHATSAPP_TOKEN/WHATSAPP_PHONE_NUMBER_ID not set. WhatsApp skipped.");
    return "skipped";
  }
  try {
    const res = await fetch(
      `https://graph.facebook.com/v18.0/${phoneId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "text",
          text: { body: message },
        }),
      }
    );
    return res.ok ? "sent" : `failed:${res.status}`;
  } catch (e) {
    return `error:${String(e)}`;
  }
}
export const orderTrigger = functions
  .region('asia-south1')
  .firestore.document("orders/{orderId}")
  .onCreate(async (snap) => {
    // आपका कोड वही रहेगा
  });
export const sendOtp = functions
  .region('asia-south1')
  .https.onRequest(async (req, res): Promise<void> => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    try {
      const body = req.body as { email?: string; otp?: string };
      const email = body.email;
      const otp = body.otp;

      if (!email || !otp) {
        res.status(400).json({ error: "Email and OTP are required" });
        return;
      }

      await sendEmail(email, "Your OTP Code", `Your OTP is: ${otp}`);

      res.status(200).json({ success: true, message: "OTP sent successfully" });
    } catch (error: any) {
      res.status(500).json({ error: String(error) });
    }
  });