// Sends a staff message to a customer as SMS through 46elks and stores it in
// snapbike_messages. Runs with the caller's JWT, so RLS scopes the customer
// lookup and the insert to the caller's store.
import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

/** Alphanumeric sender shown to the customer (max 11 chars, A-Z/0-9). */
const SENDER = 'Snapbike';

const ELKS_USERNAME = Deno.env.get('ELKS_API_USERNAME') ?? '';
const ELKS_PASSWORD = Deno.env.get('ELKS_API_PASSWORD') ?? '';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });
}

/** Swedish local or international number to E.164 (+46...), or null. */
function toE164(phone: string): string | null {
  let p = phone.replace(/[\s\-()]/g, '');
  if (p.startsWith('00')) p = '+' + p.slice(2);
  else if (p.startsWith('0')) p = '+46' + p.slice(1);
  return /^\+\d{8,15}$/.test(p) ? p : null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' });
  if (!ELKS_USERNAME || !ELKS_PASSWORD) return json(500, { error: 'SMS-tjänsten är inte konfigurerad' });

  const { customerId, body } = (await req.json().catch(() => ({}))) as {
    customerId?: string;
    body?: string;
  };
  const text = (body ?? '').trim();
  if (!customerId || !text) return json(400, { error: 'customerId och body krävs' });

  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
  });

  const { data: customer, error: customerError } = await supabase
    .from('snapbike_customer')
    .select('phone')
    .eq('id', customerId)
    .maybeSingle();
  if (customerError) return json(500, { error: `Kunde inte hämta kunden: ${customerError.message}` });
  if (!customer) return json(404, { error: 'Kunden hittades inte' });
  const to = toE164((customer.phone as string | null) ?? '');
  if (!to) return json(400, { error: 'Kunden har inget giltigt telefonnummer' });

  const elks = await fetch('https://api.46elks.com/a1/sms', {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + btoa(`${ELKS_USERNAME}:${ELKS_PASSWORD}`),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ from: SENDER, to, message: text }).toString(),
  });
  if (!elks.ok) {
    const detail = await elks.text();
    return json(502, { error: `SMS kunde inte skickas: ${detail}` });
  }

  const { data: message, error: insertError } = await supabase
    .from('snapbike_messages')
    .insert({ customer_id: customerId, direction: 'out', body: text })
    .select('id, created_at, customer_id, direction, body')
    .single();
  if (insertError) return json(500, { error: `SMS skickat men kunde inte sparas: ${insertError.message}` });

  return json(200, message);
});
