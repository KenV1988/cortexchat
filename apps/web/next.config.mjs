/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  // better-sqlite3 uses a native .node addon. serverExternalPackages alone
  // doesn't reliably keep it out of the webpack bundle when it's required
  // transitively through a pnpm-workspace-symlinked package (@cortexchat/db)
  // rather than apps/web's own package.json — bundling it breaks the
  // `bindings` package's runtime lookup of the compiled binary. Explicitly
  // externalizing it in the webpack config is the well-established fix.
  serverExternalPackages: ['better-sqlite3'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = [...(config.externals ?? []), 'better-sqlite3'];
    }
    return config;
  },
};

export default nextConfig;
