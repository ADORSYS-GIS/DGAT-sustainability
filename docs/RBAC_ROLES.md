# Roles & RBAC Implementation — DGAT Sustainability Tool

## 1. Overview

Access control is enforced at three layers, each enforcing a different aspect
of the same authorization model:

1. **Keycloak** — issues JWT tokens containing realm roles and the
   `organizations` claim. This is the source of truth for identity and roles.
2. **Backend (Rust / Axum)** — validates JWT signatures and executes
   server-side role checks. This is the authoritative enforcement point for
   API access.
3. **Frontend (React)** — performs route-level guard checks via
   `<ProtectedRoute>` to hide/show UI. This is a **UX convenience only**; the
   backend re-checks every request.

The role hierarchy and application logic assume the following precedence:

```
application_admin  (super user, no org scoping)
       ▲
   drgv_admin       (DGRV platform administrator — admin console)
       ▲
   org_admin        (cooperative administrator, scoped to their organization)
       ▲
   Org_User         (cooperative member, can answer assessments)
```

---

## 2. Realm Roles Defined in Keycloak

The realm `sustainability-realm` (`infrastructure/keycloak/realm-export.json`)
defines these custom realm roles, in addition to the built-in Keycloak roles
(`offline_access`, `uma_authorization`, `default-roles-sustainability-realm`):

| Role | Scope | Description |
|------|-------|-------------|
| `application_admin` | Global | Super user. Bypasses organization scoping. Can manage any organization. |
| `drgv_admin` | Global | DGRV platform administrator. Used for the admin console frontend routes. |
| `org_admin` | Org-scoped | Cooperative administrator. Manages their organization's members, invitations, and assigned categories. |
| `Org_User` | Org-scoped | Cooperative member. Creates/answers/submits assessments and views reports. |

> The seeded admin user (`360@dgrv.coop`) created by `scripts/admin.sh` is
> assigned both `application_admin` and `drgv_admin`, plus all
> `realm-management` client roles.

The `organizations` JWT claim maps organization name → `{ id, categories }`:

```json
"organizations": {
  "adorsys": {
    "id": "org-id-123",
    "categories": ["environment", "social"]
  }
}
```

For `application_admin` users, the `organizations` claim may be absent — they
are treated as unscoped and can manage any organization.

---

## 3. Backend Authorization Model

### 3.1 JWT validation

The middleware chain is defined in `backend/src/web/routes.rs`:

- **`auth_middleware`** (`backend/src/web/handlers/midlw.rs`) is applied to all
  `/api/*` and `/user/*` and `/protected/*` routes.
  1. Extracts the `Authorization: Bearer <token>` header.
  2. Validates the token via Keycloak's JWKS endpoint using `JwtValidator`
     (`backend/src/web/handlers/jwt_validator.rs`).
  3. Injects `Claims` and the raw token string into the request extensions.
  4. Returns `401 Unauthorized` if the header is missing, malformed, or the
     signature/expiry fails to validate.
- Health endpoints (`/api/health`, `/api/metrics`, `/health`) are **public**
  and do not pass through the auth middleware.
- The OpenAPI spec endpoint (`/api/openapi.json`) is public.

### 3.2 Claims structure

Defined in `backend/src/common/models/claims.rs`:

```rust
pub struct Claims {
    pub sub: String,                       // Keycloak user ID
    pub organizations: Option<Organizations>,
    pub realm_access: Option<RealmAccess>, // realm roles
    pub resource_access: Option<HashMap<String, RealmAccess>>, // client roles
    pub preferred_username: String,
    pub email: Option<String>,
    pub given_name: Option<String>,
    pub family_name: Option<String>,
    pub exp: u64,
    pub iat: u64,
    pub aud: serde_json::Value,
    pub iss: String,
}
```

### Compiled role checks (claims.rs)

| Helper method | Behaviour |
|---------------|-----------|
| `has_role(role)` | True if `realm_access.roles` contains `role`. |
| `is_application_admin()` | `has_role("application_admin")`. |
| `is_organization_admin()` | `has_role("organization_admin") || has_role("org_admin")`. |
| `is_org_admin()` | `has_role("org_admin")`. |
| `is_Org_User()` | `has_role("Org_User")`. |
| `is_super_user()` | Same as `is_application_admin()`. |
| `can_create_assessments()` | `is_org_admin() || is_application_admin()`. |
| `can_answer_assessments()` | `is_Org_User() || is_org_admin() || is_application_admin()`. |
| `can_manage_organization(org_id)` | `is_application_admin()` OR (org admin AND the org id is in their `organizations` claim). |
| `get_org_id()` / `get_primary_organization_id()` | First organization's id/name from the `organizations` claim. |
| `get_organization_ids()` | All organization names from the claim. |
| `has_organization_role(org_id, role)` | Always `false` — org-scoped roles are not part of the current JWT format; scoping uses the `organizations` claim + realm roles. |

### 3.3 Reusable role-guard middleware factories

`midlw.rs` provides reusable middleware factories for layering additional
role checks on top of `auth_middleware`:

- `require_role(required_role)` — generic factory requiring any named realm
  role. Returns `403 Forbidden` if the claim is missing the role.
- `require_application_admin()` — requires `application_admin`.
- `require_organization_admin()` — requires `organization_admin` OR
  `application_admin`.
