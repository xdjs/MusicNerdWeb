// MusicNerdAPI runs research (#1365). Without its URL, the research pumps and Look again
// call `undefined/api/...` and fail silently, so a production build must not ship without it.
if (process.env.VERCEL_ENV === "production" && !process.env.NEXT_PUBLIC_MUSICNERD_API_URL) {
    throw new Error("NEXT_PUBLIC_MUSICNERD_API_URL is required for production builds (#1365)");
}

/** @type {import('next').NextConfig} */
const nextConfig = {
    // pdf-parse is a Node-only CJS lib with dynamic requires; let it load at
    // runtime from node_modules instead of being bundled by Next.
    serverExternalPackages: ["pdf-parse"],
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
