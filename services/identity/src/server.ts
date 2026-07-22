import "dotenv/config";
// Identity service entrypoint.
import express from "express";
import { nanoid } from "nanoid";
import { z } from "zod";
import { asyncHandler, createPool, errorMiddleware, fail, hashPassword, health, identity, ok, opaqueToken, requireIdentity, requireRoles, signJwt, tokenHash, verifyPassword } from "@movie-platform/service-kit";

const app = express();
const pool = createPool("identity_db");
void pool.query(`CREATE TABLE IF NOT EXISTS password_reset_tokens(id varchar(40) PRIMARY KEY,user_id varchar(40) NOT NULL REFERENCES users(id) ON DELETE CASCADE,token_hash char(64) UNIQUE NOT NULL,expires_at timestamptz NOT NULL,used_at timestamptz,created_at timestamptz NOT NULL DEFAULT now());CREATE INDEX IF NOT EXISTS password_reset_tokens_lookup_idx ON password_reset_tokens(token_hash) WHERE used_at IS NULL`).catch(error=>console.error("Cannot initialize password reset tokens",error));
const analyticsUrl=process.env.ANALYTICS_URL??"http://localhost:4107";
const emitAnalytics=(body:Record<string,unknown>)=>fetch(`${analyticsUrl}/internal/events`,{method:"POST",headers:{"content-type":"application/json","x-internal-secret":process.env.INTERNAL_SECRET??"local-internal-secret"},body:JSON.stringify(body)}).catch(()=>null);
app.use(express.json({ limit: "1mb" }));
app.get("/health", health("identity-service", pool));

