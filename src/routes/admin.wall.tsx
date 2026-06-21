import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getChillNotes, getMemoryPolaroids } from "@/lib/chill.functions";
import { deleteChillNoteAdmin, deletePolaroidAdmin } from "@/lib/admin.functions";
import { SiteShell } from "@/components/SiteShell";
import { AdminGuard } from "@/components/AdminGuard";
import { Scribble } from "@/components/Doodles";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/wall")({
  ssr: false,
  head: () => ({ meta: [{ title: "Wall — AFTERHOURS Admin" }] }),
  component: () => <AdminGuard><WallPage /></AdminGuard>,
});

type Note = { id: string; text: string; who: string | null; created_at: string };
type Polaroid = { id: string; photo_url: string; caption: string | null; created_at: string };

function WallPage() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [polas, setPolas] = useState<Polaroid[]>([]);

  const fetchNotes = useServerFn(getChillNotes);
  const fetchPolaroids = useServerFn(getMemoryPolaroids);
  const doDeleteNote = useServerFn(deleteChillNoteAdmin);
  const doDeletePolaroid = useServerFn(deletePolaroidAdmin);

  const load = async () => {
    try {
      const [n, p] = await Promise.all([
        fetchNotes(),
        fetchPolaroids(),
      ]);
      setNotes(n);
      setPolas(p);
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  useEffect(() => { load(); }, []);

  const delNote = async (id: string) => {
    if (!confirm("delete this note?")) return;
    try {
      await doDeleteNote({ data: { id } });
      toast.success("note removed");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };
  const delPola = async (id: string) => {
    if (!confirm("delete this polaroid?")) return;
    try {
      await doDeletePolaroid({ data: { id } });
      toast.success("polaroid removed");
      load();
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  return (
    <SiteShell hideFooter>
      <section className="max-w-6xl mx-auto px-4 md:px-8 pt-12 pb-20">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] opacity-60">moderation</p>
        <h1 className="font-display text-5xl md:text-6xl mt-2">The Wall.</h1>
        <Scribble className="w-40 text-accent/60 mt-2" />
        <p className="mt-3 font-serif italic text-ink/60">remove anything inappropriate from chill pill notes & polaroids.</p>

        <h2 className="mt-12 font-display text-3xl">Notes ({notes.length})</h2>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((n) => (
            <div key={n.id} className="bg-white/80 border border-ink/10 p-4 relative shadow-sm">
              <p className="font-serif italic text-ink/80 pr-8">{n.text}</p>
              <p className="mt-3 font-mono text-[10px] uppercase opacity-50">— {n.who ?? "anon"} · {new Date(n.created_at).toLocaleDateString()}</p>
              <button onClick={() => delNote(n.id)} className="absolute top-2 right-2 text-[10px] uppercase text-red-600 hover:underline">delete</button>
            </div>
          ))}
          {notes.length === 0 && <p className="font-mono text-xs opacity-50 italic">no notes yet.</p>}
        </div>

        <h2 className="mt-16 font-display text-3xl">Polaroids ({polas.length})</h2>
        <div className="mt-4 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {polas.map((p) => (
            <div key={p.id} className="bg-white p-3 pb-6 shadow-md relative">
              <img src={p.photo_url} alt={p.caption ?? ""} className="w-full aspect-square object-cover" />
              {p.caption && <p className="mt-2 font-display text-sm text-center">{p.caption}</p>}
              <button onClick={() => delPola(p.id)} className="absolute top-1 right-1 bg-paper/90 text-[10px] uppercase text-red-600 px-2 py-1 hover:underline">delete</button>
            </div>
          ))}
          {polas.length === 0 && <p className="font-mono text-xs opacity-50 italic">no polaroids yet.</p>}
        </div>
      </section>
    </SiteShell>
  );
}