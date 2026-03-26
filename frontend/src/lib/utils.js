import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "";

export function getAvatarUrl(path) {
  if (!path) return null;
  if (path.startsWith("http")) return path;

  // Remove trailing slash from base if present
  const baseUrl = BACKEND_URL.endsWith('/') ? BACKEND_URL.slice(0, -1) : BACKEND_URL;

  // Remove leading slash from path if present to avoid double slash
  const cleanPath = path.startsWith('/') ? path : `/${path}`;

  return `${baseUrl}${cleanPath}`;
}
