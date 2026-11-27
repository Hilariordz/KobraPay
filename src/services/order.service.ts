import {
  createPeyCharge,
  isValidPeyWebhookSignature,
  PeyClientError,
} from "@/clients/pey.client";
import {
  createPendingOrder,
  findOrderByPeyReference,
  markOrderPaid,
  OrderRepositoryError,
  savePeyCharge,
} from "@/repositories/order.repository";
import type { CreateOrderInput } from "@/types/order.types";

export class OrderServiceError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "OrderServiceError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function toServiceError(error: unknown): OrderServiceError {
  if (error instanceof OrderRepositoryError || error instanceof PeyClientError) {
    return new OrderServiceError(error.message, error.statusCode);
  }

  return new OrderServiceError("An unexpected order error occurred.", 500);
}

export async function createOrder(input: CreateOrderInput) {
  if (!Number.isFinite(input.amount) || input.amount <= 0) {
    throw new OrderServiceError("Amount must be greater than zero.", 400);
  }

  if (typeof input.concept !== "string") {
    throw new OrderServiceError("Concept is required.", 400);
  }

  const concept = input.concept.trim();
  if (!concept || concept.length > 200) {
    throw new OrderServiceError(
      "Concept must contain 1 to 200 characters.",
      400,
    );
  }

  let order;
  try {
    order = await createPendingOrder({ amount: input.amount, concept });
  } catch (error) {
    throw toServiceError(error);
  }

  let charge;
  try {
    charge = await createPeyCharge({
      amount: order.amount,
      concept: order.concept,
      reference: order.id,
    });
  } catch (error) {
    throw toServiceError(error);
  }

  try {
    await savePeyCharge(order.id, charge);
  } catch (error) {
    throw toServiceError(error);
  }

  return {
    ...order,
    pey_reference: charge.pey_reference,
    qr_payload: charge.qr_payload,
  };
}

export async function processPeyWebhook(
  rawBody: string,
  signature: string,
): Promise<{ received: true }> {
  if (!isValidPeyWebhookSignature(rawBody, signature)) {
    throw new OrderServiceError("Invalid webhook signature.", 401);
  }

  let event: unknown;
  try {
    event = JSON.parse(rawBody);
  } catch {
    throw new OrderServiceError("Invalid JSON body.", 400);
  }

  if (!isRecord(event)) {
    throw new OrderServiceError("Invalid webhook body.", 400);
  }

  const reference = event.pey_reference ?? event.reference;
  if (typeof reference !== "string" || !reference) {
    throw new OrderServiceError(
      "Webhook is missing the payment reference.",
      400,
    );
  }

  if (event.status !== "paid") {
    return { received: true };
  }

  let order;
  try {
    order = await findOrderByPeyReference(reference);
  } catch (error) {
    throw toServiceError(error);
  }

  if (!order) {
    throw new OrderServiceError("Order not found.", 404);
  }

  if (order.status === "PAGADA") {
    return { received: true };
  }

  if (order.status !== "PENDIENTE") {
    throw new OrderServiceError("Order is not eligible for payment.", 409);
  }

  let updated: boolean;
  try {
    updated = await markOrderPaid(order.id, new Date().toISOString());
  } catch (error) {
    throw toServiceError(error);
  }

  if (!updated) {
    let latestOrder;
    try {
      latestOrder = await findOrderByPeyReference(reference);
    } catch (error) {
      throw toServiceError(error);
    }

    if (latestOrder?.status !== "PAGADA") {
      throw new OrderServiceError("Order is not eligible for payment.", 409);
    }
  }

  return { received: true };
}
