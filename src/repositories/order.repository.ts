import { supabaseAdmin } from "@/clients/supabase-admin";
import type {
  OrderRecord,
  PeyChargeDetails,
} from "@/types/order.types";

const orderColumns =
  "id, folio, amount, concept, status, pey_reference, qr_payload, paid_at, created_at";

export class OrderRepositoryError extends Error {
  constructor(
    message: string,
    readonly statusCode = 500,
  ) {
    super(message);
    this.name = "OrderRepositoryError";
  }
}

function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    throw new OrderRepositoryError(
      "Supabase admin is not configured.",
      503,
    );
  }

  return supabaseAdmin;
}

export async function createPendingOrder(
  input: Pick<OrderRecord, "amount" | "concept">,
): Promise<OrderRecord> {
  const { data, error } = await getSupabaseAdmin()
    .from("orders")
    .insert({ ...input, status: "PENDIENTE" })
    .select(orderColumns)
    .single();

  if (error) {
    console.error("Could not create order in Supabase:", error.message);
    throw new OrderRepositoryError("Could not create order.");
  }

  return data as OrderRecord;
}

export async function savePeyCharge(
  orderId: string,
  charge: PeyChargeDetails,
): Promise<void> {
  const { error } = await getSupabaseAdmin()
    .from("orders")
    .update({
      qr_payload: charge.qr_payload,
      pey_reference: charge.pey_reference,
    })
    .eq("id", orderId);

  if (error) {
    console.error("Could not save Pey charge in Supabase:", error.message);
    throw new OrderRepositoryError("Could not save the payment details.");
  }
}

export async function findOrderByPeyReference(
  reference: string,
): Promise<Pick<OrderRecord, "id" | "status"> | null> {
  const { data, error } = await getSupabaseAdmin()
    .from("orders")
    .select("id, status")
    .eq("pey_reference", reference)
    .maybeSingle();

  if (error) {
    console.error("Could not find order in Supabase:", error.message);
    throw new OrderRepositoryError("Could not find order.");
  }

  return data as Pick<OrderRecord, "id" | "status"> | null;
}

export async function markOrderPaid(
  orderId: string,
  paidAt: string,
): Promise<boolean> {
  const { data, error } = await getSupabaseAdmin()
    .from("orders")
    .update({ status: "PAGADA", paid_at: paidAt })
    .eq("id", orderId)
    .eq("status", "PENDIENTE")
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("Could not mark order as paid in Supabase:", error.message);
    throw new OrderRepositoryError("Could not update order status.");
  }

  return Boolean(data);
}
