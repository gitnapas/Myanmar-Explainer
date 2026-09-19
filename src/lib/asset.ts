/**
 * Prefixes a public asset with the deployment base path.
 *
 * next/link and next/image apply basePath themselves; a raw <img> or an SVG
 * <image> does not. On GitHub Pages the site lives under /<repo>, so an
 * unprefixed "/images/x.png" resolves to the domain root and 404s. Everything
 * that reaches for a file in public/ goes through here.
 */
const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const asset = (path: string) => `${BASE}/${path.replace(/^\//, "")}`;
