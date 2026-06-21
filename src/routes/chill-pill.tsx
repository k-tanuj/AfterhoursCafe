import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { SiteShell } from "@/components/SiteShell";
import { Scribble } from "@/components/Doodles";
import { Svg } from "@/lib/svgs";
import { useScrollReveal } from "@/hooks/use-scroll-reveal";
import { useAuth } from "@/hooks/use-auth";
import { useServerFn } from "@tanstack/react-start";
import {
  getChillNotes,
  postChillNote,
  getMemoryPolaroids,
  postMemoryPolaroid,
  uploadPolaroid,
} from "@/lib/chill.functions";
import { toast } from "sonner";
import { LittleEscapes } from "@/components/LittleEscapes";

export const Route = createFileRoute("/chill-pill")({
  head: () => ({
    meta: [
      { title: "Chill Pill — AFTERHOURS" },
      { name: "description", content: "Notes from the room — late-night confessions, small wins, charger requests, soft thoughts left behind by other afterhours regulars." },
      { property: "og:title", content: "Chill Pill — AFTERHOURS" },
      { property: "og:description", content: "Notes from the room — late-night confessions, small wins, charger requests, soft thoughts left behind by other afterhours regulars." },
    ],
  }),
  component: ChillPillPage,
});

type Note = { id: string; text: string; who: string | null; created_at: string };
type Polaroid = { id: string; photo_url: string; caption: string | null; created_at: string };

// stable per-note visual jitter — keyed by id so it doesn't reshuffle on re-render
const STICKY_COLORS = [
  "bg-yellow-200",
  "bg-pink-200",
  "bg-sky-200",
  "bg-emerald-200",
  "bg-orange-200",
  "bg-violet-200",
  "bg-rose-200",
  "bg-lime-200",
];
const TAPE_COLORS = ["bg-yellow-300/70", "bg-rose-300/70", "bg-sky-300/70", "bg-stone-300/70"];

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// pack into a 5-col grid (notes) / 5-col grid (polaroids) with tiny rotation jitter, so they sit close together
function noteSlot(i: number, h: number) {
  const cols = 5;
  const col = i % cols;
  const row = Math.floor(i / cols);
  const jitterX = ((h % 30) - 15);     // -15..15 px
  const jitterY = (((h >> 4) % 30) - 15);
  const rot = (((h >> 8) % 140) - 70) / 10; // -7..7 deg
  return { col, row, jitterX, jitterY, rot };
}

