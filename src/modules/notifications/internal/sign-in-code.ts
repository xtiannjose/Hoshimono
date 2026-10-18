import { smsProvider } from "./providers";

/** The one-time sign-in code by SMS (PRD ACC-1). Not logged: it is a secret. */
export async function sendSignInCode(
  phone: string,
  code: string
): Promise<void> {
  await smsProvider().send({
    to: phone,
    text: `${code} is your Hoshimono sign-in code. It works for 5 minutes. Never share it with anyone, even if they say they are from Hoshimono.`,
  });
}
