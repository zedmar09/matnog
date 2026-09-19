/** @type {import('next').NextConfig} */
const nextConfig = {
  reactCompiler: true,
  // The external macOS volume creates AppleDouble files in Next's image cache.
  // Direct local image delivery avoids the optimizer reading those as images.
  images: { unoptimized: true },
  turbopack: { root: process.cwd() },
  // NOTE: this project sits on an exFAT volume, which emits no macOS FSEvents.
  // Neither Turbopack's watcher nor webpack polling sees edits here, so hot
  // reload does not work: restart `npm run dev` to pick up source changes.
};
export default nextConfig;
