import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Bell, ChevronDown, Clapperboard, Film, LayoutDashboard, LogIn, Moon, Play, RefreshCw, Search, Sparkles, Sun, Tv, UserCircle } from "lucide-react";
import { Genre, Movie, User } from "../../../packages/shared-types/src/index";
import { DetailPanel } from "./components/DetailPanel";
import { LoginModal } from "./components/LoginModal";
import { MovieRow } from "./components/MovieRow";
import { VideoPlayer } from "./components/VideoPlayer";
import { AccountCenter } from "./components/AccountCenter";
import { AdminDashboard } from "./components/AdminDashboard";
import { api, setToken, setRefreshToken, getToken } from "./services/api";

type AdminStats = {
  totalUsers: number;
  totalViews: number;
  revenue: number;
  watchMinutes: number;
  topContent: Array<{ contentId: string; title: string; views: number; completionRate: number }>;
  trend: Array<{ stat_date: string; new_users: number; total_views: number; total_revenue: number }>;
};

export function App() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [hotMovies,setHotMovies]=useState<Movie[]>([]);
  const [genres, setGenres] = useState<Genre[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [showLogin, setShowLogin] = useState(() => window.location.pathname.startsWith("/admin") && !getToken());
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Movie[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAccount, setShowAccount] = useState(false);
  const [view, setView] = useState(() => window.location.pathname.startsWith("/admin") ? "admin" : "home");

  const [activeVideoMovie, setActiveVideoMovie] = useState<Movie | null>(null);
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [continueWatching, setContinueWatching] = useState<Movie[]>([]);
  const [catalogTitle, setCatalogTitle] = useState("Phim mới cập nhật");
  const [error, setError] = useState("");
  const [catalogBusy, setCatalogBusy] = useState(false);
  const [catalogMode, setCatalogMode] = useState<"home" | "filtered">("home");
  const [openNav, setOpenNav] = useState<"movies" | "genres" | null>(null);
  const [theme,setTheme]=useState<"dark"|"light">(()=>{const saved=localStorage.getItem("nexaplay-theme");const initial=saved==="dark"||saved==="light"?saved:window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark";document.documentElement.dataset.theme=initial;document.documentElement.style.colorScheme=initial;return initial});

  useEffect(()=>{document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;localStorage.setItem("nexaplay-theme",theme)},[theme]);
  const toggleTheme=()=>setTheme(current=>current==="dark"?"light":"dark");

  useEffect(() => {
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";
    if (!window.location.hash || window.location.hash === "#home") window.scrollTo(0, 0);
    const initialMovies=api.ophimHome();
    Promise.all([initialMovies, initialMovies.then(()=>api.ophimGenres()),api.ophimHot()])
      .then(([movieData, genreData,hotData]) => {
        setMovies(movieData);
        setGenres(genreData);
        setHotMovies(hotData);
      })
      .catch(() => setError("Không thể tải kho phim. Vui lòng kiểm tra kết nối và thử lại."))
      .finally(() => setLoading(false));

    if (getToken()) {
      api.me()
        .then((userData) => {
          setUser(userData);
          if (userData.profiles && userData.profiles.length > 0) {
            setActiveProfileId(userData.profiles[0].id);
          }
          loadPersonalData();
        })
        .catch(() => setToken(null));
    }
  }, []);

  useEffect(() => {
    const syncView = () => setView(window.location.pathname.startsWith("/admin") ? "admin" : "home");
    window.addEventListener("popstate", syncView);
    return () => window.removeEventListener("popstate", syncView);
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const handle = window.setTimeout(() => {
      api.ophimSearch(query).then(setSearchResults).catch(() => setSearchResults([]));
    }, 220);
    return () => window.clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (user?.role !== "admin") {
      setAdminStats(null);
      return;
    }
    api.adminStats().then(setAdminStats).catch(() => setAdminStats(null));
  }, [user]);

  const featured = movies.find((movie) => movie.isFeatured) ?? movies[0];
  const trending = movies.filter((movie) => movie.isTrending);
  const forYou = movies.filter((movie) => movie.matchScore >= 90);
  const korean = movies.filter((movie) => movie.country?.includes("Hàn Quốc"));
  const related = useMemo(() => {
    if (!selectedMovie) return [];
    return movies.filter((movie) => movie.id !== selectedMovie.id && movie.genres.some((genre) => selectedMovie.genres.includes(genre)));
  }, [movies, selectedMovie]);

  async function openMovie(movie: Movie) {
    try { setSelectedMovie(await api.ophimMovie(movie.slug ?? movie.id)); }
    catch { setSelectedMovie(movie); }
  }

  async function playMovie(movie: Movie) {
    try { setActiveVideoMovie(movie.episodes?.length ? movie : await api.ophimMovie(movie.slug ?? movie.id)); }
    catch { setActiveVideoMovie(movie); }
  }

  async function browseGenre(slug: string) {
    const genre = genres.find((item) => item.slug === slug);
    setCatalogBusy(true); setError("");
    try {
      const results = await api.ophimMovies(`?genre=${encodeURIComponent(slug)}&page=1`);
      setMovies(results);
      setCatalogTitle(genre ? `Thể loại ${genre.name}` : "Khám phá phim");
      setCatalogMode("filtered");
      setQuery("");
      setOpenNav(null);
      window.location.hash = "home";
      window.setTimeout(() => document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" }), 0);
    } catch { setError("Không tải được thể loại này. Vui lòng thử lại."); }
    finally { setCatalogBusy(false); }
  }

  async function loadHome() {
    if (window.location.pathname !== "/") window.history.pushState({}, "", "/");
    setCatalogBusy(true); setError("");
    try { const [latest,hot]=await Promise.all([api.ophimHome(),api.ophimHot()]);setMovies(latest);setHotMovies(hot);setCatalogTitle("Phim mới cập nhật");setCatalogMode("home");setOpenNav(null); window.scrollTo({top:0,behavior:"smooth"}); }
    catch { setError("Không thể làm mới kho phim."); }
    finally { setCatalogBusy(false); }
  }

  async function browseCollection(type: string, title: string) {
    setCatalogBusy(true); setError("");
    try { setMovies(await api.ophimMovies(`?type=${encodeURIComponent(type)}&page=1`)); setCatalogTitle(title);setCatalogMode("filtered");setOpenNav(null);window.setTimeout(()=>document.getElementById("catalog")?.scrollIntoView({behavior:"smooth"}),0); }
    catch { setError("Không thể tải danh mục phim."); }
    finally { setCatalogBusy(false); }
  }

  async function loadPersonalData() {
    const [list, continued] = await Promise.all([
      api.getWatchlist().catch(() => []),
      api.continueWatching().catch(() => [])
    ]);
    setWatchlist(list); setContinueWatching(continued);
  }

  async function login(email: string, password: string) {
    const payload = await api.login(email, password);
    setToken(payload.accessToken);
    setRefreshToken(payload.refreshToken);
    setUser(payload.user);
    if (payload.user.profiles && payload.user.profiles.length > 0) {
      setActiveProfileId(payload.user.profiles[0].id);
    }
    await Promise.allSettled([loadHome(), loadPersonalData()]);
    window.scrollTo({ top: 0 });
  }

  async function register(email: string, password: string, displayName: string) {
    const payload = await api.register(email, password, displayName);
    setToken(payload.accessToken);
    setRefreshToken(payload.refreshToken);
    setUser(payload.user);
    if (payload.user.profiles && payload.user.profiles.length > 0) {
      setActiveProfileId(payload.user.profiles[0].id);
    }
    await Promise.allSettled([loadHome(), loadPersonalData()]);
    window.scrollTo({ top: 0 });
  }

  async function logout() {
    try { await api.logout(); } catch { /* Local logout must still complete. */ }
    finally {
      setToken(null);
      setRefreshToken(null);
      setUser(null);
      setAdminStats(null);
      setWatchlist([]);
      setContinueWatching([]);
      setActiveProfileId(null);
      setShowAccount(false);
      void loadHome();
    }
  }

  async function toggleWatchlist(movie: Movie) {
    if (!user) return;
    const inList = watchlist.some((m) => m.id === movie.id);
    try {
      if (inList) {
        await api.removeFromWatchlist(movie.id);
        setWatchlist((prev) => prev.filter((m) => m.id !== movie.id));
      } else {
        await api.addToWatchlist(movie.id);
        setWatchlist((prev) => [...prev, movie]);
      }
    } catch (err) {
      console.error("Lỗi cập nhật danh sách yêu thích", err);
    }
  }

  async function handleProgress(movieId: string, progress: number, playback?: { episodeSlug?: string; episodeName?: string; serverName?: string }) {
    const source = continueWatching.find(item=>item.id===movieId) ?? activeVideoMovie;
    if(source) api.trackView(source,progress).catch(()=>{});
    if (!user) return;
    try {
      await api.updateProgress(movieId, progress, playback);
      setContinueWatching((items) => {
        const source = items.find((item) => item.id === movieId) ?? activeVideoMovie;
        if (!source || progress >= 90) return items.filter((item) => item.id !== movieId);
        const updated = { ...source, progress, ...playback };
        return [updated, ...items.filter((item) => item.id !== movieId)];
      });
    } catch (err) {
      console.error("Lỗi cập nhật tiến trình", err);
    }
  }

  async function switchProfile(profileId: string) {
    if (!user) return;
    try {
      const switched = await api.setActiveProfile(profileId);
      setToken(switched.accessToken);
      setActiveProfileId(profileId);
      await Promise.all([loadHome(), loadPersonalData()]);
    } catch (err) {
      console.error("Lỗi chuyển đổi profile", err);
    }
  }

  if (loading) {
    return <main className="loading-screen">Dang tai rap phim cua ban...</main>;
  }

  const canAccessAdmin = user && ["admin", "super_admin", "content_editor", "support"].includes(user.role);

  if (view === "admin" && canAccessAdmin) {
    return <AdminDashboard currentUser={user} onLogout={()=>void logout()} theme={theme} onToggleTheme={toggleTheme} onBack={() => { window.history.pushState({}, "", "/"); setView("home"); }} />;
  }

  return (
    <>
      <header className="topbar">
        <button className="brand" type="button" aria-label="Về trang chủ" onClick={loadHome}>
          <span className="brand-mark">N</span>
          <span>Nexa<span className="brand-accent">Play</span></span>
        </button>
        <nav className="main-nav" onMouseLeave={() => setOpenNav(null)}>
          <button type="button" className={catalogTitle === "Phim mới cập nhật" ? "active" : ""} onClick={loadHome}>Trang chủ</button>
          <div className="nav-menu">
            <button type="button" className={openNav === "movies" ? "active" : ""} onClick={() => setOpenNav(openNav === "movies" ? null : "movies")} onMouseEnter={() => setOpenNav("movies")}>Phim mới <ChevronDown size={14}/></button>
            {openNav === "movies" && <div className="nav-dropdown nav-dropdown--movies">
              <span className="nav-dropdown__label">Khám phá nội dung</span>
              <button onClick={loadHome}><Sparkles size={18}/><span><strong>Mới cập nhật</strong><small>Những phim vừa được thêm</small></span></button>
              <button onClick={() => browseCollection("phim-le", "Phim lẻ mới cập nhật")}><Film size={18}/><span><strong>Phim lẻ</strong><small>Điện ảnh trong và ngoài nước</small></span></button>
              <button onClick={() => browseCollection("phim-bo", "Phim bộ mới cập nhật")}><Tv size={18}/><span><strong>Phim bộ</strong><small>Series và tập mới hôm nay</small></span></button>
              <button onClick={() => browseCollection("hoat-hinh", "Hoạt hình mới cập nhật")}><Clapperboard size={18}/><span><strong>Hoạt hình</strong><small>Anime và phim hoạt họa</small></span></button>
            </div>}
          </div>
          <div className="nav-menu">
            <button type="button" className={openNav === "genres" ? "active" : ""} onClick={() => setOpenNav(openNav === "genres" ? null : "genres")} onMouseEnter={() => setOpenNav("genres")}>Thể loại <ChevronDown size={14}/></button>
            {openNav === "genres" && <div className="nav-dropdown nav-dropdown--genres">
              <div className="nav-dropdown__heading"><span><b>Thể loại phim</b><small>Chọn nội dung theo sở thích</small></span><span>{genres.length} thể loại</span></div>
              <div className="nav-genre-grid">{genres.map((genre) => <button key={genre.id} type="button" onClick={() => browseGenre(genre.slug)}>{genre.name}<span>›</span></button>)}</div>
            </div>}
          </div>
          {canAccessAdmin && <button type="button" className="admin-nav-link" onClick={() => { window.history.pushState({}, "", "/admin"); setView("admin"); }}><LayoutDashboard size={14}/> Quản trị</button>}
        </nav>
        <div className="topbar__actions">
          <label className="search-box">
            <Search size={18} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm tên phim..." aria-label="Tìm kiếm phim" />
          </label>
          <button className="icon-button theme-toggle" title={theme==="dark"?"Chuyển sang giao diện sáng":"Chuyển sang giao diện tối"} aria-label={theme==="dark"?"Bật giao diện sáng":"Bật giao diện tối"} type="button" onClick={toggleTheme}>
            {theme==="dark"?<Sun size={19}/>:<Moon size={19}/>}
          </button>
          <button className="icon-button" title="Thông báo và gói dịch vụ" type="button" onClick={() => user ? setShowAccount(true) : setShowLogin(true)}>
            <Bell size={19} />
          </button>
          {user ? (
            <button className="profile-button" type="button" onClick={() => setShowAccount(true)} title="Tài khoản">
              <img src={user.profiles.find(p => p.id === activeProfileId)?.avatarUrl ?? user.profiles[0]?.avatarUrl} alt={user.displayName} />
              <span>{user.displayName}</span>
              <ChevronDown size={16} />
            </button>
          ) : (
            <button className="secondary-button" type="button" onClick={() => setShowLogin(true)}>
              <LogIn size={17} /> Đăng nhập
            </button>
          )}
        </div>
      </header>

      {query && (
        <div className="search-popover">
          <span className="eyebrow">Kết quả tìm kiếm</span>
          {searchResults.length ? searchResults.map((movie) => (
            <button key={movie.id} type="button" className="search-result" onClick={() => openMovie(movie)}>
              <img src={movie.posterUrl} alt={movie.title} />
              <span>
                <strong>{movie.title}</strong>
                <small>{movie.year} · {movie.genres.join(", ")}</small>
              </span>
            </button>
          )) : <p className="muted">Không có kết quả phù hợp.</p>}
        </div>
      )}

      <main id="home">
        {error && <div className="error-banner"><span>{error}</span><button type="button" onClick={loadHome}><RefreshCw size={16}/> Thử lại</button></div>}
        {catalogMode === "home" && featured && (
          <section className="hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(11,11,15,.96) 0%, rgba(11,11,15,.78) 42%, rgba(11,11,15,.18) 100%), url(${featured.backdropUrl})` }}>
            <div className="hero__copy">
              <span className="eyebrow"><Sparkles size={16} /> Lựa chọn nổi bật hôm nay</span>
              <h1>{featured.title}</h1>
              <p>{featured.description}</p>
              <div className="facts">
                <span className="match-badge">{featured.matchScore}% phù hợp</span>
                <span>{featured.year}</span>
                <span>{featured.quality ?? featured.ageRating}</span>
                {featured.language && <span>{featured.language}</span>}
                {featured.episodeCurrent && <span>{featured.episodeCurrent}</span>}
              </div>
              <div className="button-row">
                <button className="primary-button" type="button" onClick={() => playMovie(featured)}>
                  <Play size={19} fill="currentColor" /> Xem ngay
                </button>
                <button className="secondary-button" type="button" onClick={() => openMovie(featured)}>
                  Chi tiết
                </button>
              </div>
            </div>
          </section>
        )}

        {catalogMode === "home" && user && (
          <section className="profile-band">
            <div>
              <span className="eyebrow"><UserCircle size={16} /> Profile đang xem</span>
              <h2>{user.profiles.find(p => p.id === activeProfileId)?.name ?? user.profiles[0]?.name}</h2>
            </div>
            <div className="profile-list">
              {user.profiles.map((profile) => {
                const isActive = profile.id === activeProfileId;
                return (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => switchProfile(profile.id)}
                    className={isActive ? "profile-chip active" : "profile-chip"}
                  >
                    <img src={profile.avatarUrl} alt={profile.name} />
                    <span>{profile.name}</span>
                    {profile.isKids && <small>Kids</small>}
                  </button>
                );
              })}
            </div>
          </section>
        )}

        <section className="discovery-bar" id="catalog">
          <div><span className="eyebrow">Khám phá</span><h2>{catalogTitle}</h2></div>
          {catalogMode === "home" ? <div className="discovery-actions">
            <button className={catalogTitle === "Phim mới cập nhật" ? "active" : ""} onClick={loadHome}><Sparkles size={16}/> Mới nhất</button>
            <button className={catalogTitle.includes("Phim lẻ") ? "active" : ""} onClick={() => browseCollection("phim-le", "Phim lẻ tuyển chọn")}><Film size={16}/> Phim lẻ</button>
            <button className={catalogTitle.includes("Phim bộ") || catalogTitle.includes("Series") ? "active" : ""} onClick={() => browseCollection("phim-bo", "Series đang phát")}><Tv size={16}/> Phim bộ</button>
            <button className={catalogTitle.includes("Hoạt hình") ? "active" : ""} onClick={() => browseCollection("hoat-hinh", "Hoạt hình đặc sắc")}><Clapperboard size={16}/> Hoạt hình</button>
          </div> : <button className="catalog-back" type="button" onClick={loadHome}><ArrowLeft size={16}/> Về trang chủ</button>}
        </section>
        {catalogBusy && <div className="catalog-progress"><span/></div>}

        {catalogMode === "home" && user && watchlist.length > 0 && (
          <MovieRow title="Danh sách yêu thích của tôi" movies={watchlist} onOpen={openMovie} />
        )}

        {catalogMode === "home" && continueWatching.length > 0 && (
          <MovieRow title="Tiếp tục xem" movies={continueWatching} onOpen={openMovie} />
        )}
        {catalogMode === "home" ? <>
          <MovieRow title="Top phim hot 2026" movies={hotMovies.slice(0,12)} onOpen={openMovie} />
          <MovieRow title={catalogTitle} movies={trending} onOpen={openMovie} />
          <MovieRow title="Đề xuất cho bạn" movies={forYou} onOpen={openMovie} />
          {korean.length > 0 && <MovieRow title="Phim Hàn Quốc" movies={korean} onOpen={openMovie} />}
        </> : <div className="catalog-results"><MovieRow title={catalogTitle} movies={movies} onOpen={openMovie} /></div>}

        {catalogMode === "home" && <section className="admin-section" id="admin">
          <div>
            <span className="eyebrow"><LayoutDashboard size={16} /> Admin/CMS</span>
            <h2>Dashboard nội dung</h2>
            <p>Đăng nhập bằng tài khoản admin để xem thống kê tổng quan và phim hot.</p>
          </div>
          {adminStats ? (
            <div className="admin-grid">
              <div className="stat"><span>Người dùng</span><strong>{adminStats.totalUsers}</strong></div>
              <div className="stat"><span>Lượt xem</span><strong>{adminStats.totalViews.toLocaleString("vi-VN")}</strong></div>
              <div className="stat"><span>Doanh thu</span><strong>{adminStats.revenue.toLocaleString("vi-VN")}đ</strong></div>
            </div>
          ) : (
            <button className="primary-button" type="button" onClick={() => setShowLogin(true)}>
              <LogIn size={18} /> Đăng nhập admin
            </button>
          )}
        </section>}
      </main>

      <footer className="site-footer">
        <div className="site-footer__top"><button className="brand" type="button" onClick={loadHome}><span className="brand-mark">N</span><span>Nexa<span className="brand-accent">Play</span></span></button><p>Không gian giải trí trực tuyến với phim mới, phim bộ và nội dung tuyển chọn mỗi ngày.</p></div>
        <div className="site-footer__grid"><div><strong>Khám phá</strong><button onClick={loadHome}>Trang chủ</button><button onClick={()=>browseCollection("phim-le","Phim lẻ tuyển chọn")}>Phim lẻ</button><button onClick={()=>browseCollection("phim-bo","Phim bộ mới cập nhật")}>Phim bộ</button></div><div><strong>Thể loại nổi bật</strong>{genres.slice(0,4).map(genre=><button key={genre.id} onClick={()=>browseGenre(genre.slug)}>{genre.name}</button>)}</div><div><strong>Hỗ trợ</strong><span>Điều khoản sử dụng</span><span>Chính sách riêng tư</span><span>Liên hệ hỗ trợ</span></div><div><strong>NexaPlay</strong><span>Chất lượng HD–4K</span><span>Phụ đề đa ngôn ngữ</span><span>Xem trên mọi thiết bị</span></div></div>
        <div className="site-footer__bottom"><span>© 2026 NexaPlay. All rights reserved.</span><span>Nội dung được tổng hợp từ các nguồn cung cấp hợp pháp.</span></div>
      </footer>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} onLogin={login} onRegister={register} />}

      {selectedMovie && (
        <DetailPanel
          movie={selectedMovie}
          related={related}
          onClose={() => setSelectedMovie(null)}
          onPlay={(movie) => {
            setSelectedMovie(null);
            playMovie(movie);
          }}
          inWatchlist={watchlist.some((m) => m.id === selectedMovie.id)}
          onToggleWatchlist={toggleWatchlist}
          isUserLoggedIn={!!user}
          profileName={user?.profiles.find(profile => profile.id === activeProfileId)?.name}
        />
      )}

      {showAccount && user && <AccountCenter user={user} activeProfileId={activeProfileId} onClose={() => setShowAccount(false)} onUserChange={setUser} onProfileSwitch={switchProfile} onLogout={()=>void logout()} />}


      {activeVideoMovie && (
        <VideoPlayer
          key={activeVideoMovie.id}
          movie={activeVideoMovie}
          onClose={() => setActiveVideoMovie(null)}
          onProgress={handleProgress}
          onPlayMovie={playMovie}
          isUserLoggedIn={!!user}
          profileName={user?.profiles.find(profile => profile.id === activeProfileId)?.name}
          onRequireLogin={() => { setActiveVideoMovie(null); setShowLogin(true); }}
        />
      )}
    </>
  );
}
