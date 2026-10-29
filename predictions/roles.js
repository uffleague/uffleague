// Who can do what. Roles live on the account (users.role) and are checked on the server for every privileged
// request; the page hiding a button is never the protection. Staff and above also have to unlock admin tools
// with their admin password on that session (auth.js elevate), so a PIN alone never opens them.
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

// Throws unless the signed-in user has the permission and (by default) has unlocked admin tools on this session
export function need(user, perm, { elevated = true } = {}) {
  if (!user) throw new HttpError(401, "Sign in first.");
  if (!can(user, perm)) throw new HttpError(403, "Your account doesn't have permission to do that.");
  if (elevated && !user.elevated) throw new HttpError(401, "Unlock admin tools with your admin password first.", "elevate");
}
