import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const ALLOWED_ORIGINS = [
  'https://onlineprint4u.in',
  'https://www.onlineprint4u.in',
  'http://localhost:5173',
  'http://localhost:4173',
];

const corsHeaders = (origin: string | null) => {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
    'Access-Control-Max-Age': '86400',
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  } else {
    headers['Access-Control-Allow-Origin'] = '*';
  }
  return headers;
};

interface FirebaseTokenResponse {
  users: Array<{
    localId: string;
    phoneNumber?: string;
    email?: string;
    displayName?: string;
  }>;
  error?: { message: string };
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get('Origin');
  const cors = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: cors });
  }

  try {
    const { firebaseToken, firebaseApiKey } = await req.json();
    if (!firebaseToken) {
      return new Response(
        JSON.stringify({ error: 'Missing firebaseToken' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    const apiKey = firebaseApiKey || Deno.env.get('VITE_FIREBASE_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Firebase API key not provided' }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    const verifyRes = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: firebaseToken }),
      }
    );

    if (!verifyRes.ok) {
      const errBody = await verifyRes.text();
      return new Response(
        JSON.stringify({ error: `Firebase token verification failed: ${verifyRes.status}`, detail: errBody }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    const verified: FirebaseTokenResponse = await verifyRes.json();
    if (verified.error || !verified.users?.length) {
      return new Response(
        JSON.stringify({ error: 'Invalid Firebase token — no user found' }),
        { status: 401, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    const fbUser = verified.users[0];
    const phone = fbUser.phoneNumber ?? '';
    const email = fbUser.email ?? '';
    const displayName = fbUser.displayName ?? 'User';

    if (!phone) {
      return new Response(
        JSON.stringify({ error: 'No phone number associated with this Firebase account' }),
        { status: 400, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase server credentials not configured' }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const derivedEmail = `${phone.replace(/[^0-9]/g, '')}@phone.local`;

    const { data: created, error: createErr } = await serviceClient.auth.admin.createUser({
      email: derivedEmail,
      email_confirm: true,
      phone,
      phone_confirm: true,
      user_metadata: { full_name: displayName, firebase_uid: fbUser.localId },
    });

    let supabaseUserId: string;

    if (createErr) {
      const { data: userList, error: listErr } = await serviceClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (listErr) {
        return new Response(
          JSON.stringify({ error: 'Failed to locate existing user' }),
          { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
        );
      }

      const existing = userList.users.find((u) => u.phone === phone || u.email === derivedEmail);
      if (!existing) {
        return new Response(
          JSON.stringify({ error: 'Could not create or find Supabase user for this phone' }),
          { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
        );
      }
      supabaseUserId = existing.id;
    } else {
      supabaseUserId = created.user.id;
    }

    await serviceClient.from('profiles').upsert({
      id: supabaseUserId,
      email,
      full_name: displayName,
      phone,
      role: 'user',
    }, { onConflict: 'id' });

    const tempPassword = `Fb${fbUser.localId.slice(0, 12)}!${Date.now().toString(36)}`;
    await serviceClient.auth.admin.updateUserById(supabaseUserId, {
      password: tempPassword,
      email_confirm: true,
      phone_confirm: true,
    });

    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY') ?? '', {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: signInData, error: signInErr } = await anonClient.auth.signInWithPassword({
      email: derivedEmail,
      password: tempPassword,
    });

    if (signInErr || !signInData.session) {
      return new Response(
        JSON.stringify({ error: 'Failed to create Supabase session' }),
        { status: 500, headers: { ...cors, 'Content-Type': 'application/json' } }
      );
    }

    await serviceClient.auth.admin.updateUserById(supabaseUserId, {
      password: `Rot${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}!${Date.now().toString(36)}`,
    });

    return new Response(
      JSON.stringify({
        access_token: signInData.session.access_token,
        refresh_token: signInData.session.refresh_token,
        expires_in: signInData.session.expires_in,
        expires_at: signInData.session.expires_at,
        user: {
          id: supabaseUserId,
          phone,
          email,
        },
      }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders(origin), 'Content-Type': 'application/json' } }
    );
  }
});
