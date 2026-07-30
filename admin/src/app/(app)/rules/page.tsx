import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getAdminAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export default async function RulesPage() {
  const access = await getAdminAccess();
  if (!access?.canAccess) redirect('/login');
  const supabase = await createClient();

  const { data: rules } = await supabase
    .from('reservation_rules')
    .select(
      'id,municipality_id,max_active_reservations,max_days_ahead,cancel_before_minutes,late_join_minutes,minimum_remaining_minutes,allow_waitlist,allow_qr_checkin,allow_same_day_booking,booking_open_hour,booking_close_hour,municipalities(name)',
    )
    .order('municipality_id');

  async function save(formData: FormData) {
    'use server';
    const supabase = await createClient();
    const id = String(formData.get('id') || '');
    const municipalityId = String(formData.get('municipality_id') || '');
    const patch = {
      late_join_minutes: Number(formData.get('late_join_minutes') || 30),
      minimum_remaining_minutes: Number(
        formData.get('minimum_remaining_minutes') || 30,
      ),
      cancel_before_minutes: Number(formData.get('cancel_before_minutes') || 120),
      max_days_ahead: Number(formData.get('max_days_ahead') || 7),
      max_active_reservations: Number(
        formData.get('max_active_reservations') || 1,
      ),
      booking_open_hour: Number(formData.get('booking_open_hour') || 8),
      booking_close_hour: Number(formData.get('booking_close_hour') || 22),
      allow_waitlist: formData.get('allow_waitlist') === 'on',
      allow_qr_checkin: formData.get('allow_qr_checkin') === 'on',
      allow_same_day_booking: formData.get('allow_same_day_booking') === 'on',
    };
    await supabase.from('reservation_rules').update(patch).eq('id', id);
    await supabase.rpc('write_audit_log', {
      p_action: 'rules.update',
      p_entity: 'reservation_rules',
      p_entity_id: id,
      p_municipality_id: municipalityId,
      p_payload: patch,
    });
    revalidatePath('/rules');
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-[var(--court-deep)]">
          Rezervasyon kuralları
        </h2>
        <p className="text-sm text-[var(--muted)]">
          Belediye bazlı saatler ve toleranslar
        </p>
      </div>

      {(rules ?? []).map((rule) => {
        const muni = Array.isArray(rule.municipalities)
          ? rule.municipalities[0]
          : rule.municipalities;
        return (
          <form
            key={rule.id}
            action={save}
            className="grid gap-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 md:grid-cols-3"
          >
            <input type="hidden" name="id" value={rule.id} />
            <input
              type="hidden"
              name="municipality_id"
              value={rule.municipality_id}
            />
            <p className="md:col-span-3 font-medium text-[var(--court-deep)]">
              {muni?.name ?? 'Belediye'}
            </p>
            {(
              [
                ['late_join_minutes', 'Geç kalma (dk)', rule.late_join_minutes],
                [
                  'minimum_remaining_minutes',
                  'Min kalan (dk)',
                  rule.minimum_remaining_minutes,
                ],
                [
                  'cancel_before_minutes',
                  'İptal süresi (dk)',
                  rule.cancel_before_minutes,
                ],
                ['max_days_ahead', 'Max gün', rule.max_days_ahead],
                [
                  'max_active_reservations',
                  'Max aktif',
                  rule.max_active_reservations,
                ],
                ['booking_open_hour', 'Açılış saati', rule.booking_open_hour],
                ['booking_close_hour', 'Kapanış saati', rule.booking_close_hour],
              ] as const
            ).map(([name, label, value]) => (
              <label key={name} className="text-xs text-[var(--muted)]">
                {label}
                <input
                  name={name}
                  type="number"
                  defaultValue={value ?? 0}
                  className="mt-1 w-full rounded-xl border border-[var(--line)] px-3 py-2 text-sm text-[var(--ink)]"
                />
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="allow_waitlist"
                defaultChecked={Boolean(rule.allow_waitlist)}
              />
              Waitlist
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="allow_qr_checkin"
                defaultChecked={Boolean(rule.allow_qr_checkin)}
              />
              QR check-in
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="allow_same_day_booking"
                defaultChecked={Boolean(rule.allow_same_day_booking ?? true)}
              />
              Aynı gün rezervasyon
            </label>
            <button className="rounded-xl bg-[var(--court-deep)] px-4 py-2 text-white md:col-span-3">
              Kaydet
            </button>
          </form>
        );
      })}
    </div>
  );
}
