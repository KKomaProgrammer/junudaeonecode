import {
  clearSessionCookie,
  hasAccessPassword,
  json,
  makeSessionCookie,
  passwordsEqual
} from "../_lib/auth.js";

export async function onRequestPost(context) {
  if (!hasAccessPassword(context.env)) {
    return json({ ok: true, passwordRequired: false });
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return json({ ok: false, error: "잘못된 요청입니다." }, 400);
  }

  const password = typeof body?.password === "string" ? body.password : "";
  const matches = await passwordsEqual(password, context.env.ACCESS_PASSWORD);

  if (!matches) {
    return json({ ok: false, error: "비밀번호가 올바르지 않습니다." }, 401);
  }

  const cookie = await makeSessionCookie(context.env);
  return json(
    { ok: true, passwordRequired: true },
    200,
    { "Set-Cookie": cookie }
  );
}

export async function onRequestDelete() {
  return json(
    { ok: true },
    200,
    { "Set-Cookie": clearSessionCookie() }
  );
}
