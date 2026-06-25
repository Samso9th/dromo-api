import { env } from "@/config/env";
import { logger } from "@/config/logger";

const FROM = "Dromo Tech <noreply@dromo.tech>";

async function sendEmail(
  to: string,
  subject: string,
  html: string,
): Promise<void> {
  if (!env.RESEND_API_KEY) {
    logger.info(`[email:dev] would send to=${to} subject="${subject}"`);
    return;
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });
  if (!res.ok) {
    logger.error(`Resend send failed: ${res.status} ${await res.text()}`);
  }
}

export async function sendMagicLink(to: string, link: string): Promise<void> {
  // Always log the link so dev works without a configured email provider.
  logger.info(`[magic-link] ${to} -> ${link}`);
  await sendEmail(
    to,
    "Your Dromo sign-in link",
    `<p>Click to sign in to Dromo:</p><p><a href="${link}">${link}</a></p><p>This link expires in 15 minutes.</p>`,
  );
}
