import {
  hasAccessPassword,
  isAuthorizedRequest,
  renderLoginPage
} from "./_lib/auth.js";

function getShareId(pathname) {
  const match = pathname.match(/^\/share\/([A-Za-z0-9]{4})\/?$/);
  return match ? match[1].toUpperCase() : null;
}

export async function onRequest(context) {
  const url = new URL(context.request.url);

  // API endpoints return JSON and perform their own authorization checks.
  if (url.pathname.startsWith("/api/")) {
    return context.next();
  }

  if (!hasAccessPassword(context.env)) {
    return context.next();
  }

  if (await isAuthorizedRequest(context.request, context.env)) {
    return context.next();
  }

  const shareId = getShareId(url.pathname);
  if (shareId && context.env.CODE_SHARES) {
    try {
      const share = await context.env.CODE_SHARES.get(`share:${shareId}`, "json");
      if (share?.visibility === "public") {
        return context.next();
      }
    } catch {
      // If KV is unavailable, keep the protected default rather than failing open.
    }
  }

  return new Response(renderLoginPage(), {
    status: 401,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store"
    }
  });
}
