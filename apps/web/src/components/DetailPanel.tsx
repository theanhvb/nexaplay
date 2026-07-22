import { useEffect, useState } from "react";
import { Check, Play, Plus, Star, X } from "lucide-react";
import type {
  Movie,
  ReviewBundle,
} from "../../../../packages/shared-types/src/index";
import { api } from "../services/api";

type Props = {
  movie: Movie;
  related: Movie[];
  onClose: () => void;
  onPlay: (movie: Movie) => void;
  inWatchlist: boolean;
  onToggleWatchlist: (movie: Movie) => void;
  isUserLoggedIn: boolean;
  profileName?: string;
};
export function DetailPanel({
  movie,
  related,
  onClose,
  onPlay,
  inWatchlist,
  onToggleWatchlist,
  isUserLoggedIn,
  profileName,
}: Props) {
  const [reviews, setReviews] = useState<ReviewBundle | null>(null),
    [rating, setRating] = useState(5),
    [comment, setComment] = useState(""),
    [saving, setSaving] = useState(false);
  useEffect(() => {
    api
      .reviews(movie.id)
      .then(setReviews)
      .catch(() => setReviews(null));
  }, [movie.id]);
  async function submitReview() {
    if (!comment.trim()) return;
    setSaving(true);
    try {
      await api.saveReview(movie, rating, comment, profileName ?? "Người xem");
      setComment("");
      setReviews(await api.reviews(movie.id));
    } finally {
      setSaving(false);
    }
  }
  async function reportReview(id: string) {
    if (!isUserLoggedIn) return;
    const detail = prompt("Mô tả ngắn lý do báo cáo (spam, xúc phạm, tiết lộ nội dung...):");
    if (detail === null) return;
    try {
      await api.reportReview(id, "other", detail.trim() || undefined);
      alert("Đã gửi báo cáo. Quản trị viên sẽ kiểm tra nội dung này.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Không gửi được báo cáo");
    }
  }
  return (
    <div className="modal-shell" role="dialog" aria-modal="true">
      <article className="detail-panel">
        <button
          className="icon-button detail-panel__close"
          type="button"
          onClick={onClose}
          aria-label="Đóng"
        >
          <X size={20} />
        </button>
        <div
          className="detail-panel__hero"
          style={{ backgroundImage: `url(${movie.backdropUrl})` }}
        >
          <div className="detail-panel__copy">
            <span className="eyebrow">{movie.matchScore}% phù hợp với bạn</span>
            <h2>{movie.title}</h2>
            <p>{movie.description}</p>
            <div className="button-row">
              <button className="primary-button" onClick={() => onPlay(movie)}>
                <Play size={18} fill="currentColor" /> Xem ngay
              </button>
              {isUserLoggedIn && (
                <button
                  className="secondary-button"
                  onClick={() => onToggleWatchlist(movie)}
                >
                  {inWatchlist ? <Check size={18} /> : <Plus size={18} />}{" "}
                  {inWatchlist ? "Đã lưu" : "Danh sách"}
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="detail-panel__content">
          <div className="facts">
            <span>
              <Star size={15} fill="currentColor" /> {movie.rating}
            </span>
            <span>{movie.year}</span>
            <span>{movie.durationMinutes} phút</span>
            <span>{movie.ageRating}</span>
            <span>{movie.type === "series" ? "Series" : "Phim lẻ"}</span>
          </div>
          <div className="detail-grid">
            <p>
              <strong>Diễn viên:</strong> {movie.cast.join(", ")}
            </p>
            <p>
              <strong>Đạo diễn:</strong> {movie.director}
            </p>
            <p>
              <strong>Thể loại:</strong> {movie.genres.join(", ")}
            </p>
          </div>
          <h3>Có thể bạn thích</h3>
          <div className="mini-grid">
            {related.slice(0, 3).map((item) => (
              <button
                type="button"
                className="mini-card"
                key={item.id}
                onClick={() => onPlay(item)}
              >
                <img src={item.posterUrl} alt={item.title} />
                <div>
                  <strong>{item.title}</strong>
                  <span>
                    {item.year} · {item.rating}
                  </span>
                </div>
              </button>
            ))}
          </div>
          <section className="review-section">
            <div className="section-heading">
              <h3>Đánh giá cộng đồng</h3>
              <span>
                {reviews?.summary.average ?? 0}/5 ·{" "}
                {reviews?.summary.total ?? 0} đánh giá
              </span>
            </div>
            {isUserLoggedIn && (
              <div className="review-composer">
                <div className="star-picker">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      aria-label={`${value} sao`}
                    >
                      <Star
                        size={20}
                        fill={value <= rating ? "currentColor" : "none"}
                      />
                    </button>
                  ))}
                </div>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Chia sẻ cảm nhận hữu ích cho người xem khác..."
                  maxLength={2000}
                />
                <button
                  className="primary-button"
                  type="button"
                  disabled={saving || !comment.trim()}
                  onClick={submitReview}
                >
                  {saving ? "Đang gửi..." : "Đăng đánh giá"}
                </button>
              </div>
            )}
            <div className="review-list">
              {reviews?.reviews.slice(0, 6).map((review) => (
                <article key={review.id} className="review-card">
                  <div>
                    <strong>{review.profileName}</strong>
                    <span>
                      {"★".repeat(review.rating)}
                      {"☆".repeat(5 - review.rating)}
                    </span>
                  </div>
                  <p>{review.content}</p>
                  <small>
                    {new Date(review.createdAt).toLocaleDateString("vi-VN")} ·{" "}
                    {review.likeCount} lượt hữu ích
                    {isUserLoggedIn && <button type="button" className="review-report-button" onClick={() => reportReview(review.id)}>Báo cáo</button>}
                  </small>
                </article>
              ))}
            </div>
          </section>
        </div>
      </article>
    </div>
  );
}
