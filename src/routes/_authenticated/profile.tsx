import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { SiteShell } from "@/components/SiteShell";
import { Scribble } from "@/components/Doodles";
import { Svg } from "@/lib/svgs";
import { toast } from "sonner";
import { getMyLoyalty } from "@/lib/loyalty.functions";
import { getMyPolaroids } from "@/lib/chill.functions";
import { getMyBookings, type MyBookingRow } from "@/lib/bookings.functions";
import { getProfile, updateProfile, logoutUser } from "@/lib/auth.functions";
import { useAuth, triggerAuthUpdate } from "@/hooks/use-auth";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "Your Profile — AFTERHOURS" }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [myPolaroids, setMyPolaroids] = useState<{ id: string; photo_url: string; caption: string | null }[]>([]);

  const fetchProfile = useServerFn(getProfile);
  const saveProfile = useServerFn(updateProfile);
  const doLogout = useServerFn(logoutUser);
  const fetchMyPolaroids = useServerFn(getMyPolaroids);

  useEffect(() => {
    if (user) {
      setEmail(user.email ?? "");
    }
  }, [user]);

  useEffect(() => {
    (async () => {
      try {
        const [data, p] = await Promise.all([
          fetchProfile(),
          fetchMyPolaroids()
        ]);
        if (data) {
          setDisplayName(data.displayName ?? "");
          setAvatarUrl(data.avatarUrl ?? "");
          setBio(data.bio ?? "");
        }
        setMyPolaroids(p || []);
      } catch (err: any) {
        console.error("Failed to load profile", err);
      } finally {
        setLoading(false);
      }
    })();
  }, [fetchProfile, fetchMyPolaroids]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await saveProfile({
        data: {
          displayName: displayName.trim().slice(0, 60),
          avatarUrl: avatarUrl.trim().slice(0, 500),
          bio: bio.trim().slice(0, 500),
        }
      });
      if (user) {
        triggerAuthUpdate({
          ...user,
          displayName: displayName.trim().slice(0, 60),
          avatarUrl: avatarUrl.trim().slice(0, 500),
          bio: bio.trim().slice(0, 500),
        });
      }
      toast.success("Saved.");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    try {
      await doLogout();
    } catch (err) {
      console.error(err);
    }
    document.cookie = "session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    triggerAuthUpdate(null);
    navigate({ to: "/auth", replace: true });
  };

  const fetchLoyalty = useServerFn(getMyLoyalty);
  const { data: loyalty } = useQuery({
    queryKey: ["my-loyalty"],
    queryFn: () => fetchLoyalty(),
    staleTime: 30_000,
  });
  const stamps = loyalty?.stamps ?? 0;

  const fetchBookings = useServerFn(getMyBookings);
  const { data: bookings = [] } = useQuery({
    queryKey: ["my-bookings"],
    queryFn: () => fetchBookings(),
    staleTime: 15_000,
  });

  const activeSlips = bookings.filter(b => ["confirmed", "pending", "seated"].includes(b.status));

  if (loading) {
    return <SiteShell><div className="max-w-3xl mx-auto px-4 pt-20 font-display text-3xl opacity-50">brewing your page…</div></SiteShell>;
  }

  return (
    <SiteShell>
      <section className="max-w-3xl mx-auto px-4 md:px-8 pt-16 pb-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] opacity-50">Section 008 · your locker</p>
        <h1 className="font-display text-6xl md:text-7xl mt-3">your corner.</h1>
        <Scribble className="w-40 text-accent/60 mt-2" />

        <div className="mt-10 flex items-center gap-6">
          {avatarUrl ? (
            <img src={avatarUrl} alt="" className="size-24 rounded-full object-cover border-2 border-ink" />
          ) : (
            <div className="size-24 rounded-full bg-white/60 border-2 border-ink flex items-center justify-center font-display text-5xl">
              {(displayName || email || "?").charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-display text-3xl">{displayName || "no name yet"}</p>
            <p className="font-mono text-xs opacity-60">{email}</p>
          </div>
        </div>

        <form onSubmit={save} className="mt-10 bg-white/60 border border-ink/10 p-8 shadow-lg space-y-6">
          <div>
            <label className="block font-display text-2xl mb-2">display name</label>
            <input value={displayName} onChange={(e)=>setDisplayName(e.target.value)} maxLength={60}
              className="w-full bg-transparent border-b-2 border-ink/30 focus:border-accent outline-none font-mono p-2" />
          </div>
          <div>
            <label className="block font-display text-2xl mb-2">bio</label>
            <textarea value={bio} onChange={(e)=>setBio(e.target.value)} rows={4} maxLength={500} placeholder="who shows up at 2am?"
              className="w-full bg-transparent border-2 border-ink/20 focus:border-accent outline-none font-mono p-3 resize-none" />
          </div>
          <div className="flex justify-between items-center">
            <button type="button" onClick={signOut} className="font-mono text-xs uppercase tracking-widest opacity-60 hover:text-accent">
              sign out ↗
            </button>
            <button disabled={saving} className="px-6 py-3 bg-ink text-paper font-display text-2xl hover:scale-105 transition-transform disabled:opacity-50">
              {saving ? "..." : "save →"}
            </button>
          </div>
        </form>

        <div className="mt-12 bg-white/50 border border-ink/10 p-8 rounded-[4px] relative shadow-sm">
          <div className="absolute -top-4 left-6 bg-accent text-paper font-mono text-[10px] px-2 py-1 -rotate-2 tracking-widest">
            LOYALTY_CARD
          </div>
          <Svg name="paperclip" className="absolute -top-10 right-8 w-16 h-16 rotate-12" />
          <h3 className="font-display text-3xl mb-2">your 2am progress</h3>
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink/50 mb-6">
            10 stamps = 1 surprise drink · ₹200+ orders
          </p>
          <div className="grid grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => {
              const filled = i < stamps;
              const stampDate = loyalty?.stamp_dates?.[i];
              // deterministic pseudo-random offset + rotation per slot
              const seed = (i * 9301 + 49297) % 233280;
              const rand = seed / 233280;
              const dx = (rand - 0.5) * 22; // -11% .. 11%
              const dy = ((rand * 7) % 1 - 0.5) * 22;
              const rot = (rand * 40) - 20; // -20° .. 20°
              return (
                <div key={i} className="flex flex-col items-center gap-1.5">
                  <div
                    className={`relative w-full aspect-square rounded-full border border-ink/20 overflow-hidden ${
                      filled ? "bg-accent/10" : ""
                    }`}
                  >
                    {filled ? (
                      <Svg
                        name="filled-coffee-cup"
                        className={`absolute w-[85%] h-[85%] object-contain ${i === stamps - 1 ? "animate-paper-float" : ""}`}
                        style={{
                          left: `calc(50% - 42.5% + ${dx}%)`,
                          top: `calc(50% - 42.5% + ${dy}%)`,
                          transform: `rotate(${rot}deg)`,
                        }}
                      />
                    ) : (
                      <Svg
                        name="empty-coffee-cup"
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 object-contain opacity-30"
                      />
                    )}
                  </div>
                  {filled && stampDate ? (
                    <span className="font-mono text-[9px] opacity-60">{stampDate}</span>
                  ) : (
                    <span className="font-mono text-[9px] opacity-0">-</span>
                  )}
                </div>
              );
            })}
          </div>
          <p className="mt-6 font-mono text-[11px] text-ink/60">
            {stamps >= 10
              ? "you've earned a surprise drink — claim it next visit."
              : `${10 - stamps} more cup${10 - stamps === 1 ? "" : "s"} to unlock a surprise drink.`}
          </p>
        </div>

        <div className="mt-10 flex gap-3">
          <Link to="/history" className="px-5 py-3 border border-ink/20 font-mono text-xs uppercase tracking-widest hover:bg-ink hover:text-paper transition-colors inline-flex items-center gap-2">
            <Svg name="open-book" className="size-4" /> your history
          </Link>
          <Link to="/booking" className="px-5 py-3 border border-ink/20 font-mono text-xs uppercase tracking-widest hover:bg-ink hover:text-paper transition-colors inline-flex items-center gap-2">
            <Svg name="couch" className="size-4" /> book a slot
          </Link>
        </div>

        {user?.role !== "admin" && activeSlips.length > 0 && (
          <div className="mt-16 bg-white/50 border border-ink/10 p-8 rounded-[4px] relative shadow-sm">
            <h3 className="font-display text-3xl mb-4">your active slips.</h3>
            <div className="grid sm:grid-cols-2 gap-4">
              {activeSlips.map(b => (
                <div key={b.id} className="bg-white border-l-4 border-accent p-4 shadow-sm font-mono text-sm relative">
                  <div className="absolute top-2 right-4 text-xs opacity-50 uppercase tracking-widest">{b.status.replace("_", " ")}</div>
                  <p className="font-display text-2xl mb-1">{b.booking_date}</p>
                  <p className="opacity-80">{b.booking_time} · Table {b.table_no || "TBD"}</p>
                  <p className="opacity-60 text-xs mt-1">Party of {b.party}</p>
                  {b.reference_code && <p className="mt-3 text-[10px] tracking-widest opacity-50">REF: {b.reference_code}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-16">
          <div className="flex items-end gap-3 mb-4">
            <Svg name="camera" className="w-10 h-10 -rotate-6" />
            <h3 className="font-display text-4xl -rotate-[1deg] text-accent">your polaroids.</h3>
          </div>
          <p className="font-mono text-[11px] uppercase tracking-widest text-ink/50 mb-6">
            every photo you've pinned to the memory wall
          </p>
          {myPolaroids.length === 0 ? (
            <Link to="/chill-pill" className="block bg-white/40 border border-dashed border-ink/20 p-10 text-center font-display text-2xl italic text-ink/50 hover:text-accent">
              no polaroids yet — pin one on the wall →
            </Link>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {myPolaroids.map((p) => (
                <div key={p.id} className="bg-white p-2 pb-6 shadow-md relative">
                  <div className="aspect-square bg-ink/5 overflow-hidden">
                    <img src={p.photo_url} alt={p.caption || ""} className="w-full h-full object-cover" loading="lazy" />
                  </div>
                  {p.caption && (
                    <p className="absolute bottom-1 left-0 right-0 text-center font-display text-xs text-ink/80 px-2 truncate">
                      {p.caption}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </SiteShell>
  );
}