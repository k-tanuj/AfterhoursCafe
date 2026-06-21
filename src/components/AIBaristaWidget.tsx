import { CoffeeCup, Star } from "./Doodles";
import { useAuth } from "@/hooks/use-auth";
import { Link } from "@tanstack/react-router";

export function AIBaristaWidget() {
  const { user } = useAuth();

  // If not logged in, don't show the widget
  if (!user) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999]">
      {/* Floating Button linking to full page */}
      <Link
        to="/chat"
        className="group relative bg-ink text-paper rounded-full size-16 shadow-2xl hover:scale-105 transition-transform flex items-center justify-center animate-in zoom-in duration-300"
        aria-label="Open Buddy"
      >
        <CoffeeCup className="size-7" />
        <Star className="absolute -top-1 -right-1 size-5 text-accent animate-paper-float drop-shadow-md" />
        {/* Notification Dot */}
        <span className="absolute top-0 right-0 size-3 rounded-full bg-red-500 border-2 border-ink" />
      </Link>
    </div>
  );
}