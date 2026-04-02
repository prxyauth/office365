const nextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  env: {
    API_KEY: process.env.API_KEY,
    API_BASE_URL: process.env.API_BASE_URL,
  },
};

export default nextConfig;