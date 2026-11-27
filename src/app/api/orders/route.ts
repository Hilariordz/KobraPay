import { createOrder, OrderServiceError } from "@/services/order.service";
import type { CreateOrderInput } from "@/types/order.types";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (!isRecord(body)) {
    return Response.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { amount, concept } = body;
  if (
    typeof amount !== "number" ||
    typeof concept !== "string"
  ) {
    return Response.json(
      { error: "A numeric amount and a concept are required." },
      { status: 400 },
    );
  }

  try {
    const input: CreateOrderInput = { amount, concept };
    const order = await createOrder(input);
    return Response.json(order, { status: 201 });
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof OrderServiceError
            ? error.message
            : "Could not create the order.",
      },
      { status: error instanceof OrderServiceError ? error.statusCode : 500 },
    );
  }
}
