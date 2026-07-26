export const CUSTOMER_COMMUNICATION_VERSION = "orbmare-customer-voice-2026-07-26";

export const CUSTOMER_EMAIL_TEMPLATES = Object.freeze({
  payment_received: {
    zh: {
      subject: "Orbmare 已收到你的订单",
      body:
        "你好，\n\n谢谢你选择 Orbmare。我们已经收到你的订单，它接下来会进入采购与配送确认阶段。\n\n我们会先核对供应商供货状态、包装尺寸和合适的运输方式。若有采购、运费或发货更新，我们会继续通过邮件告诉你。\n\nOrbmare 傲马",
    },
    en: {
      subject: "Your Orbmare order is confirmed",
      body:
        "Hello,\n\nThank you for choosing Orbmare. We’ve received your order, and it will now move into sourcing and shipping confirmation.\n\nWe’ll review supplier availability, package details, and the right shipping route. If there are sourcing, shipping cost, or dispatch updates, we’ll keep you informed by email.\n\nWarmly,\nOrbmare",
    },
  },
  sourcing_update: {
    zh: {
      subject: "Orbmare 采购确认更新",
      body:
        "你好，\n\n你的订单正在采购确认中。我们会继续核对供应商状态、包装信息和运输安排。\n\n目前你不需要额外操作。有进一步确认后，我们会通过邮件告诉你。\n\nOrbmare 傲马",
    },
    en: {
      subject: "An update on your Orbmare order",
      body:
        "Hello,\n\nYour order is under sourcing review. We’re continuing to confirm supplier status, package details, and shipping arrangements.\n\nThere’s nothing you need to do right now. We’ll email you when there is another confirmed update.\n\nWith care,\nOrbmare",
    },
  },
  shipping_adjustment: {
    zh: {
      subject: "Orbmare 需要与你确认运费变化",
      body:
        "你好，\n\n我们在确认最终运输方式时发现，承运商报价与结账时的预估运费有明显差异。\n\n在继续处理前，我们想先与你确认。你可以选择补付差额、更换运输方式，或取消订单并退款。请直接回复这封邮件告诉我们你的选择，我们会继续协助你。\n\nOrbmare 傲马",
    },
    en: {
      subject: "Action needed: confirm your shipping choice",
      body:
        "Hello,\n\nWhile confirming the final shipping route, we found that the carrier quote differs materially from the estimated shipping fee shown at checkout.\n\nBefore continuing, we’d like to confirm your choice. You may pay the difference, change the shipping method, or cancel the order for a refund. Please reply to this email with your preference, and we’ll help from there.\n\nWith care,\nOrbmare",
    },
  },
  supplier_unavailable: {
    zh: {
      subject: "Orbmare 需要与你确认供货情况",
      body:
        "你好，\n\n我们与供应商确认后，这件作品目前可能不能按原订单供货。\n\n你可以选择退款、等待补货，或让我们为你推荐替代作品。请直接回复这封邮件告诉我们你的选择。\n\nOrbmare 傲马",
    },
    en: {
      subject: "An availability update from Orbmare",
      body:
        "Hello,\n\nAfter checking with the supplier, this piece may not be available for the original order.\n\nYou may choose a refund, wait for restock, or let us suggest an alternative. Please reply to this email with your preference.\n\nWith care,\nOrbmare",
    },
  },
  tracking_update: {
    zh: {
      subject: "Orbmare 物流更新",
      body:
        "你好，\n\n你的订单已有新的物流更新。你可以查看承运商、追踪号和预计送达时间。\n\n如果追踪信息暂时没有刷新，通常是承运商还在同步包裹记录。我们会在有新的确认信息后继续更新。\n\nOrbmare 傲马",
    },
    en: {
      subject: "Your Orbmare order has a shipping update",
      body:
        "Hello,\n\nThere is a new shipping update for your order. You can review the carrier, tracking number, and estimated delivery timing.\n\nIf tracking does not update immediately, the carrier may still be syncing the package record. We’ll keep you informed as new confirmed details become available.\n\nWarmly,\nOrbmare",
    },
  },
  fulfillment_update: {
    zh: {
      subject: "Orbmare 订单状态更新",
      body:
        "你好，\n\n你的订单有新的履约进展。\n\n订单号：{{orderId}}\n新状态：{{statusTitle}}\n\n{{publicDescription}}\n\n预计送达时间：{{estimatedDelivery}}\n\n你可以回到账户页面查看完整 Order Journey。\n\nOrbmare 傲马",
    },
    en: {
      subject: "Your Orbmare order journey has been updated",
      body:
        "Hello,\n\nThere is a new update in your order journey.\n\nOrder: {{orderId}}\nNew status: {{statusTitle}}\n\n{{publicDescription}}\n\nEstimated delivery: {{estimatedDelivery}}\n\nYou can view the full Order Journey from your account.\n\nWith care,\nOrbmare",
    },
  },
});

