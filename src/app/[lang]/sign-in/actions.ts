"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { normalizePhone } from "@/lib/phone";
import { clientIp } from "@/lib/rate-limit";
import {
  emailSignInLink,
  googleEnabled,
  googleSignInUrl,
  safeNext,
  textSignInCode,
  verifySignInCode,
} from "@/modules/identity";

import { codeLimits, linkLimits, verifyLimits } from "./limits";

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
  const tooMany = await linkLimits(email, await ip());
  if (tooMany) return { status: "error", message: tooMany, email };
  try {
    await emailSignInLink(email, next);
    return { status: "sent", email };
  } catch (error) {
    console.error("[sign-in] link not sent:", error);
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
  const tooMany = await codeLimits(phone, await ip());
  if (tooMany) return { step: "number", typed, message: tooMany };
  try {
    await textSignInCode(phone);
    return { step: "code", typed, phone };
  } catch (error) {
    console.error("[sign-in] code not sent:", error);
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
  const tooMany = await verifyLimits(phone, await ip());
  if (tooMany) return { ...prev, step: "code", phone, message: tooMany };
  let accepted: boolean;
  try {
    accepted = await verifySignInCode(phone, code);
  } catch (error) {
    console.error("[sign-in] code not checked:", error);
    return {
      ...prev,
      step: "code",
      phone,
      message:
        "We could not check your code just now. Please try again in a minute.",
    };
  }
  if (!accepted) {
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
