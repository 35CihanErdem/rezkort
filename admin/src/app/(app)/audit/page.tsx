import { redirect } from 'next/navigation';
import { getAdminAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

export default async function AuditPage() {
  const access = await getAdminAccess();
  if (!access?.canAccess) redirect('/login');
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from('audit_logs')
    .select(
      'id,action,entity,entity_id,municipality_id,payload,created_at,profiles:actor_user_id(first_name,last_name,email)',
    )
    .order('created_at', { ascending: false })
    .limit(100);

  return (
    <div>
      <h2 className="text-2xl font-semibold text-[var(--court-deep)]">
        Audit log
      </h2>
      <p className="text-sm text-[var(--muted)]">Son 100 işlem</p>

      <div className="mt-6 overflow-x-auto rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
        <table className="min-w-full text-sm">
          <thead className="border-b border-[var(--line)] text-[var(--muted)]">
            <tr>
              <th className="px-4 py-3 text-left">Zaman</th>
              <th className="px-4 py-3 text-left">Kim</th>
              <th className="px-4 py-3 text-left">Aksiyon</th>
              <th className="px-4 py-3 text-left">Entity</th>
            </tr>
          </thead>
          <tbody>
            {(logs ?? []).map((log) => {
              const actor = Array.isArray(log.profiles)
                ? log.profiles[0]
                : log.profiles;
              return (
                <tr key={log.id} className="border-b border-[var(--line)]">
                  <td className="px-4 py-3 whitespace-nowrap text-xs">
                    {new Date(log.created_at).toLocaleString('tr-TR')}
                  </td>
                  <td className="px-4 py-3">
                    {actor
                      ? `${actor.first_name} ${actor.last_name}`
                      : '—'}
                  </td>
                  <td className="px-4 py-3">{log.action}</td>
                  <td className="px-4 py-3 text-xs text-[var(--muted)]">
                    {log.entity} {log.entity_id?.slice(0, 8)}
                  </td>
                </tr>
              );
            })}
            {(logs ?? []).length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-[var(--muted)]" colSpan={4}>
                  Henüz kayıt yok. Migration 0027 sonrası işlemler burada görünür.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}
