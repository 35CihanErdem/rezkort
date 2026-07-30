import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAdminAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export default async function MunicipalitiesPage() {
  const access = await getAdminAccess();
  if (!access?.canAccess) redirect('/login');
  if (!access.isSuperAdmin) redirect('/');

  const supabase = await createClient();
  const { data: municipalities } = await supabase
    .from('municipalities')
    .select('id,name,created_at')
    .order('name');

  async function createMunicipality(formData: FormData) {
    'use server';
    const access = await getAdminAccess();
    if (!access?.isSuperAdmin) return;
    const supabase = await createClient();
    const name = String(formData.get('name') || '').trim();
    if (!name) return;
    const { data, error } = await supabase
      .from('municipalities')
      .insert({ name })
      .select('id')
      .single();
    if (!error && data) {
      await supabase.from('reservation_rules').insert({
        municipality_id: data.id,
      });
      await supabase.rpc('write_audit_log', {
        p_action: 'municipality.create',
        p_entity: 'municipalities',
        p_entity_id: data.id,
        p_municipality_id: data.id,
        p_payload: { name },
      });
    }
    revalidatePath('/municipalities');
  }

  async function assignAdmin(formData: FormData) {
    'use server';
    const access = await getAdminAccess();
    if (!access?.isSuperAdmin) return;
    const supabase = await createClient();
    const email = String(formData.get('email') || '')
      .trim()
      .toLowerCase();
    const municipalityId = String(formData.get('municipality_id') || '');
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (!profile) return;
    await supabase.rpc('assign_staff_membership', {
      p_user_id: profile.id,
      p_municipality_id: municipalityId,
      p_role: 'admin',
      p_starts_at: null,
      p_ends_at: null,
    });
    revalidatePath('/municipalities');
    revalidatePath('/staff');
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-[var(--court-deep)]">
          Belediyeler
        </h2>
        <p className="text-sm text-[var(--muted)]">
          Super Admin — belediye ekle ve Admin ata
        </p>
      </div>

      <form
        action={createMunicipality}
        className="flex flex-wrap gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
      >
        <input
          name="name"
          required
          placeholder="Belediye adı"
          className="min-w-[220px] flex-1 rounded-xl border border-[var(--line)] px-3 py-2"
        />
        <button className="rounded-xl bg-[var(--court-deep)] px-4 py-2 text-white">
          Ekle
        </button>
      </form>

      <form
        action={assignAdmin}
        className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 md:grid-cols-3"
      >
        <p className="md:col-span-3 font-medium">Admin ata</p>
        <input
          name="email"
          type="email"
          required
          placeholder="Ali Yılmaz e-posta"
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
        <button className="rounded-xl bg-[var(--court)] px-4 py-2 text-white">
          Admin yap
        </button>
      </form>

      <ul className="space-y-2">
        {(municipalities ?? []).map((m) => (
          <li
            key={m.id}
            className="rounded-xl border border-[var(--line)] bg-[var(--surface)] px-4 py-3"
          >
            {m.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
