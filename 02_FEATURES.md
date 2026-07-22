# DANH SÁCH TÍNH NĂNG — TỪ CƠ BẢN ĐẾN VƯỢT TRỘI

## A. TÍNH NĂNG CƠ BẢN (MVP)

- Đăng ký / đăng nhập (email, số điện thoại, Google/Facebook OAuth)
- Trang chủ: banner phim nổi bật, các hàng carousel theo thể loại/xu hướng
- Trang chi tiết phim/series: mô tả, diễn viên, đạo diễn, thể loại, năm, thời lượng, trailer
- Phát video: chọn chất lượng, phụ đề, âm thanh đa ngôn ngữ
- Tìm kiếm theo tên phim
- Đánh giá sao + bình luận
- Danh sách yêu thích (My List / Watchlist)
- Lịch sử xem
- Quản lý tài khoản, đổi mật khẩu, quên mật khẩu
- Trang quản trị (Admin) cơ bản: CRUD phim, thể loại, người dùng

## B. TÍNH NĂNG NÂNG CAO

- **Multi-profile** trong 1 tài khoản (như Netflix): mỗi profile có avatar, lịch sử, gợi ý riêng
- **Kids Mode**: giao diện riêng, lọc nội dung theo độ tuổi, PIN kiểm soát của phụ huynh
- **Tiếp tục xem** đồng bộ đa thiết bị (xem dở trên điện thoại → mở laptop xem tiếp đúng vị trí)
- **Adaptive bitrate streaming** (tự động đổi chất lượng theo băng thông)
- **Đa gói cước** (Free có quảng cáo / Basic / Premium 4K) + thanh toán online (VNPay, Momo, thẻ quốc tế)
- **Thông báo** phim mới, tập mới của series đang theo dõi (email/push/in-app)
- **Tải xuống xem offline** (mobile app, có DRM hạn chế)
- **Đa ngôn ngữ giao diện** + phụ đề nhiều thứ tiếng
- **Tìm kiếm nâng cao**: theo diễn viên, đạo diễn, tag, gợi ý tự động khi gõ (autocomplete)
- **Dashboard thống kê** cho admin: lượt xem, doanh thu, phim hot, retention

## C. TÍNH NĂNG "VƯỢT TRỘI" (ĐIỂM KHÁC BIỆT CẠNH TRANH)

1. **Watch Party (xem chung realtime)** — nhiều người ở xa cùng xem đồng bộ 1 phim, có chat/video call nhỏ overlay góc màn hình, đồng bộ play/pause/seek cho cả phòng.
2. **AI Recommendation cá nhân hóa** — kết hợp collaborative filtering (dựa trên hành vi người dùng tương tự) + content-based (dựa trên thể loại/diễn viên đã xem), hiển thị dạng "Dành cho bạn", "Vì bạn đã xem X".
3. **Auto Skip Intro/Recap** — AI/heuristic nhận diện đoạn intro lặp lại giữa các tập để hiện nút "Bỏ qua giới thiệu" đúng thời điểm.
4. **Hover Preview** — di chuột vào poster sẽ tự động phát đoạn trailer ngắn (giống Netflix), có thông tin nhanh (rating, năm, thể loại) hiện overlay.
5. **AI Chatbot gợi ý phim** — hỏi bằng ngôn ngữ tự nhiên ("gợi ý phim hành động Hàn Quốc mới") → chatbot trả lời + trực tiếp thêm vào watchlist.
6. **Voice Search** — tìm phim bằng giọng nói (đặc biệt hữu ích cho Smart TV/remote).
7. **Continue Watching thông minh** — tự nhận diện đã xem gần hết 1 tập → tự gợi ý phát tập tiếp theo (auto-play next episode với đếm ngược có thể hủy).
8. **Gamification** — huy hiệu "Marathon" (xem hết 1 mùa trong ngày), thống kê thời gian đã xem trong năm ("Wrapped" theo năm như Spotify Wrapped).
9. **Social Feed** — chia sẻ review, clip ngắn yêu thích lên "dòng thời gian" trong app, bạn bè có thể thấy bạn đang xem gì (tùy chọn bật/tắt riêng tư).
10. **Interactive/Branching content** (tùy chọn nâng cao) — hỗ trợ phim tương tác kiểu "Black Mirror: Bandersnatch" cho phép người xem chọn nhánh cốt truyện.
11. **Đa nền tảng đồng bộ** — Web, PWA, Mobile App (React Native), Smart TV App (Tizen/webOS/Android TV), Chromecast/AirPlay.
12. **Chế độ tối/sáng + Accessibility** — hỗ trợ điều hướng bàn phím, screen reader, phụ đề tùy biến (font, size, màu nền).

## D. LỘ TRÌNH TRIỂN KHAI ĐỀ XUẤT (ROADMAP)

| Giai đoạn | Nội dung |
|---|---|
| **Phase 1 – MVP** | Auth, Catalog, Streaming cơ bản, User profile đơn, Search cơ bản, Admin CRUD |
| **Phase 2 – Core UX** | Multi-profile, Watchlist, Continue Watching, Review/Rating, Payment/Subscription |
| **Phase 3 – Engagement** | Recommendation AI, Notification, Search nâng cao (Elasticsearch), Hover Preview |
| **Phase 4 – Khác biệt hóa** | Watch Party, AI Chatbot, Auto Skip Intro, Gamification, Offline Download |
| **Phase 5 – Scale** | Multi-platform (Mobile/TV app), Analytics nâng cao, A/B testing, tối ưu CDN toàn cầu |
