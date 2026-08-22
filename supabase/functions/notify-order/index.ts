import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface OrderItem {
  fileName: string;
  fileType: string;
  fileSize: number;
  pages: number;
  copies: number;
  printType: string;
  side: string;
  paperGsm: string;
  binding: string;
  lamination: string;
  premiumPhoto: boolean;
  notes: string;
  price: number;
  fileUrl?: string;
}

interface OrderPayload {
  order_number: string;
  created_at: string;
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_pincode: string;
  customer_email: string | null;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  coupon_code: string | null;
  shipping_cost: number;
  total: number;
  payment_method: string;
  payment_status: string;
  notes: string | null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const order: OrderPayload = body.order;
    const ownerEmail: string = body.ownerEmail || "contact@onlineprint4u.in";
    const ownerWhatsApp: string = body.ownerWhatsApp || "917858093865";

    if (!order) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing order data" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const itemLines = (order.items || [])
      .map((item: OrderItem, i: number) => {
        const typeLabel = item.printType === "bw" ? "B&W" : "Color";
        const sideLabel = item.side === "double" ? "Double" : "Single";
        const bindingLabel = item.binding !== "none" ? ` | ${item.binding}` : "";
        const fileLink = item.fileUrl ? `\n   File: ${item.fileUrl}` : "";
        return `${i + 1}. ${item.fileName}\n   ${item.pages}pg x ${item.copies} copies | ${typeLabel} ${sideLabel} | ${item.paperGsm}GSM${bindingLabel} - Rs. ${item.price.toFixed(2)}${fileLink}`;
      })
      .join("\n");

    const timestamp = new Date(order.created_at || Date.now()).toLocaleString("en-IN", {
      timeZone: "Asia/Kolkata",
      dateStyle: "medium",
      timeStyle: "short",
    });

    const paymentLabel =
      order.payment_method === "advance"
        ? "50% Advance Paid (Online)"
        : order.payment_method === "full_upi"
        ? "100% Full Online Payment"
        : order.payment_method === "cod"
        ? "50% Advance & 50% on Delivery"
        : order.payment_method;

    // --- Build email body ---
    const emailSubject = `New Order ${order.order_number} — Online Print 4U`;
    const emailBody =
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
      `Payment: ${paymentLabel} (${order.payment_status})\n\n` +
      (order.notes ? `Notes: ${order.notes}\n\n` : "") +
      `Please process this order promptly.`;

    // --- Build WhatsApp message ---
    const whatsappMessage =
      `*NEW ORDER — ONLINE PRINT 4U*\n\n` +
      `Order: ${order.order_number}\n` +
      `Time: ${timestamp}\n` +
      `Customer: ${order.shipping_name}\n` +
      `Mobile: ${order.shipping_phone}\n` +
      `Address: ${order.shipping_address} — ${order.shipping_pincode}\n` +
      `Payment: ${paymentLabel} (${order.payment_status})\n\n` +
      `*Items:*\n${itemLines}\n\n` +
      `Subtotal: Rs. ${order.subtotal?.toFixed(2)}\n` +
      (order.discount > 0 ? `Discount: -Rs. ${order.discount?.toFixed(2)}\n` : "") +
      `Shipping: Rs. ${order.shipping_cost?.toFixed(2)}\n` +
      `*Total: Rs. ${order.total?.toFixed(2)}*\n\n` +
      `Process this order promptly.`;

    // --- Send email via Resend (free tier, no paid API) ---
    let emailResult = "skipped";
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (resendApiKey) {
      try {
        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "Online Print 4U <orders@resend.onlineprint4u.in>",
            to: [ownerEmail],
            subject: emailSubject,
            text: emailBody,
          }),
        });
        emailResult = emailRes.ok ? "sent" : `failed:${emailRes.status}`;
      } catch (e) {
        emailResult = `error:${String(e)}`;
      }
    } else {
      console.log("[MAIL] RESEND_API_KEY not set. Email body:\n" + emailBody);
    }

    // --- Send WhatsApp via free webhook (WhatsApp Cloud API or wa.me link) ---
    let whatsappResult = "skipped";
    const waToken = Deno.env.get("WHATSAPP_TOKEN");
    const waPhoneId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID");
    if (waToken && waPhoneId) {
      try {
        const waRes = await fetch(
          `https://graph.facebook.com/v18.0/${waPhoneId}/messages`,
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${waToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              messaging_product: "whatsapp",
              to: ownerWhatsApp,
              type: "text",
              text: { body: whatsappMessage },
            }),
          }
        );
        whatsappResult = waRes.ok ? "sent" : `failed:${waRes.status}`;
      } catch (e) {
        whatsappResult = `error:${String(e)}`;
      }
    } else {
      console.log("[WA] WHATSAPP_TOKEN/WHATSAPP_PHONE_NUMBER_ID not set. WhatsApp message:\n" + whatsappMessage);
    }

    return new Response(
      JSON.stringify({
        success: true,
        email: emailResult,
        whatsapp: whatsappResult,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
