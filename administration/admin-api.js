/*
 * PrepareKora admin API routes — MERGE INTO the existing Cloudflare Worker.
 * This file is intentionally separate; do not replace the current login/signup Worker.
 * Requires Worker bindings: FIREBASE_WEB_API_KEY (or FIREBASE_API_KEY) and
 * FIREBASE_DATABASE_URL (or FIREBASE_DB_URL). Do not put their values in GitHub.
 */
const ADMIN_UID = "uG8gJRil9wSwl0xanyyCbhqBhJm2";
const API_PREFIX = "/api/admin";
const AUDIT_PATH = "adminLogs";
const MAX_BODY_BYTES = 2 * 1024 * 1024;
const DEFAULT_ALLOWED_ORIGINS = ["https://preparekora.in", "https://www.preparekora.in"];

export async function handlePrepareKoraAdminApi(request, env) {
  const url = new URL(request.url);
  if (!url.pathname.startsWith(API_PREFIX)) return null;
  const origin = request.headers.get("Origin") || "";
  const allowed = allowedOrigins(env).includes(origin);
  const headers = corsHeaders(origin, allowed);
  if (request.method === "OPTIONS") return new Response(null, { status: allowed ? 204 : 403, headers });
  if (origin && !allowed) return json({ ok:false, error:"Origin is not allowed." }, 403, headers);
  try {
    const route = url.pathname.slice(API_PREFIX.length).replace(/\/+$/, "") || "/";
    if (route === "/health" && request.method === "GET") return json({ ok:true, service:"preparekora-admin-api" }, 200, headers);
    if (route === "/login" && request.method === "POST") return await login(request, env, headers);
    if (route === "/refresh" && request.method === "POST") return await refresh(request, env, headers);
    if (route === "/session" && request.method === "GET") {
      const user = await requireAdmin(request, env);
      return json({ ok:true, user:{ uid:user.uid, email:user.email || "" } }, 200, headers);
    }
    if (route === "/logout" && request.method === "POST") {
      // The browser clears the short-lived session tokens. No server-side session is stored here.
      return json({ ok:true }, 200, headers);
    }
    if (route === "/database") return await databaseRoute(request, url, env, headers);
    return json({ ok:false, error:"Admin route not found." }, 404, headers);
  } catch (error) {
    const status = Number(error?.status) || 500;
    if (status >= 500) console.error("PrepareKora admin API error:", error?.message || "Unknown error");
    return json({ ok:false, error:status >= 500 ? "Admin API could not complete this request." : (error.message || "Request rejected.") }, status, headers);
  }
}

