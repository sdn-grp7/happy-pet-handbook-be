import sgMail from "@sendgrid/mail";
import { env, getCorsOrigins } from "../../config/env.js";

let configured = false;

function ensureClient() {
  if (configured) return true;
  if (!env.SENDGRID_API_KEY || !env.SENDGRID_FROM_EMAIL) return false;
  sgMail.setApiKey(env.SENDGRID_API_KEY);
  configured = true;
  return true;
}

function appBaseUrl() {
  const configured = env.APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, "");
  return getCorsOrigins()[0] ?? "http://localhost:5173";
}

export type AdoptionRequestMailInput = {
  to: string;
  ownerName: string;
  adopterName: string;
  petName: string;
  message?: string;
};

/** Fire-and-forget safe: returns false if mail is not configured. */
export async function sendAdoptionRequestToOwner(input: AdoptionRequestMailInput) {
  if (!ensureClient()) {
    console.warn("[mail] SENDGRID_API_KEY / SENDGRID_FROM_EMAIL not set — skip notify");
    return false;
  }

  const inboxUrl = `${appBaseUrl()}/adoption-requests`;
  const greeting = input.ownerName?.trim() || "bạn";
  const note = input.message?.trim()
    ? `\n\nLời nhắn từ người xin nhận nuôi:\n"${input.message.trim()}"\n`
    : "\n";

  const text = [
    `Xin chào ${greeting},`,
    "",
    `${input.adopterName} vừa gửi yêu cầu nhận nuôi bé ${input.petName}.`,
    note.trimEnd(),
    `Xem và xử lý tại: ${inboxUrl}`,
    "",
    "— PawPath",
  ].join("\n");

  const html = `
    <p>Xin chào <strong>${escapeHtml(greeting)}</strong>,</p>
    <p><strong>${escapeHtml(input.adopterName)}</strong> vừa gửi yêu cầu nhận nuôi bé <strong>${escapeHtml(input.petName)}</strong>.</p>
    ${
      input.message?.trim()
        ? `<p>Lời nhắn:</p><blockquote style="margin:0;padding:8px 12px;border-left:3px solid #c45c26;color:#444">${escapeHtml(input.message.trim())}</blockquote>`
        : ""
    }
    <p><a href="${inboxUrl}" style="display:inline-block;margin-top:12px;padding:10px 16px;background:#c45c26;color:#fff;text-decoration:none;border-radius:999px">Xem yêu cầu tới</a></p>
    <p style="color:#888;font-size:12px">— PawPath</p>
  `.trim();

  try {
    await sgMail.send({
      to: input.to,
      from: { email: env.SENDGRID_FROM_EMAIL, name: "PawPath" },
      subject: `Yêu cầu nhận nuôi mới — ${input.petName}`,
      text,
      html,
    });
  } catch (err: unknown) {
    const response =
      err && typeof err === "object" && "response" in err
        ? (err as { response?: { body?: unknown } }).response?.body
        : undefined;
    console.error("[mail] SendGrid error:", response ?? err);
    throw err;
  }

  return true;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
