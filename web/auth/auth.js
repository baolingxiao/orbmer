import { getCustomerCommunicationCopy } from "/shared/js/customer-communications.js";
import {
  CONCIERGE_STATUSES,
  MEMBERSHIP_COPY,
  MEMBERSHIP_ENTITLEMENTS,
  SERVICE_TYPES,
  TIER_META,
  tierIncludes,
} from "/shared/js/membership-data.js";

const lang = document.documentElement.lang?.startsWith("en") ? "en" : "zh";
const customerCopy = getCustomerCommunicationCopy(lang);
const state = { csrfToken: "", role: "" };
const guestView = document.querySelector("[data-guest-view]");
const buyerView = document.querySelector("[data-buyer-view]");
const adminView = document.querySelector("[data-admin-view]");

function showGoogleResult(googleAvailable = null) {
  const result = new URLSearchParams(location.search).get("google");
  if (!result) return;
  const message = document.querySelector("[data-google-message]");
  if (!message) return;
  if (result === "success" || (result === "unavailable" && googleAvailable === true)) {
    message.hidden = true;
    history.replaceState({}, "", "/auth/");
    return;
  }
  const messages = customerCopy.auth.google;
  message.textContent = messages[result] || messages.fallback;
  message.hidden = false;
  history.replaceState({}, "", "/auth/");
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (options.method && options.method !== "GET" && state.csrfToken) {
    headers["x-csrf-token"] = state.csrfToken;
  }
  const response = await fetch(`/auth/api${path}`, {
    credentials: "same-origin",
    ...options,
    headers,
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || customerCopy.auth.requestFailed);
  return data;
}

function hideAll() {
  guestView.hidden = true;
  buyerView.hidden = true;
  adminView.hidden = true;
}

function showUser(session) {
  state.csrfToken = session.csrfToken || "";
  state.role = session.user?.role || "";
  hideAll();
  if (state.role === "admin") {
    adminView.hidden = false;
    document.querySelector("[data-admin-email]").textContent = session.user?.email || "";
    return;
  }
  buyerView.hidden = false;
  document.querySelector("[data-user-email]").textContent = session.user?.email || "";
  const membership = document.querySelector("[data-membership-state]");
  if (membership) {
    const tier = session.user?.membershipStatus || "explorer";
    membership.textContent = tier === "explorer" ? "Explorer" : TIER_META[tier]?.titleZh || tier;
    membership.classList.toggle("is-member", tier !== "explorer");
  }
}

function showGuest() {
  state.csrfToken = "";
  state.role = "";
  hideAll();
  guestView.hidden = false;
}

async function loadOrders() {
  if (state.role !== "buyer") return;
  const data = await api("/orders");
  const root = document.querySelector("[data-orders]");
  if (!data.orders?.length) {
    root.innerHTML = `<p>${customerCopy.auth.noOrders}</p>`;
    return;
  }
  root.innerHTML = data.orders
    .map(
      (order) => `<article class="order"><strong>${order.id}</strong><div>${order.fulfillmentStatus || order.status}</div>
      <div>${order.paymentStatus || ""} · ${(order.totals?.dueNowCents / 100).toFixed?.(2) || ""} USD</div>
      <button type="button" data-view-journey="${order.id}">查看 Order Journey</button></article>`
    )
    .join("");
}

function membershipTierLabel(tier) {
  return TIER_META[tier]?.titleZh || "Explorer";
}

function requestStatusLabel(status) {
  return CONCIERGE_STATUSES[status]?.zh || status;
}

function serviceTypeLabel(type) {
  return SERVICE_TYPES[type]?.zh || type;
}

async function loadMembership() {
  if (state.role !== "buyer") return;
  const root = document.querySelector("[data-account-membership-body]");
  const concierge = document.querySelector("[data-account-concierge]");
  const requestRoot = document.querySelector("[data-concierge-requests]");
  if (!root) return;
  try {
    const data = await api("/membership");
    const membership = data.membership || { tier: "explorer", status: "inactive" };
    const tier = membership.tier || "explorer";
    const active = MEMBERSHIP_ENTITLEMENTS.filter((item) => tierIncludes(tier, item.tier) && item.availability === "active");
    const prep = MEMBERSHIP_ENTITLEMENTS.filter((item) => tierIncludes(tier, item.tier) && item.availability === "preparation");
    root.innerHTML = `
      <article class="membership-account-card">
        <p class="brand-stamp">Orbmare Membership</p>
        <h3>${membershipTierLabel(tier)}</h3>
        <p>${membership.billingInterval || "none"} · ${membership.status || "inactive"}${membership.currentPeriodEnd ? ` · 下次续费/到期 ${new Date(membership.currentPeriodEnd).toLocaleDateString()}` : ""}</p>
        <div class="actions">
          ${tier === "explorer" ? `<a href="/membership/" style="text-decoration:none"><button type="button">升级会员</button></a>` : ""}
          ${tier === "journal" ? `<a href="/membership/" style="text-decoration:none"><button type="button">升级 Collector</button></a>` : ""}
          ${tier !== "explorer" && membership.stripeCustomerId ? `<button type="button" data-manage-membership>管理订阅</button>` : ""}
          ${tier === "collector" ? `<a href="/membership/" style="text-decoration:none"><button type="button" class="ghost">申请了解 Black</button></a>` : ""}
        </div>
        <h4>已开放权益</h4>
        <ul>${active.map((item) => `<li>${item.titleZh}</li>`).join("") || "<li>公开浏览与正常下单</li>"}</ul>
        <h4>正在筹备</h4>
        <ul>${prep.map((item) => `<li>${item.titleZh}</li>`).join("") || "<li>暂无</li>"}</ul>
      </article>`;
    concierge.hidden = !["collector", "black"].includes(tier);
    const requests = data.requests || [];
    requestRoot.innerHTML = requests.length
      ? requests.map((request) => `<article class="request-row">
          <strong>${request.request_number}</strong>
          <span>${serviceTypeLabel(request.service_type)} · ${requestStatusLabel(request.status)}</span>
          <p>${request.description}</p>
          <small>${new Date(request.created_at).toLocaleString()}</small>
        </article>`).join("")
      : "<p>还没有服务申请记录。</p>";
  } catch (error) {
    root.innerHTML = `<p class="error">${error.message}</p>`;
  }
}

async function loadOrderJourney(orderId) {
  const data = await api(`/orders/${encodeURIComponent(orderId)}/journey`);
  const shell = document.querySelector("[data-order-journey]");
  const body = document.querySelector("[data-order-journey-body]");
  if (!shell || !body) return;
  const events = data.events || [];
  const shipments = data.shipments || [];
  body.innerHTML = `
    <article class="journey-card">
      <h3>${orderId}</h3>
      ${events.length ? events.map((event) => `
        <div class="journey-event">
          <strong>${event.publicTitle || event.status}</strong>
          <p>${event.publicDescription || ""}</p>
          <small>${event.location || ""}${event.location ? " · " : ""}${new Date(event.createdAt).toLocaleString()}</small>
        </div>`).join("") : "<p>订单旅程会在有新的履约进展后显示。</p>"}
    </article>
    ${shipments.map((shipment) => `
      <article class="journey-card">
        <h3>Shipment ${shipment.shipmentId}</h3>
        <p>${shipment.sourceCountry || ""} · ${shipment.carrier || ""} ${shipment.trackingNumber || ""}</p>
        ${(shipment.events || []).map((event) => `
          <div class="journey-event">
            <strong>${event.publicTitle || event.status}</strong>
            <p>${event.publicDescription || ""}</p>
            <small>${event.location || ""}${event.location ? " · " : ""}${new Date(event.createdAt).toLocaleString()}</small>
          </div>`).join("")}
      </article>`).join("")}
  `;
  shell.hidden = false;
}

document.querySelectorAll("[data-tab]").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll("[data-tab]").forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    const login = btn.dataset.tab === "login";
    document.querySelector("[data-login-form]").hidden = !login;
    document.querySelector("[data-register-form]").hidden = login;
  });
});

