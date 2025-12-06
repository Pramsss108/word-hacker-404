import path from "path"
import type { NextConfig } from "next"

const nextConfig: NextConfig = {
  reactCompiler: true,
  turbo: {
    // Force Turbopack to treat replica-studio as the workspace root
    root: path.resolve(__dirname),
  },
  webpack: (config, { isServer }) => {
    // Exclude esbuild binaries and READMEs from webpack processing
    config.module = config.module || {};
    config.module.rules = config.module.rules || [];
    config.module.rules.push({
      test: /node_modules\/@esbuild\/.*\.(md|node)$/,
      type: 'asset/resource',
    });
    return config;
  },
}

export default nextConfig
