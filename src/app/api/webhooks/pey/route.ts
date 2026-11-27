import {
  OrderServiceError,
  processPeyWebhook,
} from "@/services/order.service";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-pey-signature") ?? "";
  try {
    return Response.json(await processPeyWebhook(rawBody, signature));
  } catch (error) {
    return Response.json(
      {
        error:
          error instanceof OrderServiceError
            ? error.message
            : "Could not process webhook.",
      },
      { status: error instanceof OrderServiceError ? error.statusCode : 500 },
    );
  }
}
