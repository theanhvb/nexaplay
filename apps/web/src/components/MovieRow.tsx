import { Movie } from "../../../../packages/shared-types/src/index";
import { MovieCard } from "./MovieCard";

type Props = {
  title: string;
  movies: Movie[];
  onOpen: (movie: Movie) => void;
};

export function MovieRow({ title, movies, onOpen }: Props) {
  if (!movies.length) return null;

  return (
    <section className="movie-row">
      <div className="section-heading">
        <h2>{title}</h2>
      </div>
      <div className="movie-strip">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} onOpen={onOpen} />
        ))}
      </div>
    </section>
  );
}