document.querySelector("[data-login-form]")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const error = document.querySelector("[data-login-error]");
  error.hidden = true;
  const form = new FormData(event.target);
  try {
    const data = await api("/login", {
      method: "POST",
      body: JSON.stringify({ email: form.get("email"), password: form.get("password") }),
    });
    showUser(data);
    if (data.user?.role === "admin") {
      location.href = "/";
      return;
    }
    await loadOrders();
    await loadMembership();
  } catch (err) {
    error.hidden = false;
    error.textContent = err.message;
  }
});

document.querySelector("[data-register-form]")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const error = document.querySelector("[data-register-error]");
  error.hidden = true;
  const form = new FormData(event.target);
  try {
    await api("/register", {
      method: "POST",
      body: JSON.stringify({
        displayName: form.get("displayName"),
        email: form.get("email"),
        password: form.get("password"),
      }),
    });
    error.hidden = false;
    error.classList.add("success");
    error.textContent = customerCopy.auth.registerSuccess;
  } catch (err) {
    error.hidden = false;
    error.classList.remove("success");
    error.textContent = err.message;
  }
});

document.querySelectorAll("[data-logout]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    try {
      await api("/logout", { method: "POST", body: "{}" });
    } catch {
      // ignore
    }
    showGuest();
  });
});

document.querySelector("[data-link-orders]")?.addEventListener("click", async () => {
  await api("/link-orders", { method: "POST", body: "{}" });
  await loadOrders();
});

document.querySelector("[data-orders]")?.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-view-journey]");
  if (!button) return;
  await loadOrderJourney(button.dataset.viewJourney);
});

document.querySelector("[data-account-membership]")?.addEventListener("click", async (event) => {
  const manage = event.target.closest("[data-manage-membership]");
  if (!manage) return;
  try {
    const data = await api("/membership/portal", { method: "POST", body: "{}" });
    location.href = data.url;
  } catch (error) {
    alert(error.message || MEMBERSHIP_COPY.zh.paymentInProgress);
  }
});

document.querySelector("[data-concierge-form]")?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const error = document.querySelector("[data-concierge-error]");
  error.hidden = true;
  const form = new FormData(event.target);
  try {
    const attachmentUrl = String(form.get("attachmentUrl") || "").trim();
    await api("/concierge", {
      method: "POST",
      body: JSON.stringify({
        serviceType: form.get("serviceType"),
        description: form.get("description"),
        budget: form.get("budget"),
        desiredDate: form.get("desiredDate"),
        productUrl: form.get("productUrl"),
        attachments: attachmentUrl ? [{ url: attachmentUrl }] : [],
        contactMethod: form.get("contactMethod"),
        country: form.get("country"),
      }),
    });
    event.target.reset();
    await loadMembership();
  } catch (err) {
    error.hidden = false;
    error.textContent = err.message;
  }
});

async function boot() {
  try {
    const session = await api("/session");
    if (!session.configured) return;
    showGoogleResult(session.googleSignInAvailable);
    const googleLink = document.querySelector("[data-google-sign-in]");
    if (googleLink && session.googleSignInAvailable === false) {
      googleLink.hidden = true;
      document.querySelector(".auth-divider")?.setAttribute("hidden", "");
    }
    if (session.authenticated) {
      showUser(session);
      await loadOrders();
      await loadMembership();
    }
  } catch (err) {
    showGoogleResult();
    console.error(err);
  }
}

boot();
