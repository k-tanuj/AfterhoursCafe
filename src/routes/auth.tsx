import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { SiteShell } from "@/components/SiteShell";
import { Scribble, Star } from "@/components/Doodles";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { registerUser, loginUser, loginWithFirebase } from "@/lib/auth.functions";
import { useAuth, triggerAuthUpdate } from "@/hooks/use-auth";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — AFTERHOURS" },
      { name: "description", content: "Sign in or create your AFTERHOURS account." },
    ],
  }),
  component: AuthPage,
});

const signInSchema = z.object({
  email: z.string().trim().email().max(255),
  password: z.string().min(6).max(72),
});
const signUpSchema = signInSchema.extend({
  displayName: z.string().trim().min(1).max(60),
});

function AuthPage() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [busy, setBusy] = useState(false);
  const [authError, setAuthError] = useState("");

  const doRegister = useServerFn(registerUser);
  const doLogin = useServerFn(loginUser);
  const doFirebaseLogin = useServerFn(loginWithFirebase);
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: user.role === "admin" ? "/admin" : "/profile" });
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setAuthError("");
    try {
      if (tab === "signup") {
        const parsed = signUpSchema.safeParse({ email, password, displayName });
        if (!parsed.success) { setAuthError(parsed.error.issues[0].message); return; }
        
        const regRes = await doRegister({ data: { email, password, fullName: displayName } });
        if (regRes.error) { setAuthError(regRes.error); return; }
        
        const loginRes = await doLogin({ data: { email, password } });
        if (loginRes.error) { setAuthError(loginRes.error); return; }
        
        document.cookie = `session=${loginRes.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
        
        triggerAuthUpdate({
          id: loginRes.userId,
          email,
          role: "USER",
          displayName,
        });

        toast.success("Welcome to afterhours.");
        navigate({ to: "/profile" });
      } else {
        const parsed = signInSchema.safeParse({ email, password });
        if (!parsed.success) { setAuthError(parsed.error.issues[0].message); return; }
        
        const loginRes = await doLogin({ data: { email, password } });
        if (loginRes.error) { setAuthError(loginRes.error); return; }
        
        document.cookie = `session=${loginRes.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
        
        triggerAuthUpdate({
          id: loginRes.userId,
          email: loginRes.email,
          role: loginRes.role,
          displayName: loginRes.displayName,
        });
        
        toast.success("Pulled up a chair.");
        navigate({ to: loginRes.role === "ADMIN" ? "/admin" : "/profile" });
      }
    } catch (err: any) {
      console.error("Auth error details:", err);
      setAuthError("Server error: " + (err.message || String(err)));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SiteShell>
      <section className="max-w-md mx-auto px-4 md:px-8 pt-16 pb-24">
        <p className="font-mono text-[11px] uppercase tracking-[0.3em] opacity-50">Section 007 · come on in</p>
        <h1 className="font-display text-6xl mt-3">{tab === "signin" ? "back again." : "first cup?"}</h1>
        <Scribble className="w-40 text-accent/60 mt-2" />

        <div className="mt-8 flex gap-1 font-mono text-xs uppercase tracking-widest">
          <button onClick={() => { setTab("signin"); setAuthError(""); }} className={`px-4 py-2 border ${tab==="signin"?"bg-ink text-paper border-ink":"border-ink/20"}`}>sign in</button>
          <button onClick={() => { setTab("signup"); setAuthError(""); }} className={`px-4 py-2 border ${tab==="signup"?"bg-ink text-paper border-ink":"border-ink/20"}`}>register</button>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 bg-white/60 border border-ink/10 p-8 shadow-lg space-y-6">
          {authError && (
            <div className="bg-red-50 text-red-600 border border-red-200 p-3 font-mono text-xs uppercase tracking-widest">
              {authError}
            </div>
          )}
          {tab === "signup" && (
            <div>
              <label className="block font-display text-2xl mb-2">what should we call you?</label>
              <input value={displayName} onChange={(e)=>setDisplayName(e.target.value)} required maxLength={60}
                className="w-full bg-transparent border-b-2 border-ink/30 focus:border-accent outline-none font-mono p-2" />
            </div>
          )}
          <div>
            <label className="block font-display text-2xl mb-2">email</label>
            <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required maxLength={255}
              className="w-full bg-transparent border-b-2 border-ink/30 focus:border-accent outline-none font-mono p-2" />
          </div>
          <div>
            <label className="block font-display text-2xl mb-2">password</label>
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required minLength={6} maxLength={72}
              className="w-full bg-transparent border-b-2 border-ink/30 focus:border-accent outline-none font-mono p-2" />
          </div>
          <button disabled={busy} className="w-full px-6 py-3 bg-ink text-paper font-display text-2xl hover:scale-[1.02] transition-transform disabled:opacity-50">
            {busy ? "..." : tab==="signin" ? "sign in →" : "create account →"}
          </button>
        </form>

        <div className="mt-6 flex items-center gap-3 opacity-50">
          <div className="h-px bg-ink/30 flex-1" />
          <span className="font-mono text-[10px] uppercase tracking-widest">or</span>
          <div className="h-px bg-ink/30 flex-1" />
        </div>

        <button onClick={async () => {
          setBusy(true);
          try {
            const result = await signInWithPopup(auth, googleProvider);
            const idToken = await result.user.getIdToken();
            const loginRes = await doFirebaseLogin({ data: { idToken } });
            
            if (loginRes.error) {
              setAuthError(loginRes.error);
              return;
            }

            document.cookie = `session=${loginRes.token}; path=/; max-age=${7 * 24 * 60 * 60}; SameSite=Lax`;
            
            triggerAuthUpdate({
              id: loginRes.userId!,
              email: loginRes.email!,
              role: loginRes.role!,
              displayName: loginRes.displayName!,
            });
            
            toast.success("Pulled up a chair with Google.");
            navigate({ to: loginRes.role === "ADMIN" ? "/admin" : "/profile" });
          } catch (error: any) {
            setAuthError("Google sign-in failed.");
          } finally {
            setBusy(false);
          }
        }} disabled={busy}
          className="mt-6 w-full px-6 py-3 border-2 border-ink font-display text-xl hover:bg-ink hover:text-paper transition-colors disabled:opacity-50 flex items-center justify-center gap-3">
          <Star className="size-5" />
          continue with Google
        </button>

        <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-widest opacity-60">
          <Link to="/" className="hover:text-accent">← back home</Link>
        </p>
      </section>
    </SiteShell>
  );
}