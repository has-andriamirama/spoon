import { NextResponse } from "next/server";

/**
 * Deprecated.
 *
 * Payment sessions are now allowed to remain open for their Stripe-defined
 * expiration period. Stripe's checkout.session.expired webhook is the source
 * of truth for expiration, with auto-cancel-pending acting as a DB fallback.
 *
 * Keep this route temporarily so an old cron invocation does not mutate
 * legitimate pending payments.
 */
export async function GET() {
  return NextResponse.json({
    success: true,
    cleaned: 0,
    message: "Deprecated: pending payments are no longer expired by this cron.",
  });
}
