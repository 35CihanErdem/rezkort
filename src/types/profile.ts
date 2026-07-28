export type ProfileRole = 'citizen' | 'staff' | 'admin' | 'super_admin';

export type Profile = {
  id: string;
  firstName: string;
  lastName: string;
  /** E.164: +905xxxxxxxxx */
  phone: string;
  email: string;
  username: string;
  role: ProfileRole;
  phoneVerified: boolean;
  emailVerified: boolean;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProfileRow = {
  id: string;
  phone: string;
  email: string;
  first_name: string;
  last_name: string;
  username: string | null;
  role: ProfileRole;
  phone_verified: boolean;
  email_verified: boolean;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
};

export type UpdateProfileInput = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  username?: string;
  /** İleride SMS doğrulaması için: true olunca phone_verified güncellenir */
  phoneVerified?: boolean;
};

export function mapProfileRow(row: ProfileRow): Profile {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    phone: row.phone,
    email: row.email,
    username: row.username ?? '',
    role: row.role,
    phoneVerified: row.phone_verified,
    emailVerified: row.email_verified,
    isActive: row.is_active,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function displayName(profile: Pick<Profile, 'firstName' | 'lastName'>): string {
  return `${profile.firstName} ${profile.lastName}`.trim();
}
