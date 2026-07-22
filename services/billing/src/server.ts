import "dotenv/config";
import express from "express";
import { nanoid } from "nanoid";
import { z } from "zod";
import {
  asyncHandler,
  createPool,
  errorMiddleware,
  fail,
  health,
  identity,
  ok,
  requireIdentity,
  requireRoles,
} from "@movie-platform/service-kit";
const app = express(),
  pool = createPool("billing_db");
app.use(express.json());
async function initializeBillingSchema(){await pool.query(`ALTER TABLE plans ADD COLUMN IF NOT EXISTS billing_interval varchar(10) NOT NULL DEFAULT 'month';ALTER TABLE plans ADD COLUMN IF NOT EXISTS max_concurrent_streams smallint NOT NULL DEFAULT 1;ALTER TABLE plans ADD COLUMN IF NOT EXISTS has_ads boolean NOT NULL DEFAULT false;ALTER TABLE plans ADD COLUMN IF NOT EXISTS download_limit smallint NOT NULL DEFAULT 0;CREATE TABLE IF NOT EXISTS invoice_admin_actions(id bigserial PRIMARY KEY,invoice_id varchar(40) NOT NULL REFERENCES invoices(id),admin_user_id varchar(40) NOT NULL,previous_status varchar(20) NOT NULL,next_status varchar(20) NOT NULL,reason text,created_at timestamptz NOT NULL DEFAULT now());CREATE INDEX IF NOT EXISTS invoice_admin_actions_invoice_idx ON invoice_admin_actions(invoice_id,created_at DESC)`)}
app.get("/health", health("billing-service", pool)); // Service runtime.
const analyticsUrl = process.env.ANALYTICS_URL ?? "http://localhost:4107";
const emitAnalytics = (body: Record<string, unknown>) =>
  fetch(`${analyticsUrl}/internal/events`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-internal-secret":
        process.env.INTERNAL_SECRET ?? "local-internal-secret",
    },
    body: JSON.stringify(body),
  }).catch(() => null);
