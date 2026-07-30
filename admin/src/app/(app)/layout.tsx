import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getAdminAccess } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

const NAV = [
  { href: '/', label: 'Dashboard' },
  { href: '/reservations', label: 'Rezervasyonlar' },
  { href: '/facilities', label: 'Tesisler' },
  { href: '/courts', label: 'Kortlar' },
  { href: '/staff', label: 'Staff' },
  { href: '/rules', label: 'Kurallar' },
  { href: '/municipalities', label: 'Belediyeler' },
  { href: '/audit', label: 'Audit' },
];

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const access = await getAdminAccess();
  if (!access) redirect('/login');

  if (!access.canAccess) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col justify-center p-8">
        <h1 className="text-2xl font-semibold text-[var(--court-deep)]">
          Yetkin yok
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          Bu panel yalnızca staff / belediye admin / super admin içindir.
          Vatandaş uygulamasını mobil üzerinden kullan.
        </p>
        <form
          action={async () => {
            'use server';
            const supabase = await createClient();
            await supabase.auth.signOut();
            redirect('/login');
          }}
        >
          <button className="mt-6 rounded-xl bg-[var(--court-deep)] px-4 py-2 text-white">
            Çıkış yap
          </button>
        </form>
      </main>
    );
  }

  const links = NAV.filter(
    (item) => item.href !== '/municipalities' || access.isSuperAdmin,
  );

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-[var(--line)] bg-[var(--surface)] lg:border-b-0 lg:border-r">
        <div className="p-5">
          <p className="text-xs font-semibold tracking-[0.2em] text-[var(--court)]">
            REZCOURT
          </p>
          <h1 className="text-xl font-semibold text-[var(--court-deep)]">
            Admin
          </h1>
          <p className="mt-1 truncate text-xs text-[var(--muted)]">
            {access.email}
          </p>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-4 lg:flex-col">
          {links.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-3 py-2 text-sm text-[var(--ink)] hover:bg-[var(--bg)]"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form
          className="px-5 pb-5"
          action={async () => {
            'use server';
            const supabase = await createClient();
            await supabase.auth.signOut();
            redirect('/login');
          }}
        >
          <button className="text-sm text-[var(--muted)] underline">
            Çıkış
          </button>
        </form>
      </aside>
      <main className="p-6 lg:p-8">{children}</main>
    </div>
  );
}
