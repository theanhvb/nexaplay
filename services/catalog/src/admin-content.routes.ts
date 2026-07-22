import { Router } from "express";
import { nanoid } from "nanoid";
import { z } from "zod";
import { catalogPrisma } from "@movie-platform/database/catalog";
import { asyncHandler, fail, identity, ok, requireRoles } from "@movie-platform/service-kit";
import { LocalStorageProvider } from "./storage/local-storage.provider.js";

const router = Router();
const editors = requireRoles("super_admin", "content_editor");
const storage = new LocalStorageProvider();
const serialize = <T>(value: T): T => JSON.parse(JSON.stringify(value, (_key, item) => typeof item === "bigint" ? Number(item) : item));
const slugify = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

const contentInput = z.object({
  title: z.string().trim().min(1).max(255), originalTitle: z.string().trim().max(255).default(""),
  slug: z.string().trim().max(180).optional(), description: z.string().trim().min(10), shortDescription: z.string().trim().max(500).optional().nullable(),
  releaseYear: z.number().int().min(1888).max(2200), durationMinutes: z.number().int().min(1), ageRating: z.string().trim().min(1).max(10),
  contentType: z.enum(["movie", "series"]), country: z.string().trim().max(100).optional().nullable(), language: z.string().trim().max(80).optional().nullable(),
  status: z.enum(["draft", "processing", "scheduled", "published", "archived"]).default("draft"),
  posterUrl: z.string().url(), backdropUrl: z.string().url(), trailerUrl: z.string().url().or(z.literal("")),
  director: z.string().trim().max(150).default("Đang cập nhật"), genres: z.array(z.string()).default([]), cast: z.array(z.string()).default([]),
  isTrending: z.boolean().default(false), isFeatured: z.boolean().default(false), scheduledPublishAt: z.string().datetime().optional().nullable(),
  seoTitle: z.string().max(255).optional().nullable(), seoDescription: z.string().optional().nullable(), seoKeywords: z.array(z.string()).default([])
});
const seasonInput = z.object({ number: z.number().int().positive(), title: z.string().max(255).optional(), description: z.string().optional(), posterUrl: z.string().url().optional(), position: z.number().int().min(0).default(0) });
const episodeInput = z.object({ number: z.number().int().positive(), title: z.string().min(1).max(255), slug: z.string().max(180).optional(), description: z.string().optional(), durationMinutes: z.number().int().positive().optional(), thumbnailUrl: z.string().url().optional(), status: z.enum(["draft", "processing", "scheduled", "published", "archived"]).default("draft"), position: z.number().int().min(0).default(0), scheduledPublishAt: z.string().datetime().optional().nullable() });

router.use(requireRoles("super_admin", "content_editor", "support"));
router.get("/", asyncHandler(async (req, res) => {
  const page = Math.max(1, Number(req.query.page) || 1), limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
  const search = String(req.query.search ?? "").trim(), status = String(req.query.status ?? ""), type = String(req.query.type ?? "");
  const where = { deletedAt: null, ...(search ? { OR: [{ title: { contains: search, mode: "insensitive" as const } }, { originalTitle: { contains: search, mode: "insensitive" as const } }] } : {}), ...(status ? { status } : {}), ...(type ? { contentType: type } : {}) };
  const [items, total] = await catalogPrisma.$transaction([catalogPrisma.movie.findMany({ where, orderBy: { updatedAt: "desc" }, skip: (page - 1) * limit, take: limit, include: { _count: { select: { seasons: true, media: true } } } }), catalogPrisma.movie.count({ where })]);
  ok(res, serialize({ items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } }));
}));

router.get("/:id", asyncHandler(async (req, res) => {
  const item = await catalogPrisma.movie.findFirst({ where: { id: req.params.id, deletedAt: null }, include: { seasons: { orderBy: { position: "asc" }, include: { episodes: { orderBy: { position: "asc" }, include: { media: true, subtitles: true } } } }, media: true, subtitles: true, genres: { include: { genre: true } }, actors: { include: { actor: true } }, directors: { include: { director: true } }, tags: { include: { tag: true } } } });
  if (!item) return fail(res, 404, "CONTENT_NOT_FOUND", "Không tìm thấy nội dung");
  ok(res, serialize(item));
}));

router.post("/", editors, asyncHandler(async (req, res) => {
  const parsed = contentInput.safeParse(req.body); if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Dữ liệu nội dung không hợp lệ", parsed.error.flatten());
  const value = parsed.data, actor = identity(req)!; const slug = value.slug || slugify(value.title);
  const item = await catalogPrisma.movie.create({ data: { id: `mov_${nanoid(16)}`, title: value.title, slug, originalTitle: value.originalTitle, description: value.description, shortDescription: value.shortDescription, releaseYear: value.releaseYear, durationMinutes: value.durationMinutes, ageRating: value.ageRating, contentType: value.contentType, country: value.country, language: value.language, status: value.status, posterUrl: value.posterUrl, backdropUrl: value.backdropUrl, trailerUrl: value.trailerUrl, directorLegacy: value.director, genresLegacy: value.genres, castLegacy: value.cast, isTrending: value.isTrending, isFeatured: value.isFeatured, scheduledPublishAt: value.scheduledPublishAt ? new Date(value.scheduledPublishAt) : null, publishedAt: value.status === "published" ? new Date() : null, seoTitle: value.seoTitle, seoDescription: value.seoDescription, seoKeywords: value.seoKeywords, createdById: actor.userId, updatedById: actor.userId } });
  ok(res, serialize(item), null, 201);
}));

