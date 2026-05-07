/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  compiler: {
    removeConsole: process.env.NODE_ENV === "production",
  },
  // EXPERIMENTAL PACKAGE OPTIMIZATION REMOVED:
  // This was causing 5-minute initial compilation hangs with Sandpack.
};

export default nextConfig;