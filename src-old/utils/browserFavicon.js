import { DEFAULT_LOGO_URL } from "./clinicBranding";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000/api";

let activeBlobUrl = null;

function guessIconType(href) {
  const lower = href.toLowerCase();
  if (lower.includes(".png")) return "image/png";
  if (lower.includes(".svg")) return "image/svg+xml";
  if (lower.includes(".webp")) return "image/webp";
  return "image/jpeg";
}

function withCacheBuster(href) {
  if (!href || href.startsWith("blob:")) return href;
  const sep = href.includes("?") ? "&" : "?";
  return `${href}${sep}v=${Date.now()}`;
}

function removeFaviconLinks() {
  document
    .querySelectorAll(
      "link[rel='icon'], link[rel='shortcut icon'], link[rel='apple-touch-icon']",
    )
    .forEach((el) => el.remove());
}

function appendFaviconLink(rel, href, type) {
  const link = document.createElement("link");
  link.rel = rel;
  link.href = href;
  if (type) link.type = type;
  document.head.appendChild(link);
}

function revokeActiveBlobUrl() {
  if (!activeBlobUrl) return;
  URL.revokeObjectURL(activeBlobUrl);
  activeBlobUrl = null;
}

function toSameOriginLogoPath(logoUrl) {
  try {
    const parsed = new URL(logoUrl.trim());
    if (parsed.pathname.startsWith("/storage/")) {
      return parsed.pathname;
    }
    if (
      parsed.pathname === "/logo.jpg" ||
      parsed.pathname === "/images/logo.jpg" ||
      parsed.pathname === "/images/logo.png"
    ) {
      return DEFAULT_LOGO_URL;
    }
  } catch {
    // ignore invalid URL
  }
  return null;
}

async function resolveFaviconHref(settings) {
  const customLogo = settings?.logo_url;
  if (typeof customLogo === "string" && customLogo.trim()) {
    const sameOriginPath = toSameOriginLogoPath(customLogo);
    if (sameOriginPath) {
      return {
        href: sameOriginPath,
        type: guessIconType(sameOriginPath),
        isBlob: false,
      };
    }

    try {
      const response = await fetch(
        `${API_BASE}/settings/logo?_=${Date.now()}`,
        {
          mode: "cors",
          credentials: "omit",
          cache: "no-store",
        },
      );
      if (!response.ok) throw new Error("logo unavailable");
      const blob = await response.blob();
      const nextBlobUrl = URL.createObjectURL(blob);
      return {
        href: nextBlobUrl,
        type: blob.type || guessIconType(customLogo.trim()),
        isBlob: true,
      };
    } catch {
      return {
        href: customLogo.trim(),
        type: guessIconType(customLogo.trim()),
        isBlob: false,
      };
    }
  }

  return {
    href: DEFAULT_LOGO_URL,
    type: "image/jpeg",
    isBlob: false,
  };
}

function applyResolvedFavicon({ href, type }) {
  const bustedHref = withCacheBuster(href);
  removeFaviconLinks();
  appendFaviconLink("icon", bustedHref, type);
  appendFaviconLink("shortcut icon", bustedHref, type);
  appendFaviconLink("apple-touch-icon", bustedHref);
}

export function applyDefaultFaviconSync() {
  const href = withCacheBuster(DEFAULT_LOGO_URL);
  removeFaviconLinks();
  appendFaviconLink("icon", href, "image/jpeg");
  appendFaviconLink("shortcut icon", href, "image/jpeg");
  appendFaviconLink("apple-touch-icon", href);
}

export async function applyBrowserFavicon(settings) {
  const resolved = await resolveFaviconHref(settings);
  const previousBlobUrl = activeBlobUrl;

  applyResolvedFavicon(resolved);

  if (resolved.isBlob) {
    activeBlobUrl = resolved.href;
    if (previousBlobUrl && previousBlobUrl !== activeBlobUrl) {
      URL.revokeObjectURL(previousBlobUrl);
    }
    return;
  }

  if (previousBlobUrl) {
    URL.revokeObjectURL(previousBlobUrl);
    activeBlobUrl = null;
  }
}