function allowedOrigins(env) {
  const extra = String(env.ADMIN_ALLOWED_ORIGINS || "").split(",").map(s=>s.trim()).filter(Boolean);
  return [...new Set([...DEFAULT_ALLOWED_ORIGINS, ...extra])];
}
function corsHeaders(origin, allowed) {
  const h = { "Vary":"Origin", "Access-Control-Allow-Methods":"GET,POST,PUT,PATCH,DELETE,OPTIONS", "Access-Control-Allow-Headers":"Authorization,Content-Type", "Access-Control-Max-Age":"600" };
  if (origin && allowed) h["Access-Control-Allow-Origin"] = origin;
  return h;
}
function json(data, status=200, headers={}) { return new Response(JSON.stringify(data), { status, headers:{ "Content-Type":"application/json; charset=utf-8", "Cache-Control":"no-store", ...headers } }); }
function firebaseApiKey(env) { return env.FIREBASE_WEB_API_KEY || env.FIREBASE_API_KEY || ""; }
function databaseUrl(env) { return String(env.FIREBASE_DATABASE_URL || env.FIREBASE_DB_URL || "").replace(/\/+$/, ""); }
function ensureBindings(env) { if(!firebaseApiKey(env)) throw Object.assign(new Error("Firebase API key binding is missing in Worker settings."),{status:500}); if(!databaseUrl(env)) throw Object.assign(new Error("Firebase Realtime Database URL binding is missing in Worker settings."),{status:500}); }
async function readJson(request) {
  const size = Number(request.headers.get("Content-Length") || 0);
  if(size > MAX_BODY_BYTES) throw Object.assign(new Error("Request body exceeds the 2 MB limit."),{status:413});
  const text = await request.text();
  if(text.length > MAX_BODY_BYTES) throw Object.assign(new Error("Request body exceeds the 2 MB limit."),{status:413});
  try { return text ? JSON.parse(text) : {}; } catch { throw Object.assign(new Error("Request body must be valid JSON."),{status:400}); }
}
async function firebaseJson(url, init={}) {
  const response = await fetch(url, { ...init, headers:{ Accept:"application/json", ...(init.body ? {"Content-Type":"application/json"}:{}), ...(init.headers||{}) } });
  const text = await response.text(); let body=null;
  try { body=text ? JSON.parse(text) : null; } catch { body={error:{message:text}}; }
  if(!response.ok) {
    const firebaseMessage = body?.error?.message || body?.error || `Firebase request failed (${response.status})`;
    const status = response.status >= 500 ? 502 : response.status;
    throw Object.assign(new Error(typeof firebaseMessage === "string" ? firebaseMessage : "Firebase request failed."),{status});
  }
  return body;
}
async function login(request, env, headers) {
  ensureBindings(env);
  const body = await readJson(request);
  if(typeof body.email !== "string" || typeof body.password !== "string" || !body.email.trim() || !body.password) throw Object.assign(new Error("Email and password are required."),{status:400});
  const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(firebaseApiKey(env))}`;
  let result;
  try { result = await firebaseJson(url,{method:"POST",body:JSON.stringify({email:body.email.trim(),password:body.password,returnSecureToken:true})}); }
  catch (e) { if (e.status === 400 || e.status === 401) throw Object.assign(new Error("Sign-in failed. Check your credentials."),{status:401}); throw e; }
  if(result.localId !== ADMIN_UID) throw Object.assign(new Error("This account is not authorised for PrepareKora administration."),{status:403});
  return json({ ok:true, idToken:result.idToken, refreshToken:result.refreshToken, localId:result.localId, email:result.email, expiresIn:result.expiresIn },200,headers);
}
async function refresh(request, env, headers) {
  ensureBindings(env);
  const body = await readJson(request);
  if(typeof body.refreshToken !== "string" || !body.refreshToken) throw Object.assign(new Error("A refresh token is required."),{status:400});
  const form = new URLSearchParams({ grant_type:"refresh_token", refresh_token:body.refreshToken });
  const result = await firebaseJson(`https://securetoken.googleapis.com/v1/token?key=${encodeURIComponent(firebaseApiKey(env))}`,{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:form.toString()});
  if(result.user_id !== ADMIN_UID) throw Object.assign(new Error("This account is not authorised for PrepareKora administration."),{status:403});
  const checked = await verifyIdToken(result.id_token, env);
  return json({ ok:true, idToken:result.id_token, refreshToken:result.refresh_token, localId:checked.uid, email:checked.email || result.email || "", expiresIn:result.expires_in },200,headers);
}
async function verifyIdToken(idToken, env) {
  ensureBindings(env);
  if(!idToken) throw Object.assign(new Error("Authentication required."),{status:401});
  let result;
  try {
    result = await firebaseJson(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(firebaseApiKey(env))}`,{method:"POST",body:JSON.stringify({idToken})});
  } catch (error) {
    if ([400, 401, 403].includes(Number(error.status))) throw Object.assign(new Error("Invalid or expired administrator session."),{status:401});
    throw error;
  }
  const user=result.users?.[0];
  if(!user?.localId) throw Object.assign(new Error("Invalid or expired administrator session."),{status:401});
  return { uid:user.localId, email:user.email || "" };
}
async function requireAdmin(request, env) {
  const auth = request.headers.get("Authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  if(!match) throw Object.assign(new Error("Authentication required."),{status:401});
  const user = await verifyIdToken(match[1],env);
  if(user.uid !== ADMIN_UID) throw Object.assign(new Error("This account is not authorised for PrepareKora administration."),{status:403});
  return user;
}
function cleanPath(path) {
  const p=String(path||"").trim().replace(/^\/+|\/+$/g,"");
  if(!p) return "";
  const segments=p.split("/");
  for(const key of segments) if(!key || key==="." || key===".." || key.length>768 || /[.#$\[\]\u0000-\u001f\u007f]/.test(key)) throw Object.assign(new Error("Invalid Firebase database path."),{status:400});
  return segments.join("/");
}
function encodedPath(path) { return path ? path.split("/").map(encodeURIComponent).join("/") : ""; }
function assertWritablePath(path) {
  if(!path) throw Object.assign(new Error("Writing, replacing, or deleting the database root is blocked. Select a child node."),{status:400});
  if(path===AUDIT_PATH || path.startsWith(AUDIT_PATH+"/")) throw Object.assign(new Error("Audit logs are append-only through this API."),{status:403});
}
async function databaseRest(request, env, user, path, method, data, shallow=false) {
  const base=databaseUrl(env);
  const url=new URL(`${base}/${encodedPath(path)}.json`);
  if(shallow && method === "GET") url.searchParams.set("shallow","true");
  const init={method,headers:{Authorization:`Bearer ${request.headers.get("Authorization").replace(/^Bearer\s+/i,"")}`}};
  if(["PUT","PATCH","POST"].includes(method)) init.body=JSON.stringify(data);
  return await firebaseJson(url.toString(),init);
}
async function appendAudit(request,env,user,action,path,details={}) {
  try {
    const body={action,path:path||"/",details,actorUid:user.uid,actorEmail:user.email||null,timestamp:Date.now()};
    await databaseRest(request,env,user,AUDIT_PATH,"POST",body,false);
  } catch(error) { console.warn("Admin mutation completed, but audit logging failed:",error?.message||"unknown"); }
}
async function databaseRoute(request,url,env,headers) {
  if(!["GET","PUT","PATCH","POST","DELETE"].includes(request.method)) return json({ok:false,error:"Method not allowed."},405,headers);
  const user=await requireAdmin(request,env);
  const path=cleanPath(url.searchParams.get("path")||"");
  const shallow=url.searchParams.get("shallow")==="true";
  if(request.method === "GET") {
    const data=await databaseRest(request,env,user,path,"GET",undefined,shallow);
    return json({ok:true,path:path||"/",data},200,headers);
  }
  assertWritablePath(path);
  const body=await readJson(request);
  if(!Object.prototype.hasOwnProperty.call(body,"data")) throw Object.assign(new Error("Request must include a data field."),{status:400});
  if(request.method === "PATCH" && (body.data===null || typeof body.data!=="object" || Array.isArray(body.data))) throw Object.assign(new Error("PATCH requires a JSON object."),{status:400});
  if(request.method === "POST" && (body.data===null || typeof body.data!=="object")) throw Object.assign(new Error("POST requires a JSON object or array."),{status:400});
  const data=await databaseRest(request,env,user,path,request.method,body.data,false);
  await appendAudit(request,env,user,request.method,path,{createdKey:request.method==="POST"?data?.name:undefined});
  return json({ok:true,path,data,name:data?.name||undefined},200,headers);
}
