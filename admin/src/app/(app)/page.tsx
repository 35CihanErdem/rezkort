import { redirect } from 'next/navigation';
import { getAdminAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export default async function DashboardPage() {
  const access = await getAdminAccess();
  if (!access?.canAccess) redirect('/login');

  const supabase = await createClient();
  await supabase.rpc('complete_due_reservations');

  const municipalityId =
    access.isSuperAdmin && access.memberships.length === 0
      ? null
      : access.memberships[0]?.municipalityId ?? null;

  const { data: stats } = await supabase.rpc('admin_dashboard_stats', {
    p_municipality_id: municipalityId,
  });

  const s = (stats ?? {}) as {
    today_bookings?: number;
    active_courts?: number;
    occupancy_pct?: number;
    waitlist_waiting?: number;
    today_no_shows?: number;
  };

  const cards = [
    { label: 'Bugünkü rezervasyon', value: s.today_bookings ?? 0 },
    { label: 'Aktif kort', value: s.active_courts ?? 0 },
    { label: 'Bugünkü doluluk', value: `${s.occupancy_pct ?? 0}%` },
    { label: 'Bekleme listesi', value: s.waitlist_waiting ?? 0 },
    { label: 'Bugün no-show', value: s.today_no_shows ?? 0 },
  ];

  return (
    <div>
      <h2 className="text-2xl font-semibold text-[var(--court-deep)]">
        Dashboard
      </h2>
      <p className="mt-1 text-sm text-[var(--muted)]">
        Pilot özeti — gün sonu geçmiş slotlar otomatik completed işaretlenir.
      </p>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
          >
            <p className="text-xs text-[var(--muted)]">{c.label}</p>
            <p className="mt-2 text-3xl font-semibold text-[var(--court-deep)]">
              {c.value}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
