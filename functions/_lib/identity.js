const encoder = new TextEncoder();

export const PROFILE_NAMES = {
  junwoo: "이준우",
  daewon: "김대원",
  visitor: "방문자"
};

export const PROFILE_IDS = new Set(Object.keys(PROFILE_NAMES));

function bytesToHex(buffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getClientAddress(request) {
  const direct = request.headers.get("CF-Connecting-IP");
  if (direct) return direct.trim();

  const forwarded = request.headers.get("X-Forwarded-For");
  if (forwarded) return forwarded.split(",")[0].trim();

  return "unknown";
}

export async function getNetworkId(request, env) {
  const ip = getClientAddress(request);
  const ua = (request.headers.get("User-Agent") || "unknown").slice(0, 512);
  const salt = String(env.IDENTITY_SALT || env.ACCESS_PASSWORD || "junudaeonecode-identity-v1");
  const digest = await crypto.subtle.digest(
    "SHA-256",
    encoder.encode(`${salt}\n${ip}\n${ua}`)
  );
  return bytesToHex(digest).slice(0, 16);
}

export async function getIdentity(request, env) {
  const networkId = await getNetworkId(request, env);
  let profile = "visitor";

  if (env.CODE_SHARES) {
    const stored = await env.CODE_SHARES.get(`identity:${networkId}`);
    if (PROFILE_IDS.has(stored)) profile = stored;
  }

  const name = PROFILE_NAMES[profile];
  const ownerKey = profile === "visitor"
    ? `visitor:${networkId}`
    : `profile:${profile}`;

  return { networkId, profile, name, ownerKey };
}

export async function setIdentity(request, env, profile) {
  if (!PROFILE_IDS.has(profile)) {
    throw new Error("INVALID_PROFILE");
  }
  if (!env.CODE_SHARES) {
    throw new Error("KV_UNAVAILABLE");
  }

  const networkId = await getNetworkId(request, env);
  await env.CODE_SHARES.put(`identity:${networkId}`, profile);
  return getIdentity(request, env);
}

export function profileName(profile) {
  return PROFILE_NAMES[profile] || PROFILE_NAMES.visitor;
}
