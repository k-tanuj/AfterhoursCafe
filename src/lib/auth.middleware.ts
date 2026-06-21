import { createMiddleware } from "@tanstack/react-start";
import { getCurrentUser } from "./auth.functions";

export const requireAuth = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const user = await getCurrentUser();
    if (!user) {
      throw new Error("Unauthorized: Please sign in");
    }
    return next({
      context: {
        user,
        userId: user.id,
      },
    });
  }
);

export const requireAdmin = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    const user = await getCurrentUser();
    if (!user || user.role !== "ADMIN") {
      throw new Error("Forbidden: Admin access required");
    }
    return next({
      context: {
        user,
        userId: user.id,
      },
    });
  }
);
