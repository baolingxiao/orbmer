const EMAIL_EVENTS = Object.freeze({
  payment_received: {
    zh: {
      subject: "Orbmare 已收到你的订单",
      body: "你好，\n\n我们已经收到你的订单。接下来我们会先确认供应商库存、包装尺寸和合适的运输方式。\n\n如果有采购、运费或发货更新，我们会继续通过邮件告诉你。\n\nOrbmare 傲马",
    },
    en: {
      subject: "Orbmare received your order",
      body: "Hello,\n\nWe have received your order. Next, we will confirm supplier availability, package details, and the right shipping route.\n\nIf there are sourcing, shipping cost, or dispatch updates, we will keep you posted by email.\n\nOrbmare",
    },
  },
  sourcing_update: {
    zh: {
      subject: "Orbmare 采购确认更新",
      body: "你好，\n\n你的订单正在采购确认中。我们会继续确认供应商状态、包装信息和运输安排。\n\n有进一步更新时，我们会通过邮件告诉你。\n\nOrbmare 傲马",
    },
    en: {
      subject: "Orbmare sourcing update",
      body: "Hello,\n\nYour order is under sourcing review. We are continuing to confirm supplier status, package details, and shipping arrangements.\n\nWe will email you when there is another update.\n\nOrbmare",
    },
  },
  shipping_adjustment: {
    zh: {
      subject: "Orbmare 需要与你确认运费变化",
      body: "你好，\n\n我们在确认最终运输方式时发现承运商报价与结账时的预估运费有明显差异。\n\n在继续处理前，我们想先与你确认：你可以选择补付差额、更换运输方式，或取消订单并退款。\n\n请直接回复这封邮件，我们会继续协助你。\n\nOrbmare 傲马",
    },
    en: {
      subject: "Orbmare needs to confirm a shipping cost change",
      body: "Hello,\n\nWhile confirming the final shipping route, we found that the carrier quote differs materially from the estimated shipping fee shown at checkout.\n\nBefore continuing, we would like to confirm your choice: you may pay the difference, change the shipping method, or cancel the order for a refund.\n\nPlease reply to this email and we will help from there.\n\nOrbmare",
    },
  },
  supplier_unavailable: {
    zh: {
      subject: "Orbmare 需要与你确认供货情况",
      body: "你好，\n\n我们刚与供应商确认，这件作品目前可能无法按原订单供货。\n\n你可以选择退款、等待补货，或让我们为你推荐替代作品。请直接回复这封邮件告诉我们你的选择。\n\nOrbmare 傲马",
    },
    en: {
      subject: "Orbmare needs to confirm item availability",
      body: "Hello,\n\nWe checked with the supplier and this object may not be available for the original order.\n\nYou may choose a refund, wait for restock, or let us suggest an alternative. Please reply to this email with your preference.\n\nOrbmare",
    },
  },
  tracking_update: {
    zh: {
      subject: "Orbmare 物流更新",
      body: "你好，\n\n你的订单已有新的物流更新。你可以查看承运商、追踪号和预计送达时间。\n\n如果追踪信息暂时没有刷新，通常是承运商还在同步包裹记录。\n\nOrbmare 傲马",
    },
    en: {
      subject: "Orbmare shipping update",
      body: "Hello,\n\nThere is a new shipping update for your order. You can review the carrier, tracking number, and estimated delivery timing.\n\nIf tracking does not update immediately, the carrier may still be syncing the package record.\n\nOrbmare",
    },
  },
});

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
  return Object.entries(EMAIL_EVENTS).map(([id, template]) => ({
    id,
    subjectZh: template.zh.subject,
    subjectEn: template.en.subject,
  }));
}

export function buildEmailDraft({ templateId = "sourcing_update", language = "zh", order = null } = {}) {
  const template = EMAIL_EVENTS[templateId] || EMAIL_EVENTS.sourcing_update;
  const locale = language === "en" ? "en" : "zh";
  const selected = template[locale];
  const orderLine = order?.id
    ? locale === "zh"
      ? `\n\n订单号：${order.id}`
      : `\n\nOrder: ${order.id}`
    : "";
  return {
    templateId: EMAIL_EVENTS[templateId] ? templateId : "sourcing_update",
    language: locale,
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
