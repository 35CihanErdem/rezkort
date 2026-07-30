import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAdminAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

function todayIstanbul() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Istanbul',
  }).format(new Date());
}

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const access = await getAdminAccess();
  if (!access?.canAccess) redirect('/login');

  const sp = await searchParams;
  const date = sp.date || todayIstanbul();
  const supabase = await createClient();
  await supabase.rpc('complete_due_reservations');

  let query = supabase
    .from('reservations')
    .select(
      'id,date,start_hour,end_hour,status,checked_in,phone,notes,courts(name,facilities(name,municipality_id,municipalities(name))),profiles(first_name,last_name)',
    )
    .eq('date', date)
    .order('start_hour', { ascending: true });

  const { data: rows } = await query;

  async function runAction(formData: FormData) {
    'use server';
    const id = String(formData.get('id') || '');
    const action = String(formData.get('action') || '');
    const supabase = await createClient();
    if (action === 'check_in') {
      await supabase.rpc('admin_check_in_reservation', { p_reservation_id: id });
    } else if (action === 'cancel') {
      await supabase.rpc('admin_cancel_reservation', {
        p_reservation_id: id,
        p_reason: 'Admin iptali',
      });
    } else if (action === 'no_show') {
      await supabase.rpc('admin_mark_no_show', { p_reservation_id: id });
    } else if (action === 'complete') {
      await supabase.rpc('admin_complete_reservation', {
        p_reservation_id: id,
      });
    }
    revalidatePath('/reservations');
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-[var(--court-deep)]">
            Rezervasyonlar
          </h2>
          <p className="text-sm text-[var(--muted)]">
            Check-in, iptal, no-show, completed
          </p>
        </div>
        <form className="flex items-center gap-2">
          <input
            type="date"
            name="date"
            defaultValue={date}
            className="rounded-xl border border-[var(--line)] bg-white px-3 py-2"
          />
          <button className="rounded-xl bg-[var(--court-deep)] px-3 py-2 text-sm text-white">
            Göster
          </button>
        </form>
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[var(--line)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3">Saat</th>
              <th className="px-4 py-3">Kort</th>
              <th className="px-4 py-3">Oyuncu</th>
              <th className="px-4 py-3">Durum</th>
              <th className="px-4 py-3">İşlem</th>
            </tr>
          </thead>
          <tbody>
            {(rows ?? []).map((r) => {
              const court = Array.isArray(r.courts) ? r.courts[0] : r.courts;
              const facility = court
                ? Array.isArray(court.facilities)
                  ? court.facilities[0]
                  : court.facilities
                : null;
              const profile = Array.isArray(r.profiles)
                ? r.profiles[0]
                : r.profiles;
              const name = profile
                ? `${profile.first_name} ${profile.last_name}`.trim()
                : r.phone;
              return (
                <tr key={r.id} className="border-b border-[var(--line)]">
                  <td className="px-4 py-3">
                    {String(r.start_hour).padStart(2, '0')}:00–
                    {String(r.end_hour).padStart(2, '0')}:00
                  </td>
                  <td className="px-4 py-3">
                    {facility?.name ?? '—'} / {court?.name ?? '—'}
                  </td>
                  <td className="px-4 py-3">{name}</td>
                  <td className="px-4 py-3">
                    {r.status}
                    {r.checked_in ? ' · check-in' : ''}
                  </td>
                  <td className="px-4 py-3">
                    {r.status === 'active' ? (
                      <div className="flex flex-wrap gap-2">
                        <form action={runAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="action" value="check_in" />
                          <button className="rounded-lg bg-[var(--court)] px-2 py-1 text-xs text-white">
                            Check-in
                          </button>
                        </form>
                        <form action={runAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="action" value="complete" />
                          <button className="rounded-lg border border-[var(--line)] px-2 py-1 text-xs">
                            Completed
                          </button>
                        </form>
                        <form action={runAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="action" value="no_show" />
                          <button className="rounded-lg border border-[var(--line)] px-2 py-1 text-xs">
                            No-show
                          </button>
                        </form>
                        <form action={runAction}>
                          <input type="hidden" name="id" value={r.id} />
                          <input type="hidden" name="action" value="cancel" />
                          <button className="rounded-lg border border-[var(--danger)] px-2 py-1 text-xs text-[var(--danger)]">
                            İptal
                          </button>
                        </form>
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                </tr>
              );
            })}
            {(rows ?? []).length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-[var(--muted)]" colSpan={5}>
                  Bu tarihte rezervasyon yok.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
