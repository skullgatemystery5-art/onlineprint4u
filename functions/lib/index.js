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
exports.verifyOtp = exports.sendOtp = exports.orderTrigger = void 0;
const functions = __importStar(require("firebase-functions"));
const admin = __importStar(require("firebase-admin"));
admin.initializeApp();
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
function buildOwnerWhatsAppMessage(order, timestamp) {
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
function buildCustomerEmailBody(order, timestamp) {
    const itemLines = buildItemLines(order.items);
    return (`Dear ${order.shipping_name},\n\n` +
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
        `Thank you for choosing Online Print 4U!`);
}
/**
 * Sends an email via Zoho SMTP.
 * Credentials are read from ZOHO_USER / ZOHO_PASS environment variables
 * (set via `firebase functions:config:set` or Firebase CLI env vars).
 *
 * On failure this function THROWS — the caller is responsible for
 * surfacing the error. Errors are never silently suppressed.
 */
async function sendEmail(to, subject, body) {
    const smtpUser = process.env.ZOHO_USER || (functions.config().zoho && functions.config().zoho.user) || "";
    const smtpPass = process.env.ZOHO_PASS || (functions.config().zoho && functions.config().zoho.pass) || "";
    if (!smtpUser || !smtpPass) {
        console.error("[MAIL] ZOHO_USER / ZOHO_PASS not set — cannot send email.");
        throw new Error("Zoho SMTP credentials are not configured. Set ZOHO_USER and ZOHO_PASS environment variables.");
    }
    const smtpHost = process.env.ZOHO_HOST || "smtp.zoho.in";
    const smtpPort = parseInt(process.env.ZOHO_PORT || "465", 10);
    const smtpFrom = process.env.ZOHO_FROM || smtpUser;
    const nodemailer = await Promise.resolve().then(() => __importStar(require("nodemailer")));
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
const OWNER_WHATSAPP = process.env.OWNER_WHATSAPP || "917858093865";
exports.orderTrigger = functions
    .region('asia-south1')
    .firestore.document("orders/{orderId}")
    .onCreate(async (snap) => {
    const orderData = snap.data();
    console.log("NEW ORDER CREATED:", orderData);
    const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    const ownerEmailBody = buildEmailBody(orderData, timestamp);
    const ownerWaMessage = buildOwnerWhatsAppMessage(orderData, timestamp);
    // 1. Send email to owner (store inbox)
    try {
        await sendEmail("contact@onlineprint4u.in", `New Order ${orderData.order_number}`, ownerEmailBody);
    }
    catch (e) {
        console.error("OWNER EMAIL FAILED:", e);
    }
    // 2. Send WhatsApp alert to owner number
    try {
        await sendWhatsApp(OWNER_WHATSAPP, ownerWaMessage);
    }
    catch (e) {
        console.error("OWNER WHATSAPP FAILED:", e);
    }
    // 3. Send confirmation email to customer (if email provided)
    if (orderData.customer_email) {
        try {
            const customerBody = buildCustomerEmailBody(orderData, timestamp);
            await sendEmail(orderData.customer_email, `Order Confirmation — ${orderData.order_number}`, customerBody);
        }
        catch (e) {
            console.error("CUSTOMER EMAIL FAILED:", e);
        }
    }
});
exports.sendOtp = functions
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
        const { email } = bodyData || {};
        console.log("PARSED REQ BODY:", { email });
        if (!email) {
            res.status(400).json({ success: false, error: "Email is required" });
            return;
        }
        // 1. 6 अंकों का नया OTP जनरेट करें
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const storeKey = `otp:${email}`;
        // 2. डेटाबेस के 'otp_store' में सेव करें
        await admin.firestore().collection('otp_store').doc(storeKey).set({
            otp: otp,
            created_at: admin.firestore.FieldValue.serverTimestamp()
        });
        const subject = "Your Verification OTP Code";
        const body = `Your OTP code is: ${otp}. It is valid for a short time.`;
        // 3. जोहो से ईमेल भेजें
        await sendEmail(email, subject, body);
        res.status(200).json({ success: true, message: "OTP sent successfully via Zoho" });
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("ZOHO SEND OTP ERROR:", message);
        res.status(500).json({
            success: false,
            error: message,
            code: "ZOHO_SEND_FAILED",
        });
    }
});
exports.verifyOtp = functions
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
        const stored = storeSnap.data();
        const createdAt = stored.created_at;
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
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error("VERIFY OTP ERROR:", message);
        res.status(500).json({ success: false, error: message });
    }
});
//# sourceMappingURL=index.js.map