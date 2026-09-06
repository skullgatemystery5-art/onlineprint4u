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

// ============================
// OTP Authentication Functions
// ============================

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendOtpEmail(to: string, code: string): Promise<string> {
  const subject = "Your Online Print 4U Verification Code";
  const body =
    `Your verification code for Online Print 4U is: ${code}\n\n` +
    `This code expires in 5 minutes. Do not share it with anyone.\n\n` +
    `If you did not request this code, please ignore this email.`;
  return sendEmail(to, subject, body);
}

async function sendOtpSms(phone: string, code: string): Promise<string> {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneId || !phone) {
    console.log(`[SMS] WhatsApp credentials not set. OTP for ${phone}: ${code}`);
    return "skipped";
  }
  try {
    const message = `Your Online Print 4U verification code is ${code}. It expires in 5 minutes. Do not share it with anyone.`;
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
          to: phone,
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

interface OtpRequestData {
  channel: "phone" | "email";
  contact: string;
}

interface OtpVerifyData {
  channel: "phone" | "email";
  contact: string;
  code: string;
}

export const sendOtp = functions.https.onCall(async (data: OtpRequestData) => {
  const channel = data?.channel;
  const contact = (data?.contact || "").trim();

  if (!channel || !contact) {
    throw new functions.https.HttpsError("invalid-argument", "Channel and contact are required.");
  }

  if (channel === "phone") {
    const digits = contact.replace(/\D/g, "");
    if (digits.length !== 10 && digits.length !== 12) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid phone number.");
    }
  } else if (channel === "email") {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
      throw new functions.https.HttpsError("invalid-argument", "Invalid email address.");
    }
  } else {
    throw new functions.https.HttpsError("invalid-argument", "Channel must be 'phone' or 'email'.");
  }

  // Rate limiting: check last OTP request for this contact
  const otpRef = admin.firestore().collection("otp_codes").doc(`${channel}:${contact.toLowerCase()}`);
  const existing = await otpRef.get();
  if (existing.exists) {
    const existingData = existing.data();
    const elapsed = Date.now() - (existingData?.createdAt?.toMillis() || 0);
    if (elapsed < 30000) {
      throw new functions.https.HttpsError("resource-exhausted", "Please wait 30 seconds before requesting another code.");
    }
  }

  const code = generateOtp();
  const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + 5 * 60 * 1000);

  await otpRef.set({
    code,
    channel,
    contact,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    expiresAt,
    attempts: 0,
  });

  let sendResult: string;
  if (channel === "email") {
    sendResult = await sendOtpEmail(contact, code);
  } else {
    const fullPhone = contact.startsWith("+") ? contact.replace("+", "") : `91${contact.replace(/\D/g, "")}`;
    sendResult = await sendOtpSms(fullPhone, code);
  }

  console.log(`OTP sent for ${channel}:${contact}, result=${sendResult}`);
  return { success: true, channel, sendResult };
});

export const verifyOtp = functions.https.onCall(async (data: OtpVerifyData) => {
  const channel = data?.channel;
  const contact = (data?.contact || "").trim();
  const code = (data?.code || "").trim();

  if (!channel || !contact || !code) {
    throw new functions.https.HttpsError("invalid-argument", "Channel, contact, and code are required.");
  }

  if (code.length !== 6 || !/^\d{6}$/.test(code)) {
    throw new functions.https.HttpsError("invalid-argument", "Code must be 6 digits.");
  }

  const otpRef = admin.firestore().collection("otp_codes").doc(`${channel}:${contact.toLowerCase()}`);
  const doc = await otpRef.get();

  if (!doc.exists) {
    throw new functions.https.HttpsError("not-found", "No OTP found. Please request a new code.");
  }

  const otpData = doc.data();
  if (!otpData) {
    throw new functions.https.HttpsError("internal", "OTP data corrupted.");
  }

  // Check expiry
  const expiresAt = otpData.expiresAt?.toMillis() || 0;
  if (Date.now() > expiresAt) {
    await otpRef.delete();
    throw new functions.https.HttpsError("deadline-exceeded", "This code has expired. Please request a new one.");
  }

  // Check attempts
  const attempts = otpData.attempts || 0;
  if (attempts >= 5) {
    await otpRef.delete();
    throw new functions.https.HttpsError("resource-exhausted", "Too many incorrect attempts. Please request a new code.");
  }

  if (otpData.code !== code) {
    await otpRef.update({ attempts: attempts + 1 });
    const remaining = 5 - (attempts + 1);
    throw new functions.https.HttpsError("invalid-argument", `Incorrect code. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining.`);
  }

  // Code is correct — clean up the OTP
  await otpRef.delete();

  // Create or get Firebase user and return a custom token
  const contactLower = contact.toLowerCase();
  let uid: string;
  let email: string | undefined;
  let phone: string | undefined;

  if (channel === "email") {
    email = contactLower;
    try {
      const userRecord = await admin.auth().getUserByEmail(email);
      uid = userRecord.uid;
    } catch {
      const userRecord = await admin.auth().createUser({
        email,
        emailVerified: true,
        displayName: "",
      });
      uid = userRecord.uid;
    }
  } else {
    const digits = contact.replace(/\D/g, "");
    const fullPhone = contact.startsWith("+") ? contact : `+91${digits}`;
    phone = fullPhone;
    try {
      const userRecord = await admin.auth().getUserByPhoneNumber(fullPhone);
      uid = userRecord.uid;
    } catch {
      const userRecord = await admin.auth().createUser({
        phoneNumber: fullPhone,
        displayName: "",
      });
      uid = userRecord.uid;
    }
  }

  const customToken = await admin.auth().createCustomToken(uid, { channel, contact: contactLower });

  // Upsert profile
  await admin.firestore().collection("profiles").doc(uid).set({
    id: uid,
    email: email || null,
    phone: phone || contact,
    full_name: "",
    role: "user",
    updated_at: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });

  return { success: true, customToken, uid };
});

export const onOrderCreated = functions.firestore
  .document("orders/{orderId}")
  .onCreate(async (snap) => {
    const order = snap.data() as OrderData;
    if (!order || !order.order_number) {
      console.log("Skipping: invalid order data");
      return;
    }

    const ownerEmail = process.env.OWNER_EMAIL || "contact@onlineprint4u.in";
    const ownerWhatsApp = process.env.OWNER_WHATSAPP || "917858093865";

    const timestamp = new Date().toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });

    const emailSubject = `New Order ${order.order_number} — Online Print 4U`;
    const emailBody = buildEmailBody(order, timestamp);
    const whatsappMessage = buildWhatsAppMessage(order, timestamp);

    const [emailResult, whatsappResult] = await Promise.all([
      sendEmail(ownerEmail, emailSubject, emailBody),
      sendWhatsApp(ownerWhatsApp, whatsappMessage),
    ]);

    console.log(`Order ${order.order_number}: email=${emailResult}, whatsapp=${whatsappResult}`);
  });
