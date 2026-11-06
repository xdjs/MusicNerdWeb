/** @type {import('next').NextConfig} */
const nextConfig = {
    // The browser picks MusicNerdAPI production or staging from this
    // (src/lib/musicNerdApi/const.ts). Vercel always sets VERCEL_ENV at build
    // time; inlining it here doesn't depend on system-env exposure (#1365).
    env: { NEXT_PUBLIC_VERCEL_ENV: process.env.VERCEL_ENV ?? "" },
    webpack: (config) => {
        config.externals.push("pino-pretty", "lokijs", "encoding");

        // Ignore React Native dependencies in web builds (MetaMask SDK)
        config.resolve.fallback = {
            ...config.resolve.fallback,
            "@react-native-async-storage/async-storage": false,
        };

        return config;
      },
};

export default nextConfig;
