"use client";
export const getAccessToken = async () => "local-synthetic";
export const getIdentityToken = async () => "local-synthetic";
const user = { id: "local-subject", linkedAccounts: [] };
export const usePrivy = () => ({
  ready: true,
  authenticated: true,
  user,
  getAccessToken,
  login() {
    throw Error("No real login in fixture");
  },
  logout() {
    throw Error("No real logout in fixture");
  },
});
export const useIdentityToken = () => ({ identityToken: "local-synthetic" });
export const useLogin = () => ({
  login() {
    throw Error("No real login in fixture");
  },
});
export const useLogout = () => ({
  logout() {
    throw Error("No real logout in fixture");
  },
});
export function PrivyProvider({ children }: { children: React.ReactNode }) {
  return children;
}

export const useLinkAccount = () => ({ linkWallet() { throw Error("Synthetic fixture does not link real wallets"); } });
