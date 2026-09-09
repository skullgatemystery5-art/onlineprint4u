import { createClient } from "npm:@supabase/supabase-js@2";
import { initializeApp, cert } from "npm:firebase-admin@12.7.0/app";
import { getAuth as getAdminAuth } from "npm:firebase-admin@12.7.0/auth";
import nodemailer from "npm:nodemailer@6.9.14";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const smtpConfig = {
  host: Deno.env.get("SMTP_HOST") ?? "smtp.zoho.in",
  port: parseInt(Deno.env.get("SMTP_PORT") ?? "465"),
  user: Deno.env.get("SMTP_USER") ?? "",
  pass: Deno.env.get("SMTP_PASS") ?? "",
  from: Deno.env.get("SMTP_FROM") ?? "Online Print 4U <noreply@onlineprint4u.in>",
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

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
});

let firebaseAdminApp: ReturnType<typeof initializeApp> | null = null;
let adminAuth: ReturnType<typeof getAdminAuth> | null = null;

function getFirebaseAdmin() {
  if (adminAuth) return adminAuth;
  const projectId = Deno.env.get("FIREBASE_PROJECT_ID") ?? "";
  const clientEmail = Deno.env.get("FIREBASE_CLIENT_EMAIL") ?? "";
  const privateKey = (Deno.env.get("FIREBASE_PRIVATE_KEY") ?? "").replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  try {
    firebaseAdminApp = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
    adminAuth = getAdminAuth(firebaseAdminApp);
    return adminAuth;
  } catch (e) {
    console.error("[FIREBASE-ADMIN] Init failed:", String(e));
    return null;
  }
}

function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendEmail(to: string, otp: string): Promise<boolean> {
  const t = getTransporter();
  if (!t) {
    console.log("[EMAIL-OTP] SMTP credentials not set. OTP for", to, ":", otp);
    return false;
  }

  try {
    await t.sendMail({
      from: smtpConfig.from,
      to,
      subject: "Your Login Code — Online Print 4U",
      text: `Your verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you did not request this, please ignore this email.\n\nOnline Print 4U`,
      html: `<div style="font-family:Arial,sans-serif;max-width:400px;margin:0 auto;padding:20px;">
<h2 style="color:#1e293b;">Online Print 4U</h2>
<p style="font-size:16px;color:#475569;">Your verification code is:</p>
<div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#2563eb;padding:20px 0;">${otp}</div>
<p style="font-size:14px;color:#64748b;">This code expires in 10 minutes.</p>
<p style="font-size:14px;color:#64748b;">If you did not request this, please ignore this email.</p>
<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">
<p style="font-size:12px;color:#94a3b8;">Online Print 4U</p>
</div>`,
    });
    return true;
  } catch (e) {
    console.error("[EMAIL-OTP] Failed to send:", String(e));
    return false;
  }
}

async function getOrCreateFirebaseCustomToken(email: string): Promise<string | null> {
  const auth = getFirebaseAdmin();
  if (!auth) return null;

  try {
    let uid: string;
    try {
      const userRecord = await auth.getUserByEmail(email);
      uid = userRecord.uid;
    } catch {
      const userRecord = await auth.createUser({ email, emailVerified: true });
      uid = userRecord.uid;
    }
    return await auth.createCustomToken(uid);
  } catch (e) {
    console.error("[FIREBASE-ADMIN] Custom token failed:", String(e));
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { action, email, otp } = await req.json();

    if (action === "send") {
      if (!email || !email.includes("@")) {
        return new Response(JSON.stringify({ error: "Invalid email" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const code = generateOtp();

      const { error: insertError } = await supabase.from("email_otps").insert({
        email: normalizedEmail,
        otp_code: code,
        expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        used: false,
      });

      if (insertError) {
        return new Response(JSON.stringify({ error: "Failed to generate OTP" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const sent = await sendEmail(normalizedEmail, code);

      return new Response(
        JSON.stringify({ success: true, sent, message: sent ? "OTP sent to email" : "OTP generated (email delivery not configured)" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    if (action === "verify") {
      if (!email || !otp) {
        return new Response(JSON.stringify({ error: "Email and OTP required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const normalizedEmail = email.toLowerCase().trim();

      const { data, error } = await supabase
        .from("email_otps")
        .select("id, otp_code, expires_at, used")
        .eq("email", normalizedEmail)
        .eq("used", false)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !data) {
        return new Response(JSON.stringify({ error: "No OTP found. Please request a new code." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (new Date(data.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "This code has expired. Please request a new one." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (data.otp_code !== otp) {
        return new Response(JSON.stringify({ error: "Invalid verification code." }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("email_otps").update({ used: true }).eq("id", data.id);

      const customToken = await getOrCreateFirebaseCustomToken(normalizedEmail);

      if (!customToken) {
        return new Response(JSON.stringify({ error: "Login failed — Firebase Admin is not configured. Please contact support." }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      return new Response(
        JSON.stringify({ success: true, email: normalizedEmail, customToken }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
