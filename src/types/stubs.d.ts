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
