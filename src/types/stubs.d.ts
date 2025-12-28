// Stub type declarations for deleted packages
// These allow kept components to compile even though packages are uninstalled

declare module 'next-auth/react' {
  export function useSession(...args: any[]): any;
  export function SessionProvider(...args: any[]): any;
  export function signIn(...args: any[]): any;
  export function signOut(...args: any[]): any;
}

declare module 'next-auth' {
  export type Session = any;
}

declare module 'wagmi' {
  export function useAccount(...args: any[]): any;
  export function useEnsName(...args: any[]): any;
  export function useEnsAvatar(...args: any[]): any;
  export function useDisconnect(...args: any[]): any;
  export function useConfig(...args: any[]): any;
}

declare module 'wagmi/chains' {
  export const mainnet: any;
}

declare module 'viem' {
  export function normalize(...args: any[]): any;
  export function createPublicClient(...args: any[]): any;
  export function http(...args: any[]): any;
}

declare module 'viem/ens' {
  export function normalize(...args: any[]): any;
  export function getEnsAvatar(...args: any[]): any;
  export function getEnsName(...args: any[]): any;
}

declare module '@rainbow-me/rainbowkit' {
  export function ConnectButton(...args: any[]): any;
  export function useConnectModal(...args: any[]): any;
}

declare module 'react-jazzicon' {
  export default function Jazzicon(...args: any[]): any;
  export function jsNumberForAddress(...args: any[]): any;
}
