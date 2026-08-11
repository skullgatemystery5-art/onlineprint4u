import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
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
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { firebaseToken, firebaseApiKey } = await req.json();
    if (!firebaseToken) {
      return new Response(
        JSON.stringify({ error: 'Missing firebaseToken' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Firebase API key is a public identifier (safe for client-side).
    // Accept it from the request body, falling back to env if present.
    const apiKey = firebaseApiKey || Deno.env.get('VITE_FIREBASE_API_KEY');
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'Firebase API key not provided' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
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
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const verified: FirebaseTokenResponse = await verifyRes.json();
    if (verified.error || !verified.users?.length) {
      return new Response(
        JSON.stringify({ error: 'Invalid Firebase token — no user found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fbUser = verified.users[0];
    const phone = fbUser.phoneNumber ?? '';
    const email = fbUser.email ?? '';
    const displayName = fbUser.displayName ?? 'User';

    if (!phone) {
      return new Response(
        JSON.stringify({ error: 'No phone number associated with this Firebase account' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use service role to create/mint a Supabase session for this user.
    // We upsert a profile keyed by phone, then generate a custom JWT signed
    // with the service role key that Supabase auth will accept.
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({ error: 'Supabase server credentials not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const serviceClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Find existing Supabase user by phone, or create one.
    // Supabase doesn't have a direct admin.createUser by phone, so we use
    // a deterministic approach: sign in with the Firebase uid as the password
    // on a fixed email derived from the phone. This gives us a real session.

    // Strategy: create a Supabase user with email = phone@firebase.local
    // and a random secure password stored nowhere (we use admin linkIdentity
    // alternative: just sign in with OTP-like admin approach).
    // The cleanest supported approach: use admin.generateLink or createUser.

    const derivedEmail = `${phone.replace(/[^0-9]/g, '')}@phone.local`;

    // Try to create the user; if exists, fetch them.
    const { data: created, error: createErr } = await serviceClient.auth.admin.createUser({
      email: derivedEmail,
      email_confirm: true,
      phone,
      phone_confirm: true,
      user_metadata: { full_name: displayName, firebase_uid: fbUser.localId },
    });

    let supabaseUserId: string;

    if (createErr) {
      // User likely exists — list users by phone to find them
      const { data: userList, error: listErr } = await serviceClient.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });

      if (listErr) {
        return new Response(
          JSON.stringify({ error: 'Failed to locate existing user' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const existing = userList.users.find((u) => u.phone === phone || u.email === derivedEmail);
      if (!existing) {
        return new Response(
          JSON.stringify({ error: 'Could not create or find Supabase user for this phone' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      supabaseUserId = existing.id;
    } else {
      supabaseUserId = created.user.id;
    }

    // Upsert profile
    await serviceClient.from('profiles').upsert({
      id: supabaseUserId,
      email,
      full_name: displayName,
      phone,
      role: 'user',
    }, { onConflict: 'id' });

    // Generate a Supabase access token for this user using admin.generateLink
    // with 'magiclink' then extracting the token — but that's complex.
    // Simpler: sign in with the service role and return the user id + a
    // short-lived session by generating a signed JWT.
    // The most reliable approach: use admin.updateUserById to set a known
    // password, then sign in with password to get a real session.

    const tempPassword = `Fb${fbUser.localId.slice(0, 12)}!${Date.now().toString(36)}`;
    await serviceClient.auth.admin.updateUserById(supabaseUserId, {
      password: tempPassword,
      email_confirm: true,
      phone_confirm: true,
    });

    // Now sign in with the temp password to get a real session
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
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rotate the temp password so it can't be reused
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
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
