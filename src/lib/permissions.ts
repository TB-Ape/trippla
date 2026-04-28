import { getMemberRole } from "@/lib/db/trips";
import { MemberRole } from "@prisma/client";

/**
 * Check if a user can modify (edit/delete) an item.
 * Returns true if user is OWNER/ADMIN, or if they created the item.
 */
export async function canModifyItem(
  tripId: string,
  userId: string,
  createdById: string
): Promise<boolean> {
  if (userId === createdById) return true;

  const role = await getMemberRole(tripId, userId);
  return role === MemberRole.OWNER || role === MemberRole.ADMIN;
}