app.get("/v1/admin/users", requireRoles("super_admin", "support"), asyncHandler(async (req, res) => {
  const page=Math.max(1,Number(req.query.page)||1),limit=Math.min(100,Math.max(1,Number(req.query.limit)||20)),search=String(req.query.search??"").trim(),status=String(req.query.status??""),role=String(req.query.role??""),tier=String(req.query.tier??""),sort=String(req.query.sort??"newest");
  const params:unknown[]=[],where:string[]=[];
  if(search){params.push(`%${search}%`);where.push(`(u.email ILIKE $${params.length} OR u.display_name ILIKE $${params.length})`)}
  if(status){params.push(status);where.push(`u.status=$${params.length}`)} if(role){params.push(role);where.push(`u.role=$${params.length}`)} if(tier){params.push(tier);where.push(`u.subscription_tier=$${params.length}`)}
  const clause=where.length?`WHERE ${where.join(" AND ")}`:"";
  const total=Number((await pool.query(`SELECT COUNT(*) count FROM users u ${clause}`,params)).rows[0].count);params.push(limit,(page-1)*limit);
  const order=sort==="last_login"?"u.last_login_at DESC NULLS LAST":sort==="oldest"?"u.created_at ASC":"u.created_at DESC";
  const rows=await pool.query(`SELECT u.id,u.email,u.display_name,u.role,u.status,u.subscription_tier,u.last_login_at,u.created_at,COUNT(DISTINCT p.id)::int profile_count,COUNT(DISTINCT s.id) FILTER(WHERE s.revoked_at IS NULL AND s.expires_at>NOW())::int active_devices FROM users u LEFT JOIN profiles p ON p.user_id=u.id LEFT JOIN sessions s ON s.user_id=u.id ${clause} GROUP BY u.id ORDER BY ${order} LIMIT $${params.length-1} OFFSET $${params.length}`,params);
  ok(res,{items:rows.rows.map(r=>({id:r.id,email:r.email,displayName:r.display_name,role:r.role,status:r.status,subscriptionTier:r.subscription_tier,lastLoginAt:r.last_login_at,createdAt:r.created_at,profileCount:r.profile_count,activeDevices:r.active_devices})),pagination:{page,limit,total,totalPages:Math.ceil(total/limit)}});
}));
app.get("/v1/admin/users/:id",requireRoles("super_admin","support"),asyncHandler(async(req,res)=>{const user=(await pool.query("SELECT id,email,display_name,role,status,subscription_tier,last_login_at,created_at FROM users WHERE id=$1",[req.params.id])).rows[0];if(!user)return fail(res,404,"USER_NOT_FOUND","Không tìm thấy người dùng");const[profiles,devices]=await Promise.all([pool.query("SELECT id,name,avatar_url,is_kids,maturity_level,created_at FROM profiles WHERE user_id=$1 ORDER BY created_at",[req.params.id]),pool.query("SELECT id,user_agent,ip_address,last_seen_at,expires_at,revoked_at FROM sessions WHERE user_id=$1 ORDER BY last_seen_at DESC LIMIT 20",[req.params.id])]);ok(res,{id:user.id,email:user.email,displayName:user.display_name,role:user.role,status:user.status,subscriptionTier:user.subscription_tier,lastLoginAt:user.last_login_at,createdAt:user.created_at,profiles:profiles.rows,devices:devices.rows})}));
app.patch("/v1/admin/users/:id/status",requireRoles("super_admin","support"),asyncHandler(async(req,res)=>{const parsed=z.object({status:z.enum(["active","suspended"])}).safeParse(req.body);if(!parsed.success)return fail(res,400,"VALIDATION_ERROR","Trạng thái không hợp lệ");if(req.params.id===identity(req)!.userId&&parsed.data.status!=="active")return fail(res,409,"SELF_LOCK","Không thể tự khóa tài khoản đang sử dụng");const row=(await pool.query("UPDATE users SET status=$1,updated_at=NOW() WHERE id=$2 RETURNING id,status",[parsed.data.status,req.params.id])).rows[0];if(!row)return fail(res,404,"USER_NOT_FOUND","Không tìm thấy người dùng");if(parsed.data.status==="suspended")await pool.query("UPDATE sessions SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL",[req.params.id]);ok(res,row)}));
app.patch("/v1/admin/users/:id/role",requireRoles("super_admin"),asyncHandler(async(req,res)=>{const parsed=z.object({role:z.enum(["user","admin","super_admin","content_editor","support"])}).safeParse(req.body);if(!parsed.success)return fail(res,400,"VALIDATION_ERROR","Vai trò không hợp lệ");if(req.params.id===identity(req)!.userId)return fail(res,409,"SELF_ROLE_CHANGE","Không thể tự thay đổi vai trò");const row=(await pool.query("UPDATE users SET role=$1,updated_at=NOW() WHERE id=$2 RETURNING id,role",[parsed.data.role,req.params.id])).rows[0];if(!row)return fail(res,404,"USER_NOT_FOUND","Không tìm thấy người dùng");await pool.query("UPDATE sessions SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL",[req.params.id]);ok(res,row)}));
app.post("/v1/admin/users/:id/password-reset",requireRoles("super_admin","support"),asyncHandler(async(req,res)=>{const user=(await pool.query("SELECT id FROM users WHERE id=$1 AND status='active'",[req.params.id])).rows[0];if(!user)return fail(res,404,"USER_NOT_FOUND","Không tìm thấy tài khoản đang hoạt động");const raw=opaqueToken();await pool.query("UPDATE password_reset_tokens SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL",[user.id]);await pool.query("INSERT INTO password_reset_tokens(id,user_id,token_hash,expires_at) VALUES($1,$2,$3,NOW()+INTERVAL '30 minutes')",[`prt_${nanoid(16)}`,user.id,tokenHash(raw)]);ok(res,{resetToken:raw,expiresInMinutes:30})}));

