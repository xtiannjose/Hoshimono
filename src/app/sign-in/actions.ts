"use server";

import { sendSignInLink } from "@/modules/identity";

export type SignInState =
  | { status: "idle" }
  | { status: "sent"; email: string }
  | { status: "error"; message: string; email: string };

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// shortcut: no rate limit on link requests yet; Batch 2.6 adds them (PRD ACC-1).
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
