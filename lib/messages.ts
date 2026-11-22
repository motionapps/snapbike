import { supabase } from './supabase';
import { normalizePhone } from './types';

export type Message = {
  id: string;
  createdAt: string;
  customerId: string;
  direction: 'out' | 'in';
  body: string;
};

/** One customer's thread in the overview: their latest message. */
export type Conversation = {
  customerId: string;
  name: string;
  phone: string;
  last: Message;
};

type MessageRow = {
  id: string;
  created_at: string;
  customer_id: string;
  direction: 'out' | 'in';
  body: string;
};

function toMessage(row: MessageRow): Message {
  return {
    id: row.id,
    createdAt: row.created_at,
    customerId: row.customer_id,
    direction: row.direction,
    body: row.body,
  };
}

/** The customer row id for a phone number (customers are unique by phone). */
export async function customerIdByPhone(phone: string): Promise<string | null> {
  const normalized = normalizePhone(phone);
  if (!normalized) return null;
  const { data, error } = await supabase
    .from('snapbike_customer')
    .select('id')
    .eq('phone', normalized)
    .maybeSingle();
  if (error) throw new Error(`Kunde inte hämta kunden: ${error.message}`);
  return (data?.id as string | undefined) ?? null;
}

/** A customer's messages, oldest first. */
export async function fetchThread(customerId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('snapbike_messages')
    .select('id, created_at, customer_id, direction, body')
    .eq('customer_id', customerId)
    .order('created_at', { ascending: true });
  if (error) throw new Error(`Kunde inte hämta meddelanden: ${error.message}`);
  return (data as MessageRow[]).map(toMessage);
}

/** All conversations, the one with the latest message first. */
export async function fetchConversations(): Promise<Conversation[]> {
  const { data, error } = await supabase
    .from('snapbike_messages')
    .select('id, created_at, customer_id, direction, body, customer:snapbike_customer(first_name, last_name, phone)')
    .order('created_at', { ascending: false })
    .limit(1000);
  if (error) throw new Error(`Kunde inte hämta meddelanden: ${error.message}`);
  type Row = MessageRow & {
    customer: { first_name: string; last_name: string; phone: string | null } | null;
  };
  const seen = new Map<string, Conversation>();
  for (const row of data as unknown as Row[]) {
    if (seen.has(row.customer_id)) continue;
    const c = row.customer;
    seen.set(row.customer_id, {
      customerId: row.customer_id,
      name: c ? `${c.first_name} ${c.last_name}`.trim() : '',
      phone: c?.phone ?? '',
      last: toMessage(row),
    });
  }
  return [...seen.values()];
}

/** Stores an outgoing message. Nothing is delivered to the customer yet. */
export async function sendMessage(customerId: string, body: string): Promise<Message> {
  const { data, error } = await supabase
    .from('snapbike_messages')
    .insert({ customer_id: customerId, direction: 'out', body: body.trim() })
    .select('id, created_at, customer_id, direction, body')
    .single();
  if (error) throw new Error(`Kunde inte skicka: ${error.message}`);
  return toMessage(data as MessageRow);
}
