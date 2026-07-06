# User Invitation Flow — DGAT Sustainability Tool

This document describes how new cooperative users get invited, verify their
email, accept the organization invitation, and become active members. It
covers both the DGRV admin path and the org admin path.

> See also [PENDING_INVITATION_TRACKING.md](PENDING_INVITATION_TRACKING.md)
> for how pending (unaccepted) invitations are detected. For roles see
> [RBAC_ROLES.md](RBAC_ROLES.md).

---

## 1. Overview

Keycloak has no native API to list pending (unaccepted) invitations, so the
application tracks them with a single user attribute, `org.ro.active`. The
invitation flow combines three Keycloak operations:

1. **Create the user** (if they don't already exist) with the `org.ro.active`
   attribute set to the inviting organization's ID.
2. **Trigger email verification** so the invitee confirms ownership of their
   email address.
3. **Send the Keycloak organization invitation** so the user becomes a member
   of the organization once they accept.

There are two entry points:
- **DGRV admin** invitation — `POST /api/admin/user-invitations` (handler
  `admin::create_user_invitation`). Can invite to any organization.
- **Org admin** invitation — `POST /api/organizations/:org_id/org-admin/members`
  (handler `organizations::add_org_admin_member`). Scoped to the
  caller's own organization (verified against the JWT `organizations` claim).

---

## 2. Step-by-step Flow

```
┌──────────┐  1. invite  ┌─────────┐  2. create user + org.ro.active
│  Admin   │ ───────────▶ │ Backend │ ───────────────────────────────▶ Keycloak
│ (UI)     │              │ handler │  3. send VERIFY_EMAIL action email
└──────────┘              └─────────┘  4. send organization invite email
                                              │
                                              ▼
                                  ┌─────────────────────┐
                                  │  Invitee's inbox    │
                                  │  - verify email link │
                                  │  - accept org invite │
                                  └──────────┬──────────┘
                                             │ clicks
                                             ▼
                        ┌────────────────────────────────────┐
                        │  Keycloak accepts the user into    │
                        │  the organization on confirmation  │
                        └────────────────────────────────────┘
```

### Step details

1. **Admin enters the invitee's email** in the UI (DGRV admin → Manage Users
   page; Org admin → Manage Users under their org).
2. **Backend handler** (`admin.rs::create_user_invitation` for DGRV admin,
   `organizations.rs::add_org_admin_member` for org admin):
   - If the user doesn't exist, creates them in Keycloak via
     `POST /admin/realms/{realm}/users` with the `org.ro.active` attribute
     set to the organization ID (must be an array: `["org-uuid"]`).
   - Triggers the email verification action via
     `POST /admin/realms/{realm}/users/{id}/execute-actions-email` with
     `["VERIFY_EMAIL"]`.
   - Sends the org invitation immediately via
     `send_organization_invitation_immediate` (calls Keycloak's
     `POST /admin/realms/{realm}/organizations/{org}/members/invite-user`).
   - If the user already exists, the handler looks them up and re-sends the
     org invitation instead of failing (idempotent).
3. **Invitee receives two emails**: a "verify your email" link and an
   "accept the organization invitation" link.
4. **Invitee verifies email** → `emailVerified` becomes `true`.
5. **Invitee accepts the organization invitation** → they appear in the
   organization's members list, the invitation is consumed, and the
   `org.ro.active` attribute is retained for audit.

---

## 3. User State Transitions

| State | `org.ro.active` | `emailVerified` | Org member? | UI badge |
|-------|-----------------|-----------------|-------------|----------|
| Invited | set | `false` | no | "Awaiting email verification" |
| Email verified | set | `true` | no | "Email verified" |
| Active | set | `true` (or retained) | yes | Moves to the active members grid |

Pending detection = (users with `org.ro.active = org_id`) MINUS (active org
members). See [PENDING_INVITATION_TRACKING.md](PENDING_INVITATION_TRACKING.md).

---

## 4. Endpoints

| Method | Path | Role | Description |
|--------|------|------|-------------|
| POST | `/api/admin/user-invitations` | `application_admin` / `drgv_admin` | Create a user + send verification + invite to an org |
| GET | `/api/admin/user-invitations/:user_id/status` | admin | Read invitation status from user attributes |
| POST | `/api/admin/user-invitations/:user_id/resend` | admin | Resend invitation email |
| GET | `/api/admin/organizations/:org_id/pending-invitations` | admin / org_admin | List pending invitees for an org |
| POST | `/api/admin/organizations/:org_id/users/:user_id/resend-invitation` | admin / org_admin | Resend verification + invite emails |
| DELETE | `/api/admin/users/:user_id` | `application_admin` only | Delete a pending user entirely |
| POST | `/api/organizations/:org_id/org-admin/members` | `org_admin` (scoped) | Org admin invites a user to their org |
| GET | `/api/organizations/:org_id/org-admin/members` | `org_admin` | List org admin members |
| DELETE | `/api/organizations/:org_id/org-admin/members/:member_id` | `org_admin` | Remove an org admin member |
| PUT | `/api/organizations/:org_id/org-admin/members/:member_id/categories` | `org_admin` | Assign assessment categories to an org member |
| GET | `/api/organizations/:id/invitations` | `org_admin` | List Keycloak's tracked invitations for the org |
| DELETE | `/api/organizations/:id/invitations/:invitation_id` | `org_admin` | Delete a Keycloak invitation |

---

## 5. Resend Flow

If an invitee loses the email or the link expires, an admin can resend:

1. The backend fetches the user to get their email address.
2. Re-triggers the VERIFY_EMAIL action (generates a fresh verification email).
3. Re-calls `invite-user` with just the email — no role/category reassignment.

Endpoint: `POST /api/admin/organizations/:org_id/users/:user_id/resend-invitation`.

---

## 6. Key Implementation Notes

- The attribute name **must** be exactly `org.ro.active` — it is registered in
  the Keycloak User Profile schema for `sustainability-realm`. Any other name
  is silently ignored.
- Attribute values **must** be arrays: `["org-uuid"]`, not a bare string.
- Keycloak's `q` search supports `q=org.ro.active:<org_id>` and does a
  value-level scan through the attribute array, which is how pending lookup
  works.
- Both DGRV admin and org admin invitation paths set the **same**
  `org.ro.active` attribute, so pending detection is uniform across both
  invitation types.
- Deleting a user (`DELETE /api/admin/users/:user_id`) is restricted to
  `application_admin` because it removes them from the entire system, not just
  the org.
- SMTP must be configured (via `EMAIL_*` env vars applied by
  `scripts/admin.sh`) for the verification and invitation emails to be
  delivered; otherwise the flow stalls at "Invited".

---

## 7. Frontend Hooks

| Hook | Purpose |
|------|---------|
| `useOrganizationInvitations` | Lists an org's pending/active invitations |
| `usePendingReviewSubmissions` | Related pending-submission state |
| `useRecommendationMutations` | (related) action plan mutations |

The invitation forms live in:
- `frontend/src/components/shared/UserInvitationForm.tsx` (DGRV admin)
- `frontend/src/components/shared/OrgAdminUserInvitationForm.tsx` (org admin)