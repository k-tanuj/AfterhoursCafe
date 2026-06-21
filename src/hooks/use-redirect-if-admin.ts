import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useIsAdmin } from "./use-auth";

/**
 * On public/customer pages, bounce admins straight to /admin so they only
 * ever see the back-of-house experience.
 */
export function useRedirectIfAdmin() {
  const { isAdmin, loading } = useIsAdmin();
  const navigate = useNavigate();
  useEffect(() => {
    if (!loading && isAdmin) {
      navigate({ to: "/admin", replace: true });
    }
  }, [isAdmin, loading, navigate]);
}