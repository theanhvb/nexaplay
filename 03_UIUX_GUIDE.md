# HƯỚNG DẪN UI/UX — THIẾT KẾ GIAO DIỆN XEM PHIM CAO CẤP

## 1. TRANG WEB THAM KHẢO

| Trang | Điểm nên học hỏi |
|---|---|
| **Netflix** | Hero banner tự động phát trailer, hover preview poster, carousel ngang mượt, dark theme chuẩn mực |
| **Disney+ / HBO Max** | Phân loại nội dung theo "Hub" (Marvel, Star Wars...), typography lớn rõ ràng, chuyển cảnh mượt |
| **Apple TV+** | Tối giản, nhiều khoảng trắng (trong theme tối), ảnh chất lượng cao chiếm chủ đạo, ít chữ |
| **FPT Play / Galaxy Play** | Tham khảo layout phù hợp thị trường Việt Nam, cách hiển thị lịch chiếu, bình luận |
| **Letterboxd** | UI trang review/rating phim đẹp, cộng đồng, cách trình bày poster dạng grid |

## 2. NGUYÊN TẮC THIẾT KẾ CHỦ ĐẠO

- **Dark-first design**: nền tối (#0B0B0F – #141420) làm nổi bật poster/ảnh màu, giảm mỏi mắt khi xem phim ban đêm — cho phép chuyển light mode tùy chọn.
- **Content-first**: hình ảnh/poster là trung tâm, chữ chỉ hỗ trợ, tránh khung viền rườm rà.
- **Motion có chủ đích**: hover phóng to nhẹ (scale 1.05–1.1) + fade-in trailer sau 600ms–1s hover, transition 200–300ms ease-out — không giật, không lag.
- **Phân cấp thị giác rõ**: Hero → Continue Watching → Trending → Theo thể loại → Vì bạn đã xem..., mỗi hàng carousel có tiêu đề rõ ràng, scroll ngang mượt (snap-scroll).
- **Nhất quán component**: dùng design token (màu, spacing, radius, shadow) thống nhất toàn hệ thống — nên build design system riêng (xem mục 4).

## 3. BẢNG MÀU & TYPOGRAPHY ĐỀ XUẤT

```
Màu nền chính:      #0B0B0F (near-black)
Màu nền phụ (card):  #17171F
Màu chữ chính:       #F5F5F7
Màu chữ phụ:         #A0A0AC
Màu nhấn (accent):   #E50914 (đỏ - CTA/Play) hoặc tùy chỉnh theo thương hiệu
Màu gradient overlay: linear-gradient(to top, #0B0B0F 0%, transparent 60%)  — dùng phủ dưới poster để chữ dễ đọc

Font chữ:
- Heading: Inter / Manrope / Sora (weight 600-800)
- Body: Inter / Roboto (weight 400-500)
- Số liệu (rating, năm): dùng tabular-nums để căn thẳng hàng
```

## 4. CẤU TRÚC TRANG CHÍNH CẦN CÓ

1. **Trang chủ**: Hero carousel (3–5 phim nổi bật, auto-play trailer khi hover/sau vài giây), các hàng gợi ý (Tiếp tục xem, Xu hướng, Theo thể loại, Dành riêng cho bạn).
2. **Trang chi tiết phim**: Ảnh nền lớn (backdrop) + overlay gradient, nút Play nổi bật, thông tin nhanh (rating/năm/thời lượng/độ tuổi), tab Tập phim (nếu series)/Diễn viên/Đánh giá/Đề xuất liên quan.
3. **Trình phát video**: Full-screen player, thanh điều khiển ẩn/hiện thông minh, nút "Bỏ qua giới thiệu", nút "Tập tiếp theo" góc dưới phải khi gần hết tập, thanh chọn chất lượng/phụ đề/tốc độ.
4. **Trang tìm kiếm**: Ô search nổi bật, gợi ý autocomplete có ảnh mini, bộ lọc (thể loại, năm, đánh giá).
5. **Trang cá nhân**: Danh sách profile dạng thẻ tròn/vuông lớn (giống Netflix chọn hồ sơ), trang quản lý gói cước, lịch sử thanh toán.
6. **Watch Party room**: Layout chia 2 vùng — video chính lớn, sidebar chat + danh sách người tham gia, nút mời qua link.
7. **Trang Admin/CMS**: Dashboard thống kê (biểu đồ lượt xem/doanh thu), bảng quản lý phim (data table + filter + bulk action), form thêm/sửa phim có upload poster/trailer/video.

## 5. RESPONSIVE & ĐA NỀN TẢNG

- Mobile: carousel chuyển thành swipe, ẩn bớt thông tin phụ, nút Play to dễ chạm.
- Tablet/Desktop: giữ layout carousel nhiều cột, hover preview chỉ bật trên thiết bị có chuột.
- Smart TV: focus state rõ ràng (viền sáng khi dùng remote điều hướng), chữ to hơn, tránh yêu cầu gõ nhiều (ưu tiên voice search).

## 6. GỢI Ý CÔNG CỤ DỰNG UI

- **Design**: Figma (tạo design system trước khi code — màu, type scale, spacing 8px grid, component library)
- **Code**: TailwindCSS + shadcn/ui (Radix) cho component có sẵn accessibility tốt, Framer Motion cho animation/transition mượt
- **Icon**: Lucide Icons
- **Ảnh/Poster**: dùng `next/image` với lazy-loading + blur placeholder để tránh layout shift
