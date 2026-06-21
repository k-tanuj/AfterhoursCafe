import { useEffect, useState } from "react";
import { getCurrentUser } from "@/lib/auth.functions";
import { useServerFn } from "@tanstack/react-start";

export interface User {
  id: string;
  email: string;
  role: string;
  displayName?: string;
  avatarUrl?: string;
  bio?: string;
}

export interface Session {
  user: User;
}

let authListeners: Array<(user: User | null) => void> = [];
let currentUserCached: User | null = null;
let currentLoading = true;
let isFetching = false;

export function triggerAuthUpdate(user: User | null) {
  currentUserCached = user;
  currentLoading = false;
  authListeners.forEach(listener => listener(user));
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(currentUserCached);
  const [loading, setLoading] = useState(currentUserCached ? false : currentLoading);
  const fetchCurrentUser = useServerFn(getCurrentUser);

  useEffect(() => {
    const listener = (u: User | null) => {
      setUser(u);
      setLoading(false);
    };
    authListeners.push(listener);

    if (currentUserCached === null && currentLoading && !isFetching) {
      isFetching = true;
      fetchCurrentUser()
        .then((res: any) => {
          currentUserCached = res;
          currentLoading = false;
          triggerAuthUpdate(res);
        })
        .catch(() => {
          currentLoading = false;
          triggerAuthUpdate(null);
        });
    }

    return () => {
      authListeners = authListeners.filter(l => l !== listener);
    };
  }, [fetchCurrentUser]);

  const session = user ? { user } : null;

  return { session, user, loading };
}

export function useIsAdmin() {
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      setIsAdmin(false);
      setChecking(false);
      return;
    }
    setIsAdmin(user.role === 'ADMIN');
    setChecking(false);
  }, [user, loading]);

  return { isAdmin, loading: loading || checking };
}