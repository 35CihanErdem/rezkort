import type { Profile, ProfileRole } from '../types/profile';

const ADMIN_ROLES: ProfileRole[] = ['staff', 'admin', 'super_admin'];

export function canAccessAdmin(
  profile: Pick<Profile, 'role' | 'isActive'> | null | undefined,
): boolean {
  if (!profile?.isActive) return false;
  return ADMIN_ROLES.includes(profile.role);
}

export function isGlobalAdmin(
  profile: Pick<Profile, 'role'> | null | undefined,
): boolean {
  return profile?.role === 'admin' || profile?.role === 'super_admin';
}

export function roleLabel(role: ProfileRole): string {
  switch (role) {
    case 'super_admin':
      return 'Süper Admin';
    case 'admin':
      return 'Admin';
    case 'staff':
      return 'Personel';
    default:
      return 'Vatandaş';
  }
}
