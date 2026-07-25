# AI Content Optimization

Orbmare admin AI writing assistant for editorial CMS fields. OpenAI runs **only on the server** via the Responses API with structured JSON output. Accepting a suggestion updates the form; the existing **Save** button still writes the database.

## Architecture

```
Admin form field
  → AiOptimizeButton / Batch button (web/admin/ai/admin-ai.js)
  → POST /api/ai/optimize  (admin router, CSRF + session + permission)
  → server/ai/service.js
      → field-registry whitelist
      → rate-limit
      → prompt-registry + writing-guide
      → openai-client (Responses API + JSON schema)
      → log-repo (ai_optimization_logs + audit event)
  → preview / diff / accept → form state only
```

| Layer | Path |
|-------|------|
| Config | `server/ai/config.js` |
| Writing guide | `server/ai/writing-guide.js` |
| Prompt registry | `server/ai/prompt-registry.js` |
| Field whitelist | `server/ai/field-registry.js` |
| JSON schemas | `server/ai/schema.js` |
| OpenAI client | `server/ai/openai-client.js` |
| Service | `server/ai/service.js` |
| Rate limit | `server/ai/rate-limit.js` |
| Logs | `server/ai/log-repo.js` |
| Migration | `server/db/migrations/005_ai_optimization.sql` |
| Admin UI | `web/admin/ai/admin-ai.js`, `diff.js`, `ai.css` |

## Environment variables

```bash
OPENAI_API_KEY=
OPENAI_DEFAULT_MODEL=          # standard tier (e.g. GPT-5.6 Luna id)
OPENAI_PREMIUM_MODEL=          # premium tier (e.g. GPT-5.6 Terra id)
OPENAI_AI_FEATURE_ENABLED=true
OPENAI_MAX_INPUT_CHARS=30000
OPENAI_REQUEST_TIMEOUT_MS=45000
OPENAI_DAILY_LIMIT_PER_USER=200
OPENAI_MONTHLY_LIMIT_PER_USER=3000
OPENAI_RATE_LIMIT_PER_MINUTE=20
OPENAI_COST_PER_1M_INPUT=1.25
OPENAI_COST_PER_1M_OUTPUT=10
```

- Never put `OPENAI_API_KEY` in frontend code or commit it.
- Model IDs must come from env only (not hardcoded in callers).

## OpenAI configuration

1. Create an API key in the OpenAI dashboard.
2. Set `OPENAI_DEFAULT_MODEL` / `OPENAI_PREMIUM_MODEL` to model IDs available on the account.
3. Restart the Node process (`pm2 restart printnova` after deploy).
4. Run DB migration so permissions and log tables exist:

```bash
npm run db:migrate
```

## Permissions

| Permission | Meaning |
|------------|---------|
| `ai_content_optimize` | Use AI optimize API + UI |
| `ai_content_use_premium_model` | Select premium model tier |

Seeded for `super_admin`, `administrator`, and (standard only) `editor` in `005_ai_optimization.sql`. Legacy single-admin sessions receive all permissions via `LEGACY_ALL_PERMISSIONS`.

## API

### `GET /api/ai/registry`

Returns enabled flag, field registry, and allowed enums.

### `POST /api/ai/optimize`

Requires session, CSRF, `ai_content_optimize`.

**Single field**

```json
{
  "entityType": "brand",
  "entityId": "brand-oclin",
  "mode": "single_field",
  "field": "editorsNoteZh",
  "contentType": "editor_note",
  "objective": "luxury_editorial",
  "tone": "restrained",
  "length": "similar",
  "modelTier": "standard",
  "currentValue": "...",
  "context": { "nameZh": "Oclin" },
  "customInstruction": "不要虚构事实"
}
```

**Full form**

```json
{
  "entityType": "brand",
  "mode": "full_form",
  "fields": { "blurbZh": "...", "editorsNoteZh": "..." }
}
```

Frontend cannot pass system prompts or raw model IDs — only `modelTier`: `standard` | `premium`.

## How to add an AI-enabled field

1. Add a form control with a stable `name` on the admin form.
2. Register it in `server/ai/field-registry.js` under the entity:

```js
field({
  field: "storyZh",
  label: "中文故事",
  language: "zh",
  contentType: "brand_story",
  maxLength: 2000,
  relatedFields: ["nameZh", "blurbZh"],
})
```

3. Re-open the form — `mountForm` attaches the AI button from the registry API.
4. Do **not** enable AI for id, slug, status, prices, SKU, URLs, images, or passwords.

## How to add a content-type prompt

Edit `server/ai/prompt-registry.js` `CONTENT_RULES` and reference the key from the field’s `contentType`. Global voice lives in `server/ai/writing-guide.js`.

## How to add an entity

1. Add `entityType` key + fields in `ENTITY_FIELD_REGISTRY`.
2. On the admin form, call:

```js
bridge().ai.mountForm(form, { entityType: "my_entity", getEntityId: () => id });
```

3. Ensure save still goes through the existing content/product API.

## Rate limits & cost

- Per-minute and per-day limits (in-memory per Node process).
- Input character cap via `OPENAI_MAX_INPUT_CHARS`.
- Timeout via `OPENAI_REQUEST_TIMEOUT_MS`.
- One retry for timeout / 5xx / OpenAI 429 only.
- Token usage + rough USD estimate stored on `ai_optimization_logs` (no full prompt/output by default).

## Logging & privacy

- Table: `ai_optimization_logs` (request id, user, entity, field, tokens, cost, warnings, hash).
- Also appends a compact `ai.optimize` audit event.
- Full source/output text is **not** stored by default.
- API keys and Authorization headers are never logged.

## Wired admin surfaces

| Surface | Entity type | Notes |
|---------|-------------|--------|
| Brand / studio / designer dialog | `brand` | Full editorial fields + philosophy batch |
| Product dialog | `product` | Titles, descriptions, stories, SEO |
| Material dialog | `material` | Via shared entity dialog |
| Country dialog | `country` | Pavilion copy |
| Craft dialog | `craft` | History / blurbs |
| Site content form | `site_content` | Home / about / journal heroes |

## Not separately modeled yet

- Standalone magazine CMS articles / blog posts as first-class entities (journal items JSON can still be edited manually; add fields to registry when a dedicated editor exists).
- Rich-text HTML editors (current fields are input/textarea).

## Common errors

| Code / message | Cause |
|----------------|-------|
| `ai_key_missing` | `OPENAI_API_KEY` empty |
| `ai_model_missing` | Model env unset |
| `ai_disabled` | Feature flag off |
| `ai_forbidden` / 403 | Missing permission |
| `ai_premium_forbidden` | No premium permission |
| `ai_rate_limited` / `ai_daily_quota` | Limits hit |
| `ai_input_too_large` | Context too large |
| `invalid_field` / `invalid_entity_type` | Outside whitelist |
| Conflict confirm dialog | User edited field while AI was running |

## Deploy steps

1. Set OpenAI env vars on the server `.env` (deploy script must not overwrite `.env`).
2. `npm run db:migrate`
3. Deploy code (`./scripts/deploy-production.sh` or equivalent).
4. `pm2 restart printnova` (or your process name).
5. Sign in as admin → brand edit → **AI 优化** → preview → accept → **保存**.

## Tests

```bash
npm run test:ai-optimize
npm run test:admin-rbac
npm run test:admin-security
```
