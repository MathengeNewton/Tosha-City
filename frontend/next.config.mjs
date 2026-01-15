/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use standalone output for Docker deployment
  output: 'standalone',
  
  // Fix trailing slash handling
  trailingSlash: true,
  
  // React strict mode
  reactStrictMode: true,
  
  images: {
    unoptimized: false,
  },
};

export default nextConfig;
