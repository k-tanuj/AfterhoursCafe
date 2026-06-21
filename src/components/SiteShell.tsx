import { Link, useNavigate } from "@tanstack/react-router";
import { type ReactNode, useState } from "react";
import { useAuth, useIsAdmin, triggerAuthUpdate } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import { logoutUser } from "@/lib/auth.functions";
import { Moon, Star, CoffeeCup, Scribble } from "./Doodles";
import { AIBaristaWidget } from "./AIBaristaWidget";
import { SmoothScroll } from "./SmoothScroll";
import { BackgroundDoodles } from "./BackgroundDoodles";
import { ScrollBackground } from "./ScrollBackground";
import { Svg } from "@/lib/svgs";

const NAV = [
  { to: "/", label: "Home" },
  { to: "/menu", label: "Menu" },
  { to: "/chill-pill", label: "Chill Pill", featured: true },
  { to: "/booking", label: "Booking" },
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

const ADMIN_NAV = [
  { to: "/admin", label: "Dashboard", exact: true },
  { to: "/admin/orders", label: "Orders" },
  { to: "/admin/customers", label: "Customers" },
  { to: "/admin/bookings", label: "Bookings" },
  { to: "/admin/menu", label: "Menu" },
  { to: "/admin/demand", label: "Demand" },
  { to: "/admin/feedback", label: "Feedback" },
  { to: "/admin/wall", label: "Wall" },
] as const;

function BindingHoles() {
  return (
    <div className="fixed left-3 top-0 bottom-0 hidden lg:flex flex-col justify-center gap-8 pointer-events-none z-0">
      {Array.from({ length: 7 }).map((_, i) => (
        <div
          key={i}
          className="w-4 h-4 rounded-full bg-ink/10 shadow-[inset_0_2px_3px_rgba(0,0,0,0.2)]"
        />
      ))}
    </div>
  );
}

function TopNav() {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();
  const navigate = useNavigate();
  const doLogout = useServerFn(logoutUser);

  const signOut = async () => {
    try {
      await doLogout();
    } catch (err) {
      console.error(err);
    }
    document.cookie = "session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    triggerAuthUpdate(null);
    navigate({ to: "/auth", replace: true });
  };

  if (isAdmin) {
    return (
      <nav className="sticky top-0 z-40 backdrop-blur-md bg-ink/95 text-paper border-b border-paper/10">
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-3 flex items-center justify-between">
          <Link to="/admin" className="flex items-center gap-2 group">
            <Svg name="afterhours-logo" className="h-8 w-auto invert opacity-90 group-hover:rotate-3 transition-transform" />
            <span className="font-display text-xl md:text-2xl tracking-tight -rotate-[2deg] px-2 hidden sm:inline">
              back office
            </span>
            <span className="hidden sm:inline font-mono text-[10px] uppercase tracking-widest opacity-50">staff</span>
          </Link>
          <button
            className="md:hidden font-mono text-[10px] uppercase border border-paper/30 px-3 py-1.5"
            onClick={() => setOpen((v) => !v)}
            aria-label="Toggle menu"
          >
            {open ? "close" : "menu"}
          </button>
          <div className="hidden md:flex gap-5 font-mono text-[11px] uppercase tracking-wider items-center">
            {ADMIN_NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="opacity-70 hover:opacity-100 hover:text-accent transition-colors"
                activeProps={{ className: "text-accent opacity-100" }}
                activeOptions={{ exact: "exact" in n && !!n.exact }}
              >
                {n.label}
              </Link>
            ))}
            <button onClick={signOut} className="ml-2 px-3 py-1 border border-paper/30 hover:bg-accent hover:border-accent transition-colors">
              sign out
            </button>
          </div>
        </div>
        {open && (
          <div className="md:hidden border-t border-paper/10 px-6 py-4 flex flex-col gap-3 font-mono text-xs uppercase bg-ink">
            {ADMIN_NAV.map((n) => (
              <Link key={n.to} to={n.to} onClick={() => setOpen(false)} className="opacity-80 hover:text-accent">
                {n.label}
              </Link>
            ))}
            <button onClick={signOut} className="text-left opacity-80 hover:text-accent">sign out</button>
          </div>
        )}
      </nav>
    );
  }

  return (
    <nav className="sticky top-0 z-40 backdrop-blur-md bg-paper/70 border-b border-ink/10">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <Svg name="afterhours-logo" className="h-10 w-auto group-hover:rotate-3 transition-transform" />
          <span className="font-display text-2xl md:text-3xl tracking-tight -rotate-[2deg] px-2 hidden sm:inline">
            afterhours
          </span>
        </Link>
        <button
          className="md:hidden font-mono text-xs uppercase border border-ink/20 px-3 py-2"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle menu"
        >
          {open ? "close" : "menu"}
        </button>
        <div className="hidden md:flex gap-6 font-mono text-xs uppercase tracking-wider">
          {(user ? NAV : [NAV[0]]).map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className={
                "featured" in n && n.featured
                  ? "font-display normal-case tracking-normal text-2xl -rotate-[4deg] text-accent underline decoration-wavy decoration-accent/60 underline-offset-4 hover:scale-110 transition-transform"
                  : "hover:line-through hover:text-accent transition-colors"
              }
              activeProps={
                "featured" in n && n.featured
                  ? { className: "scale-110" }
                  : { className: "text-accent line-through" }
              }
              activeOptions={{ exact: n.to === "/" }}
            >
              {n.label}
            </Link>
          ))}
          {user ? (
            <Link to="/profile" className="hover:text-accent">Profile</Link>
          ) : null}
        </div>
      </div>
      {open && (
        <div className="md:hidden border-t border-ink/10 px-6 py-4 flex flex-col gap-3 font-display text-2xl bg-paper">
          {(user ? NAV : [NAV[0]]).map((n) => (
            <Link
              key={n.to}
              to={n.to}
              onClick={() => setOpen(false)}
              className={
                "featured" in n && n.featured
                  ? "font-display text-3xl text-accent -rotate-[3deg] underline decoration-wavy decoration-accent/60 underline-offset-4"
                  : "hover:text-accent"
              }
            >
              {n.label}
            </Link>
          ))}
          {user ? (
            <Link to="/profile" onClick={()=>setOpen(false)} className="hover:text-accent">Profile</Link>
          ) : null}
        </div>
      )}
    </nav>
  );
}

