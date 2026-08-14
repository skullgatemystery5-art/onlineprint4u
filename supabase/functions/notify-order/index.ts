import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const ALLOWED_ORIGINS = [
  "https://onlineprint4u.in",
  "https://www.onlineprint4u.in",
  "http://localhost:5173",
  "http://localhost:4173",
];

const corsHeaders = (origin: string | null) => {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
    "Access-Control-Max-Age": "86400",
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Vary"] = "Origin";
  } else {
    headers["Access-Control-Allow-Origin"] = "*";
  }
  return headers;
};

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("Origin");
  const cors = corsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: cors });
  }

  try {
    const { order, ownerEmail } = await req.json();

    const items = order?.items || [];
    const itemLines = items
      .map((item: any, i: number) => {
        const typeLabel = item.printType === "bw" ? "B&W" : "Color";
        return `${i + 1}. ${item.fileName} — ${item.pages}pg x ${item.copies} copies | ${typeLabel} | Rs. ${item.price.toFixed(2)}`;
      })
      .join("\n");

    const emailBody =
      `NEW ORDER RECEIVED — ONLINE PRINT 4U\n\n` +
      `Order: ${order?.order_number}\n` +
      `Customer: ${order?.shipping_name}\n` +
      `Phone: ${order?.shipping_phone}\n` +
      `Address: ${order?.shipping_address} — ${order?.shipping_pincode}\n\n` +
      `ITEMS:\n${itemLines}\n\n` +
      `Subtotal: Rs. ${order?.subtotal?.toFixed(2)}\n` +
      `Shipping: Rs. ${order?.shipping_cost?.toFixed(2)}\n` +
      `TOTAL: Rs. ${order?.total?.toFixed(2)}\n\n` +
      `Process this order promptly.`;

    console.log(`[MAIL] Order notification for ${ownerEmail}:\n${emailBody}`);

    return new Response(
      JSON.stringify({ success: true, message: "Notification processed" }),
      { status: 200, headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders(req.headers.get("Origin")), "Content-Type": "application/json" } }
    );
  }
});
