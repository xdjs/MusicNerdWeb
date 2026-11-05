"use client";
import { session } from "./session";
export function SessionProvider({ children }: { children: React.ReactNode }) {
  return children;
}
export const useSession = () => ({
  data: session,
  status: "authenticated",
  update: async () => session,
});
export const getSession = async () => session;
export const signIn = async () => {
  throw Error("Synthetic fixture does not exercise sign-in");
};
export const signOut = async () => {
  throw Error("Synthetic fixture does not exercise sign-out");
};
