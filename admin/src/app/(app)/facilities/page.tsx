import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAdminAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export default async function FacilitiesPage() {
  const access = await getAdminAccess();
  if (!access?.canAccess) redirect('/login');
  const supabase = await createClient();

  const { data: municipalities } = await supabase
    .from('municipalities')
    .select('id,name')
    .order('name');
  const { data: facilities } = await supabase
    .from('facilities')
    .select('id,name,district,address,status,municipality_id,municipalities(name)')
    .order('name');

  async function createFacility(formData: FormData) {
    'use server';
    const supabase = await createClient();
    const municipalityId = String(formData.get('municipality_id') || '');
    const name = String(formData.get('name') || '').trim();
    const district = String(formData.get('district') || '').trim();
    const address = String(formData.get('address') || '').trim();
    if (!municipalityId || !name) return;

    const { data, error } = await supabase
      .from('facilities')
      .insert({
        municipality_id: municipalityId,
        name,
        district,
        address,
        status: 'active',
      })
      .select('id')
      .single();

    if (!error && data) {
      await supabase.rpc('write_audit_log', {
        p_action: 'facility.create',
        p_entity: 'facilities',
        p_entity_id: data.id,
        p_municipality_id: municipalityId,
        p_payload: { name, district },
      });
    }
    revalidatePath('/facilities');
  }

  async function setStatus(formData: FormData) {
    'use server';
    const supabase = await createClient();
    const id = String(formData.get('id') || '');
    const status = String(formData.get('status') || 'inactive');
    const municipalityId = String(formData.get('municipality_id') || '');
    await supabase.from('facilities').update({ status }).eq('id', id);
    await supabase.rpc('write_audit_log', {
      p_action: 'facility.status',
      p_entity: 'facilities',
      p_entity_id: id,
      p_municipality_id: municipalityId || null,
      p_payload: { status },
    });
    revalidatePath('/facilities');
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-[var(--court-deep)]">
          Tesisler
        </h2>
        <p className="text-sm text-[var(--muted)]">
          Soft-delete: inactive / maintenance (hard delete yok)
        </p>
      </div>

      <form
        action={createFacility}
        className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 md:grid-cols-2"
      >
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
        <input
          name="name"
          required
          placeholder="Tesis adı"
          className="rounded-xl border border-[var(--line)] px-3 py-2"
        />
        <input
          name="district"
          required
          placeholder="İlçe"
          className="rounded-xl border border-[var(--line)] px-3 py-2"
        />
        <input
          name="address"
          required
          placeholder="Adres"
          className="rounded-xl border border-[var(--line)] px-3 py-2"
        />
        <button className="rounded-xl bg-[var(--court-deep)] px-4 py-2 text-white md:col-span-2">
          Tesis ekle
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
        <table className="min-w-full text-sm">
          <thead className="border-b border-[var(--line)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 text-left">Ad</th>
              <th className="px-4 py-3 text-left">Belediye</th>
              <th className="px-4 py-3 text-left">Durum</th>
              <th className="px-4 py-3 text-left">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {(facilities ?? []).map((f) => {
              const muni = Array.isArray(f.municipalities)
                ? f.municipalities[0]
                : f.municipalities;
              return (
                <tr key={f.id} className="border-b border-[var(--line)]">
                  <td className="px-4 py-3">
                    {f.name}
                    <div className="text-xs text-[var(--muted)]">
                      {f.district}
                    </div>
                  </td>
                  <td className="px-4 py-3">{muni?.name ?? '—'}</td>
                  <td className="px-4 py-3">{f.status ?? 'active'}</td>
                  <td className="px-4 py-3">
                    <form action={setStatus} className="flex gap-2">
                      <input type="hidden" name="id" value={f.id} />
                      <input
                        type="hidden"
                        name="municipality_id"
                        value={f.municipality_id}
                      />
                      <select
                        name="status"
                        defaultValue={f.status ?? 'active'}
                        className="rounded-lg border border-[var(--line)] px-2 py-1"
                      >
                        <option value="active">active</option>
                        <option value="maintenance">maintenance</option>
                        <option value="inactive">inactive</option>
                      </select>
                      <button className="rounded-lg bg-[var(--court)] px-2 py-1 text-xs text-white">
                        Kaydet
                      </button>
                    </form>
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