router.patch("/:id", editors, asyncHandler(async (req, res) => {
  const parsed = contentInput.partial().safeParse(req.body); if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Dữ liệu nội dung không hợp lệ", parsed.error.flatten());
  const value = parsed.data;
  const { director, genres, cast, scheduledPublishAt, ...fields } = value;
  const item = await catalogPrisma.movie.update({ where: { id: req.params.id }, data: { ...fields, directorLegacy: director, genresLegacy: genres, castLegacy: cast, scheduledPublishAt: scheduledPublishAt ? new Date(scheduledPublishAt) : scheduledPublishAt, ...(value.status === "published" ? { publishedAt: new Date() } : {}), updatedById: identity(req)!.userId } });
  ok(res, serialize(item));
}));

router.delete("/:id", requireRoles("super_admin"), asyncHandler(async (req, res) => { await catalogPrisma.movie.update({ where: { id: req.params.id }, data: { status: "archived", deletedAt: new Date(), updatedById: identity(req)!.userId } }); ok(res, { id: req.params.id, deleted: true }); }));
router.post("/:movieId/seasons", editors, asyncHandler(async (req, res) => { const parsed = seasonInput.safeParse(req.body); if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Mùa phim không hợp lệ", parsed.error.flatten()); const item = await catalogPrisma.season.create({ data: { id: `sea_${nanoid(16)}`, movieId: req.params.movieId, ...parsed.data } }); ok(res, item, null, 201); }));
router.patch("/:movieId/seasons/:seasonId", editors, asyncHandler(async (req, res) => { const parsed = seasonInput.partial().safeParse(req.body); if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Mùa phim không hợp lệ", parsed.error.flatten()); ok(res, await catalogPrisma.season.update({ where: { id: req.params.seasonId }, data: parsed.data })); }));
router.post("/:movieId/seasons/:seasonId/episodes", editors, asyncHandler(async (req, res) => { const parsed = episodeInput.safeParse(req.body); if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Tập phim không hợp lệ", parsed.error.flatten()); const value = parsed.data; const item = await catalogPrisma.episode.create({ data: { ...value, id: `epi_${nanoid(16)}`, seasonId: req.params.seasonId, slug: value.slug || `tap-${value.number}`, scheduledPublishAt: value.scheduledPublishAt ? new Date(value.scheduledPublishAt) : null } }); ok(res, item, null, 201); }));
router.patch("/:movieId/seasons/:seasonId/episodes/:episodeId", editors, asyncHandler(async (req, res) => { const parsed = episodeInput.partial().safeParse(req.body); if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Tập phim không hợp lệ", parsed.error.flatten()); const value = parsed.data; ok(res, await catalogPrisma.episode.update({ where: { id: req.params.episodeId }, data: { ...value, scheduledPublishAt: value.scheduledPublishAt ? new Date(value.scheduledPublishAt) : value.scheduledPublishAt } })); }));

router.post("/uploads/sign", editors, asyncHandler(async (req, res) => { const parsed = z.object({ fileName: z.string().min(1), contentType: z.string().min(1), size: z.number().int().positive().max(20 * 1024 * 1024 * 1024) }).safeParse(req.body); if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Thông tin upload không hợp lệ", parsed.error.flatten()); const safeName = parsed.data.fileName.replace(/[^a-zA-Z0-9._-]/g, "-"); ok(res, await storage.createSignedUpload({ key: `content/${Date.now()}-${nanoid(8)}-${safeName}`, contentType: parsed.data.contentType, size: parsed.data.size })); }));
router.post("/:id/media", editors, asyncHandler(async (req, res) => { const parsed = z.object({ episodeId: z.string().optional(), type: z.enum(["poster", "banner", "thumbnail", "trailer", "video"]), quality: z.string().max(20).optional(), storageProvider: z.string(), storageKey: z.string(), url: z.string().url(), mimeType: z.string().optional(), fileSize: z.number().nonnegative().optional() }).safeParse(req.body); if (!parsed.success) return fail(res, 400, "VALIDATION_ERROR", "Media không hợp lệ", parsed.error.flatten()); const value = parsed.data; const item = await catalogPrisma.media.create({ data: { id: `med_${nanoid(16)}`, movieId: value.episodeId ? null : req.params.id, episodeId: value.episodeId, type: value.type, quality: value.quality, storageProvider: value.storageProvider, storageKey: value.storageKey, url: value.url, mimeType: value.mimeType, fileSize: value.fileSize, encodeStatus: value.type === "video" ? "queued" : "completed", encodeProgress: value.type === "video" ? 0 : 100 } }); ok(res, serialize(item), null, 201); }));

export const adminContentRouter = router;
