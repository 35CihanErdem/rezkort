import { createClient } from './supabase/server';

export type AdminAccess = {
  userId: string;
  email: string | null;
  isSuperAdmin: boolean;
  canAccess: boolean;
  memberships: {
    id: string;
    municipalityId: string;
    municipalityName: string;
    role: 'staff' | 'admin';
  }[];
};

export async function getAdminAccess(): Promise<AdminAccess | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id,email,is_super_admin,is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile?.is_active) {
    return {
      userId: user.id,
      email: user.email ?? null,
      isSuperAdmin: false,
      canAccess: false,
      memberships: [],
    };
  }

  const { data: canAccess } = await supabase.rpc('can_access_admin_panel');

  const { data: memberships } = await supabase
    .from('staff_memberships')
    .select('id,municipality_id,role,is_active,starts_at,ends_at,municipalities(name)')
    .eq('user_id', user.id)
    .eq('is_active', true);

  const now = Date.now();
  const active = (memberships ?? []).filter((m) => {
    const startOk = !m.starts_at || new Date(m.starts_at).getTime() <= now;
    const endOk = !m.ends_at || new Date(m.ends_at).getTime() > now;
    return startOk && endOk && (m.role === 'staff' || m.role === 'admin');
  });

  return {
    userId: user.id,
    email: profile.email ?? user.email ?? null,
    isSuperAdmin: Boolean(profile.is_super_admin),
    canAccess: Boolean(canAccess) || Boolean(profile.is_super_admin),
    memberships: active.map((m) => {
      const muni = Array.isArray(m.municipalities)
        ? m.municipalities[0]
        : m.municipalities;
      return {
        id: m.id,
        municipalityId: m.municipality_id,
        municipalityName: (muni as { name?: string } | null)?.name ?? 'Belediye',
        role: m.role as 'staff' | 'admin',
      };
    }),
  };
}
