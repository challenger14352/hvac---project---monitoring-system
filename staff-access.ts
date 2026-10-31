export function isStaffUserId(userId: string | undefined, configuredIds = process.env.STAFF_USER_IDS): boolean {
  if (!userId || !configuredIds) return false;
  return configuredIds.split(",").some((id) => id.trim() === userId);
}