- `get_claims_from_request(req)` — utility to read claims inside a handler.

### 3.4 Where authorization is enforced

Most handler-level authorization is **programmatic**: handlers read `Claims`
from the request extensions via `get_claims_from_request` and branch on the
role helpers above rather than relying solely on route-level middleware. This is
because the same endpoint often serves different data depending on the caller's
scope (e.g., `list_assessments` returns org-scoped data for an `org_admin`
versus all assessments for an `application_admin`).

Examples from `backend/src/web/api/handlers/`:

| Handler | Authorization logic |
|---------|---------------------|
| `assessments::list_assessments` | `application_admin` → all assessments; otherwise scoped to the caller's organization id. |
| `assessments::create_assessment` | Requires `can_create_assessments()` (org_admin or app admin). |
| `assessments::submit_assessment` / `user_submit_draft_assessment` | Requires `can_answer_assessments()`. |
| `submissions::list_user_submissions` | Returns only submissions for the caller's organization (or all for app admin). Used by both `/api/submissions` and `/api/org_admin/submissions`. |
| `admin::list_all_submissions` | Admin-only; returns every submission across orgs. |
| `organizations::*` | Member/invitation/identity-provider management gated by `can_manage_organization(org_id)`. |
| `organizations::add_org_admin_member` / `update_org_admin_member_categories` | Org-admin scoped to their organization. |
| `reports::list_all_reports` / `list_all_action_plans` | Admin endpoints; user-scoped listing via `list_user_reports` / `list_reports`. |

> Because no single route is marked with a static role middleware in
> `create_router`, the **authoritative** guarantee is the per-handler claims
> check. When adding a new endpoint, always add a `Claims`-based scope check
> in the handler — never assume the route is protected merely because it lives
> under `/api/`.

---

## 4. Frontend Authorization Model

### 4.1 Role constants

`frontend/src/constants/roles.ts`:

```ts
export const ROLES = {
  ADMIN: "drgv_admin",
  Org_User: "Org_User",
  ORG_ADMIN: "org_admin",
};
```

### 4.2 Route guards

`frontend/src/router/ProtectedRoute.tsx` renders `<ProtectedRoute
allowedRoles={[...]} requireOrganization>` wrappers. It:

1. Waits for `useAuth()` to resolve the authenticated state.
2. Redirects unauthenticated users to `/` (home/login).
3. Checks the user's combined roles (`user.roles` +
   `user.realm_access.roles`, compared case-insensitively) against
   `allowedRoles`. Redirects unauthorized users to `/unauthorized`.
4. If `requireOrganization` is set and the user has no `organizations` claim,
   redirects to `/`.

### 4.3 Route → role matrix

Defined in `frontend/src/router/routes.ts`:

| Route prefix | allowedRoles | requireOrganization |
|--------------|--------------|---------------------|
| `/admin/*` (dashboard, categories, organizations, users, questions, action-plans, report-history, guide) | `[drgv_admin]` | — |
| `/dashboard` | `[org_admin, Org_User]` | yes |
| `/assessment/*` | `[org_admin, Org_User]` | — |
| `/user/*` (assessment/:id, assessment-list, draft-submissions, assessment-submissions, manage-users, guide, reviews, profile) | `[dgrv_admin, org_admin, Org_User]` | — |
| `/assessments` | `[org_admin, Org_User]` | — |
| `/action-plan/submission/:id` | `[org_admin, Org_User]` | — |
| `/submission-view/:id` | `[org_admin, Org_User]` | — |
| `/` , `/unauthorized`, `*` (404) | public | — |

> Note: the frontend uses `drgv_admin` for admin pages and there is no explicit
> `application_admin` route guard. A user holding `application_admin` but not
> `drgv_admin` would not see the admin console routes — in practice the seeded
> admin always holds both. If a standalone `application_admin` is needed to
> access admin pages, add `ROLES.APPLICATION_ADMIN` to the
> `/admin` allowedRoles list (`application_admin`).

### 4.4 User profile & active organization

- `frontend/src/contexts/AuthContext.tsx` + `hooks/shared/useAuth.ts` expose the
  decoded Keycloak token (roles, organizations, email, names) to the app.
- `hooks/shared/useActiveOrganization.ts` tracks the currently selected
  organization for multi-org users.

---

## 5. Multi-tenancy

Multi-tenancy is driven entirely by the `organizations` JWT claim, not by a
tenant column on every table. Concretely:

- Each assessment, response, submission, and report is linked to an
  organization via its owning assessment's `keycloak_organization_id`.
- `Claims::can_manage_organization(org_id)` checks that the caller is an app
  admin OR an org admin whose `organizations` claim includes that org id.
- Some endpoints accept a `keycloak_organization_id` path parameter (e.g.
  `/api/organizations/:org_id/categories`); handlers verify the caller can
  manage the given org before mutating data.

---

## 6. Security notes

- Never trust the frontend guard alone — always re-check in the handler.
- JWTs are validated on every request; there is no opaque session store. A
  lightweight `SessionCache` (`backend/src/common/cache.rs`) is available for
  short-lived request-level caching only.
- The backend never handles passwords directly; password changes are delegated
  to Keycloak via the `KeycloakService` admin API.
- CORS is restricted to a single origin (`CORS_ORIGIN` env var) configured at
  app startup in `create_app`.