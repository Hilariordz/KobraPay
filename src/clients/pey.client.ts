import { createHmac, timingSafeEqual } from "node:crypto";
import type {
  CreatePeyChargeInput,
  PeyChargeResponse,
} from "@/types/pey.types";

export class PeyClientError extends Error {
  constructor(
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "PeyClientError";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function createPeyCharge({
  amount,
  concept,
  reference,
}: CreatePeyChargeInput): Promise<PeyChargeResponse> {
  const apiKey = process.env.PEY_API_KEY;
  const apiUrl = process.env.PEY_API_URL;

  if (!apiKey || !apiUrl) {
    throw new PeyClientError(
      "PEY_API_KEY and PEY_API_URL must be configured.",
      503,
    );
  }

  let response: Response;
  try {
    response = await fetch(`${apiUrl.replace(/\/+$/, "")}/charges`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ amount, concept, reference }),
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    throw new PeyClientError("Could not reach the Pey API.", 502);
  }

  if (!response.ok) {
    throw new PeyClientError(
      `Pey charge request failed with status ${response.status}.`,
      502,
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new PeyClientError("Pey returned an invalid JSON response.", 502);
  }

  if (!isRecord(data)) {
    throw new PeyClientError("Pey returned an invalid charge response.", 502);
  }

  const peyReference = data.pey_reference ?? data.reference;
  if (
    typeof data.qr_payload !== "string" ||
    !data.qr_payload ||
    typeof peyReference !== "string" ||
    !peyReference
  ) {
    throw new PeyClientError(
      "Pey response is missing the QR payload or reference.",
      502,
    );
  }

  return { qr_payload: data.qr_payload, pey_reference: peyReference };
}

export function isValidPeyWebhookSignature(
  rawBody: string,
  signature: string,
): boolean {
  const secret = process.env.PEY_WEBHOOK_SECRET;
  if (!secret) return true;

  const providedSignature = signature.replace(/^sha256=/i, "");
  const expectedSignature = createHmac("sha256", secret)
    .update(rawBody)
    .digest("hex");
  const provided = Buffer.from(providedSignature, "hex");
  const expected = Buffer.from(expectedSignature, "hex");

  return (
    provided.length === expected.length &&
    timingSafeEqual(provided, expected)
  );
}
