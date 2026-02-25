const nextConfig = {
  output: "export",
  distDir: "office365",
  images: { unoptimized: true },
  trailingSlash: true,
  basePath: '/office365',
  assetPrefix: '/office365/',
  env: {
    NEXT_PUBLIC_API_KEY: process.env.NEXT_PUBLIC_API_KEY,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
  },
};

export default nextConfig;