import type { NextConfig } from "next";

/**
 * GitHub Pages serves a project site from /<repo>, so every asset and link
 * needs that prefix. CI sets NEXT_PUBLIC_BASE_PATH; local dev leaves it empty
 * so the site still works at http://localhost:3000/.
 */
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // Pages is a plain static host: no server, no runtime rendering.
  output: "export",
  basePath,
  // There is no image optimisation server behind a static export.
  images: { unoptimized: true },
  // Emit /route/index.html so directory URLs resolve without host rewrites.
  trailingSlash: true,
};

export default nextConfig;