function ChillPillPage() {
  const ref = useScrollReveal<HTMLElement>({ stagger: 0.06, y: 20 });
  const [notes, setNotes] = useState<Note[]>([]);
  const [polaroids, setPolaroids] = useState<Polaroid[]>([]);
  const { user } = useAuth();

  const [draft, setDraft] = useState("");
  const [who, setWho] = useState("");
  const [posting, setPosting] = useState(false);

  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchNotes = useServerFn(getChillNotes);
  const fetchPolaroids = useServerFn(getMemoryPolaroids);
  const doPinNote = useServerFn(postChillNote);
  const doPinPolaroid = useServerFn(postMemoryPolaroid);
  const doUpload = useServerFn(uploadPolaroid);

  useEffect(() => {
    refresh();
  }, []);

  const refresh = async () => {
    try {
      const [n, p] = await Promise.all([fetchNotes(), fetchPolaroids()]);
      setNotes(n);
      setPolaroids(p);
    } catch (e: any) {
      toast.error(e.message);
    }
  };

  const postNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    if (!user) { toast.error("sign in to leave a note"); return; }
    setPosting(true);
    try {
      await doPinNote({
        data: {
          text: draft,
          who: who || null,
        }
      });
      setDraft(""); setWho("");
      toast.success("pinned.");
      refresh();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setPosting(false);
    }
  };

  const getBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (error) => reject(error);
    });
  };

  const onPickFile = async (file: File) => {
    if (!user) { toast.error("sign in to pin a photo"); return; }
    setUploading(true);
    try {
      const base64Data = await getBase64(file);
      const uploadRes = await doUpload({ data: { base64Data, fileName: file.name } });
      await doPinPolaroid({
        data: {
          photoUrl: uploadRes.photoUrl,
          caption: caption.trim() || null,
        }
      });
      setCaption("");
      toast.success("pinned to the wall.");
      refresh();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <SiteShell hideFooter>
      <section ref={ref} className="max-w-6xl mx-auto px-4 md:px-8 pt-16 pb-0">
        <p data-reveal className="font-mono text-[11px] uppercase tracking-[0.3em] opacity-50">
          Section 007 · the wall · breathe
        </p>
        <h1 data-reveal className="font-display text-7xl md:text-[120px] mt-3 leading-[0.95] -rotate-[3deg] text-accent">
          chill pill.
        </h1>
        <Scribble className="w-48 text-accent/60 mt-3" />
        <p data-reveal className="mt-6 italic text-ink/75 max-w-xl text-lg leading-relaxed">
          three small rooms to breathe in. drop a thought, stick a photo,
          or kill ten minutes on something tiny. that's it. take what you need.
        </p>

        {/* ──────── SECTION 1 · AFTERTHOUGHTS ──────── */}
        <div className="mt-20 flex items-end gap-4">
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-ink/45">01</span>
          <h2 data-reveal className="font-display text-5xl md:text-7xl -rotate-[2deg] text-accent">
            afterthoughts.
          </h2>
        </div>
        <p data-reveal className="mt-3 italic text-ink/70 max-w-xl">
          small notes left behind. half confessions, half charger requests.
          take one, leave one — that's the whole rule.
        </p>

        <div data-reveal className="mt-8 relative bg-ink/[0.03] border border-dashed border-ink/15 p-6 md:p-10 rounded-sm">
          <Svg name="sparkle" className="absolute -top-6 -left-6 w-14 opacity-70" />
          <Svg name="heart" className="absolute -top-4 right-6 w-10 opacity-70 rotate-12" />
          {notes.length === 0 ? (
            <p className="font-display text-2xl text-ink/40 italic text-center py-20">
              wall's bare. leave the first note ↓
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 md:gap-4">
              {notes.map((n, i) => {
                const h = hash(n.id);
                const rot = (((h >> 8) % 140) - 70) / 10;
                const color = STICKY_COLORS[h % STICKY_COLORS.length];
                const tape = TAPE_COLORS[(h >> 3) % TAPE_COLORS.length];
                return (
                  <div
                    key={n.id}
                    className={`relative ${color} p-4 pt-6 shadow-md hover:scale-105 hover:rotate-0 transition-transform duration-300 aspect-square flex flex-col justify-between`}
                    style={{ transform: `rotate(${rot}deg)` }}
                  >
                    <span className={`absolute -top-2 left-1/2 -translate-x-1/2 ${tape} w-12 h-4 rotate-[-3deg] shadow-sm`} />
                    <p className="font-display text-sm md:text-[15px] leading-snug text-ink/85 break-words">
                      "{n.text}"
                    </p>
                    <p className="font-mono text-[9px] uppercase tracking-widest text-ink/55 mt-2">
                      {n.who || "— anon"}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* POST A NOTE */}
        <div data-reveal className="mt-14 relative max-w-2xl mx-auto" style={{ transform: "rotate(-1.2deg)" }}>
          <Svg name="paperclip" className="absolute -top-10 right-10 w-14 h-14 rotate-12 z-20" />
          <span className="absolute -top-3 left-12 w-20 h-5 bg-yellow-300/70 rotate-[-4deg] shadow-sm z-10" />
          <span className="absolute -top-3 right-24 w-16 h-5 bg-rose-300/60 rotate-[6deg] shadow-sm z-10" />
          {/* journal page */}
          <div
            className="relative bg-[#fdf6e3] shadow-2xl p-8 md:p-12 border border-ink/10"
            style={{
              backgroundImage:
                "repeating-linear-gradient(transparent, transparent 31px, rgba(60,40,20,0.18) 31px, rgba(60,40,20,0.18) 32px)",
              backgroundPositionY: "8px",
            }}
          >
            {/* red margin line */}
            <span className="absolute top-0 bottom-0 left-12 w-px bg-red-400/50" />
            <div className="pl-6">
              <h2 className="font-display text-5xl text-ink/90 -rotate-[1deg]">dear afterhours,</h2>
              <p className="font-mono text-[11px] uppercase tracking-widest text-ink/50 mt-1 mb-5">
                page 015 · only the 15 most recent stay on the wall
              </p>
              <form onSubmit={postNote} className="space-y-5">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={4}
                  maxLength={240}
                  placeholder="today i want to say…"
                  className="w-full bg-transparent border-0 outline-none font-display text-xl text-ink/85 placeholder:text-ink/30 resize-none leading-[32px]"
                  style={{ lineHeight: "32px" }}
                />
                <div className="flex flex-col sm:flex-row gap-3 items-end pt-2">
                  <div className="flex-1 w-full">
                    <span className="font-mono text-[10px] uppercase tracking-widest text-ink/40">signed,</span>
                    <input
                      value={who}
                      onChange={(e) => setWho(e.target.value)}
                      maxLength={40}
                      placeholder="— anon"
                      className="w-full bg-transparent border-0 border-b border-dashed border-ink/30 focus:border-accent outline-none font-display text-xl italic text-ink/80 p-1"
                    />
                  </div>
                  <button
                    disabled={posting}
                    className="px-6 py-3 bg-ink text-paper font-display text-2xl hover:scale-105 transition-transform disabled:opacity-50 whitespace-nowrap rotate-[2deg]"
                  >
                    {posting ? "..." : "pin it →"}
                  </button>
                </div>
                {!user && <p className="font-mono text-[11px] text-ink/50">sign in to post.</p>}
              </form>
            </div>
          </div>
        </div>

        {/* ──────── SECTION 2 · POLAROID STORIES ──────── */}
        <div className="mt-32 relative">
          <div className="flex items-end gap-4 mb-4">
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-ink/45">02</span>
            <Svg name="camera" className="w-16 h-16 -rotate-6" />
            <h2 data-reveal className="font-display text-5xl md:text-7xl -rotate-[2deg] text-accent">
              polaroid stories.
            </h2>
          </div>
          <Svg name="wavy-line" className="w-48 h-4 object-contain opacity-60 -mt-2" />
          <p data-reveal className="mt-2 italic text-ink/75 max-w-xl text-lg">
            polaroids from people who passed through. pin one of yours — a coffee, a corner, a 2am face.
            it'll show here and in your profile.
          </p>

          {/* upload card */}
          <div data-reveal className="mt-10 relative max-w-2xl" style={{ transform: "rotate(1deg)" }}>
            <Svg name="tape" className="absolute -top-6 left-10 w-24 rotate-[-8deg] opacity-90 z-20" />
            <span className="absolute -top-3 right-16 w-20 h-5 bg-sky-300/60 rotate-[5deg] shadow-sm z-10" />
            <div
              className="relative bg-[#fdf6e3] shadow-2xl p-8 md:p-10 border border-ink/10"
              style={{
                backgroundImage:
                  "repeating-linear-gradient(transparent, transparent 31px, rgba(60,40,20,0.18) 31px, rgba(60,40,20,0.18) 32px)",
                backgroundPositionY: "8px",
              }}
            >
              <span className="absolute top-0 bottom-0 left-12 w-px bg-red-400/50" />
              <div className="pl-6">
                <h3 className="font-display text-4xl text-ink/90 -rotate-[1deg]">paste a polaroid.</h3>
                <p className="font-mono text-[11px] uppercase tracking-widest text-ink/50 mt-1 mb-5">
                  page 016 · stuck in the scrapbook
                </p>
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => e.target.files?.[0] && onPickFile(e.target.files[0])}
                  className="hidden"
                />
                <div className="space-y-4">
                  <div>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-ink/40">caption:</span>
                    <input
                      value={caption}
                      onChange={(e) => setCaption(e.target.value)}
                      maxLength={60}
                      placeholder="say something tiny about it…"
                      className="w-full bg-transparent border-0 border-b border-dashed border-ink/30 focus:border-accent outline-none font-display text-xl italic text-ink/80 p-1"
                    />
                  </div>
                  <div className="flex items-end justify-between pt-2">
                    <p className="font-mono text-[10px] uppercase tracking-widest text-ink/50 max-w-[55%]">
                      {user ? "15 most recent show · the rest live in your profile" : "sign in to pin a photo"}
                    </p>
                    <button
                      disabled={uploading}
                      onClick={() => fileRef.current?.click()}
                      className="px-6 py-3 bg-ink text-paper font-display text-2xl hover:scale-105 transition-transform whitespace-nowrap disabled:opacity-50 -rotate-[2deg]"
                    >
                      {uploading ? "..." : "pin a photo →"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* POLAROID GRID — CSS frames packed close together */}
          <div className="mt-10 relative bg-ink/[0.03] border border-dashed border-ink/15 p-6 md:p-10 rounded-sm">
            <Svg name="flowers" className="absolute -top-8 right-8 w-20 opacity-70" />
            <Svg name="vinyl" className="absolute -bottom-6 -left-4 w-16 opacity-70" />
            {polaroids.length === 0 ? (
              <p className="font-display text-2xl text-ink/40 italic text-center py-20">
                no polaroids yet. pin the first one ↑
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-6">
                {polaroids.map((p) => {
                  const h = hash(p.id);
                  const rot = (((h >> 8) % 120) - 60) / 10; // -6..6 deg
                  const tape = TAPE_COLORS[h % TAPE_COLORS.length];
                  return (
                    <div
                      key={p.id}
                      className="relative bg-white p-2 pb-8 shadow-xl hover:scale-105 hover:rotate-0 transition-transform duration-300"
                      style={{ transform: `rotate(${rot}deg)` }}
                    >
                      <span className={`absolute -top-2 left-1/2 -translate-x-1/2 ${tape} w-14 h-4 rotate-[-3deg] shadow-sm`} />
                      <div className="aspect-square bg-ink/5 overflow-hidden">
                        <img src={p.photo_url} alt={p.caption || ""} className="w-full h-full object-cover" loading="lazy" />
                      </div>
                      {p.caption && (
                        <p className="absolute bottom-1 left-0 right-0 text-center font-display text-xs md:text-sm text-ink/80 px-2 truncate">
                          {p.caption}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ──────── SECTION 3 · LITTLE ESCAPES ──────── */}
        <div className="mt-32 relative">
          <div className="flex items-end gap-4 mb-4">
            <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-ink/45">03</span>
            <Svg name="vinyl" className="w-14 h-14 -rotate-12" />
            <h2 data-reveal className="font-display text-5xl md:text-7xl -rotate-[2deg] text-accent">
              little escapes.
            </h2>
          </div>
          <Svg name="wavy-line" className="w-48 h-4 object-contain opacity-60 -mt-2" />
          <p data-reveal className="mt-2 italic text-ink/75 max-w-xl text-lg">
            three tiny games for when the cup is empty and the work won't wait politely.
            close the laptop. play one round. come back softer.
          </p>
          <div data-reveal>
            <LittleEscapes />
          </div>
        </div>

        {/* ──────── SECTION 4 · AFTERWAVES ──────── */}
        <Afterwaves />
      </section>
    </SiteShell>
  );
}

// ============================================================
// AFTERWAVES — lofi playlist, sky-blue ocean waves, doodled
// ============================================================
const songModules = import.meta.glob('/src/assets/songs/*.mp3', { import: 'default', eager: true });

const TRACKS = Object.entries(songModules).map(([path, url]) => {
  const filename = path.split('/').pop()?.replace('.mp3', '') || '';
  const parts = filename.split(' - ');
  let title = filename;
  let artist = "Unknown Artist";
  if (parts.length >= 2) {
    title = parts[0].trim();
    artist = parts.slice(1).join(' - ').trim();
  }
  return {
    title,
    artist,
    url: url as string,
  };
});

function Afterwaves() {
  const [nowPlayingUrl, setNowPlayingUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement>(null);

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    setCurrentTime(time);
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  };

  const togglePlay = (url: string) => {
    if (nowPlayingUrl === url) {
      if (audioRef.current) {
        if (isPlaying) audioRef.current.pause();
        else audioRef.current.play();
      }
    } else {
      setNowPlayingUrl(url);
      setIsPlaying(true);
    }
  };

  const nextTrack = () => {
    if (!nowPlayingUrl) return;
    const idx = TRACKS.findIndex(t => t.url === nowPlayingUrl);
    if (idx !== -1 && idx < TRACKS.length - 1) {
      setNowPlayingUrl(TRACKS[idx + 1].url);
      setIsPlaying(true);
    } else if (TRACKS.length > 0) {
      setNowPlayingUrl(TRACKS[0].url);
      setIsPlaying(true);
    }
  };

  return (
    <div className="mt-32 relative -mx-4 md:-mx-8 rounded-t-[32px] overflow-hidden bg-gradient-to-b from-sky-100 via-sky-200/60 to-sky-300/70 border border-sky-300/50 -mb-px">
      {/* doodled clouds + sparkles */}
      <Svg name="cloud" className="absolute top-8 left-10 w-28 opacity-70" />
      <Svg name="cloud" className="absolute top-20 right-16 w-20 opacity-60 -rotate-6" />
      <Svg name="sparkle" className="absolute top-12 right-1/3 w-10 opacity-70" />
      <Svg name="moon" className="absolute top-10 right-10 w-14 opacity-70" />

      <div className="relative px-6 md:px-12 pt-14 pb-10 z-10">
        <div className="flex items-end gap-4 mb-2">
          <span className="font-mono text-[11px] uppercase tracking-[0.3em] text-sky-900/45">04</span>
          <Svg name="headphones" className="w-14 h-14 -rotate-6" />
          <h2 className="font-display text-5xl md:text-7xl -rotate-[2deg] text-sky-700 drop-shadow-sm">
            afterwaves.
          </h2>
        </div>
        <p className="italic text-sky-900/70 max-w-xl text-lg">
          the afterhours playlist. lofi, slow tides, songs for the second cup.
          press play. let the room hum.
        </p>

        {/* track list — handwritten ticket cards */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-w-5xl relative z-10 transition-all duration-500">
          {TRACKS.length === 0 && (
            <p className="italic text-sky-900/50">no songs loaded. add some .mp3s to src/assets/songs!</p>
          )}
          {TRACKS.map((t, i) => {
            const playing = nowPlayingUrl === t.url;
            return (
              <button
                key={i}
                onClick={() => togglePlay(t.url)}
                className={`group flex items-center gap-4 text-left bg-white/80 backdrop-blur border border-sky-300/40 px-4 py-3 shadow-md transition-all hover:shadow-lg hover:-translate-y-0.5 ${
                  playing ? "ring-2 ring-sky-500" : ""
                }`}
                style={{ transform: `rotate(${(i % 2 === 0 ? -0.6 : 0.6).toFixed(1)}deg)` }}
              >
                <span className={`grid place-items-center size-10 rounded-full font-display text-xl shadow shrink-0 transition-colors ${
                  playing ? "bg-sky-500 text-white" : "bg-sky-300/60 text-white/70 group-hover:bg-sky-400 group-hover:text-white"
                }`}>
                  {playing && isPlaying ? "❚❚" : "▶"}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-display text-xl text-ink/90 truncate">{t.title}</p>
                  <p className="font-mono text-[10px] uppercase tracking-widest text-ink/55 truncate">
                    {t.artist}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Theme Animation when playing */}
        <div className={`mt-8 flex flex-col justify-center items-center transition-all duration-1000 origin-top ${isPlaying || nowPlayingUrl ? "opacity-100 scale-100 h-64" : "opacity-0 scale-95 h-0"} overflow-hidden relative z-10`}>
          <div className="relative flex items-center justify-center mt-6">
            <Svg name="vinyl" className={`w-28 h-28 drop-shadow-lg ${isPlaying ? "animate-[spin_4s_linear_infinite]" : ""}`} />
            
            {/* Music notes steaming up like coffee */}
            <span className={`absolute top-0 right-0 text-3xl text-sky-800/80 ${isPlaying ? "animate-steam" : ""}`} style={{ animationDelay: "0ms" }}>♪</span>
            <span className={`absolute -top-4 left-4 text-2xl text-sky-600/70 ${isPlaying ? "animate-steam" : ""}`} style={{ animationDelay: "400ms" }}>♫</span>
            <span className={`absolute top-4 -right-6 text-xl text-sky-700/60 ${isPlaying ? "animate-steam" : ""}`} style={{ animationDelay: "800ms" }}>♪</span>
            
            <p className="absolute -bottom-8 font-mono text-[10px] uppercase tracking-widest text-sky-900/60 whitespace-nowrap">
              vibing to {TRACKS.find(t => t.url === nowPlayingUrl)?.title || "the waves"}...
            </p>
          </div>
          
          {/* Timeline Slider */}
          <div className="w-full max-w-sm mt-10 flex items-center gap-3 px-4">
            <span className="font-mono text-[10px] text-sky-900/60 w-8 text-right">{formatTime(currentTime)}</span>
            <input 
              type="range" 
              min={0} 
              max={duration || 100} 
              value={currentTime} 
              onChange={handleSeek}
              className="flex-1 h-1.5 bg-sky-300/30 rounded-lg appearance-none cursor-pointer accent-sky-500 hover:accent-sky-600 focus:outline-none"
            />
            <span className="font-mono text-[10px] text-sky-900/60 w-8">{formatTime(duration)}</span>
          </div>
        </div>

        {/* invisible audio player */}
        <audio
          ref={audioRef}
          src={nowPlayingUrl || undefined}
          autoPlay
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onEnded={nextTrack}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          className="hidden"
        />

      </div>

      {/* ocean waves — animated svg layered at the bottom */}
      <div className="relative h-44 md:h-56 mt-4">
        <svg
          viewBox="0 0 1200 200"
          preserveAspectRatio="none"
          className="absolute inset-0 w-full h-full"
        >
          <defs>
            <path
              id="wave-path"
              d="M0,100 C150,60 300,140 600,100 C900,60 1050,140 1200,100 L1200,200 L0,200 Z"
            />
          </defs>
          <g className="animate-wave-slow" style={{ opacity: 0.35 }}>
            <use href="#wave-path" fill="#ffffff" />
            <use href="#wave-path" x="-1200" fill="#ffffff" />
          </g>
          <g className="animate-wave-mid" style={{ opacity: 0.55, transform: "translateY(20px)" }}>
            <use href="#wave-path" fill="#bae6fd" />
            <use href="#wave-path" x="-1200" fill="#bae6fd" />
          </g>
          <g className="animate-wave-fast" style={{ opacity: 0.85, transform: "translateY(40px)" }}>
            <use href="#wave-path" fill="#7dd3fc" />
            <use href="#wave-path" x="-1200" fill="#7dd3fc" />
          </g>
        </svg>
        {/* signature on the waves */}
        <div className="absolute left-6 md:left-10 bottom-4 md:bottom-6 z-10 text-white drop-shadow-[0_2px_6px_rgba(2,132,199,0.45)]">
          <p className="font-display text-4xl md:text-5xl -rotate-[2deg] leading-none">afterhours</p>
          <p className="mt-1 font-mono text-[10px] md:text-[11px] uppercase tracking-[0.3em] opacity-95">
            coffee. conversations. chaos.
          </p>
        </div>
      </div>
    </div>
  );
}