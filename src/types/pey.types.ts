export interface CreatePeyChargeInput {
  amount: number;
  concept: string;
  reference: string;
}

export interface PeyChargeResponse {
  qr_payload: string;
  pey_reference: string;
}

export interface PeyWebhookPayload {
  pey_reference?: string;
  reference?: string;
  status?: string;
}
