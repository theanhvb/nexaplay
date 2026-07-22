import { Router } from "express";
import { nanoid } from "nanoid";
import { z } from "zod";
import { catalogPrisma } from "@movie-platform/database/catalog";
import { asyncHandler, fail, ok, requireRoles } from "@movie-platform/service-kit";

const router=Router(),editors=requireRoles("super_admin","content_editor");
const schema=z.object({name:z.string().trim().min(2).max(80),slug:z.string().trim().regex(/^[a-z0-9-]+$/).max(80),description:z.string().trim().max(500).optional().nullable(),active:z.boolean().default(true),position:z.number().int().min(0).default(0)});
router.use(requireRoles("super_admin","content_editor","support"));
router.get("/",asyncHandler(async(_req,res)=>ok(res,await catalogPrisma.genre.findMany({orderBy:[{position:"asc"},{name:"asc"}],include:{_count:{select:{movies:true}}}}))));
router.post("/",editors,asyncHandler(async(req,res)=>{const parsed=schema.safeParse(req.body);if(!parsed.success)return fail(res,400,"VALIDATION_ERROR","Thể loại không hợp lệ",parsed.error.flatten());ok(res,await catalogPrisma.genre.create({data:{id:`gen_${nanoid(16)}`,...parsed.data}}),null,201)}));
router.patch("/:id",editors,asyncHandler(async(req,res)=>{const parsed=schema.partial().safeParse(req.body);if(!parsed.success)return fail(res,400,"VALIDATION_ERROR","Thể loại không hợp lệ",parsed.error.flatten());ok(res,await catalogPrisma.genre.update({where:{id:req.params.id},data:parsed.data}))}));
router.delete("/:id",requireRoles("super_admin"),asyncHandler(async(req,res)=>{const used=await catalogPrisma.movieGenre.count({where:{genreId:req.params.id}});if(used)return fail(res,409,"GENRE_IN_USE",`Không thể xóa thể loại đang được ${used} phim sử dụng`);await catalogPrisma.genre.delete({where:{id:req.params.id}});ok(res,{id:req.params.id,deleted:true})}));
router.put("/reorder/all",editors,asyncHandler(async(req,res)=>{const parsed=z.object({ids:z.array(z.string()).min(1)}).safeParse(req.body);if(!parsed.success)return fail(res,400,"VALIDATION_ERROR","Danh sách thứ tự không hợp lệ");await catalogPrisma.$transaction(parsed.data.ids.map((id,position)=>catalogPrisma.genre.update({where:{id},data:{position}})));ok(res,{reordered:parsed.data.ids.length})}));
export const adminGenresRouter=router;
