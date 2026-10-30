// Who can do what. Roles live on the account (users.role) and are checked on the server for every privileged
// request; the page hiding a button is never the protection. The role is read from the account on every request,
// so giving or taking one away applies at once; without a role, signing in never opens admin tools.
import { HttpError } from "./errors.js";

export const ROLES = ["user", "staff", "admin", "super_admin"];
export const ROLE_LABEL = { user: "User", staff: "Staff", admin: "Admin", super_admin: "Super Admin" };
export const rank = (role) => ROLES.indexOf(role);

const STAFF = ["admin.view", "challenges.manage_own", "redemptions.review"];
const ADMIN = [...STAFF, "challenges.manage_all", "markets.manage", "users.view", "users.suspend", "credits.manage",
  "rewards.manage", "redemptions.refund", "audit.view"];
export const PERMISSIONS = { user: [], staff: STAFF, admin: ADMIN, super_admin: [...ADMIN, "roles.manage"] };

export const can = (user, perm) => !!user && user.status === "active" && (PERMISSIONS[user.role] || []).includes(perm);
// Staff and above run things, so they don't play (no picks, challenge entries or redemptions of their own)
export const plays = (user) => !!user && user.role === "user";

// Throws unless the signed-in user's role has the permission
export function need(user, perm) {
  if (!user) throw new HttpError(401, "Sign in first.");
  if (!can(user, perm)) throw new HttpError(403, "Your account doesn't have permission to do that.");
}
