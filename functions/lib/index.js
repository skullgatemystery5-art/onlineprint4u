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
exports.sendOtp = exports.orderTrigger = void 0;
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
exports.orderTrigger = functions
    .region('asia-south1')
    .firestore.document("orders/{orderId}")
    .onCreate(async (snap) => {
    // आपका कोड वही रहेगा
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
        // आपका ओटीपी भेजने का लॉजिक (या जो कोड आप एक्सेक्यूट करना चाहते हैं) यहाँ आएगा
        res.status(200).json({ success: true, message: "OTP sent successfully" });
    }
    catch (error) {
        res.status(500).json({ error: String(error) });
    }
});
//# sourceMappingURL=index.js.map