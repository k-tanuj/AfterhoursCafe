import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getMenu, saveMenuItem, deleteMenuItem, toggleMenuAvailability, uploadMenuImage } from "@/lib/menu.functions";
import { SiteShell } from "@/components/SiteShell";
import { AdminGuard } from "@/components/AdminGuard";
import { Scribble } from "@/components/Doodles";
import { toast } from "sonner";
import { useRef } from "react";

export const Route = createFileRoute("/admin/menu")({
  ssr: false,
  head: () => ({ meta: [{ title: "Menu Manager — AFTERHOURS Admin" }] }),
  component: () => <AdminGuard><MenuManagerPage /></AdminGuard>,
});

type Item = {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  image_url: string | null;
  sort_order: number;
  is_available: boolean;
};

const CATEGORIES = [
  "Hot Coffees",
  "Cold Coffees",
  "Waffles",
  "Pancakes",
  "Donuts",
  "Toasts",
  "Smoothies",
  "Add-ons"
];

const empty: Omit<Item, "id"> = {
  name: "", category: "Hot Coffees", description: "", price: 0, image_url: "", sort_order: 100, is_available: true,
};

function MenuManagerPage() {
  const fetchMenu = useServerFn(getMenu);
  const saveMenu = useServerFn(saveMenuItem);
  const deleteMenu = useServerFn(deleteMenuItem);
  const toggleMenu = useServerFn(toggleMenuAvailability);

  const [rows, setRows] = useState<Item[]>([]);
  const [editing, setEditing] = useState<Item | null>(null);
  const [draft, setDraft] = useState<Omit<Item, "id">>(empty);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const doUpload = useServerFn(uploadMenuImage);

  const load = async () => {
    try {
      const data = await fetchMenu();
      setRows(data as Item[]);
    } catch (error) {
      toast.error("Failed to load menu");
    }
  };

  useEffect(() => { load(); }, []);

  const getBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const onPickFile = async (file: File) => {
    setUploadingImage(true);
    try {
      const base64Data = await getBase64(file);
      const uploadRes = await doUpload({ data: { base64Data, fileName: file.name } });
      setDraft({ ...draft, image_url: uploadRes.imageUrl });
      toast.success("Image uploaded");
    } catch (e: any) {
      toast.error(e.message || "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  };


  const startNew = () => { setEditing(null); setDraft(empty); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const startEdit = (it: Item) => { setEditing(it); setDraft({ ...it }); window.scrollTo({ top: 0, behavior: "smooth" }); };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = draft.name.trim();
    if (!name) { toast.error("name is required"); return; }
    setSaving(true);

    const payload = {
      id: editing?.id, // undefined if it's a new item
      name,
      category: draft.category,
      description: draft.description.trim(),
      price: Number(draft.price),
      image_url: draft.image_url?.trim() || null,
      sort_order: Number(draft.sort_order) || 100,
      is_available: !!draft.is_available,
    };

    try {
      await saveMenu({ data: payload });
      toast.success(editing ? "updated" : "added");
      setEditing(null);
      setDraft(empty);
      load();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };


  const remove = async (it: Item) => {
    if (!confirm(`delete "${it.name}"?`)) return;
    try {
      await deleteMenu({ data: it.id });
      toast.success("deleted");
      load();
    } catch (error: any) {
      toast.error("Failed to delete item");
    }
  };


  const toggle = async (it: Item) => {
    try {
      await toggleMenu({ data: { id: it.id, is_available: !it.is_available } });
      load();
    } catch (error) {
      toast.error("Failed to toggle availability");
    }
  };


  return (
    <SiteShell hideFooter>
      <section className="max-w-6xl mx-auto px-4 md:px-8 pt-12 pb-20">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] opacity-60">menu manager</p>
        <h1 className="font-display text-5xl md:text-6xl mt-2">The Menu.</h1>
        <Scribble className="w-40 text-accent/60 mt-2" />
        <p className="mt-3 font-serif italic text-ink/60">add, edit, hide, or delete any menu item — drinks, food, snacks, desserts. changes show up on the public menu instantly.</p>

        <form onSubmit={save} className="mt-8 bg-white/70 border border-ink/10 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-display text-2xl">{editing ? `Edit · ${editing.name}` : "Add new item"}</h2>
            {editing && (
              <button type="button" onClick={startNew} className="font-mono text-[10px] uppercase opacity-70 hover:text-accent">cancel edit</button>
            )}
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-widest opacity-60">Item name</span>
              <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="e.g. Iced Latte, Veg Sandwich" maxLength={120}
                className="bg-paper/60 border border-ink/15 px-3 py-2 font-mono text-sm focus:outline-none focus:border-accent" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-widest opacity-60">Category</span>
              <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })}
                className="bg-paper/60 border border-ink/15 px-3 py-2 font-mono text-sm focus:outline-none focus:border-accent">
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </label>
            <label className="md:col-span-2 flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-widest opacity-60">Description</span>
              <textarea value={draft.description} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="short tagline shown on the public menu"
                className="bg-paper/60 border border-ink/15 px-3 py-2 font-mono text-sm focus:outline-none focus:border-accent" rows={2} />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-widest opacity-60">Price (₹)</span>
              <input value={draft.price} onChange={(e) => setDraft({ ...draft, price: Number(e.target.value) })} type="number" min="0" step="1"
                className="bg-paper/60 border border-ink/15 px-3 py-2 font-mono text-sm focus:outline-none focus:border-accent" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-widest opacity-60">Sort order <span className="opacity-50 normal-case">— lower shows first</span></span>
              <input value={draft.sort_order} onChange={(e) => setDraft({ ...draft, sort_order: Number(e.target.value) })} type="number"
                className="bg-paper/60 border border-ink/15 px-3 py-2 font-mono text-sm focus:outline-none focus:border-accent" />
            </label>
            <label className="md:col-span-2 flex flex-col gap-1">
              <span className="font-mono text-[10px] uppercase tracking-widest opacity-60">Image URL <span className="opacity-50 normal-case">— optional</span></span>
              <div className="flex gap-2">
                <input value={draft.image_url ?? ""} onChange={(e) => setDraft({ ...draft, image_url: e.target.value })} placeholder="https://…"
                  className="flex-1 bg-paper/60 border border-ink/15 px-3 py-2 font-mono text-sm focus:outline-none focus:border-accent" />
                <button type="button" disabled={uploadingImage} onClick={() => fileRef.current?.click()}
                  className="bg-ink/10 px-4 py-2 font-mono text-xs uppercase tracking-widest hover:bg-ink/20 disabled:opacity-50 transition-colors">
                  {uploadingImage ? "..." : "Upload"}
                </button>
                <input ref={fileRef} type="file" accept="image/jpeg, image/png, image/webp" className="hidden"
                  onChange={(e) => e.target.files?.[0] && onPickFile(e.target.files[0])} />
              </div>
            </label>
            <label className="flex items-center gap-2 font-mono text-xs">
              <input type="checkbox" checked={draft.is_available} onChange={(e) => setDraft({ ...draft, is_available: e.target.checked })} />
              available on public menu
            </label>
            <button disabled={saving} type="submit" className="bg-ink text-paper font-display text-xl px-4 py-2 hover:scale-[1.02] transition-transform disabled:opacity-50">
              {saving ? "saving…" : editing ? "save changes →" : "add item →"}
            </button>
          </div>
        </form>

        <div className="mt-10 bg-white/60 border border-ink/10 overflow-hidden">
          <table className="w-full font-mono text-sm">
            <thead className="bg-ink/5 text-[10px] uppercase tracking-widest">
              <tr className="text-left">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Price</th>
                <th className="px-4 py-3 text-center">Sort</th>
                <th className="px-4 py-3 text-center">Live</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (<tr><td colSpan={6} className="px-4 py-8 text-center opacity-50 italic">no menu items yet.</td></tr>)}
              {rows.map((it) => (
                <tr key={it.id} className={`border-t border-ink/5 ${!it.is_available ? "opacity-50" : ""} hover:bg-accent/5`}>
                  <td className="px-4 py-3 font-display text-base">{it.name}</td>
                  <td className="px-4 py-3 opacity-70">{it.category}</td>
                  <td className="px-4 py-3 text-right text-accent">₹{Number(it.price).toFixed(0)}</td>
                  <td className="px-4 py-3 text-center opacity-70">{it.sort_order}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => toggle(it)} className={`text-[10px] uppercase px-2 py-1 ${it.is_available ? "bg-green-100 text-green-700" : "bg-ink/10"}`}>
                      {it.is_available ? "live" : "hidden"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button onClick={() => startEdit(it)} className="text-[10px] uppercase mr-3 hover:text-accent">edit</button>
                    <button onClick={() => remove(it)} className="text-[10px] uppercase hover:text-red-600">delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </SiteShell>
  );
}