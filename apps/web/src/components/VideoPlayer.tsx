import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, CirclePlay, Heart, Lock, MessageCircle, Search, Server, Share2, SkipBack, SkipForward, Star, ThumbsUp } from "lucide-react";
import type { Movie } from "../../../../packages/shared-types/src/index";
import { api } from "../services/api";

type Playback = { episodeSlug?: string; episodeName?: string; serverName?: string };
type Props = { movie: Movie; onClose: () => void; onProgress: (movieId: string, progressPercent: number, playback?: Playback) => void; onPlayMovie: (movie: Movie) => void; isUserLoggedIn: boolean; profileName?: string; onRequireLogin: () => void };

export function VideoPlayer({ movie, onClose, onProgress, onPlayMovie, isUserLoggedIn, profileName, onRequireLogin }: Props) {
  const servers = movie.episodes ?? [];
  const initialServer = Math.max(0, servers.findIndex((server) => server.name === movie.serverName));
  const [serverIndex, setServerIndex] = useState(initialServer);
  const [episodeIndex, setEpisodeIndex] = useState(() => Math.max(0, servers[initialServer]?.episodes.findIndex((episode) => episode.slug === movie.episodeSlug) ?? 0));
  const [episodeQuery, setEpisodeQuery] = useState("");
  const [watchedEpisodes, setWatchedEpisodes] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<Movie[]>([]);
  const [comment,setComment]=useState(""),[commentRating,setCommentRating]=useState(5),[commentBusy,setCommentBusy]=useState(false),[commentNotice,setCommentNotice]=useState("");
  const activeServer = servers[serverIndex];
  const activeEpisode = activeServer?.episodes[episodeIndex];
  const normalizedQuery = episodeQuery.trim().toLocaleLowerCase("vi");
  const visibleEpisodes = (activeServer?.episodes ?? []).map((episode, index) => ({ episode, index })).filter(({ episode }) => !normalizedQuery || episode.name.toLocaleLowerCase("vi").includes(normalizedQuery));
  const progress = useMemo(() => activeServer?.episodes.length ? Math.max(3, Math.min(85, Math.round(((episodeIndex + 1) / activeServer.episodes.length) * 85))) : 0, [activeServer, episodeIndex]);
  const closeRef = useRef(onClose), progressRef = useRef(onProgress), snapshotRef = useRef({ progress, episodeSlug: activeEpisode?.slug, episodeName: activeEpisode?.name, serverName: activeServer?.name });
  closeRef.current = onClose; progressRef.current = onProgress; snapshotRef.current = { progress, episodeSlug: activeEpisode?.slug, episodeName: activeEpisode?.name, serverName: activeServer?.name };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") closeRef.current(); };
    window.addEventListener("keydown", onKey); document.body.style.overflow = "hidden";
    return () => { const saved = snapshotRef.current; window.removeEventListener("keydown", onKey); document.body.style.overflow = ""; progressRef.current(movie.id, saved.progress, { episodeSlug: saved.episodeSlug, episodeName: saved.episodeName, serverName: saved.serverName }); };
  }, [movie.id]);

  useEffect(() => { api.watchedEpisodes(movie.id).then((items) => setWatchedEpisodes(new Set(items.map((item) => item.episodeSlug)))).catch(() => setWatchedEpisodes(new Set())); }, [movie.id]);
  useEffect(() => { const slug = movie.genreSlugs?.[0]; (slug ? api.ophimMovies(`?genre=${encodeURIComponent(slug)}&page=1`) : api.ophimHome()).then((items) => setSuggestions(items.filter((item) => item.id !== movie.id).slice(0, 8))).catch(() => setSuggestions([])); }, [movie.id]);

  function saveEpisode(index: number) { const episode = activeServer?.episodes[index], savedProgress = Math.max(3, Math.min(85, Math.round(((index + 1) / (activeServer?.episodes.length || 1)) * 85))); setEpisodeIndex(index); setWatchedEpisodes((items) => new Set(items).add(episode?.slug ?? "")); onProgress(movie.id, savedProgress, { episodeSlug: episode?.slug, episodeName: episode?.name, serverName: activeServer?.name }); }
  function moveEpisode(direction: number) { const next = Math.max(0, Math.min((activeServer?.episodes.length ?? 1) - 1, episodeIndex + direction)); if (next !== episodeIndex) saveEpisode(next); }
  async function submitComment(){if(!isUserLoggedIn)return onRequireLogin();if(comment.trim().length<3){setCommentNotice("Bình luận cần ít nhất 3 ký tự.");return}setCommentBusy(true);setCommentNotice("");try{await api.saveReview(movie,commentRating,comment.trim(),profileName??"Người xem");setComment("");setCommentNotice("Đánh giá đã được đăng thành công.")}catch(e){setCommentNotice(e instanceof Error?e.message:"Không gửi được bình luận")}finally{setCommentBusy(false)}}

  return <div className="watch-screen" role="dialog" aria-modal="true" aria-label={`Đang xem ${movie.title}`}>
    <header className="watch-header">
      <button type="button" className="watch-back" onClick={onClose}><ChevronLeft size={21} /><span>Quay lại trang chủ</span></button>
      <strong className="watch-logo">NEXA<span>PLAY</span></strong>
      <span className="watch-now">Đang xem · {activeEpisode ? `Tập ${activeEpisode.name}` : "Phim lẻ"}</span>
    </header>
    <main className="watch-page">
      <div className="watch-breadcrumb"><CirclePlay size={14} /> Xem phim <b>{movie.title}</b></div>
      <section className="watch-stage">
        {activeEpisode?.embedUrl ? <iframe key={activeEpisode.embedUrl} src={activeEpisode.embedUrl} title={`${movie.title} - tập ${activeEpisode.name}`} allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowFullScreen referrerPolicy="origin" /> : <div className="watch-empty"><CirclePlay size={46} /><strong>Chưa có nguồn phát</strong><span>Vui lòng chọn server khác hoặc quay lại sau.</span></div>}
      </section>
      <div className="player-toolbar">
        <button onClick={() => moveEpisode(-1)} disabled={episodeIndex === 0}><SkipBack size={16} /> Tập trước</button>
        <button><Heart size={16} /> Yêu thích</button><button><Share2 size={16} /> Chia sẻ</button>
        <button onClick={() => moveEpisode(1)} disabled={episodeIndex >= (activeServer?.episodes.length ?? 1) - 1}>Tập sau <SkipForward size={16} /></button>
      </div>

      <div className="watch-content-grid">
        <div className="watch-main-column">
          <section className="watch-info">
            <img src={movie.posterUrl} alt={movie.title} />
            <div><h1>{movie.title}</h1><p>{movie.originalTitle}</p><div className="watch-tags"><span>{movie.quality ?? "HD"}</span><span>{movie.language ?? "Vietsub"}</span><span>{movie.year}</span><span>{movie.ageRating}</span></div></div>
            <p className="watch-description">{movie.description}</p>
            <div className="watch-rating"><Star size={17} fill="currentColor" /><strong>{movie.rating || "Mới"}</strong><small>đánh giá</small></div>
          </section>

          <div className="watch-notice">💡 Nếu không xem được, hãy đổi server hoặc tải lại trang.</div>
          <section className="episode-library">
            <div className="episode-library__head"><h2>Danh sách tập</h2><label><Search size={15} /><input value={episodeQuery} onChange={(event) => setEpisodeQuery(event.target.value)} placeholder="Tìm tập..." /></label></div>
            <div className="server-tabs">{servers.map((server, index) => <button type="button" className={index === serverIndex ? "active" : ""} key={server.name} onClick={() => { setServerIndex(index); setEpisodeIndex(0); }}>{<Server size={14} />}{server.name}</button>)}</div>
            <div className="episode-grid">{visibleEpisodes.map(({ episode, index }) => { const watched = watchedEpisodes.has(episode.slug) && index !== episodeIndex; return <button type="button" className={`${index === episodeIndex ? "active" : ""} ${watched ? "watched" : ""}`} key={`${episode.slug}-${index}`} onClick={() => saveEpisode(index)}>{watched ? <Check size={15} /> : <CirclePlay size={15} />}<span>Tập {episode.name}</span></button>; })}</div>
          </section>

          <section className="watch-comments"><h2><MessageCircle size={19} /> Bình luận</h2>{isUserLoggedIn?<div className="comment-box"><div className="comment-rating">Đánh giá: {[1,2,3,4,5].map(value=><button key={value} className={value<=commentRating?"active":""} onClick={()=>setCommentRating(value)}>★</button>)}</div><textarea value={comment} onChange={e=>setComment(e.target.value)} maxLength={2000} placeholder="Viết bình luận của bạn..." /><button disabled={commentBusy||comment.trim().length<3} onClick={submitComment}>{commentBusy?"Đang gửi...":"Gửi bình luận"}</button>{commentNotice&&<small className="comment-notice">{commentNotice}</small>}</div>:<div className="comment-login-required"><Lock size={18}/><span><strong>Đăng nhập để bình luận</strong><small>Bạn cần tài khoản NexaPlay để tham gia thảo luận.</small></span><button onClick={onRequireLogin}>Đăng nhập</button></div>}<div className="comment-placeholder"><span>👤</span><div><strong>Cộng đồng NexaPlay</strong><p>Hãy chia sẻ cảm nhận về bộ phim và giữ nội dung bình luận văn minh nhé.</p><button><ThumbsUp size={13} /> Hữu ích</button></div></div></section>
        </div>

        <aside className="watch-suggestions"><h2>Đề xuất cho bạn</h2>{suggestions.map((item) => <button key={item.id} onClick={() => onPlayMovie(item)}><img src={item.posterUrl} alt="" /><span><strong>{item.title}</strong><small>{item.originalTitle || item.year}</small><em><Star size={11} fill="currentColor" /> {item.rating || "Mới"} · {item.episodeCurrent || item.quality}</em></span></button>)}</aside>
      </div>
    </main>
  </div>;
}
