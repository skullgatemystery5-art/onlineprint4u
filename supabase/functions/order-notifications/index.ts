const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

import nodemailer from "npm:nodemailer@6.9.14";

const smtpConfig = {
  host: Deno.env.get("SMTP_HOST") ?? "smtp.zoho.in",
  port: parseInt(Deno.env.get("SMTP_PORT") ?? "465"),
  user: Deno.env.get("SMTP_USER") ?? "",
  pass: Deno.env.get("SMTP_PASS") ?? "",
  from: Deno.env.get("SMTP_FROM") ?? "Online Print 4U <orders@onlineprint4u.in>",
};

let transporter: nodemailer.Transporter | null = null;

function getTransporter(): nodemailer.Transporter | null {
  if (!smtpConfig.user || !smtpConfig.pass) return null;
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: smtpConfig.host,
    port: smtpConfig.port,
    secure: smtpConfig.port === 465,
    auth: { user: smtpConfig.user, pass: smtpConfig.pass },
  });
  return transporter;
}

interface OrderItem {
  fileName: string;
  pages: number;
  copies: number;
  printType: string;
  side: string;
  paperGsm: string;
  binding: string;
  lamination?: string;
  price: number;
  fileUrl?: string;
}

interface OrderData {
  order_number: string;
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

function getPaymentLabel(method: string): string {
  if (method === "advance") return "50% Advance Paid (Online)";
  if (method === "full_upi") return "100% Full Online Payment";
  if (method === "cod") return "50% Advance & 50% on Delivery";
  return method;
}

function buildItemLines(items: OrderItem[]): string {
  return (items || [])
    .map((item, i) => {
      const typeLabel = item.printType === "bw" ? "B&W" : "Color";
      const sideLabel = item.side === "double" ? "Double" : "Single";
      const bindingLabel = item.binding && item.binding !== "none" ? ` | ${item.binding}` : "";
      return `${i + 1}. ${item.fileName}\n   ${item.pages}pg x ${item.copies} copies | ${typeLabel} ${sideLabel} | ${item.paperGsm}GSM${bindingLabel} - Rs. ${item.price.toFixed(2)}`;
    })
    .join("\n");
}

function buildEmailBody(order: OrderData): string {
  const itemLines = buildItemLines(order.items);
  return (
    `Dear ${order.shipping_name},\n\n` +
    `Thank you for your order with Online Print 4U!\n\n` +
    `*ORDER CONFIRMATION*\n` +
    `Order Number: ${order.order_number}\n\n` +
    `Delivery Address: ${order.shipping_address} — ${order.shipping_pincode}\n\n` +
    `PRINTING DETAILS:\n${itemLines}\n\n` +
    `Subtotal: Rs. ${order.subtotal?.toFixed(2)}\n` +
    (order.discount > 0 ? `Discount${order.coupon_code ? ` (${order.coupon_code})` : ""}: -Rs. ${order.discount?.toFixed(2)}\n` : "") +
    `Shipping: Rs. ${order.shipping_cost?.toFixed(2)}\n` +
    `TOTAL: Rs. ${order.total?.toFixed(2)}\n` +
    `Payment: ${getPaymentLabel(order.payment_method)} (${order.payment_status})\n\n` +
    `We will start processing your order right away. You can track your order from your dashboard.\n\n` +
    `Thank you for choosing Online Print 4U!\n\n` +
    `Need help? WhatsApp us at +91 7858093865`
  );
}

function buildEmailHtml(order: OrderData): string {
  const itemLines = buildItemLines(order.items).replace(/\n/g, "<br>");
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
<h2 style="color:#1e293b;">Order Confirmed — Online Print 4U</h2>
<p style="color:#475569;">Dear ${order.shipping_name},</p>
<p style="color:#475569;">Thank you for your order! We've received your printing request and will start processing it right away.</p>
<div style="background:#f1f5f9;border-radius:8px;padding:16px;margin:16px 0;">
<p style="margin:0;color:#1e293b;font-weight:bold;">Order Number: ${order.order_number}</p>
</div>
<h3 style="color:#1e293b;">Printing Details:</h3>
<div style="font-size:14px;color:#475569;line-height:1.6;">${itemLines}</div>
<div style="margin-top:16px;padding:16px;background:#f8fafc;border-radius:8px;">
<p style="margin:4px 0;color:#475569;">Subtotal: Rs. ${order.subtotal?.toFixed(2)}</p>
${order.discount > 0 ? `<p style="margin:4px 0;color:#16a34a;">Discount: -Rs. ${order.discount?.toFixed(2)}</p>` : ""}
<p style="margin:4px 0;color:#475569;">Shipping: Rs. ${order.shipping_cost?.toFixed(2)}</p>
<p style="margin:4px 0;color:#1e293b;font-weight:bold;font-size:18px;">Total: Rs. ${order.total?.toFixed(2)}</p>
<p style="margin:8px 0 0;color:#475569;">Payment: ${getPaymentLabel(order.payment_method)} (${order.payment_status})</p>
</div>
<p style="color:#475569;">Delivery to: ${order.shipping_address} — ${order.shipping_pincode}</p>
<p style="color:#64748b;font-size:14px;">Track your order from your dashboard. Need help? WhatsApp us at +91 7858093865</p>
<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
<p style="font-size:12px;color:#94a3b8;">Online Print 4U — Fast, Easy & Reliable Online Document Printing</p>
</div>`;
}

async function sendEmail(to: string, subject: string, text: string, html: string): Promise<string> {
  const t = getTransporter();
  if (!t) {
    console.log("[ORDER-EMAIL] SMTP credentials not set. Email body:\n" + text);
    return "skipped";
  }
  try {
    await t.sendMail({
      from: smtpConfig.from,
      to,
      subject,
      text,
      html,
    });
    return "sent";
  } catch (e) {
    return `error:${String(e)}`;
  }
}

async function sendWhatsApp(to: string, message: string): Promise<string> {
  const token = Deno.env.get("WHATSAPP_TOKEN");
  const phoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
  if (!token || !phoneId || !to) {
    console.log("[ORDER-WA] WhatsApp API not configured. Message:\n" + message);
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
      },
    );
    return res.ok ? "sent" : `failed:${res.status}`;
  } catch (e) {
    return `error:${String(e)}`;
  }
}

function buildWhatsAppMessage(order: OrderData): string {
  const itemLines = buildItemLines(order.items);
  return (
    `*ORDER CONFIRMATION — ONLINE PRINT 4U*\n\n` +
    `Order: ${order.order_number}\n` +
    `Customer: ${order.shipping_name}\n` +
    `Mobile: ${order.shipping_phone}\n` +
    `Address: ${order.shipping_address} — ${order.shipping_pincode}\n` +
    `Payment: ${getPaymentLabel(order.payment_method)} (${order.payment_status})\n\n` +
    `*Items:*\n${itemLines}\n\n` +
    `Subtotal: Rs. ${order.subtotal?.toFixed(2)}\n` +
    (order.discount > 0 ? `Discount: -Rs. ${order.discount?.toFixed(2)}\n` : "") +
    `Shipping: Rs. ${order.shipping_cost?.toFixed(2)}\n` +
    `*Total: Rs. ${order.total?.toFixed(2)}*\n\n` +
    `Thank you for choosing Online Print 4U!`
  );
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const order: OrderData = await req.json();

    if (!order || !order.order_number) {
      return new Response(JSON.stringify({ error: "Invalid order data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results: Record<string, string> = {};

    const customerEmail = order.customer_email;
    const customerPhone = order.shipping_phone?.replace(/\D/g, "") ?? "";

    if (customerEmail && customerEmail.includes("@")) {
      const subject = `Order Confirmation ${order.order_number} — Online Print 4U`;
      const text = buildEmailBody(order);
      const html = buildEmailHtml(order);
      results.customerEmail = await sendEmail(customerEmail, subject, text, html);
    } else {
      results.customerEmail = "no-email";
    }

    if (customerPhone.length >= 10) {
      const waMessage = buildWhatsAppMessage(order);
      const waPhone = customerPhone.length === 10 ? `91${customerPhone}` : customerPhone;
      results.customerWhatsApp = await sendWhatsApp(waPhone, waMessage);
    } else {
      results.customerWhatsApp = "no-phone";
    }

    const ownerEmail = Deno.env.get("OWNER_EMAIL") ?? "contact@onlineprint4u.in";
    const ownerWhatsApp = Deno.env.get("OWNER_WHATSAPP") ?? "917858093865";

    const ownerSubject = `New Order ${order.order_number} — Online Print 4U`;
    const ownerText = buildEmailBody(order);
    const ownerHtml = buildEmailHtml(order);
    results.ownerEmail = await sendEmail(ownerEmail, ownerSubject, ownerText, ownerHtml);

    const ownerWaMessage = buildWhatsAppMessage(order);
    results.ownerWhatsApp = await sendWhatsApp(ownerWhatsApp, ownerWaMessage);

    return new Response(
      JSON.stringify({ success: true, results }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
