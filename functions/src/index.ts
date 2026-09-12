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
  user_id?: string;
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
  order_status?: string;
  courier_type?: string;
  delivery_type_label?: string | null;
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

function buildOwnerWhatsAppMessage(order: OrderData, timestamp: string): string {
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

function buildCustomerEmailBody(order: OrderData, timestamp: string): string {
  const itemLines = buildItemLines(order.items);
  return (
    `Dear ${order.shipping_name},\n\n` +
    `Thank you for your order with Online Print 4U! Your order has been confirmed and is now being processed.\n\n` +
    `Order Number: ${order.order_number}\n` +
    `Date & Time: ${timestamp}\n` +
    `Delivery Address: ${order.shipping_address} — ${order.shipping_pincode}\n\n` +
    `ORDER DETAILS:\n${itemLines}\n\n` +
    `Subtotal: Rs. ${order.subtotal?.toFixed(2)}\n` +
    (order.discount > 0 ? `Discount${order.coupon_code ? ` (${order.coupon_code})` : ""}: -Rs. ${order.discount?.toFixed(2)}\n` : "") +
    `Shipping: Rs. ${order.shipping_cost?.toFixed(2)}\n` +
    `TOTAL PAID: Rs. ${order.total?.toFixed(2)}\n` +
    `Payment: ${getPaymentLabel(order.payment_method)} (${order.payment_status})\n\n` +
    `We will notify you when your order is shipped. For any queries, contact us at contact@onlineprint4u.in or +91 7858093865.\n\n` +
    `Thank you for choosing Online Print 4U!`
  );
}

/**
 * Sends an email via Zoho SMTP.
 * Credentials are read from ZOHO_USER / ZOHO_PASS environment variables
 * (set via `firebase functions:config:set` or Firebase CLI env vars).
 *
 * On failure this function THROWS — the caller is responsible for
 * surfacing the error. Errors are never silently suppressed.
 */
async function sendEmail(to: string, subject: string, body: string): Promise<"sent" | "skipped"> {
  const smtpUser = process.env.ZOHO_USER || (functions.config().zoho && functions.config().zoho.user) || "";
  const smtpPass = process.env.ZOHO_PASS || (functions.config().zoho && functions.config().zoho.pass) || "";

  if (!smtpUser || !smtpPass) {
    console.error("[MAIL] ZOHO_USER / ZOHO_PASS not set — cannot send email.");
    throw new Error("Zoho SMTP credentials are not configured. Set ZOHO_USER and ZOHO_PASS environment variables.");
  }

  const smtpHost = process.env.ZOHO_HOST || "smtp.zoho.in";
  const smtpPort = parseInt(process.env.ZOHO_PORT || "465", 10);
  const smtpFrom = process.env.ZOHO_FROM || smtpUser;

  const nodemailer = await import("nodemailer");
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    requireTLS: smtpPort !== 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  await transporter.sendMail({
    from: smtpFrom,
    to,
    subject,
    text: body,
  });

  return "sent";
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

const OWNER_WHATSAPP = process.env.OWNER_WHATSAPP || "917858093865";

export const orderTrigger = functions
  .region('asia-south1')
  .firestore.document("orders/{orderId}")
  .onCreate(async (snap) => {
    const orderData = snap.data() as OrderData;
    console.log("NEW ORDER CREATED:", orderData);

    const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const ownerEmailBody = buildEmailBody(orderData, timestamp);
    const ownerWaMessage = buildOwnerWhatsAppMessage(orderData, timestamp);

    // 1. Send email to owner (store inbox)
    try {
      await sendEmail("contact@onlineprint4u.in", `New Order ${orderData.order_number}`, ownerEmailBody);
    } catch (e) {
      console.error("OWNER EMAIL FAILED:", e);
    }

    // 2. Send WhatsApp alert to owner number
    try {
      await sendWhatsApp(OWNER_WHATSAPP, ownerWaMessage);
    } catch (e) {
      console.error("OWNER WHATSAPP FAILED:", e);
    }

    // 3. Send confirmation email to customer (if email provided)
    if (orderData.customer_email) {
      try {
        const customerBody = buildCustomerEmailBody(orderData, timestamp);
        await sendEmail(orderData.customer_email, `Order Confirmation — ${orderData.order_number}`, customerBody);
      } catch (e) {
        console.error("CUSTOMER EMAIL FAILED:", e);
      }
    }
  });

export const sendOtp = functions
  .region('asia-south1')
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    try {
      const bodyData = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const { email, otp } = bodyData || {};

      console.log("PARSED REQ BODY:", { email, otp });

      if (!email || !otp) {
        res.status(400).json({ success: false, error: "Email and OTP are required" });
        return;
      }

      const subject = "Your Verification OTP Code";
      const body = `Your OTP code is: ${otp}. It is valid for a short time.`;

      await sendEmail(email, subject, body);

      res.status(200).json({ success: true, message: "OTP sent successfully via Zoho" });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("ZOHO SEND OTP ERROR:", message);
      res.status(500).json({
        success: false,
        error: message,
        code: "ZOHO_SEND_FAILED",
      });
    }
  });

export const verifyOtp = functions
  .region('asia-south1')
  .https.onRequest(async (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.status(204).send('');
      return;
    }

    try {
      const bodyData = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
      const { email, otp } = bodyData || {};

      if (!email || !otp) {
        res.status(400).json({ success: false, error: "Email and OTP are required" });
        return;
      }

      const storeKey = `otp:${email}`;
      const adminDb = admin.firestore();
      const storeRef = adminDb.collection('otp_store').doc(storeKey);
      const storeSnap = await storeRef.get();

      if (!storeSnap.exists) {
        res.status(400).json({ success: false, error: "No OTP request found. Please request a new code." });
        return;
      }

      const stored = storeSnap.data() as { otp: string; created_at: unknown };
      const createdAt = stored.created_at as { seconds: number } | null;
      if (createdAt && Date.now() / 1000 - createdAt.seconds > 300) {
        await storeRef.delete();
        res.status(400).json({ success: false, error: "OTP has expired. Please request a new code." });
        return;
      }

      if (stored.otp !== otp) {
        res.status(400).json({ success: false, error: "Invalid OTP. Please check and try again." });
        return;
      }

      await storeRef.delete();

      const customToken = await admin.auth().createCustomToken(email);
      res.status(200).json({ success: true, customToken });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error("VERIFY OTP ERROR:", message);
      res.status(500).json({ success: false, error: message });
    }
  });
