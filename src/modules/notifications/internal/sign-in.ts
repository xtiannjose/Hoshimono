import { emailProvider, smsProvider } from "./providers";

/** The one-time sign-in code by SMS (PRD ACC-1). Not logged: it is a secret. */
export async function sendSignInCode(
  phone: string,
  code: string,
  validMinutes: number
): Promise<void> {
  await smsProvider().send({
    to: phone,
    text: `${code} is your Hoshimono sign-in code. It works for ${validMinutes} minutes. Never share it with anyone, even if they say they are from Hoshimono.`,
  });
}

/** The sign-in link by email (PRD ACC-1). */
export async function sendSignInLink(
  email: string,
  url: string
): Promise<void> {
  await emailProvider().send({
    to: email,
    subject: "Your Hoshimono sign-in link",
    text: `Tap this link to sign in to Hoshimono:\n${url}\n\nIf you did not ask to sign in, you can ignore this email.`,
  });
}