app.get("/v1/admin/settings",requireRoles("super_admin"),asyncHandler(async(_req,res)=>{const rows=await pool.query("SELECT key,value,description,updated_by,updated_at FROM system_settings ORDER BY key");ok(res,Object.fromEntries(rows.rows.map(r=>[r.key,{value:r.value,description:r.description,updatedBy:r.updated_by,updatedAt:r.updated_at}])))}));
app.put("/v1/admin/settings",requireRoles("super_admin"),asyncHandler(async(req,res)=>{const parsed=z.object({max_concurrent_devices:z.number().int().min(1).max(20),email_notifications:z.boolean(),push_notifications:z.boolean(),maintenance_mode:z.boolean()}).safeParse(req.body);if(!parsed.success)return fail(res,400,"VALIDATION_ERROR","Cấu hình hệ thống không hợp lệ",parsed.error.flatten());const client=await pool.connect();try{await client.query("BEGIN");for(const[key,value]of Object.entries(parsed.data))await client.query(`INSERT INTO system_settings(key,value,updated_by,updated_at) VALUES($1,$2,$3,NOW()) ON CONFLICT(key) DO UPDATE SET value=EXCLUDED.value,updated_by=EXCLUDED.updated_by,updated_at=NOW()`,[key,JSON.stringify(value),identity(req)!.userId]);await client.query("COMMIT");ok(res,{updated:true})}catch(e){await client.query("ROLLBACK");throw e}finally{client.release()}}));

const profileDto = (row: any) => ({ id: row.id, name: row.name, avatarUrl: row.avatar_url, isKids: row.is_kids, maturityLevel: row.maturity_level });

async function userDto(userId: string) {
  const result = await pool.query("SELECT id,email,display_name,role,subscription_tier,status FROM users WHERE id=$1", [userId]);
  if (!result.rowCount) return null;
  const profiles = await pool.query("SELECT * FROM profiles WHERE user_id=$1 ORDER BY created_at", [userId]);
  const user = result.rows[0];
  return { id: user.id, email: user.email, displayName: user.display_name, role: user.role, subscriptionTier: user.subscription_tier, status: user.status, profiles: profiles.rows.map(profileDto) };
}

async function createTokens(user: any, profileId: string, req: express.Request) {
  const setting=(await pool.query("SELECT value FROM system_settings WHERE key='max_concurrent_devices'")).rows[0];
  const maxDevices=Math.min(20,Math.max(1,Number(setting?.value??3)));
  await pool.query(`UPDATE sessions SET revoked_at=NOW() WHERE id IN (SELECT id FROM sessions WHERE user_id=$1 AND revoked_at IS NULL AND expires_at>NOW() ORDER BY last_seen_at DESC OFFSET $2)`,[user.id,maxDevices-1]);
  const sessionId = `ses_${nanoid(20)}`;
  const refreshToken = opaqueToken();
  const accessToken = signJwt({ userId: user.id, profileId, role: user.role, sessionId });
  await pool.query(
    "INSERT INTO sessions(id,user_id,profile_id,refresh_token_hash,user_agent,ip_address,expires_at) VALUES($1,$2,$3,$4,$5,$6,NOW()+INTERVAL '30 days')",
    [sessionId, user.id, profileId, tokenHash(refreshToken), req.get("user-agent") ?? null, req.ip]
  );
  return { accessToken, refreshToken };
}

