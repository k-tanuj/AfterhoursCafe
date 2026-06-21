import { type ReactNode } from "react";
import { SiteShell } from "./SiteShell";
import { useIsAdmin } from "@/hooks/use-auth";
import { Link } from "@tanstack/react-router";

/**
 * Wrap an admin page body. Shows loading / not-authorized states; renders
 * children only when the current user is confirmed admin.
 */
export function AdminGuard({ children }: { children: ReactNode }) {
  const { isAdmin, loading } = useIsAdmin();
  if (loading) {
    return (
      <SiteShell hideFooter>
        <div className="max-w-6xl mx-auto px-6 pt-24 font-mono text-xs uppercase opacity-50">
          checking credentials…
        </div>
      </SiteShell>
    );
  }
  if (!isAdmin) {
    return (
      <SiteShell hideFooter>
        <section className="max-w-3xl mx-auto px-4 md:px-8 pt-24 pb-32 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.3em] opacity-50">staff-only</p>
          <h1 className="font-display text-6xl mt-3">Not your table.</h1>
          <p className="mt-6 font-serif italic text-ink/70">this corner of the sketchbook is for staff.</p>
          <Link to="/auth" className="inline-block mt-8 px-6 py-3 bg-accent text-paper font-display text-xl">sign in →</Link>
        </section>
      </SiteShell>
    );
  }
  return <>{children}</>;
}