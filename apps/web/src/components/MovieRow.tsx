import { Movie } from "../../../../packages/shared-types/src/index";
import { MovieCard } from "./MovieCard";

type Props = {
  title: string;
  movies: Movie[];
  onOpen: (movie: Movie) => void;
  onViewAll?: () => void;
};

export function MovieRow({ title, movies, onOpen, onViewAll }: Props) {
  if (!movies.length) return null;

  return (
    <section className="movie-row">
      <div className="section-heading">
        <h2>{title}</h2>
        {onViewAll && <button type="button" className="view-all-button" onClick={onViewAll}>Xem tất cả <span>→</span></button>}
      </div>
      <div className="movie-strip">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}
