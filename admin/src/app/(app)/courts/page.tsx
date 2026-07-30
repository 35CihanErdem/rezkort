import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAdminAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export default async function CourtsPage() {
  const access = await getAdminAccess();
  if (!access?.canAccess) redirect('/login');
  const supabase = await createClient();

  const { data: facilities } = await supabase
    .from('facilities')
    .select('id,name,municipality_id')
    .eq('status', 'active')
    .order('name');

  const { data: courts } = await supabase
    .from('courts')
    .select(
      'id,name,status,open_hour,close_hour,facility_id,facilities(name,municipality_id)',
    )
    .order('name');

  async function createCourt(formData: FormData) {
    'use server';
    const supabase = await createClient();
    const facilityId = String(formData.get('facility_id') || '');
    const name = String(formData.get('name') || '').trim();
    const openHour = Number(formData.get('open_hour') || 8);
    const closeHour = Number(formData.get('close_hour') || 22);
    if (!facilityId || !name) return;

    const { data: facility } = await supabase
      .from('facilities')
      .select('municipality_id')
      .eq('id', facilityId)
      .single();

    const { data, error } = await supabase
      .from('courts')
      .insert({
        facility_id: facilityId,
        name,
        surface_type: 'hard',
        has_lights: false,
        reservation_duration: 60,
        status: 'active',
        open_hour: openHour,
        close_hour: closeHour,
      })
      .select('id')
      .single();

    if (!error && data) {
      await supabase.rpc('write_audit_log', {
        p_action: 'court.create',
        p_entity: 'courts',
        p_entity_id: data.id,
        p_municipality_id: facility?.municipality_id ?? null,
        p_payload: { name },
      });
    }
    revalidatePath('/courts');
  }

  async function setStatus(formData: FormData) {
    'use server';
    const supabase = await createClient();
    const id = String(formData.get('id') || '');
    const status = String(formData.get('status') || 'inactive');
    const municipalityId = String(formData.get('municipality_id') || '');
    await supabase.from('courts').update({ status }).eq('id', id);
    await supabase.rpc('write_audit_log', {
      p_action: 'court.status',
      p_entity: 'courts',
      p_entity_id: id,
      p_municipality_id: municipalityId || null,
      p_payload: { status },
    });
    revalidatePath('/courts');
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-semibold text-[var(--court-deep)]">
          Kortlar
        </h2>
        <p className="text-sm text-[var(--muted)]">
          Bakım / inactive — silme yok
        </p>
      </div>

      <form
        action={createCourt}
        className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 md:grid-cols-2"
      >
        <select
          name="facility_id"
          required
          className="rounded-xl border border-[var(--line)] px-3 py-2"
        >
          <option value="">Tesis</option>
          {(facilities ?? []).map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
        <input
          name="name"
          required
          placeholder="Kort adı"
          className="rounded-xl border border-[var(--line)] px-3 py-2"
        />
        <input
          name="open_hour"
          type="number"
          min={0}
          max={23}
          defaultValue={8}
          className="rounded-xl border border-[var(--line)] px-3 py-2"
        />
        <input
          name="close_hour"
          type="number"
          min={1}
          max={24}
          defaultValue={22}
          className="rounded-xl border border-[var(--line)] px-3 py-2"
        />
        <button className="rounded-xl bg-[var(--court-deep)] px-4 py-2 text-white md:col-span-2">
          Kort ekle
        </button>
      </form>

      <div className="overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
        <table className="min-w-full text-sm">
          <thead className="border-b border-[var(--line)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 text-left">Kort</th>
              <th className="px-4 py-3 text-left">Saat</th>
              <th className="px-4 py-3 text-left">Durum</th>
              <th className="px-4 py-3 text-left">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {(courts ?? []).map((c) => {
              const facility = Array.isArray(c.facilities)
                ? c.facilities[0]
                : c.facilities;
              return (
                <tr key={c.id} className="border-b border-[var(--line)]">
                  <td className="px-4 py-3">
                    {c.name}
                    <div className="text-xs text-[var(--muted)]">
                      {facility?.name}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {c.open_hour}–{c.close_hour}
                  </td>
                  <td className="px-4 py-3">{c.status}</td>
                  <td className="px-4 py-3">
                    <form action={setStatus} className="flex gap-2">
                      <input type="hidden" name="id" value={c.id} />
                      <input
                        type="hidden"
                        name="municipality_id"
                        value={facility?.municipality_id ?? ''}
                      />
                      <select
                        name="status"
                        defaultValue={c.status}
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
