import {
  hasAccessPassword,
  isAuthorizedRequest,
  json
} from "../_lib/auth.js";

export async function onRequestGet(context) {
  const passwordRequired = hasAccessPassword(context.env);
  const authenticated = passwordRequired
    ? await isAuthorizedRequest(context.request, context.env)
    : true;

  return json({ passwordRequired, authenticated });
}
