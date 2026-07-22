import "dotenv/config";
import express from "express";
import { z } from "zod";
import {
  asyncHandler,
  createPool,
  errorMiddleware,
  fail,
  health,
  identity,
  ok,
  requireAdmin,
} from "@movie-platform/service-kit";
const app = express(),
  pool = createPool("analytics_db");
app.use(express.json());
app.get("/health", health("analytics-service", pool)); // Service runtime.
app.get(
  "/v1/admin/stats/overview",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const totals = (
      await pool.query(
        `SELECT COALESCE(SUM(new_users),0)::int total_users,COALESCE(SUM(total_views),0)::bigint total_views,COALESCE(SUM(total_revenue),0)::numeric revenue,COALESCE(SUM(watch_minutes),0)::bigint watch_minutes FROM daily_platform_stats`,
      )
    ).rows[0];
    const top = await pool.query(
      "SELECT content_id,title,view_count,completion_rate FROM content_performance ORDER BY view_count DESC LIMIT 6",
    );
    const trend = await pool.query(
      "SELECT stat_date,new_users,total_views,total_revenue FROM daily_platform_stats ORDER BY stat_date DESC LIMIT 14",
    );
    ok(res, {
      totalUsers: totals.total_users,
      totalViews: Number(totals.total_views),
      revenue: Number(totals.revenue),
      watchMinutes: Number(totals.watch_minutes),
      topContent: top.rows.map((r) => ({
        contentId: r.content_id,
        title: r.title,
        views: r.view_count,
        completionRate: Number(r.completion_rate),
      })),
      trend: trend.rows.reverse(),
    });
  }),
);
app.post(
  "/internal/events",
  asyncHandler(async (req, res) => {
    if (
      req.header("x-internal-secret") !==
      (process.env.INTERNAL_SECRET ?? "local-internal-secret")
    )
      return fail(res, 401, "UNAUTHORIZED", "Invalid internal secret");
    const parsed = z
      .object({
        type: z.enum([
          "user.registered",
          "content.viewed",
          "subscription.paid",
        ]),
        contentId: z.string().optional(),
        title: z.string().optional(),
        amount: z.number().optional(),
        watchMinutes: z.number().optional(),
        completionRate: z.number().optional(),
      })
      .safeParse(req.body);
    if (!parsed.success)
      return fail(res, 400, "VALIDATION_ERROR", "Invalid analytics event");
    const e = parsed.data;
    if (e.type === "user.registered")
      await pool.query(
        "INSERT INTO daily_platform_stats(stat_date,new_users) VALUES(CURRENT_DATE,1) ON CONFLICT(stat_date) DO UPDATE SET new_users=daily_platform_stats.new_users+1",
      );
    if (e.type === "content.viewed" && e.contentId) {
      await pool.query(
        "INSERT INTO daily_platform_stats(stat_date,total_views,watch_minutes) VALUES(CURRENT_DATE,1,$1) ON CONFLICT(stat_date) DO UPDATE SET total_views=daily_platform_stats.total_views+1,watch_minutes=daily_platform_stats.watch_minutes+$1",
        [e.watchMinutes ?? 0],
      );
      await pool.query(
        `INSERT INTO content_performance(content_id,title,view_count,completion_rate) VALUES($1,$2,1,$3) ON CONFLICT(content_id) DO UPDATE SET view_count=content_performance.view_count+1,title=EXCLUDED.title,completion_rate=(content_performance.completion_rate+EXCLUDED.completion_rate)/2`,
        [e.contentId, e.title ?? e.contentId, e.completionRate ?? 0],
      );
      await pool.query(`INSERT INTO daily_content_stats(stat_date,content_id,title,view_count,watch_minutes,completion_sum) VALUES(CURRENT_DATE,$1,$2,1,$3,$4) ON CONFLICT(stat_date,content_id) DO UPDATE SET view_count=daily_content_stats.view_count+1,watch_minutes=daily_content_stats.watch_minutes+EXCLUDED.watch_minutes,completion_sum=daily_content_stats.completion_sum+EXCLUDED.completion_sum,title=EXCLUDED.title`,[e.contentId,e.title??e.contentId,e.watchMinutes??0,e.completionRate??0]);
    }
    if (e.type === "subscription.paid")
      await pool.query(
        "INSERT INTO daily_platform_stats(stat_date,total_revenue) VALUES(CURRENT_DATE,$1) ON CONFLICT(stat_date) DO UPDATE SET total_revenue=daily_platform_stats.total_revenue+$1",
        [e.amount ?? 0],
      );
    ok(res, { accepted: true }, null, 202);
  }),
);
app.post(
  "/v1/admin/audit",
  requireAdmin,
  asyncHandler(async (req, res) => {
    await pool.query(
      "INSERT INTO admin_audit_logs(admin_user_id,action,target_type,target_id,metadata) VALUES($1,$2,$3,$4,$5)",
      [
        identity(req)!.userId,
        String(req.body.action ?? "UNKNOWN"),
        req.body.targetType ?? null,
        req.body.targetId ?? null,
        req.body.metadata ?? {},
      ],
    );
    ok(res, { recorded: true }, null, 201);
  }),
);
app.get("/v1/admin/reports",requireAdmin,asyncHandler(async(req,res)=>{const days=Math.min(365,Math.max(7,Number(req.query.days)||30));const daily=await pool.query(`SELECT stat_date,new_users,total_views,watch_minutes,total_revenue,new_subscriptions,cancelled_subscriptions FROM daily_platform_stats WHERE stat_date>=CURRENT_DATE-$1::int ORDER BY stat_date`,[days-1]);const totals=(await pool.query(`SELECT COALESCE(SUM(new_users),0)::int users,COALESCE(SUM(total_views),0)::bigint views,COALESCE(SUM(watch_minutes),0)::bigint watch_minutes,COALESCE(SUM(total_revenue),0)::numeric revenue FROM daily_platform_stats WHERE stat_date>=CURRENT_DATE-$1::int`,[days-1])).rows[0];const top=await pool.query(`SELECT content_id,MAX(title) title,SUM(view_count)::bigint view_count,CASE WHEN SUM(view_count)>0 THEN ROUND(SUM(completion_sum)/SUM(view_count),1) ELSE 0 END completion_rate FROM daily_content_stats WHERE stat_date>=CURRENT_DATE-$1::int GROUP BY content_id ORDER BY view_count DESC LIMIT 10`,[days-1]);ok(res,{days,totals:{users:totals.users,views:Number(totals.views),watchMinutes:Number(totals.watch_minutes),revenue:Number(totals.revenue)},daily:daily.rows.map(r=>({...r,total_revenue:Number(r.total_revenue)})),topContent:top.rows.map(r=>({contentId:r.content_id,title:r.title,views:Number(r.view_count),completionRate:Number(r.completion_rate)}))})}));
app.use(errorMiddleware);
app.listen(Number(process.env.PORT ?? 4107), () =>
  console.log("analytics-service listening"),
);
