/** @type {import('next').NextConfig} */
const nextConfig = {
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
