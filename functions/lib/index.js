"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.onOrderCreated = exports.sendPasswordReset = exports.verifyOtp = exports.sendOtp = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
// ============================
// Firebase Environment Secrets (Cloud Secret Manager)
// ============================
const ZOHO_USER = functions.params.defineSecret("VITE_ZOHO_USER");
const ZOHO_PASS = functions.params.defineSecret("VITE_ZOHO_PASS");
const ZOHO_SMTP_HOST = functions.params.defineSecret("VITE_ZOHO_SMTP_HOST");
const ZOHO_SMTP_PORT = functions.params.defineSecret("VITE_ZOHO_SMTP_PORT");
const ZOHO_FROM = functions.params.defineSecret("VITE_ZOHO_FROM");
const smtpSecrets = [ZOHO_USER, ZOHO_PASS, ZOHO_SMTP_HOST, ZOHO_SMTP_PORT, ZOHO_FROM];
function buildItemLines(items) {
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
function getPaymentLabel(method) {
    if (method === "advance")
        return "50% Advance Paid (Online)";
    if (method === "full_upi")
        return "100% Full Online Payment";
    if (method === "cod")
        return "50% Advance & 50% on Delivery";
    return method;
}
function buildEmailBody(order, timestamp) {
    const itemLines = buildItemLines(order.items);
    return (`NEW ORDER RECEIVED — ONLINE PRINT 4U\n\n` +
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
        `Please process this order promptly.`);
}
function buildWhatsAppMessage(order, timestamp) {
    const itemLines = buildItemLines(order.items);
    return (`*NEW ORDER — ONLINE PRINT 4U*\n\n` +
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
        `Process this order promptly.`);
}
async function sendEmail(to, subject, body) {
    const smtpUser = ZOHO_USER.value();
    const smtpPass = ZOHO_PASS.value();
    if (!smtpUser || !smtpPass) {
        console.log("[MAIL] VITE_ZOHO_USER/VITE_ZOHO_PASS not set. Email body:\n" + body);
        return "skipped";
    }
    try {
        const smtpHost = ZOHO_SMTP_HOST.value() || "smtp.zoho.in";
        const smtpPort = parseInt(ZOHO_SMTP_PORT.value() || "465", 10);
        const smtpFrom = ZOHO_FROM.value() || `Online Print 4U <${smtpUser}>`;
        const nodemailer = await Promise.resolve().then(() => __importStar(require("nodemailer")));
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
    }
    catch (e) {
        return `error:${String(e)}`;
    }
}
async function sendWhatsApp(to, message) {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneId || !to) {
        console.log("[WA] WHATSAPP_TOKEN/WHATSAPP_PHONE_NUMBER_ID not set. WhatsApp skipped.");
        return "skipped";
    }
    try {
        const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
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
        });
        return res.ok ? "sent" : `failed:${res.status}`;
    }
    catch (e) {
        return `error:${String(e)}`;
    }
}
// ============================
// OTP Authentication Functions
// ============================
function generateOtp() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}
async function sendOtpEmail(to, code) {
    const subject = "Your Online Print 4U Verification Code";
    const body = `Your verification code for Online Print 4U is: ${code}\n\n` +
        `This code expires in 5 minutes. Do not share it with anyone.\n\n` +
        `If you did not request this code, please ignore this email.`;
    return sendEmail(to, subject, body);
}
async function sendOtpSms(phone, code) {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneId || !phone) {
        console.log(`[SMS] WhatsApp credentials not set. OTP for ${phone}: ${code}`);
        return "skipped";
    }
    try {
        const message = `Your Online Print 4U verification code is ${code}. It expires in 5 minutes. Do not share it with anyone.`;
        const res = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
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
        });
        return res.ok ? "sent" : `failed:${res.status}`;
    }
    catch (e) {
        return `error:${String(e)}`;
    }
}
exports.sendOtp = functions
    .runWith({ secrets: smtpSecrets })
    .https.onCall(async (data) => {
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
    }
    else if (channel === "email") {
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) {
            throw new functions.https.HttpsError("invalid-argument", "Invalid email address.");
        }
    }
    else {
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
    let sendResult;
    if (channel === "email") {
        sendResult = await sendOtpEmail(contact, code);
    }
    else {
        const fullPhone = contact.startsWith("+") ? contact.replace("+", "") : `91${contact.replace(/\D/g, "")}`;
        sendResult = await sendOtpSms(fullPhone, code);
    }
    console.log(`OTP sent for ${channel}:${contact}, result=${sendResult}`);
    return { success: true, channel, sendResult };
});
exports.verifyOtp = functions
    .runWith({ secrets: smtpSecrets })
    .https.onCall(async (data) => {
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
    let uid;
    let email;
    let phone;
    if (channel === "email") {
        email = contactLower;
        try {
            const userRecord = await admin.auth().getUserByEmail(email);
            uid = userRecord.uid;
        }
        catch {
            const userRecord = await admin.auth().createUser({
                email,
                emailVerified: true,
                displayName: "",
            });
            uid = userRecord.uid;
        }
    }
    else {
        const digits = contact.replace(/\D/g, "");
        const fullPhone = contact.startsWith("+") ? contact : `+91${digits}`;
        phone = fullPhone;
        try {
            const userRecord = await admin.auth().getUserByPhoneNumber(fullPhone);
            uid = userRecord.uid;
        }
        catch {
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
// ============================
// Password Reset (Zoho SMTP only — no Firebase default email)
// ============================
async function sendPasswordResetEmail(to) {
    const resetUrl = `${process.env.VITE_APP_URL || "https://onlineprint4u.in"}/reset-password?email=${encodeURIComponent(to)}`;
    const subject = "Reset your Online Print 4U password";
    const body = `A password reset was requested for your Online Print 4U account.

` +
        `Click the link below to choose a new password:
${resetUrl}

` +
        `This link will expire in 1 hour. If you did not request a reset, please ignore this email.`;
    return sendEmail(to, subject, body);
}
exports.sendPasswordReset = functions
    .runWith({ secrets: smtpSecrets })
    .https.onCall(async (data) => {
    const email = (data?.email || "").trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new functions.https.HttpsError("invalid-argument", "A valid email address is required.");
    }
    try {
        await admin.auth().getUserByEmail(email);
    }
    catch {
        // Return success to avoid revealing whether an account exists
        return { success: true };
    }
    const result = await sendPasswordResetEmail(email);
    console.log(`Password reset email sent to ${email}, result=${result}`);
    return { success: true };
});
exports.onOrderCreated = functions
    .runWith({ secrets: smtpSecrets })
    .firestore.document("orders/{orderId}")
    .onCreate(async (snap) => {
    const order = snap.data();
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
//# sourceMappingURL=index.js.map