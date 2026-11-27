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

export interface CreateOrderInput {
  amount: number;
  concept: string;
}

export interface PeyChargeDetails {
  pey_reference: string;
  qr_payload: string;
}

export interface PeyWebhookEvent {
  reference?: string;
  status?: string;
  data?: {
    reference?: string;
    status?: string;
  };
}

export interface OrderApiResponse {
  order: OrderRecord;
}

export interface ApiErrorResponse {
  error: string;
}