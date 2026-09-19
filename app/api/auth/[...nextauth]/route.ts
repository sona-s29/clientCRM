import { handlers } from "@/auth";

// Auth.js exposes GET (session/csrf/providers checks) and POST
// (sign-in/sign-out/callback submissions) — both are needed.
export const { GET, POST } = handlers;
