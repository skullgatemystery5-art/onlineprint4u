import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
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

    // Email logging only — no external SMTP or env vars
    console.log(`[MAIL] Order notification for ${ownerEmail}:\n${emailBody}`);

    return new Response(
      JSON.stringify({ success: true, message: "Notification processed" }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
