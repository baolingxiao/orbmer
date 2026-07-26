export function underConstructionSvg({ small = false } = {}) {
  const size = small ? 24 : 96;
  return `<svg class="under-construction-svg${small ? " is-small" : ""}" width="${size}" height="${size}" viewBox="0 0 96 96" role="img" aria-hidden="true">
    <g class="uc-hat">
      <path d="M35 31c2-9 9-15 18-15s16 6 18 15" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"/>
      <path d="M31 32h44v8H31z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>
      <path d="M45 17v14M61 17v14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".45"/>
    </g>
    <path d="M28 53c3-9 11-15 21-15 8 0 14 3 19 9l9 10c2 2 3 5 2 8-1 5-5 8-10 8H38c-12 0-20-8-20-17 0-6 4-10 10-10z" fill="none" stroke="currentColor" stroke-width="3" stroke-linejoin="round"/>
    <path d="M43 51h.1M63 51h.1" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"/>
    <path d="M50 62c4 3 9 3 13 0" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
    <path class="uc-light" d="M18 74h60M27 83h42" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity=".45"/>
  </svg>`;
}

export function underConstructionBadge(label, { small = true } = {}) {
  return `<span class="under-construction-badge">${underConstructionSvg({ small })}<span>${label}</span></span>`;
}

export function underConstructionPanel({ title, body, backLabel = "", backHref = "" } = {}) {
  return `<section class="under-construction-panel">
    ${underConstructionSvg()}
    <h1>${title}</h1>
    <p>${body}</p>
    ${backHref ? `<a class="btn btn-ghost" href="${backHref}">${backLabel}</a>` : ""}
  </section>`;
}
