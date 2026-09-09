const encoder = new TextEncoder();
const COOKIE_NAME = "junudae_auth";
const TOKEN_MESSAGE = "junudaeonecode-access-v1";

export function hasAccessPassword(env) {
  return typeof env.ACCESS_PASSWORD === "string" && env.ACCESS_PASSWORD.length > 0;
}

function parseCookies(header) {
  const cookies = {};
  if (!header) return cookies;

  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index === -1) continue;
    const key = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    cookies[key] = value;
  }

  return cookies;
}

function toBase64Url(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

async function makeAuthToken(password) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(TOKEN_MESSAGE)
  );

  return toBase64Url(new Uint8Array(signature));
}

function safeEqual(a, b) {
  const left = encoder.encode(String(a ?? ""));
  const right = encoder.encode(String(b ?? ""));
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let i = 0; i < left.length; i += 1) {
    difference |= left[i] ^ right[i];
  }
  return difference === 0;
}

export async function passwordsEqual(input, expected) {
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(String(input ?? ""))),
    crypto.subtle.digest("SHA-256", encoder.encode(String(expected ?? "")))
  ]);

  const a = new Uint8Array(left);
  const b = new Uint8Array(right);
  let difference = 0;
  for (let i = 0; i < a.length; i += 1) difference |= a[i] ^ b[i];
  return difference === 0;
}

export async function isAuthorizedRequest(request, env) {
  if (!hasAccessPassword(env)) return true;

  const cookies = parseCookies(request.headers.get("Cookie"));
  const token = cookies[COOKIE_NAME];
  if (!token) return false;

  const expected = await makeAuthToken(env.ACCESS_PASSWORD);
  return safeEqual(token, expected);
}

export async function makeSessionCookie(env) {
  const token = await makeAuthToken(env.ACCESS_PASSWORD);
  return `${COOKIE_NAME}=${token}; Path=/; Max-Age=604800; HttpOnly; Secure; SameSite=Lax`;
}

export function clearSessionCookie() {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...headers
    }
  });
}

export function renderLoginPage() {
  return `<!doctype html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>접속 비밀번호 · 김대원 & 이준우의 코드 공유 사이트</title>
  <style>
    *{box-sizing:border-box}body{margin:0;min-height:100dvh;display:grid;place-items:center;background:#f5f7fb;color:#171a21;font-family:Pretendard,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;padding:24px}.card{width:min(100%,390px);background:#fff;border:1px solid #e6e9ef;border-radius:18px;padding:26px;box-shadow:0 18px 50px rgba(26,35,58,.08)}h1{font-size:20px;margin:0 0 7px;letter-spacing:-.4px}.sub{margin:0 0 22px;color:#6b7280;font-size:14px}label{display:block;font-size:13px;font-weight:700;margin-bottom:8px}input{width:100%;height:46px;border:1px solid #d7dce5;border-radius:11px;padding:0 13px;font:inherit;outline:none}input:focus{border-color:#3677f5;box-shadow:0 0 0 3px rgba(54,119,245,.12)}button{width:100%;height:46px;margin-top:12px;border:0;border-radius:11px;background:#2166e8;color:#fff;font:inherit;font-weight:750;cursor:pointer}.error{min-height:20px;margin:10px 0 0;color:#d93025;font-size:13px}
  </style>
</head>
<body>
  <main class="card">
    <h1>김대원 & 이준우의 코드 공유 사이트</h1>
    <p class="sub">접속 비밀번호를 입력하세요.</p>
    <form id="loginForm">
      <label for="password">비밀번호</label>
      <input id="password" type="password" autocomplete="current-password" autofocus required>
      <button type="submit">접속하기</button>
      <p id="error" class="error" role="alert"></p>
    </form>
  </main>
  <script>
    const form = document.getElementById('loginForm');
    const input = document.getElementById('password');
    const error = document.getElementById('error');
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      error.textContent = '';
      const button = form.querySelector('button');
      button.disabled = true;
      try {
        const response = await fetch('/api/auth', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({password: input.value})
        });
        if (!response.ok) {
          error.textContent = '비밀번호가 올바르지 않습니다.';
          input.select();
          return;
        }
        location.reload();
      } catch {
        error.textContent = '접속에 실패했습니다. 다시 시도해 주세요.';
      } finally {
        button.disabled = false;
      }
    });
  </script>
</body>
</html>`;
}
