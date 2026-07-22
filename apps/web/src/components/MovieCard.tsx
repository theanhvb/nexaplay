import { Play, Star } from "lucide-react";
import { Movie } from "../../../../packages/shared-types/src/index";

type Props = {
  movie: Movie;
  onOpen: (movie: Movie) => void;
};

export function MovieCard({ movie, onOpen }: Props) {
  const episodeLabel = movie.episodeCurrent
    ? movie.episodeCurrent.replace(/^Hoàn Tất\s*/i, "Trọn bộ ")
    : movie.type === "series" ? "Đang cập nhật" : "Phim lẻ";

  return (
    <button className="movie-card" onClick={() => onOpen(movie)} aria-label={`Mở ${movie.title}`}>
      <span className="movie-card__visual">
        <img
          src={movie.backdropUrl || movie.posterUrl}
          alt={movie.title}
          loading="lazy"
          onError={(event) => { event.currentTarget.src = movie.posterUrl; }}
        />
        <span className="movie-card__shade" />
        <span className="movie-card__badges">
          <span>{episodeLabel}</span>
          <span>{movie.quality ?? movie.ageRating}</span>
        </span>
        {movie.hotRank && movie.hotRank <= 10 && <span className="movie-card__hot"><b>#{movie.hotRank}</b> HOT</span>}
        <span className="movie-card__play"><Play size={22} fill="currentColor" /></span>
        {movie.progress !== undefined && movie.progress > 0 && <span className="movie-card__progress"><i style={{ width: `${movie.progress}%` }} /></span>}
      </span>
      <span className="movie-card__body">
        <strong>{movie.title}</strong>
        <span className="movie-card__original">{movie.originalTitle || `${movie.year} · ${movie.genres.slice(0, 2).join(", ")}`}</span>
        <span className="movie-card__meta">
          <Star size={13} fill="currentColor" /> {movie.rating || "Mới"} <i /> {movie.year} <i /> {movie.language || movie.ageRating}
        </span>
      </span>
    </button>
  );
}
