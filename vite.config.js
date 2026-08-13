import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

function openGraphMeta(siteUrl) {
  const base = siteUrl.replace(/\/$/, "");
  const ogImage = base ? `${base}/logo.png` : "/logo.png";

  return {
    name: "open-graph-meta",
    transformIndexHtml(html) {
      let next = html.replaceAll("__OG_IMAGE__", ogImage);
      if (base) {
        next = next.replaceAll("__OG_URL__", base);
      } else {
        next = next.replace(
          /\s*<meta property="og:url" content="__OG_URL__" \/>/,
          "",
        );
      }
      return next;
    },
  };
}

function legacyFaviconRedirect() {
  return {
    name: "legacy-favicon-redirect",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const path = req.url?.split("?")[0];
        if (
          path === "/favicon.svg" ||
          path === "/favicon.ico" ||
          path === "/vite.svg"
        ) {
          res.writeHead(302, { Location: "/logo.png" });
          res.end();
          return;
        }
        next();
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const siteUrl = env.VITE_SITE_URL || "";

  return {
    plugins: [react(), openGraphMeta(siteUrl), legacyFaviconRedirect()],
    server: {
      proxy: {
        "/storage": "http://localhost:8000",
      },
    },
    test: {
      environment: "jsdom",
      setupFiles: "./src/tests/setup.js",
      globals: true,
      include: ["src/**/*.spec.{js,jsx}"],
    },
  };
});
