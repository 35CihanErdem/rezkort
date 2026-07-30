import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAdminAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export default async function StaffPage() {
  const access = await getAdminAccess();
  if (!access?.canAccess) redirect('/login');
  const supabase = await createClient();

  const { data: municipalities } = await supabase
    .from('municipalities')
    .select('id,name')
    .order('name');

  const { data: memberships } = await supabase
    .from('staff_memberships')
    .select(
      'id,role,is_active,starts_at,ends_at,user_id,municipality_id,profiles(first_name,last_name,email,phone),municipalities(name)',
    )
    .order('created_at', { ascending: false });

  async function assign(formData: FormData) {
    'use server';
    const supabase = await createClient();
    const email = String(formData.get('email') || '')
      .trim()
      .toLowerCase();
    const municipalityId = String(formData.get('municipality_id') || '');
    const role = String(formData.get('role') || 'staff');
    const startsAt = String(formData.get('starts_at') || '') || null;
    const endsAt = String(formData.get('ends_at') || '') || null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (!profile) return;

    await supabase.rpc('assign_staff_membership', {
      p_user_id: profile.id,
      p_municipality_id: municipalityId,
      p_role: role,
      p_starts_at: startsAt,
      p_ends_at: endsAt,
    });
    revalidatePath('/staff');
  }

  async function deactivate(formData: FormData) {
    'use server';
    const supabase = await createClient();
    const id = String(formData.get('id') || '');
    await supabase.rpc('deactivate_staff_membership', {
      p_membership_id: id,
    });
    revalidatePath('/staff');
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-[var(--court-deep)]">
          Staff
        </h2>
        <p className="text-sm text-[var(--muted)]">
          Belediye seç → Staff veya Admin. Super Admin buradan verilmez.
        </p>
      </div>

      <form
        action={assign}
        className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 md:grid-cols-2"
      >
        <input
          name="email"
          type="email"
          required
          placeholder="Kullanıcı e-posta"
          className="rounded-xl border border-[var(--line)] px-3 py-2"
        />
        <select
          name="municipality_id"
          required
          className="rounded-xl border border-[var(--line)] px-3 py-2"
        >
          <option value="">Belediye</option>
          {(municipalities ?? []).map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
        <select
          name="role"
          className="rounded-xl border border-[var(--line)] px-3 py-2"
        >
          <option value="staff">Staff</option>
          <option value="admin">Admin</option>
        </select>
        <div className="grid grid-cols-2 gap-2">
          <input
            name="starts_at"
            type="datetime-local"
            className="rounded-xl border border-[var(--line)] px-3 py-2"
          />
          <input
            name="ends_at"
            type="datetime-local"
            className="rounded-xl border border-[var(--line)] px-3 py-2"
          />
        </div>
        <button className="rounded-xl bg-[var(--court-deep)] px-4 py-2 text-white md:col-span-2">
          Staff ekle / güncelle
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
        <table className="min-w-full text-sm">
          <thead className="border-b border-[var(--line)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 text-left">Kişi</th>
              <th className="px-4 py-3 text-left">Belediye</th>
              <th className="px-4 py-3 text-left">Rol</th>
              <th className="px-4 py-3 text-left">Süre</th>
              <th className="px-4 py-3 text-left">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {(memberships ?? []).map((m) => {
              const profile = Array.isArray(m.profiles)
                ? m.profiles[0]
                : m.profiles;
              const muni = Array.isArray(m.municipalities)
                ? m.municipalities[0]
                : m.municipalities;
              return (
                <tr key={m.id} className="border-b border-[var(--line)]">
                  <td className="px-4 py-3">
                    {profile
                      ? `${profile.first_name} ${profile.last_name}`
                      : m.user_id}
                    <div className="text-xs text-[var(--muted)]">
                      {profile?.email}
                    </div>
                  </td>
                  <td className="px-4 py-3">{muni?.name ?? '—'}</td>
                  <td className="px-4 py-3">
                    {m.role}
                    {!m.is_active ? ' (pasif)' : ''}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--muted)]">
                    {m.starts_at || '—'} → {m.ends_at || 'süresiz'}
                  </td>
                  <td className="px-4 py-3">
                    {m.is_active ? (
                      <form action={deactivate}>
                        <input type="hidden" name="id" value={m.id} />
                        <button className="text-xs text-[var(--danger)] underline">
                          Çıkar
                        </button>
                      </form>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