app.get(
  "/v1/billing/plans",
  asyncHandler(async (_q, res) => {
    const rows = await pool.query(
      "SELECT * FROM plans WHERE is_active=TRUE ORDER BY price_amount",
    );
    ok(
      res,
      rows.rows.map((r) => ({
        id: r.id,
        code: r.code,
        name: r.name,
        price: Number(r.price_amount),
        currency: r.currency,
        maxProfiles: r.max_profiles,
        maxConcurrentStreams: r.max_concurrent_streams,
        maxQuality: r.max_quality,
        hasAds: r.has_ads,
        allowDownload: r.allow_download,
        downloadLimit: r.download_limit,
        billingInterval: r.billing_interval,
        features: r.features,
      })),
    );
  }),
);
app.get(
  "/v1/billing/subscription",
  requireIdentity,
  asyncHandler(async (req, res) => {
    const row = (
      await pool.query(
        `SELECT s.*,p.code,p.name,p.price_amount FROM subscriptions s JOIN plans p ON p.id=s.plan_id WHERE s.user_id=$1 ORDER BY s.created_at DESC LIMIT 1`,
        [identity(req)!.userId],
      )
    ).rows[0];
    ok(
      res,
      row
        ? {
            id: row.id,
            plan: row.name,
            planCode: row.code,
            status: row.status,
            currentPeriodEnd: row.current_period_end,
            cancelAtPeriodEnd: row.cancel_at_period_end,
            price: Number(row.price_amount),
          }
        : null,
    );
  }),
);
app.post(
  "/v1/billing/subscribe",
  requireIdentity,
  asyncHandler(async (req, res) => {
    const parsed = z
      .object({
        planId: z.string(),
        paymentMethod: z.enum(["demo", "vnpay", "momo"]).default("demo"),
      })
      .safeParse(req.body);
    if (!parsed.success)
      return fail(
        res,
        400,
        "VALIDATION_ERROR",
        "planId and paymentMethod are required",
      );
    const plan = (
      await pool.query("SELECT * FROM plans WHERE id=$1 AND is_active=TRUE", [
        parsed.data.planId,
      ])
    ).rows[0];
    if (!plan) return fail(res, 404, "PLAN_NOT_FOUND", "Plan not found");
    const client = await pool.connect();
    try {
      await client.query("BEGIN");
      await client.query(
        "UPDATE subscriptions SET status='cancelled',updated_at=NOW() WHERE user_id=$1 AND status='active'",
        [identity(req)!.userId],
      );
      const subId = `sub_${nanoid(16)}`,
        invoiceId = `inv_${nanoid(16)}`;
      await client.query(
        `INSERT INTO subscriptions(id,user_id,plan_id,status,current_period_end) VALUES($1,$2,$3,'active',NOW()+CASE WHEN $4='year' THEN INTERVAL '1 year' ELSE INTERVAL '1 month' END)`,
        [subId, identity(req)!.userId, plan.id,plan.billing_interval],
      );
      await client.query(
        "INSERT INTO invoices(id,subscription_id,user_id,amount,currency,status,provider,provider_transaction_id,paid_at) VALUES($1,$2,$3,$4,$5,'success',$6,$7,NOW())",
        [
          invoiceId,
          subId,
          identity(req)!.userId,
          plan.price_amount,
          plan.currency,
          parsed.data.paymentMethod,
          `demo_${nanoid(12)}`,
        ],
      );
      await client.query("COMMIT");
      void emitAnalytics({
        type: "subscription.paid",
        amount: Number(plan.price_amount),
      });
      ok(
        res,
        { subscriptionId: subId, invoiceId, status: "active", plan: plan.name },
        null,
        201,
      );
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    } finally {
      client.release();
    }
  }),
);
app.post(
  "/v1/billing/cancel",
  requireIdentity,
  asyncHandler(async (req, res) => {
    const row = (
      await pool.query(
        "UPDATE subscriptions SET cancel_at_period_end=TRUE,updated_at=NOW() WHERE user_id=$1 AND status='active' RETURNING current_period_end",
        [identity(req)!.userId],
      )
    ).rows[0];
    if (!row)
      return fail(res, 404, "SUBSCRIPTION_NOT_FOUND", "No active subscription");
    ok(res, {
      cancelAtPeriodEnd: true,
      currentPeriodEnd: row.current_period_end,
    });
  }),
);
app.get(
  "/v1/billing/invoices",
  requireIdentity,
  asyncHandler(async (req, res) => {
    const rows = await pool.query(
      "SELECT id,amount,currency,status,provider,issued_at,paid_at FROM invoices WHERE user_id=$1 ORDER BY issued_at DESC",
      [identity(req)!.userId],
    );
    ok(
      res,
      rows.rows.map((r) => ({ ...r, amount: Number(r.amount) })),
    );
  }),
);
const planInput=z.object({name:z.string().trim().min(2).max(80),price:z.number().min(0),billingInterval:z.enum(["month","year"]).default("month"),maxProfiles:z.number().int().min(1).max(10),maxConcurrentStreams:z.number().int().min(1).max(10),maxQuality:z.enum(["720p","1080p","2K","4K"]),hasAds:z.boolean().default(false),allowDownload:z.boolean(),downloadLimit:z.number().int().min(0).max(100),features:z.array(z.string().trim().min(1).max(120)).max(20).default([]),isActive:z.boolean().default(false)});
app.get("/v1/admin/billing/summary",requireRoles("super_admin"),asyncHandler(async(_req,res)=>{const r=(await pool.query(`SELECT (SELECT COUNT(*) FROM subscriptions WHERE status='active')::int active_subscriptions,(SELECT COUNT(*) FROM subscriptions WHERE cancel_at_period_end=TRUE AND status='active')::int cancelling,(SELECT COALESCE(SUM(amount),0) FROM invoices WHERE status='success' AND paid_at>=date_trunc('month',NOW())) monthly_revenue,(SELECT COUNT(*) FROM invoices WHERE status='failed')::int failed_payments`)).rows[0];ok(res,{activeSubscriptions:r.active_subscriptions,cancelling:r.cancelling,monthlyRevenue:Number(r.monthly_revenue),failedPayments:r.failed_payments})}));
app.get("/v1/admin/billing/plans",requireRoles("super_admin"),asyncHandler(async(_req,res)=>{const rows=await pool.query(`SELECT p.*,COUNT(s.id) FILTER(WHERE s.status='active')::int active_subscribers FROM plans p LEFT JOIN subscriptions s ON s.plan_id=p.id GROUP BY p.id ORDER BY p.price_amount`);ok(res,rows.rows.map(r=>({id:r.id,code:r.code,name:r.name,price:Number(r.price_amount),currency:r.currency,billingInterval:r.billing_interval,maxProfiles:r.max_profiles,maxConcurrentStreams:r.max_concurrent_streams,maxQuality:r.max_quality,hasAds:r.has_ads,allowDownload:r.allow_download,downloadLimit:r.download_limit,features:r.features,isActive:r.is_active,activeSubscribers:r.active_subscribers})))}));
app.post("/v1/admin/billing/plans",requireRoles("super_admin"),asyncHandler(async(req,res)=>{const parsed=planInput.safeParse(req.body);if(!parsed.success)return fail(res,400,"VALIDATION_ERROR","Thông tin gói không hợp lệ",parsed.error.flatten());const p=parsed.data;const base=p.name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/đ/g,"d").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,16)||"custom";let code=base,suffix=1;while((await pool.query("SELECT 1 FROM plans WHERE code=$1",[code])).rowCount)code=`${base.slice(0,14)}-${++suffix}`;const id=`plan-${code}`;await pool.query(`INSERT INTO plans(id,code,name,price_amount,billing_interval,max_profiles,max_concurrent_streams,max_quality,has_ads,allow_download,download_limit,features,is_active) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)`,[id,code,p.name,p.price,p.billingInterval,p.maxProfiles,p.maxConcurrentStreams,p.maxQuality,p.hasAds,p.allowDownload,p.allowDownload?p.downloadLimit:0,JSON.stringify(p.features),p.isActive]);ok(res,{id,code},null,201)}));
app.patch("/v1/admin/billing/plans/:id",requireRoles("super_admin"),asyncHandler(async(req,res)=>{const parsed=planInput.partial().safeParse(req.body);if(!parsed.success)return fail(res,400,"VALIDATION_ERROR","Thông tin gói không hợp lệ",parsed.error.flatten());const p=parsed.data,row=(await pool.query(`UPDATE plans SET name=COALESCE($1,name),price_amount=COALESCE($2,price_amount),billing_interval=COALESCE($3,billing_interval),max_profiles=COALESCE($4,max_profiles),max_concurrent_streams=COALESCE($5,max_concurrent_streams),max_quality=COALESCE($6,max_quality),has_ads=COALESCE($7,has_ads),allow_download=COALESCE($8,allow_download),download_limit=COALESCE($9,download_limit),features=COALESCE($10,features),is_active=COALESCE($11,is_active) WHERE id=$12 RETURNING id`,[p.name,p.price,p.billingInterval,p.maxProfiles,p.maxConcurrentStreams,p.maxQuality,p.hasAds,p.allowDownload,p.downloadLimit,p.features?JSON.stringify(p.features):null,p.isActive,req.params.id])).rows[0];if(!row)return fail(res,404,"PLAN_NOT_FOUND","Không tìm thấy gói");ok(res,row)}));
app.get("/v1/admin/billing/invoices",requireRoles("super_admin"),asyncHandler(async(req,res)=>{const page=Math.max(1,Number(req.query.page)||1),limit=Math.min(100,Math.max(1,Number(req.query.limit)||25)),status=String(req.query.status??""),provider=String(req.query.provider??""),q=String(req.query.q??"").trim(),params:any[]=[],where:string[]=[];if(status){params.push(status);where.push(`i.status=$${params.length}`)}if(provider){params.push(provider);where.push(`i.provider=$${params.length}`)}if(q){params.push(`%${q}%`);where.push(`(i.id ILIKE $${params.length} OR i.user_id ILIKE $${params.length} OR i.provider_transaction_id ILIKE $${params.length})`)}const clause=where.length?`WHERE ${where.join(" AND ")}`:"",total=Number((await pool.query(`SELECT COUNT(*) count FROM invoices i ${clause}`,params)).rows[0].count);params.push(limit,(page-1)*limit);const rows=await pool.query(`SELECT i.*,p.name plan_name FROM invoices i JOIN subscriptions s ON s.id=i.subscription_id JOIN plans p ON p.id=s.plan_id ${clause} ORDER BY i.issued_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`,params);ok(res,{items:rows.rows.map(r=>({id:r.id,userId:r.user_id,planName:r.plan_name,amount:Number(r.amount),currency:r.currency,status:r.status,provider:r.provider,transactionId:r.provider_transaction_id,issuedAt:r.issued_at,paidAt:r.paid_at})),pagination:{page,limit,total,totalPages:Math.ceil(total/limit)}})}));
app.get("/v1/admin/billing/invoices/:id",requireRoles("super_admin"),asyncHandler(async(req,res)=>{const invoice=(await pool.query(`SELECT i.*,p.name plan_name,s.status subscription_status,s.current_period_start,s.current_period_end FROM invoices i JOIN subscriptions s ON s.id=i.subscription_id JOIN plans p ON p.id=s.plan_id WHERE i.id=$1`,[req.params.id])).rows[0];if(!invoice)return fail(res,404,"INVOICE_NOT_FOUND","Không tìm thấy hóa đơn");const actions=await pool.query(`SELECT admin_user_id,previous_status,next_status,reason,created_at FROM invoice_admin_actions WHERE invoice_id=$1 ORDER BY created_at DESC`,[req.params.id]);ok(res,{id:invoice.id,userId:invoice.user_id,subscriptionId:invoice.subscription_id,subscriptionStatus:invoice.subscription_status,periodStart:invoice.current_period_start,periodEnd:invoice.current_period_end,planName:invoice.plan_name,amount:Number(invoice.amount),currency:invoice.currency,status:invoice.status,provider:invoice.provider,transactionId:invoice.provider_transaction_id,issuedAt:invoice.issued_at,paidAt:invoice.paid_at,actions:actions.rows.map(a=>({adminUserId:a.admin_user_id,previousStatus:a.previous_status,nextStatus:a.next_status,reason:a.reason,createdAt:a.created_at}))})}));
app.patch("/v1/admin/billing/invoices/:id/status",requireRoles("super_admin"),asyncHandler(async(req,res)=>{const parsed=z.object({status:z.enum(["pending","success","failed","refunded"]),reason:z.string().trim().max(500).default("")}).safeParse(req.body);if(!parsed.success)return fail(res,400,"VALIDATION_ERROR","Trạng thái hoặc lý do không hợp lệ");const client=await pool.connect();try{await client.query("BEGIN");const invoice=(await client.query("SELECT id,status FROM invoices WHERE id=$1 FOR UPDATE",[req.params.id])).rows[0];if(!invoice){await client.query("ROLLBACK");return fail(res,404,"INVOICE_NOT_FOUND","Không tìm thấy hóa đơn")}const allowed:Record<string,string[]>={pending:["success","failed"],failed:["pending"],success:["refunded"],refunded:[]};if(!allowed[invoice.status]?.includes(parsed.data.status)){await client.query("ROLLBACK");return fail(res,409,"INVALID_STATUS_TRANSITION",`Không thể chuyển từ ${invoice.status} sang ${parsed.data.status}`)}if(["failed","refunded"].includes(parsed.data.status)&&parsed.data.reason.length<3){await client.query("ROLLBACK");return fail(res,400,"REASON_REQUIRED","Vui lòng nhập lý do ít nhất 3 ký tự")}await client.query("UPDATE invoices SET status=$1,paid_at=CASE WHEN $1='success' THEN COALESCE(paid_at,NOW()) ELSE paid_at END WHERE id=$2",[parsed.data.status,req.params.id]);await client.query("INSERT INTO invoice_admin_actions(invoice_id,admin_user_id,previous_status,next_status,reason) VALUES($1,$2,$3,$4,$5)",[req.params.id,identity(req)!.userId,invoice.status,parsed.data.status,parsed.data.reason||null]);await client.query("COMMIT");ok(res,{id:req.params.id,status:parsed.data.status})}catch(error){await client.query("ROLLBACK");throw error}finally{client.release()}}));
app.use(errorMiddleware);
initializeBillingSchema().then(()=>app.listen(Number(process.env.PORT ?? 4105), () => console.log("billing-service listening"))).catch(error=>{console.error("Billing schema initialization failed",error);process.exitCode=1});
