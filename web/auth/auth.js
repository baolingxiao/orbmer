const state = { csrfToken: "", role: "" };
const guestView = document.querySelector("[data-guest-view]");
const buyerView = document.querySelector("[data-buyer-view]");
const adminView = document.querySelector("[data-admin-view]");

function showGoogleResult() {
  const result = new URLSearchParams(location.search).get("google");
  if (!result || result === "success") return;
  const message = document.querySelector("[data-google-message]");
  if (!message) return;
  const messages = {
    cancelled: "已取消 Google 登录。",
    state_error: "登录验证已过期，请重新尝试。",
    failed: "Google 登录未完成，请稍后重试。",
    unavailable: "Google 登录暂不可用，请使用邮箱继续。",
  };
  message.textContent = messages[result] || "Google 登录未完成，请稍后重试。";
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
  if (!response.ok) throw new Error(data.error || "Request failed");
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
    membership.textContent = session.user?.membershipStatus === "member" ? "傲马会员" : "标准账户";
    membership.classList.toggle("is-member", session.user?.membershipStatus === "member");
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
    root.innerHTML = "<p>暂无订单。可用同一邮箱下单后再点「关联历史订单」。</p>";
    return;
  }
  root.innerHTML = data.orders
    .map(
      (order) => `<article class="order"><strong>${order.id}</strong><div>${order.status}</div>
      <div>${order.paymentStatus || ""} · ${(order.totals?.dueNowCents / 100).toFixed?.(2) || ""} USD</div></article>`
    )
    .join("");
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
    error.textContent = "注册成功，请切换到登录";
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

async function boot() {
  showGoogleResult();
  try {
    const session = await api("/session");
    if (!session.configured) return;
    const googleLink = document.querySelector("[data-google-sign-in]");
    if (googleLink && session.googleSignInAvailable === false) {
      googleLink.hidden = true;
      document.querySelector(".auth-divider")?.setAttribute("hidden", "");
    }
    if (session.authenticated) {
      showUser(session);
      await loadOrders();
    }
  } catch (err) {
    console.error(err);
  }
}

boot();
