"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { normalizePhone } from "@/lib/phone";
import { clientIp, takeToken } from "@/lib/rate-limit";
import {
  googleEnabled,
  googleSignInUrl,
  safeNext,
  sendSignInCode,
  sendSignInLink,
  verifySignInCode,
} from "@/modules/identity";

// Rate limits (PRD ACC-1). Per address or number they stop spam to one
// person; per IP they stop scripts, kept generous because many Filipino
// mobile users share one carrier IP.
const QUARTER_HOUR = 15 * 60;
const PER_TARGET = 3;
const PER_IP = 30;
const CODE_CHECKS = 10;

async function limited(
  ...rules: [key: string, limit: number][]
): Promise<string | null> {
  for (const [key, limit] of rules) {
    const token = await takeToken(key, limit, QUARTER_HOUR);
    if (!token.ok) {
      const minutes = Math.max(1, Math.ceil(token.retryAfterSeconds / 60));
      return `Too many tries. Please wait ${minutes} ${minutes === 1 ? "minute" : "minutes"} and try again.`;
    }
  }
  return null;
}

const ip = async () => clientIp(await headers());

export type SignInState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string; email: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function requestSignInLink(
  _prev: SignInState,
  formData: FormData
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const next = String(formData.get("next") ?? "");
  if (!EMAIL.test(email)) {
    return {
      status: "error",
      message: "Enter an email address like juan@example.com.",
      email,
    };
  }
  const tooMany = await limited(
    [`link:ip:${await ip()}`, PER_IP],
    [`link:email:${email}`, PER_TARGET]
  );
  if (tooMany) return { status: "error", message: tooMany, email };
  try {
    await sendSignInLink(email, next);
    return { status: "sent", email };
  } catch {
    return {
      status: "error",
      message:
        "We could not send the link just now. Please try again in a minute.",
      email,
    };
  }
}

export type CodeState = {
  step: "number" | "code";
  /** As typed, so the field refills. */
  typed: string;
  phone?: string;
  message?: string;
};

export async function requestSignInCode(
  _prev: CodeState,
  formData: FormData
): Promise<CodeState> {
  const typed = String(formData.get("phone") ?? "");
  const phone = normalizePhone(typed);
  if (!phone) {
    return {
      step: "number",
      typed,
      message: "Enter a mobile number like 0917 123 4567.",
    };
  }
  const tooMany = await limited(
    [`code:ip:${await ip()}`, PER_IP],
    [`code:phone:${phone}`, PER_TARGET]
  );
  if (tooMany) return { step: "number", typed, message: tooMany };
  try {
    await sendSignInCode(phone);
    return { step: "code", typed, phone };
  } catch {
    return {
      step: "number",
      typed,
      message:
        "We could not send a code just now. Please try again in a minute.",
    };
  }
}

export async function verifySignInCodeAction(
  prev: CodeState,
  formData: FormData
): Promise<CodeState> {
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!phone) return { step: "number", typed: prev.typed };
  if (!/^\d{6}$/.test(code)) {
    return { ...prev, step: "code", phone, message: "Enter the 6-digit code." };
  }
  const tooMany = await limited([`verify:phone:${phone}`, CODE_CHECKS]);
  if (tooMany) return { ...prev, step: "code", phone, message: tooMany };
  if (!(await verifySignInCode(phone, code))) {
    return {
      ...prev,
      step: "code",
      phone,
      message: "That code did not work. Check it, or ask for a new one.",
    };
  }
  redirect(safeNext(String(formData.get("next") ?? "")));
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  if (!googleEnabled()) return;
  const url = await googleSignInUrl(String(formData.get("next") ?? ""));
  if (url) redirect(url);
}
