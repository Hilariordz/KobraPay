import { createClient } from "@supabase/supabase-js";

export type OrderStatus = "PENDIENTE" | "PAGADA" | "EXPIRADA";

export interface OrderRecord {
  id: string;
  folio: number;
  amount: number;
  concept: string;
  status: OrderStatus;
  pey_reference: string | null;
  qr_payload: string | null;
  paid_at: string | null;
  created_at: string;
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

/**
 * Cliente público para frontend y suscripciones Supabase Realtime.
 */
export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!)
  : null;