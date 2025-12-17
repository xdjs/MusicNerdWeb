/** @type {import('next').NextConfig} */
const nextConfig = {
    webpack: (config) => {
        config.externals.push("pino-pretty", "lokijs", "encoding");

        // Ignore React Native dependencies in web builds (MetaMask SDK)
        // Ignore Solana dependencies (Privy includes Solana support but we don't use it)
        config.resolve.fallback = {
            ...config.resolve.fallback,
            "@react-native-async-storage/async-storage": false,
            "@solana-program/system": false,
            "@solana/web3.js": false,
        };

        return config;
      },
};

export default nextConfig;