function TornDivider() {
  return (
    <div className="my-20 flex items-center justify-center gap-4 opacity-50">
      <Star className="size-4" />
      <Scribble className="w-32 text-ink/40" />
      <Moon className="size-4" />
      <Scribble className="w-32 text-ink/40" />
      <Star className="size-4" />
    </div>
  );
}

function Footer() {
  return (
    <footer className="mt-32 border-t border-ink/10">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-12 grid md:grid-cols-3 gap-8">
        <div>
          <p className="font-display text-3xl -rotate-[2deg]">afterhours</p>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-widest opacity-60">
            Coffee. Conversations. Chaos.
          </p>
        </div>
        <div className="font-mono text-xs uppercase tracking-widest space-y-2 opacity-70">
          <p>Open 5pm — last poem</p>
          <p>12 ink street, gen-z lane</p>
          <p>WiFi: notilldawn</p>
        </div>
        <div className="font-mono text-xs uppercase tracking-widest space-y-2 opacity-70 md:text-right">
          <p>© 2026 afterhours</p>
          <p>Est. 2am</p>
          <p>Brewed by humans, recommended by AI.</p>
        </div>
      </div>
    </footer>
  );
}

export function SiteShell({ children, hideFooter = false }: { children: ReactNode; hideFooter?: boolean }) {
  const { isAdmin } = useIsAdmin();
  return (
    <SmoothScroll>
      <div className="min-h-screen relative">
        {!isAdmin && <ScrollBackground />}
        {!isAdmin && <BackgroundDoodles />}
        {!isAdmin && <BindingHoles />}
        <TopNav />
        <main className="relative z-10">{children}</main>
        {!hideFooter && !isAdmin && <Footer />}
        {!isAdmin && <AIBaristaWidget />}
      </div>
    </SmoothScroll>
  );
}

export { TornDivider };