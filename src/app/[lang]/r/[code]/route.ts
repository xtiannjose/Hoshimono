import { connection, NextResponse } from "next/server";

import { REFERRAL_COOKIE } from "../referral-cookie";

const THIRTY_DAYS = 30 * 24 * 60 * 60;

/**
 * A friend's Referral link (ADR 0015): remember the code for 30 days, then
 * go to the shop. It is applied at the friend's first Checkout.
 */
export async function GET(
  request: Request,
  { params }: RouteContext<"/[lang]/r/[code]">
) {
  await connection();
  const code = (await params).code.toUpperCase();
  const response = NextResponse.redirect(new URL("/", request.url), 303);
  if (/^[A-Z2-9]{6}$/.test(code)) {
    response.cookies.set(REFERRAL_COOKIE, code, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: THIRTY_DAYS,
      path: "/",
    });
  }
  return response;
}
