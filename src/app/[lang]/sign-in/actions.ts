"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { langOf } from "@/i18n/lang";
import { MESSAGES, type Messages } from "@/i18n/messages";
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

import {
  codeLimits,
  linkLimits,
  verifyLimits,
  type LimitRefusal,
} from "./limits";

const ip = async () => clientIp(await headers());

// Server Actions cannot read the language; the forms send it (ADR 0017).
const wordsFor = (formData: FormData) =>
  MESSAGES[langOf(formData.get("lang"))].signIn.problems;

const say = (t: Messages["signIn"]["problems"], no: LimitRefusal) =>
  no.reason === "too_many" ? t.too_many(no.minutes) : t.texts_paused;

export type SignInState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string; email: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function requestSignInLink(
  _prev: SignInState,
  formData: FormData
): Promise<SignInState> {
  const t = wordsFor(formData);
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const next = String(formData.get("next") ?? "");
  if (!EMAIL.test(email)) {
    return { status: "error", message: t.bad_email, email };
  }
  const tooMany = await linkLimits(email, await ip());
  if (tooMany) return { status: "error", message: say(t, tooMany), email };
  try {
    await emailSignInLink(email, next);
    return { status: "sent", email };
  } catch (error) {
    console.error("[sign-in] link not sent:", error);
    return { status: "error", message: t.link_failed, email };
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
  const t = wordsFor(formData);
  const typed = String(formData.get("phone") ?? "");
  const phone = normalizePhone(typed);
  if (!phone) return { step: "number", typed, message: t.bad_phone };
  const tooMany = await codeLimits(phone, await ip());
  if (tooMany) return { step: "number", typed, message: say(t, tooMany) };
  try {
    await textSignInCode(phone);
    return { step: "code", typed, phone };
  } catch (error) {
    console.error("[sign-in] code not sent:", error);
    return { step: "number", typed, message: t.code_failed };
  }
}

export async function verifySignInCodeAction(
  prev: CodeState,
  formData: FormData
): Promise<CodeState> {
  const t = wordsFor(formData);
  const phone = normalizePhone(String(formData.get("phone") ?? ""));
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!phone) return { step: "number", typed: prev.typed };
  if (!/^\d{6}$/.test(code)) {
    return { ...prev, step: "code", phone, message: t.bad_code };
  }
  const tooMany = await verifyLimits(phone, await ip());
  if (tooMany) {
    return { ...prev, step: "code", phone, message: say(t, tooMany) };
  }
  let accepted: boolean;
  try {
    accepted = await verifySignInCode(phone, code);
  } catch (error) {
    console.error("[sign-in] code not checked:", error);
    return { ...prev, step: "code", phone, message: t.check_failed };
  }
  if (!accepted) {
    return { ...prev, step: "code", phone, message: t.wrong_code };
  }
  redirect(safeNext(String(formData.get("next") ?? "")));
}

export async function signInWithGoogle(formData: FormData): Promise<void> {
  if (!googleEnabled()) return;
  const url = await googleSignInUrl(String(formData.get("next") ?? ""));
  if (url) redirect(url);
}