app.post("/v1/auth/register", asyncHandler(async (req, res) => {
  const parsed = z.object({ email: z.string().email(), password: z.string().min(10).max(128), displayName: z.string().trim().min(2).max(80) }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Email, display name and a password of at least 10 characters are required", parsed.error.flatten());
  const email = parsed.data.email.toLowerCase();
  if ((await pool.query("SELECT 1 FROM users WHERE email=$1", [email])).rowCount) return fail(res, 409, "EMAIL_EXISTS", "Email is already registered");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const userId = `usr_${nanoid(16)}`;
    const profileId = `pro_${nanoid(16)}`;
    await client.query("INSERT INTO users(id,email,password_hash,display_name) VALUES($1,$2,$3,$4)", [userId, email, await hashPassword(parsed.data.password), parsed.data.displayName]);
    await client.query("INSERT INTO profiles(id,user_id,name,avatar_url,is_kids,maturity_level) VALUES($1,$2,$3,$4,FALSE,18)", [profileId, userId, parsed.data.displayName.split(/\s+/).at(-1), "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=160&q=80"]);
    await client.query("COMMIT");
    const user = await userDto(userId);
    const tokens = await createTokens(user, profileId, req);
    void emitAnalytics({type:"user.registered"});
    ok(res, { ...tokens, user }, null, 201);
  } catch (error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}));

app.post("/v1/auth/login", asyncHandler(async (req, res) => {
  const parsed = z.object({ email: z.string().email(), password: z.string().min(1) }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Email and password are required");
  const found = await pool.query("SELECT * FROM users WHERE email=$1", [parsed.data.email.toLowerCase()]);
  const user = found.rows[0];
  if (!user || !(await verifyPassword(parsed.data.password, user.password_hash))) return fail(res, 401, "INVALID_CREDENTIALS", "Email or password is incorrect");
  if (user.status !== "active") return fail(res, 403, "ACCOUNT_SUSPENDED", "This account is suspended");
  const profiles = await pool.query("SELECT id FROM profiles WHERE user_id=$1 ORDER BY created_at LIMIT 1", [user.id]);
  const tokens = await createTokens(user, profiles.rows[0].id, req);
  await pool.query("UPDATE users SET last_login_at=NOW() WHERE id=$1", [user.id]);
  ok(res, { ...tokens, user: await userDto(user.id) });
}));

app.post("/v1/auth/refresh", asyncHandler(async (req, res) => {
  const parsed = z.object({ refreshToken: z.string().min(20) }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "refreshToken is required");
  const found = await pool.query(`SELECT s.*,u.role,u.status FROM sessions s JOIN users u ON u.id=s.user_id WHERE refresh_token_hash=$1 AND revoked_at IS NULL AND expires_at>NOW()`, [tokenHash(parsed.data.refreshToken)]);
  const session = found.rows[0];
  if (!session || session.status !== "active") return fail(res, 401, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired");
  const nextRefresh = opaqueToken();
  await pool.query("UPDATE sessions SET refresh_token_hash=$1,last_seen_at=NOW() WHERE id=$2", [tokenHash(nextRefresh), session.id]);
  ok(res, { accessToken: signJwt({ userId: session.user_id, profileId: session.profile_id, role: session.role, sessionId: session.id }), refreshToken: nextRefresh });
}));

app.post("/v1/auth/logout", requireIdentity, asyncHandler(async (req, res) => {
  const sessionId = req.header("x-session-id");
  if (sessionId) await pool.query("UPDATE sessions SET revoked_at=NOW() WHERE id=$1", [sessionId]);
  ok(res, { loggedOut: true });
}));
app.post("/v1/auth/forgot-password",asyncHandler(async(req,res)=>{const parsed=z.object({email:z.string().email()}).safeParse(req.body);if(!parsed.success)return fail(res,400,"VALIDATION_ERROR","Email không hợp lệ");ok(res,{accepted:true,delivery:"manual",message:"Hãy liên hệ quản trị viên để nhận mã đặt lại mật khẩu sau khi xác minh tài khoản."})}));
app.post("/v1/auth/reset-password",asyncHandler(async(req,res)=>{const parsed=z.object({token:z.string().min(20),password:z.string().min(10).max(128)}).safeParse(req.body);if(!parsed.success)return fail(res,400,"VALIDATION_ERROR","Token hoặc mật khẩu mới không hợp lệ");const client=await pool.connect();try{await client.query("BEGIN");const reset=(await client.query("SELECT id,user_id FROM password_reset_tokens WHERE token_hash=$1 AND used_at IS NULL AND expires_at>NOW() FOR UPDATE",[tokenHash(parsed.data.token)])).rows[0];if(!reset){await client.query("ROLLBACK");return fail(res,400,"RESET_TOKEN_INVALID","Liên kết đặt lại mật khẩu không hợp lệ hoặc đã hết hạn")}await client.query("UPDATE users SET password_hash=$1,updated_at=NOW() WHERE id=$2",[await hashPassword(parsed.data.password),reset.user_id]);await client.query("UPDATE password_reset_tokens SET used_at=NOW() WHERE user_id=$1 AND used_at IS NULL",[reset.user_id]);await client.query("UPDATE sessions SET revoked_at=NOW() WHERE user_id=$1 AND revoked_at IS NULL",[reset.user_id]);await client.query("COMMIT");ok(res,{reset:true})}catch(error){await client.query("ROLLBACK");throw error}finally{client.release()}}));

app.get("/v1/users/me", requireIdentity, asyncHandler(async (req, res) => ok(res, await userDto(identity(req)!.userId))));
app.patch("/v1/users/me", requireIdentity, asyncHandler(async (req, res) => {
  const parsed = z.object({ displayName: z.string().trim().min(2).max(80) }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "A valid displayName is required");
  await pool.query("UPDATE users SET display_name=$1,updated_at=NOW() WHERE id=$2", [parsed.data.displayName, identity(req)!.userId]);
  ok(res, await userDto(identity(req)!.userId));
}));
app.patch("/v1/users/me/password",requireIdentity,asyncHandler(async(req,res)=>{const parsed=z.object({currentPassword:z.string().min(1),newPassword:z.string().min(10).max(128)}).safeParse(req.body);if(!parsed.success)return fail(res,400,"VALIDATION_ERROR","Mật khẩu mới phải có ít nhất 10 ký tự");const owner=identity(req)!;const user=(await pool.query("SELECT password_hash FROM users WHERE id=$1",[owner.userId])).rows[0];if(!user||!(await verifyPassword(parsed.data.currentPassword,user.password_hash)))return fail(res,400,"CURRENT_PASSWORD_INVALID","Mật khẩu hiện tại không đúng");if(await verifyPassword(parsed.data.newPassword,user.password_hash))return fail(res,409,"PASSWORD_REUSED","Mật khẩu mới phải khác mật khẩu hiện tại");await pool.query("UPDATE users SET password_hash=$1,updated_at=NOW() WHERE id=$2",[await hashPassword(parsed.data.newPassword),owner.userId]);await pool.query("UPDATE sessions SET revoked_at=NOW() WHERE user_id=$1 AND id<>$2 AND revoked_at IS NULL",[owner.userId,owner.sessionId]);ok(res,{changed:true})}));
app.get("/v1/users/me/sessions",requireIdentity,asyncHandler(async(req,res)=>{const owner=identity(req)!;const rows=await pool.query("SELECT id,user_agent,ip_address,last_seen_at,created_at,expires_at FROM sessions WHERE user_id=$1 AND revoked_at IS NULL AND expires_at>NOW() ORDER BY last_seen_at DESC",[owner.userId]);ok(res,rows.rows.map(row=>({id:row.id,userAgent:row.user_agent,ipAddress:row.ip_address,lastSeenAt:row.last_seen_at,createdAt:row.created_at,expiresAt:row.expires_at,current:row.id===owner.sessionId})))}));
app.delete("/v1/users/me/sessions/:id",requireIdentity,asyncHandler(async(req,res)=>{const owner=identity(req)!;if(req.params.id===owner.sessionId)return fail(res,409,"CURRENT_SESSION","Hãy dùng chức năng đăng xuất để đóng phiên hiện tại");const row=(await pool.query("UPDATE sessions SET revoked_at=NOW() WHERE id=$1 AND user_id=$2 AND revoked_at IS NULL RETURNING id",[req.params.id,owner.userId])).rows[0];if(!row)return fail(res,404,"SESSION_NOT_FOUND","Không tìm thấy phiên đăng nhập");ok(res,{revoked:row.id})}));
app.delete("/v1/users/me/sessions",requireIdentity,asyncHandler(async(req,res)=>{const owner=identity(req)!;const result=await pool.query("UPDATE sessions SET revoked_at=NOW() WHERE user_id=$1 AND id<>$2 AND revoked_at IS NULL",[owner.userId,owner.sessionId]);ok(res,{revoked:result.rowCount??0})}));
app.get("/v1/users/me/profiles", requireIdentity, asyncHandler(async (req, res) => {
  const result = await pool.query("SELECT * FROM profiles WHERE user_id=$1 ORDER BY created_at", [identity(req)!.userId]);
  ok(res, result.rows.map(profileDto));
}));
app.post("/v1/users/me/profiles", requireIdentity, asyncHandler(async (req, res) => {
  const parsed = z.object({ name: z.string().trim().min(1).max(40), avatarUrl: z.string().url().optional(), isKids: z.boolean().default(false) }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Invalid profile data", parsed.error.flatten());
  const owner = identity(req)!;
  const count = await pool.query("SELECT COUNT(*)::int count FROM profiles WHERE user_id=$1", [owner.userId]);
  const max = (await pool.query("SELECT subscription_tier FROM users WHERE id=$1", [owner.userId])).rows[0].subscription_tier === "Premium" ? 5 : 2;
  if (count.rows[0].count >= max) return fail(res, 409, "PROFILE_LIMIT", `Your current plan supports up to ${max} profiles`);
  const id = `pro_${nanoid(16)}`;
  const result = await pool.query("INSERT INTO profiles(id,user_id,name,avatar_url,is_kids,maturity_level) VALUES($1,$2,$3,$4,$5,$6) RETURNING *", [id,owner.userId,parsed.data.name,parsed.data.avatarUrl ?? "https://images.unsplash.com/photo-1527980965255-d3b416303d12?auto=format&fit=crop&w=160&q=80",parsed.data.isKids,parsed.data.isKids?12:18]);
  ok(res, profileDto(result.rows[0]), null, 201);
}));
app.patch("/v1/users/me/profiles/:id",requireIdentity,asyncHandler(async(req,res)=>{const parsed=z.object({name:z.string().trim().min(1).max(40),avatarUrl:z.string().url(),isKids:z.boolean(),maturityLevel:z.number().int().min(0).max(18)}).partial().safeParse(req.body);if(!parsed.success||!Object.keys(parsed.data).length)return fail(res,400,"VALIDATION_ERROR","Thông tin hồ sơ không hợp lệ");const p=parsed.data,row=(await pool.query("UPDATE profiles SET name=COALESCE($1,name),avatar_url=COALESCE($2,avatar_url),is_kids=COALESCE($3,is_kids),maturity_level=COALESCE($4,maturity_level) WHERE id=$5 AND user_id=$6 RETURNING *",[p.name,p.avatarUrl,p.isKids,p.maturityLevel,req.params.id,identity(req)!.userId])).rows[0];if(!row)return fail(res,404,"PROFILE_NOT_FOUND","Không tìm thấy hồ sơ");ok(res,profileDto(row))}));
app.delete("/v1/users/me/profiles/:id",requireIdentity,asyncHandler(async(req,res)=>{const owner=identity(req)!;const count=Number((await pool.query("SELECT COUNT(*) count FROM profiles WHERE user_id=$1",[owner.userId])).rows[0].count);if(count<=1)return fail(res,409,"LAST_PROFILE","Tài khoản phải có ít nhất một hồ sơ");const row=(await pool.query("DELETE FROM profiles WHERE id=$1 AND user_id=$2 RETURNING id",[req.params.id,owner.userId])).rows[0];if(!row)return fail(res,404,"PROFILE_NOT_FOUND","Không tìm thấy hồ sơ");ok(res,{deleted:row.id})}));
app.post("/v1/users/me/active-profile", requireIdentity, asyncHandler(async (req, res) => {
  const parsed = z.object({ profileId: z.string() }).safeParse(req.body);
  if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "profileId is required");
  const owner = identity(req)!;
  if (!(await pool.query("SELECT 1 FROM profiles WHERE id=$1 AND user_id=$2", [parsed.data.profileId,owner.userId])).rowCount) return fail(res,404,"PROFILE_NOT_FOUND","Profile not found");
  const sessionId = req.header("x-session-id");
  if (sessionId) await pool.query("UPDATE sessions SET profile_id=$1 WHERE id=$2", [parsed.data.profileId,sessionId]);
  ok(res, { activeProfileId: parsed.data.profileId, accessToken: signJwt({ userId: owner.userId, profileId: parsed.data.profileId, role: owner.role, sessionId: sessionId ?? "profile-switch" }) });
}));

app.use(errorMiddleware);
app.listen(Number(process.env.PORT ?? 4101), () => console.log("identity-service listening"));
