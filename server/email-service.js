import {
  CUSTOMER_EMAIL_TEMPLATES,
  CUSTOMER_COMMUNICATION_VERSION,
  localeFrom,
} from "../web/shared/js/customer-communications.js";

function asText(value, max = 5000) {
  return String(value ?? "").trim().slice(0, max);
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());
}

export function getEmailConfig() {
  const provider = asText(process.env.EMAIL_PROVIDER || "resend", 40).toLowerCase();
  const from = asText(process.env.EMAIL_FROM, 240);
  const replyTo = asText(process.env.EMAIL_REPLY_TO || process.env.SUPPORT_EMAIL, 240);
  const resendKey = asText(process.env.RESEND_API_KEY, 500);
  const configured = provider === "resend" && Boolean(resendKey && from);
  return {
    provider,
    configured,
    fromConfigured: Boolean(from),
    replyToConfigured: Boolean(replyTo),
  };
}

export function listEmailTemplates() {
  return Object.entries(CUSTOMER_EMAIL_TEMPLATES).map(([id, template]) => ({
    id,
    subjectZh: template.zh.subject,
    subjectEn: template.en.subject,
  }));
}

export function buildEmailDraft({ templateId = "sourcing_update", language = "zh", order = null } = {}) {
  const template = CUSTOMER_EMAIL_TEMPLATES[templateId] || CUSTOMER_EMAIL_TEMPLATES.sourcing_update;
  const locale = localeFrom(language);
  const selected = template[locale];
  const orderLine = order?.id
    ? locale === "zh"
      ? `\n\n订单号：${order.id}`
      : `\n\nOrder: ${order.id}`
    : "";
  return {
    templateId: CUSTOMER_EMAIL_TEMPLATES[templateId] ? templateId : "sourcing_update",
    language: locale,
    version: CUSTOMER_COMMUNICATION_VERSION,
    subject: selected.subject,
    body: `${selected.body}${orderLine}`,
  };
}

export async function sendEmail({ to, subject, text, orderId = "", templateId = "manual" }) {
  const config = getEmailConfig();
  if (!config.configured) throw new Error("Email provider is not configured.");

  const recipient = asText(to, 254);
  if (!validEmail(recipient)) throw new Error("A valid recipient email is required.");

  const cleanSubject = asText(subject, 180);
  const cleanText = asText(text, 10000);
  if (!cleanSubject) throw new Error("Email subject is required.");
  if (!cleanText) throw new Error("Email body is required.");

  if (config.provider !== "resend") {
    throw new Error(`Unsupported email provider: ${config.provider}`);
  }

  const payload = {
    from: asText(process.env.EMAIL_FROM, 240),
    to: recipient,
    subject: cleanSubject,
    text: cleanText,
    headers: {
      "X-Orbmare-Email-Template": asText(templateId, 80),
      ...(orderId ? { "X-Orbmare-Order-Id": asText(orderId, 120) } : {}),
    },
  };
  const replyTo = asText(process.env.EMAIL_REPLY_TO || process.env.SUPPORT_EMAIL, 240);
  if (replyTo) payload.reply_to = replyTo;

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body.message || body.error || "Email provider rejected the message.");
  }
  return {
    provider: "resend",
    messageId: body.id || "",
    to: recipient,
    subject: cleanSubject,
    templateId,
  };
}