export const CUSTOMER_CHECKOUT_COPY = Object.freeze({
  zh: {
    sourcingTitle: "采购与配送确认",
    sourcingLead:
      "Orbmare 傲马有话想说：很多作品不是从一个大仓库里直接发出。你付款后，我们会先和供应商确认库存、包装尺寸，以及最合适的空运或海运方式。",
    sourcingQuote:
      "现在看到的运费，是根据你的地址、商品重量、尺寸和所选运输方式生成的预估报价。多数情况下它可以直接使用；如果承运商最终报价有明显变化，我们会先发邮件告诉你，不会在没有确认的情况下继续增加费用。",
    sourcingUpdate: "后续的采购确认、物流选择、发货和追踪号，都会通过邮件更新给你。",
    smallDifference: "小额差异：我们会尽量内部处理。",
    materialDifference: "明显差额：你可以选择补付差额、更换运输方式，或取消订单退款。",
    unavailableItem: "如果供应商确认无货：我们会提供退款、替换推荐，或先联系你再决定。",
    sourcingAcknowledge:
      "我理解 Orbmare 会在付款后确认供货、包装和最终运输方式；如果出现明显运费差额，傲马会先通过邮件联系我再继续处理。",
    legalAcknowledge:
      "我已阅读并同意 Orbmare 的《采购服务条款》《配送与进口费用说明》《退货与退款政策》和《隐私政策》。",
    payAcknowledge:
      "点击支付即表示你确认本订单信息无误，并同意上述条款。",
  },
  en: {
    sourcingTitle: "Sourcing and shipping confirmation",
    sourcingLead:
      "A quick note from Orbmare: many pieces do not leave from one large warehouse. After payment, we first confirm availability, package details, and the best air or sea shipping route with the supplier.",
    sourcingQuote:
      "The shipping fee shown now is an estimate based on your address, item weight, dimensions, and selected transport method. In most cases it is enough to proceed. If the final carrier quote changes materially, we’ll email you first and will not add extra cost without confirmation.",
    sourcingUpdate: "Supplier confirmation, shipping choice, dispatch, and tracking updates will be sent by email.",
    smallDifference: "Small difference: we’ll try to handle it internally.",
    materialDifference: "Material difference: you may pay the difference, change the shipping method, or cancel for a refund.",
    unavailableItem: "If the supplier confirms the item is unavailable, we’ll offer a refund, a replacement suggestion, or contact you before deciding.",
    sourcingAcknowledge:
      "I understand Orbmare will confirm availability, package details, and final shipping after payment. If a material shipping difference appears, Orbmare will email me before continuing.",
    legalAcknowledge:
      "I have read and agree to Orbmare’s Purchasing Service Terms, Shipping and Import Cost Policy, Returns and Refunds Policy, and Privacy Policy.",
    payAcknowledge:
      "By paying, you confirm that the order information is correct and that you agree to the terms above.",
  },
});

export const CUSTOMER_STATUS_COPY = Object.freeze({
  zh: {
    paymentVerifying: "我们正在核对付款状态。",
    paymentReceived: "你的付款已收到。下一步是供货与采购确认；这还不代表供应商已经最终确认供货。",
    paymentUpdate: "付款状态已有更新。",
    paymentReferenceMissing: "没有找到有效的付款记录。请返回结账页重新查看订单。",
    paymentVerificationDelayed:
      "付款状态暂时还没有完成同步。你的信息没有丢失；如果稍后仍未更新，请带上 Stripe 付款编号联系我们。",
  },
  en: {
    paymentVerifying: "We’re checking the payment status.",
    paymentReceived:
      "Your payment was received. The next step is availability and sourcing confirmation; the supplier has not yet confirmed the order.",
    paymentUpdate: "There is a payment update for your order.",
    paymentReferenceMissing: "We couldn’t find a valid payment reference. Please return to checkout and review the order again.",
    paymentVerificationDelayed:
      "Payment verification is taking longer than expected. Your details are still here; if the status does not update, contact us with the Stripe payment reference.",
  },
});

export const CUSTOMER_AUTH_COPY = Object.freeze({
  zh: {
    google: {
      cancelled: "Google 登录已取消。你可以继续使用邮箱登录。",
      state_error: "这次登录验证已经过期，请重新开始一次。",
      failed: "Google 登录暂时没有完成。你可以稍后再试，或先用邮箱继续。",
      unavailable: "Google 登录暂时没有开放，请先使用邮箱继续。",
      fallback: "Google 登录暂时没有完成。你可以稍后再试，或先用邮箱继续。",
    },
    requestFailed: "这次请求暂时没有完成，请稍后再试。",
    registerSuccess: "账户已创建。请切换到登录继续。",
    noOrders:
      "这里会显示与你当前邮箱关联的 Orbmare 订单。下单后如果没有自动出现，可以点「关联历史订单」。",
  },
  en: {
    google: {
      cancelled: "Google sign-in was cancelled. You can continue with email.",
      state_error: "This sign-in session has expired. Please start again.",
      failed: "Google sign-in did not finish. You can try again later or continue with email.",
      unavailable: "Google sign-in is not available right now. Please continue with email.",
      fallback: "Google sign-in did not finish. You can try again later or continue with email.",
    },
    requestFailed: "This request did not finish. Please try again shortly.",
    registerSuccess: "Your account has been created. Switch to sign in when you’re ready.",
    noOrders:
      "Orders connected to this email will appear here. If a recent order does not appear automatically, choose Link past orders.",
  },
});

export function localeFrom(value) {
  return value === "en" ? "en" : "zh";
}

export function getCustomerCommunicationCopy(locale = "zh") {
  const lang = localeFrom(locale);
  return {
    version: CUSTOMER_COMMUNICATION_VERSION,
    emails: CUSTOMER_EMAIL_TEMPLATES,
    checkout: CUSTOMER_CHECKOUT_COPY[lang],
    status: CUSTOMER_STATUS_COPY[lang],
    auth: CUSTOMER_AUTH_COPY[lang],
  };
}
