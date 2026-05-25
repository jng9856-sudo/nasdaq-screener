/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ['yahoo-finance2'],
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      '@gadicc/fetch-mock-cache/runtimes/deno.ts': false,
      '@gadicc/fetch-mock-cache/stores/fs.ts': false,
      '@gadicc/fetch-mock-cache': false,
      '@std/testing/mock': false,
      '@std/testing/bdd': false,
      '@std/testing': false,
    };
    return config;
  },
};

module.exports = nextConfig;
