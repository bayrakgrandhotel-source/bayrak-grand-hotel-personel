import type { NextConfig } from 'next';
// Dedicated free GitHub Pages build. The main Vercel deployment is unchanged.
const nextConfig: NextConfig = {
  output: 'export',
  basePath: '/bayrak-grand-hotel-personel',
  trailingSlash: true,
};
export default nextConfig;
