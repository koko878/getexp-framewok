/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // @getexp/core is a source-first workspace package; let Next transpile it.
  transpilePackages: ['@getexp/core'],
};

export default nextConfig;
