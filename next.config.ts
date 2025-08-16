import type { NextConfig } from "next";
const nextConfig: NextConfig = {
  // Turbopack configuration
  turbopack: {
    // Configure字体加载
    rules: {
      '*.woff2': {
        loaders: ['raw-loader'],
        as: '*.woff2',
      },
    },
    // 解决模块解析问题
    resolveAlias: {
      '@vercel/turbopack-next/internal/font/google/font': './src/lib/font-loader.ts',
    },
  },

  // 保留Webpack配置以确保兼容性
  webpack: (config, { isServer }) => {
    if (!isServer) {
      // Fix for Pinecone client-side compatibility
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        os: false,
        crypto: false,
      }
    }
    return config
  },

  serverExternalPackages: ['@pinecone-database/pinecone']
};

export default nextConfig;
