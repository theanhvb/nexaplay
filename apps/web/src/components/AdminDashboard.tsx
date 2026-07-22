import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Archive,
  ArrowLeft,
  BarChart3,
  Check,
  ChevronDown,
  ChevronUp,
  Edit3,
  EyeOff,
  Film,
  KeyRound,
  LayoutDashboard,
  Lock,
  LogOut,
  MessageSquare,
  Moon,
  Plus,
  Search,
  ShieldCheck,
  Sun,
  Tags,
  Trash2,
  Unlock,
  Users,
  Wallet,
  X,
} from "lucide-react";
import type { Movie, User } from "../../../../packages/shared-types/src/index";
import { api } from "../services/api";

type Module =
  | "overview"
  | "content"
  | "users"
  | "genres"
  | "reviews"
  | "subscriptions"
  | "reports"
  | "settings";
type AdminPlan = {
  id: string;
  code: string;
  name: string;
  price: number;
  currency: string;
  billingInterval: "month" | "year";
  maxProfiles: number;
  maxConcurrentStreams: number;
  maxQuality: string;
  hasAds: boolean;
  allowDownload: boolean;
  downloadLimit: number;
  features: string[];
  isActive: boolean;
  activeSubscribers: number;
};
type AdminInvoice = {
  id: string;
  userId: string;
  planName: string;
  amount: number;
  currency: string;
  status: string;
  provider: string;
  transactionId: string;
  issuedAt: string;
  paidAt: string | null;
};
type AdminInvoiceDetail = AdminInvoice & {
  subscriptionId: string;
  subscriptionStatus: string;
  periodStart: string;
  periodEnd: string;
  actions: Array<{
    adminUserId: string;
    previousStatus: string;
    nextStatus: string;
    reason: string | null;
    createdAt: string;
  }>;
};
type BillingSummary = {
  activeSubscriptions: number;
  cancelling: number;
  monthlyRevenue: number;
  failedPayments: number;
};
type AdminReport = {
  days: number;
  totals: {
    users: number;
    views: number;
    watchMinutes: number;
    revenue: number;
  };
  daily: Array<{
    stat_date: string;
    new_users: number;
    total_views: number;
    watch_minutes: number;
    total_revenue: number;
    new_subscriptions?: number;
    cancelled_subscriptions?: number;
  }>;
  topContent: Array<{
    contentId: string;
    title: string;
    views: number;
    completionRate: number;
  }>;
};
type Stats = {
  totalUsers: number;
  totalViews: number;
  revenue: number;
  watchMinutes: number;
  topContent: Array<{
    contentId: string;
    title: string;
    views: number;
    completionRate: number;
  }>;
  trend: Array<{
    stat_date: string;
    new_users: number;
    total_views: number;
    total_revenue: number;
  }>;
};
type AdminUser = {
  id: string;
  email: string;
  displayName: string;
  role: string;
  status: string;
  subscriptionTier: string;
  lastLoginAt: string | null;
  createdAt: string;
  profileCount: number;
  activeDevices: number;
};
type AdminGenre = {
  id: string;
  name: string;
  slug: string;
  description?: string;
  active: boolean;
  position: number;
  _count: { movies: number };
};
type AdminReview = {
  id: string;
  movieId: string;
  movieTitle?: string;
  moviePosterUrl?: string;
  profileName: string;
  rating: number;
  content: string;
  spoiler: boolean;
  likeCount: number;
  reportCount: number;
  createdAt: string;
  status: string;
};
type ReviewSummary = {
  total: number;
  hidden: number;
  reported: number;
  average: number;
};
type ReviewPagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};
type UserPagination = ReviewPagination;
type SystemSettings = {
  max_concurrent_devices: number;
  email_notifications: boolean;
  push_notifications: boolean;
  maintenance_mode: boolean;
};
type AdminMovie = Movie & {
  releaseYear?: number;
  contentType?: "movie" | "series";
  directorLegacy?: string;
  genresLegacy?: string[];
  castLegacy?: string[];
  status?: string;
  updatedAt?: string;
  viewCount?: number;
};
type FormState = {
  title: string;
  originalTitle: string;
  description: string;
  year: number;
  durationMinutes: number;
  ageRating: string;
  type: "movie" | "series";
  director: string;
  posterUrl: string;
  backdropUrl: string;
  trailerUrl: string;
  genres: string;
  cast: string;
  isTrending: boolean;
  isFeatured: boolean;
  status: "draft" | "published" | "archived";
};
const emptyForm: FormState = {
  title: "",
  originalTitle: "",
  description: "",
  year: new Date().getFullYear(),
  durationMinutes: 100,
  ageRating: "13+",
  type: "movie",
  director: "Đang cập nhật",
  posterUrl: "https://placehold.co/420x630/15151b/777?text=NexaPlay",
  backdropUrl: "https://placehold.co/1280x720/15151b/777?text=NexaPlay",
  trailerUrl:
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
  genres: "Tâm lý",
  cast: "",
  isTrending: false,
  isFeatured: false,
  status: "draft",
};

function moduleFromPath(): Module {
  const segment = window.location.pathname.split("/")[2];
  return segment === "content" ||
    segment === "users" ||
    segment === "genres" ||
    segment === "reviews" ||
    segment === "subscriptions" ||
    segment === "reports" ||
    segment === "settings"
    ? segment
    : "overview";
}

export function AdminDashboard({onBack,theme,onToggleTheme,currentUser,onLogout}:{onBack:()=>void;theme:"dark"|"light";onToggleTheme:()=>void;currentUser:User;onLogout:()=>void}) {
  const [module, setModule] = useState<Module>(moduleFromPath),
    [stats, setStats] = useState<Stats | null>(null),
    [movies, setMovies] = useState<AdminMovie[]>([]),
    [users, setUsers] = useState<AdminUser[]>([]),
    [genres, setGenres] = useState<AdminGenre[]>([]),
    [reviews, setReviews] = useState<AdminReview[]>([]),
    [plans, setPlans] = useState<AdminPlan[]>([]),
    [invoices, setInvoices] = useState<AdminInvoice[]>([]),
    [billingSummary, setBillingSummary] = useState<BillingSummary | null>(null),
    [invoicePagination, setInvoicePagination] = useState<ReviewPagination>({
      page: 1,
      limit: 25,
      total: 0,
      totalPages: 1,
    }),
    [invoiceStatus, setInvoiceStatus] = useState(""),
    [invoiceQuery, setInvoiceQuery] = useState(""),
    [report, setReport] = useState<AdminReport | null>(null),
    [reportDays, setReportDays] = useState(30),
    [settings,setSettings]=useState<SystemSettings>({max_concurrent_devices:3,email_notifications:true,push_notifications:true,maintenance_mode:false}),
    [settingsSaved,setSettingsSaved]=useState<SystemSettings | null>(null),
    [settingsUpdatedAt,setSettingsUpdatedAt]=useState<string | null>(null),
    [reviewSummary, setReviewSummary] = useState<ReviewSummary>({
      total: 0,
      hidden: 0,
      reported: 0,
      average: 0,
    });
  const [reviewStatus, setReviewStatus] = useState(""),
    [reviewQuery, setReviewQuery] = useState(""),
    [reviewRating, setReviewRating] = useState(""),
    [reviewReported, setReviewReported] = useState(false),
    [reviewPage, setReviewPage] = useState(1),
    [reviewPagination, setReviewPagination] = useState<ReviewPagination>({
      page: 1,
      limit: 25,
      total: 0,
      totalPages: 1,
    }),
    [selectedReviews, setSelectedReviews] = useState<string[]>([]);
  const [query, setQuery] = useState(""),
    [userQuery, setUserQuery] = useState(""),
    [userStatus, setUserStatus] = useState(""),
    [userRole, setUserRole] = useState(""),
    [userTier, setUserTier] = useState(""),
    [userSort, setUserSort] = useState("newest"),
    [userPage, setUserPage] = useState(1),
    [userPagination, setUserPagination] = useState<UserPagination>({
      page: 1,
      limit: 25,
      total: 0,
      totalPages: 1,
    }),
    [form, setForm] = useState<FormState>(emptyForm),
    [editingId, setEditingId] = useState<string | null>(null),
    [showForm, setShowForm] = useState(false),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(false),
    [error, setError] = useState("");
  async function loadOverview() {
    const [analytics, accounts] = await Promise.all([
      api.adminStats(),
      api.adminUsers("?page=1&limit=1"),
    ]);
    setStats({ ...analytics, totalUsers: accounts.pagination.total });
  }
  async function loadContent() {
    const result = await api.adminContent("?page=1&limit=100");
    setMovies(result.items as AdminMovie[]);
  }
  async function loadUsers(page = userPage) {
    const params = new URLSearchParams({
      page: String(page),
      limit: "25",
      sort: userSort,
    });
    if (userQuery.trim()) params.set("search", userQuery.trim());
    if (userStatus) params.set("status", userStatus);
    if (userRole) params.set("role", userRole);
    if (userTier) params.set("tier", userTier);
    const result = await api.adminUsers(`?${params}`);
    setUsers(result.items);
    setUserPagination(result.pagination);
    setUserPage(result.pagination.page);
  }
  async function loadGenres() {
    setGenres(await api.adminGenres());
  }
  async function loadReviews(page = reviewPage) {
    const params = new URLSearchParams({
      page: String(page),
      limit: "25",
      sort: "newest",
    });
    if (reviewStatus) params.set("status", reviewStatus);
    if (reviewQuery.trim()) params.set("q", reviewQuery.trim());
    if (reviewRating) params.set("rating", reviewRating);
    if (reviewReported) params.set("reported", "true");
    const result = await api.adminReviews(`?${params}`);
    setReviews(result.items);
    setReviewSummary(result.summary);
    setReviewPagination(result.pagination);
    setReviewPage(result.pagination.page);
    setSelectedReviews([]);
  }
  async function loadBilling(page = 1) {
    const params = new URLSearchParams({ page: String(page), limit: "25" });
    if (invoiceStatus) params.set("status", invoiceStatus);
    if (invoiceQuery.trim()) params.set("q", invoiceQuery.trim());
    const [summary, planRows, invoiceRows] = await Promise.all([
      api.adminBillingSummary(),
      api.adminPlans(),
      api.adminInvoices(`?${params}`),
    ]);
    setBillingSummary(summary);
    setPlans(planRows);
    setInvoices(invoiceRows.items);
    setInvoicePagination(invoiceRows.pagination);
  }
  async function loadReports(days = reportDays) {
    setReport(await api.adminReports(days));
  }
  async function loadSettings(){
    const data=await api.adminSettings();
    const next={max_concurrent_devices:Number(data.max_concurrent_devices?.value??3),email_notifications:Boolean(data.email_notifications?.value??true),push_notifications:Boolean(data.push_notifications?.value??true),maintenance_mode:Boolean(data.maintenance_mode?.value??false)};
    setSettings(next);
    setSettingsSaved(next);
    const timestamps=Object.values(data).map(item=>item.updatedAt).filter((value):value is string=>Boolean(value)).sort();
    setSettingsUpdatedAt(timestamps.at(-1)??null);
  }
  async function load() {
    setLoading(true);
    setError("");
    try {
      if (module === "overview") await loadOverview();
      if (module === "content") await loadContent();
      if (module === "genres") await loadGenres();
      if (module === "reports") await loadReports();
      if (module === "settings") await loadSettings();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không tải được dữ liệu");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    void load();
  }, [module]);
  useEffect(() => {
    if (module !== "users") return;
    const timer = window.setTimeout(() => void loadUsers(1), 350);
    return () => window.clearTimeout(timer);
  }, [module, userQuery, userStatus, userRole, userTier, userSort]);
  useEffect(() => {
    if (module !== "reviews") return;
    const timer = window.setTimeout(() => void loadReviews(1), 350);
    return () => window.clearTimeout(timer);
  }, [module, reviewQuery, reviewStatus, reviewRating, reviewReported]);
  useEffect(() => {
    if (module !== "subscriptions") return;
    const timer = window.setTimeout(() => void loadBilling(1), 350);
    return () => window.clearTimeout(timer);
  }, [module, invoiceQuery, invoiceStatus]);
  useEffect(() => {
    const sync = () => setModule(moduleFromPath());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);
  function navigate(next: Module) {
    const path = next === "overview" ? "/admin" : `/admin/${next}`;
    window.history.pushState({}, "", path);
    setModule(next);
  }
  const filtered = useMemo(
    () =>
      movies.filter((movie) =>
        `${movie.title} ${movie.director ?? movie.directorLegacy ?? ""}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    [movies, query],
  );
  function adapt(movie: AdminMovie) {
    return {
      year: movie.year ?? movie.releaseYear ?? 2026,
      type: movie.type ?? movie.contentType ?? "movie",
      director: movie.director ?? movie.directorLegacy ?? "",
      genres: movie.genres ?? movie.genresLegacy ?? [],
      cast: movie.cast ?? movie.castLegacy ?? [],
    };
  }
  function openEdit(movie: AdminMovie) {
    const value = adapt(movie);
    setEditingId(movie.id);
    setForm({
      title: movie.title,
      originalTitle: movie.originalTitle ?? "",
      description: movie.description,
      year: value.year,
      durationMinutes: movie.durationMinutes,
      ageRating: movie.ageRating,
      type: value.type,
      director: value.director,
      posterUrl: movie.posterUrl,
      backdropUrl: movie.backdropUrl,
      trailerUrl: movie.trailerUrl,
      genres: value.genres.join(", "),
      cast: value.cast.join(", "),
      isTrending: movie.isTrending,
      isFeatured: movie.isFeatured,
      status: (movie.status as FormState["status"]) ?? "published",
    });
    setShowForm(true);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const payload = {
      ...form,
      genres: form.genres
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      cast: form.cast
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
    };
    try {
      if (editingId) await api.updateMovie(editingId, payload);
      else await api.createMovie(payload);
      setShowForm(false);
      setEditingId(null);
      setForm(emptyForm);
      await loadContent();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể lưu nội dung");
    } finally {
      setBusy(false);
    }
  }
  async function archive(movie: AdminMovie) {
    if (!confirm(`Chuyển “${movie.title}” vào lưu trữ?`)) return;
    await api.archiveMovie(movie.id);
    await loadContent();
  }
  async function toggleUser(user: AdminUser) {
    const next = user.status === "active" ? "suspended" : "active";
    if (
      !confirm(
        `${next === "suspended" ? "Khóa" : "Mở khóa"} tài khoản ${user.email}?`,
      )
    )
      return;
    try {
      await api.updateAdminUserStatus(user.id, next);
      await loadUsers();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Không cập nhật được người dùng",
      );
    }
  }
  async function changeRole(user: AdminUser, role: string) {
    try {
      await api.updateAdminUserRole(user.id, role);
      await loadUsers();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không cập nhật được quyền");
    }
  }
  async function saveGenre(
    genre: AdminGenre | null,
    value: { name: string; slug: string; description: string },
  ) {
    try {
      if (genre) await api.updateAdminGenre(genre.id, value);
      else
        await api.createAdminGenre({
          ...value,
          active: true,
          position: genres.length,
        });
      await loadGenres();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không lưu được thể loại");
      throw e;
    }
  }
  async function toggleGenre(genre: AdminGenre) {
    await api.updateAdminGenre(genre.id, { active: !genre.active });
    await loadGenres();
  }
  async function deleteGenre(genre: AdminGenre) {
    if (!confirm(`Xóa thể loại “${genre.name}”?`)) return;
    try {
      await api.deleteAdminGenre(genre.id);
      await loadGenres();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không xóa được thể loại");
    }
  }
  async function moveGenre(index: number, direction: number) {
    const next = index + direction;
    if (next < 0 || next >= genres.length) return;
    const reordered = [...genres];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    setGenres(reordered);
    try {
      await api.reorderAdminGenres(reordered.map((x) => x.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không sắp xếp được thể loại");
      await loadGenres();
    }
  }
  async function moderate(
    id: string,
    status: "approved" | "hidden" | "rejected",
  ) {
    try {
      await api.moderateReview(id, status);
      await loadReviews();
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Không kiểm duyệt được đánh giá",
      );
    }
  }
  async function removeReview(id: string) {
    if (!confirm("Xóa vĩnh viễn đánh giá này?")) return;
    try {
      await api.deleteAdminReview(id);
      await loadReviews();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không xóa được đánh giá");
    }
  }
  async function bulkModerate(status: "approved" | "hidden" | "rejected") {
    if (!selectedReviews.length) return;
    try {
      await api.bulkModerateReviews(selectedReviews, status);
      await loadReviews();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Không thể xử lý hàng loạt");
    }
  }
  async function createPasswordReset(user:AdminUser){try{const result=await api.createAdminPasswordReset(user.id);await navigator.clipboard.writeText(result.resetToken);window.alert(`Đã tạo và sao chép mã đặt lại cho ${user.email}.\n\nMã có hiệu lực ${result.expiresInMinutes} phút. Chỉ gửi mã sau khi đã xác minh người dùng.`)}catch(e){setError(e instanceof Error?e.message:"Không thể tạo mã đặt lại")}}

  return (
    <main className="admin-workspace">
      <div className="admin-environment-ribbon"><ShieldCheck/> KHU VỰC QUẢN TRỊ · THAO TÁC ẢNH HƯỞNG DỮ LIỆU THẬT</div>
      <aside className="admin-sidebar">
        <button
          className="admin-sidebar__brand"
          onClick={onBack}
          aria-label="Về trang chủ NexaPlay"
        >
          <span>N</span>
          <b>
            NexaPlay<em>Admin</em>
          </b>
        </button>
        <nav>
          <button
            className={module === "overview" ? "active" : ""}
            onClick={() => navigate("overview")}
          >
            <LayoutDashboard />
            Tổng quan
          </button>
          <button
            className={module === "content" ? "active" : ""}
            onClick={() => navigate("content")}
          >
            <Film />
            Nội dung
          </button>
          <button
            className={module === "genres" ? "active" : ""}
            onClick={() => navigate("genres")}
          >
            <Tags />
            Thể loại
          </button>
          <button
            className={module === "users" ? "active" : ""}
            onClick={() => navigate("users")}
          >
            <Users />
            Người dùng
          </button>
          <button
            className={module === "reviews" ? "active" : ""}
            onClick={() => navigate("reviews")}
          >
            <MessageSquare />
            Đánh giá
          </button>
          <button
            className={module === "subscriptions" ? "active" : ""}
            onClick={() => navigate("subscriptions")}
          >
            <Wallet />
            Gói & giao dịch
          </button>
          <button
            className={module === "reports" ? "active" : ""}
            onClick={() => navigate("reports")}
          >
            <BarChart3 />
            Báo cáo
          </button>
          <button className={module==="settings"?"active":""} onClick={()=>navigate("settings")}><ShieldCheck/>Cài đặt</button>
        </nav>
        <div className="admin-session-card"><span>{currentUser.displayName.slice(0,1).toUpperCase()}</span><div><b>{currentUser.displayName}</b><small>{currentUser.role.replace("_"," ")}</small></div></div>
        <button className="admin-sidebar__back admin-theme-toggle" onClick={onToggleTheme}>
          {theme==="dark"?<Sun/>:<Moon/>}
          {theme==="dark"?"Giao diện sáng":"Giao diện tối"}
        </button>
        <button className="admin-sidebar__back" onClick={onBack}>
          <ArrowLeft />
          Về trang xem phim
        </button>
        <button className="admin-sidebar__back admin-logout" onClick={onLogout}><LogOut/>Đăng xuất quản trị</button>
      </aside>
      <section className="admin-main">
        <header className="admin-page-header">
          <div>
            <span className="eyebrow">Control Center</span>
            <h1>
              {module === "overview"
                ? "Tổng quan vận hành"
                : module === "content"
                  ? "Quản lý nội dung"
                  : module === "users"
                    ? "Quản lý người dùng"
                    : module === "genres"
                      ? "Quản lý thể loại"
                      : module === "reviews"
                        ? "Quản lý đánh giá"
                        : module === "subscriptions"
                          ? "Gói và giao dịch"
                          : module === "reports"
                            ? "Báo cáo vận hành"
                            : "Cài đặt hệ thống"}
            </h1>
            <p>
              {module === "overview"
                ? "Theo dõi dữ liệu phát sinh từ hệ thống."
                : module === "content"
                  ? "Tạo, chỉnh sửa, xuất bản và lưu trữ phim."
                  : module === "users"
                    ? "Kiểm soát tài khoản, thiết bị và quyền truy cập."
                    : module === "genres"
                      ? "Tổ chức danh mục hiển thị trên website."
                      : module === "reviews"
                        ? "Theo dõi và xử lý các bình luận vi phạm."
                        : module === "subscriptions"
                          ? "Quản lý sản phẩm thuê bao và đối soát thanh toán."
                          : module === "reports"
                            ? "Phân tích người dùng, lượt xem và doanh thu theo thời gian."
                            : "Điều chỉnh chính sách vận hành toàn hệ thống."}
            </p>
          </div>
          {module === "content" && (
            <button
              className="primary-button"
              onClick={() => {
                setEditingId(null);
                setForm(emptyForm);
                setShowForm(true);
              }}
            >
              <Plus />
              Thêm phim
            </button>
          )}
        </header>
        {error && <p className="admin-error">{error}</p>}
        {loading && <div className="admin-loading">Đang tải dữ liệu...</div>}
        {!loading && module === "overview" && <Overview stats={stats} />}{" "}
        {!loading && module === "content" && (
          <ContentTable
            movies={filtered}
            query={query}
            setQuery={setQuery}
            openEdit={openEdit}
            archive={archive}
          />
        )}{" "}
        {!loading && module === "users" && (
          <UsersTable
            users={users}
            pagination={userPagination}
            query={userQuery}
            setQuery={setUserQuery}
            status={userStatus}
            setStatus={setUserStatus}
            role={userRole}
            setRole={setUserRole}
            tier={userTier}
            setTier={setUserTier}
            sort={userSort}
            setSort={setUserSort}
            reload={() => loadUsers(1)}
            goPage={loadUsers}
            toggle={toggleUser}
            changeRole={changeRole}
            createPasswordReset={createPasswordReset}
          />
        )}{" "}
        {!loading && module === "genres" && (
          <GenresTable
            genres={genres}
            save={saveGenre}
            toggle={toggleGenre}
            remove={deleteGenre}
            move={moveGenre}
          />
        )}{" "}
        {!loading && module === "reviews" && (
          <ReviewsTable
            reviews={reviews}
            summary={reviewSummary}
            pagination={reviewPagination}
            status={reviewStatus}
            setStatus={setReviewStatus}
            query={reviewQuery}
            setQuery={setReviewQuery}
            rating={reviewRating}
            setRating={setReviewRating}
            reported={reviewReported}
            setReported={setReviewReported}
            selected={selectedReviews}
            setSelected={setSelectedReviews}
            reload={() => loadReviews(1)}
            goPage={loadReviews}
            bulkModerate={bulkModerate}
            moderate={moderate}
            remove={removeReview}
          />
        )}{" "}
        {!loading && module === "subscriptions" && (
          <BillingPanel
            summary={billingSummary}
            plans={plans}
            invoices={invoices}
            pagination={invoicePagination}
            status={invoiceStatus}
            setStatus={setInvoiceStatus}
            query={invoiceQuery}
            setQuery={setInvoiceQuery}
            reload={() => loadBilling(1)}
            goPage={loadBilling}
            save={async (id, payload) => {
              await api.saveAdminPlan(id, payload);
              await loadBilling(invoicePagination.page);
            }}
          />
        )}{" "}
        {!loading && module === "reports" && (
          <ReportsPanel
            report={report}
            days={reportDays}
            changeDays={(days) => {
              setReportDays(days);
              void loadReports(days);
            }}
          />
        )}{" "}
        {!loading&&module==="settings"&&<SettingsPanel value={settings} savedValue={settingsSaved} updatedAt={settingsUpdatedAt} setValue={setSettings} reset={()=>settingsSaved&&setSettings(settingsSaved)} save={async()=>{await api.saveAdminSettings(settings);await loadSettings()}}/>}{" "}
      </section>
      {showForm && (
        <MovieForm
          form={form}
          setForm={setForm}
          editing={!!editingId}
          busy={busy}
          close={() => setShowForm(false)}
          save={save}
        />
      )}{" "}
    </main>
  );
}

function Overview({ stats }: { stats: Stats | null }) {
  return (
    <>
      <section className="admin-kpis">
        <article>
          <Users />
          <span>Người dùng phát sinh</span>
          <strong>{stats?.totalUsers.toLocaleString("vi-VN") ?? "—"}</strong>
        </article>
        <article>
          <Film />
          <span>Lượt xem ghi nhận</span>
          <strong>{stats?.totalViews.toLocaleString("vi-VN") ?? "—"}</strong>
        </article>
        <article>
          <Wallet />
          <span>Doanh thu ghi nhận</span>
          <strong>
            {stats ? `${stats.revenue.toLocaleString("vi-VN")}đ` : "—"}
          </strong>
        </article>
        <article>
          <BarChart3 />
          <span>Phút đã xem</span>
          <strong>{stats?.watchMinutes.toLocaleString("vi-VN") ?? "—"}</strong>
        </article>
      </section>
      <section className="admin-content-grid">
        <article className="admin-panel">
          <span className="eyebrow">Hiệu suất nội dung</span>
          <h2>Top phim theo lượt xem</h2>
          <div className="performance-list">
            {stats?.topContent.map((item, index) => (
              <div key={item.contentId}>
                <strong>#{index + 1}</strong>
                <span>
                  {item.title}
                  <small>{item.completionRate}% hoàn thành</small>
                </span>
                <b>{item.views.toLocaleString("vi-VN")}</b>
              </div>
            ))}
          </div>
        </article>
        <article className="admin-panel">
          <span className="eyebrow">14 ngày gần nhất</span>
          <h2>Xu hướng lượt xem</h2>
          <div className="trend-bars">
            {stats?.trend.map((item) => {
              const max = Math.max(...stats.trend.map((x) => x.total_views), 1);
              return (
                <div key={item.stat_date}>
                  <span
                    style={{
                      height: `${Math.max(8, (item.total_views / max) * 100)}%`,
                    }}
                  />
                  <small>
                    {new Date(item.stat_date).toLocaleDateString("vi-VN", {
                      day: "2-digit",
                      month: "2-digit",
                    })}
                  </small>
                </div>
              );
            })}
          </div>
        </article>
      </section>
    </>
  );
}
function ContentTable({
  movies,
  query,
  setQuery,
  openEdit,
  archive,
}: {
  movies: AdminMovie[];
  query: string;
  setQuery: (v: string) => void;
  openEdit: (m: AdminMovie) => void;
  archive: (m: AdminMovie) => void;
}) {
  return (
    <section className="admin-panel catalog-manager">
      <div className="admin-panel__heading">
        <div>
          <span className="eyebrow">PostgreSQL Catalog</span>
          <h2>{movies.length} nội dung</h2>
        </div>
        <label className="admin-search">
          <Search />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            list="admin-movie-suggestions"
            placeholder="Tìm tên phim, đạo diễn..."
          />
          <datalist id="admin-movie-suggestions">
            {movies.slice(0, 10).map((movie) => (
              <option key={movie.id} value={movie.title} />
            ))}
          </datalist>
        </label>
      </div>
      <div className="admin-movie-table">
        <div className="admin-table-row admin-table-head">
          <span>Nội dung</span>
          <span>Phân loại</span>
          <span>Hiệu suất</span>
          <span>Trạng thái</span>
          <span>Thao tác</span>
        </div>
        {movies.map((movie) => {
          const v = {
            year: movie.year ?? movie.releaseYear,
            type: movie.type ?? movie.contentType,
            director: movie.director ?? movie.directorLegacy,
          };
          return (
            <div className="admin-table-row" key={movie.id}>
              <span className="admin-movie-cell">
                <img src={movie.posterUrl} />
                <span>
                  <strong>{movie.title}</strong>
                  <small>
                    {v.director} · {v.year}
                  </small>
                </span>
              </span>
              <span>
                {v.type === "series" ? "Phim bộ" : "Phim lẻ"}
                <small>{movie.durationMinutes} phút</small>
              </span>
              <span>
                <b>{Number(movie.rating)}/10</b>
                <small>
                  {Number(movie.viewCount ?? 0).toLocaleString("vi-VN")} lượt
                  xem
                </small>
              </span>
              <span>
                <i className={`status-live ${movie.status ?? "published"}`}>
                  {movie.status ?? "published"}
                </i>
              </span>
              <span className="admin-row-actions">
                <button onClick={() => openEdit(movie)}>
                  <Edit3 />
                </button>
                <button onClick={() => archive(movie)}>
                  <Archive />
                </button>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
function LegacyUsersTable({
  users,
  query,
  setQuery,
  reload,
  toggle,
  changeRole,
  createPasswordReset,
}: {
  users: AdminUser[];
  query: string;
  setQuery: (v: string) => void;
  reload: () => void;
  toggle: (u: AdminUser) => void;
  changeRole: (u: AdminUser, r: string) => void;
  createPasswordReset: (u:AdminUser)=>void;
}) {
  return (
    <section className="admin-panel catalog-manager">
      <div className="admin-panel__heading">
        <div>
          <span className="eyebrow">Identity Database</span>
          <h2>{users.length} tài khoản</h2>
        </div>
        <div className="admin-user-search">
          <label className="admin-search">
            <Search />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Email hoặc tên..."
            />
          </label>
          <button className="secondary-button" onClick={reload}>
            Tìm
          </button>
        </div>
      </div>
      <div className="admin-users-table">
        <div className="admin-user-row admin-table-head">
          <span>Người dùng</span>
          <span>Gói</span>
          <span>Profile / Thiết bị</span>
          <span>Vai trò</span>
          <span>Trạng thái</span>
          <span>Thao tác</span>
        </div>
        {users.map((user) => (
          <div className="admin-user-row" key={user.id}>
            <span>
              <strong>{user.displayName}</strong>
              <small>{user.email}</small>
            </span>
            <b>{user.subscriptionTier}</b>
            <span>
              {user.profileCount} profile
              <small>{user.activeDevices} thiết bị hoạt động</small>
            </span>
            <select
              value={user.role}
              onChange={(e) => changeRole(user, e.target.value)}
            >
              <option value="user">Người dùng</option>
              <option value="support">Hỗ trợ</option>
              <option value="content_editor">Biên tập</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin cũ</option>
            </select>
            <i className={`user-status ${user.status}`}>
              {user.status === "active" ? "Hoạt động" : "Đã khóa"}
            </i>
            <span className="admin-row-actions"><button className="admin-lock-button" title="Tạo mã đặt lại mật khẩu" onClick={()=>void createPasswordReset(user)}><KeyRound/>Mã reset</button><button className="admin-lock-button" onClick={() => toggle(user)}>
              {user.status === "active" ? (
                <>
                  <Lock />
                  Khóa
                </>
              ) : (
                <>
                  <Unlock />
                  Mở khóa
                </>
              )}
            </button></span>
          </div>
        ))}
      </div>
    </section>
  );
}
function UsersTable({
  users,
  pagination,
  query,
  setQuery,
  status,
  setStatus,
  role,
  setRole,
  tier,
  setTier,
  sort,
  setSort,
  reload,
  goPage,
  toggle,
  changeRole,
  createPasswordReset,
}: {
  users: AdminUser[];
  pagination: UserPagination;
  query: string;
  setQuery: (v: string) => void;
  status: string;
  setStatus: (v: string) => void;
  role: string;
  setRole: (v: string) => void;
  tier: string;
  setTier: (v: string) => void;
  sort: string;
  setSort: (v: string) => void;
  reload: () => void;
  goPage: (p: number) => void;
  toggle: (u: AdminUser) => void;
  changeRole: (u: AdminUser, r: string) => void;
  createPasswordReset: (u:AdminUser)=>void;
}) {
  return (
    <section className="admin-panel catalog-manager">
      <div className="admin-panel__heading admin-user-heading">
        <div>
          <span className="eyebrow">Identity Database</span>
          <h2>Quản lý người dùng</h2>
          <small>
            {pagination.total.toLocaleString("vi-VN")} tài khoản trong hệ thống
          </small>
        </div>
        <div className="admin-user-filters">
          <label className="admin-search">
            <Search />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              list="admin-user-suggestions"
              placeholder="Tìm chính xác theo email hoặc tên..."
            />
            <datalist id="admin-user-suggestions">
              {users.slice(0, 10).flatMap((user) => [
                <option key={`${user.id}-email`} value={user.email} />,
                <option key={`${user.id}-name`} value={user.displayName} />,
              ])}
            </datalist>
          </label>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Mọi trạng thái</option>
            <option value="active">Hoạt động</option>
            <option value="suspended">Đã khóa</option>
          </select>
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="">Mọi vai trò</option>
            <option value="user">Người dùng</option>
            <option value="support">Hỗ trợ</option>
            <option value="content_editor">Biên tập</option>
            <option value="super_admin">Super Admin</option>
          </select>
          <select value={tier} onChange={(e) => setTier(e.target.value)}>
            <option value="">Mọi gói</option>
            <option value="free">Free</option>
            <option value="basic">Basic</option>
            <option value="standard">Standard</option>
            <option value="premium">Premium</option>
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="newest">Mới đăng ký</option>
            <option value="last_login">Mới hoạt động</option>
            <option value="oldest">Cũ nhất</option>
          </select>
        </div>
      </div>
      <div className="admin-users-table">
        <div className="admin-user-row admin-table-head">
          <span>Người dùng</span>
          <span>Gói</span>
          <span>Profile / Thiết bị</span>
          <span>Vai trò</span>
          <span>Trạng thái</span>
          <span>Thao tác</span>
        </div>
        {users.map((user) => (
          <div className="admin-user-row" key={user.id}>
            <span>
              <strong>{user.displayName}</strong>
              <small>{user.email}</small>
              <small>
                Tham gia {new Date(user.createdAt).toLocaleDateString("vi-VN")}
              </small>
              <button className="admin-lock-button admin-reset-button" onClick={()=>void createPasswordReset(user)}><KeyRound/>Tạo mã reset</button>
            </span>
            <b>{user.subscriptionTier}</b>
            <span>
              {user.profileCount} profile
              <small>{user.activeDevices} thiết bị hoạt động</small>
              <small>
                {user.lastLoginAt
                  ? `Truy cập ${new Date(user.lastLoginAt).toLocaleDateString("vi-VN")}`
                  : "Chưa đăng nhập"}
              </small>
            </span>
            <select
              value={user.role}
              onChange={(e) => changeRole(user, e.target.value)}
            >
              <option value="user">Người dùng</option>
              <option value="support">Hỗ trợ</option>
              <option value="content_editor">Biên tập</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin cũ</option>
            </select>
            <i className={`user-status ${user.status}`}>
              {user.status === "active" ? "Hoạt động" : "Đã khóa"}
            </i>
            <button className="admin-lock-button" onClick={() => toggle(user)}>
              {user.status === "active" ? (
                <>
                  <Lock />
                  Khóa
                </>
              ) : (
                <>
                  <Unlock />
                  Mở khóa
                </>
              )}
            </button>
          </div>
        ))}
        {!users.length && (
          <div className="admin-empty">Không có tài khoản phù hợp bộ lọc.</div>
        )}
      </div>
      {pagination.totalPages > 1 && (
        <div className="admin-pagination">
          <button
            disabled={pagination.page <= 1}
            onClick={() => goPage(pagination.page - 1)}
          >
            Trang trước
          </button>
          <span>
            Trang {pagination.page}/{pagination.totalPages}
          </span>
          <button
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => goPage(pagination.page + 1)}
          >
            Trang sau
          </button>
        </div>
      )}
    </section>
  );
}

function LegacyReviewsTable({
  reviews,
  summary,
  status,
  setStatus,
  reload,
  moderate,
  remove,
}: {
  reviews: AdminReview[];
  summary: { total: number; pending: number; average: number };
  status: string;
  setStatus: (v: string) => void;
  reload: () => void;
  moderate: (id: string, s: "approved" | "hidden" | "rejected") => void;
  remove: (id: string) => void;
}) {
  return (
    <>
      <section className="review-admin-summary">
        <article>
          <span>Tổng đánh giá</span>
          <strong>{summary.total}</strong>
        </article>
        <article>
          <span>Chờ duyệt</span>
          <strong>{summary.pending}</strong>
        </article>
        <article>
          <span>Điểm trung bình</span>
          <strong>{summary.average}/5</strong>
        </article>
      </section>
      <section className="admin-panel catalog-manager">
        <div className="admin-panel__heading">
          <div>
            <span className="eyebrow">Review Service</span>
            <h2>Hàng đợi kiểm duyệt</h2>
          </div>
          <div className="admin-user-search">
            <select
              className="admin-review-filter"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="pending">Chờ duyệt</option>
              <option value="approved">Đã duyệt</option>
              <option value="hidden">Đã ẩn</option>
              <option value="rejected">Từ chối</option>
            </select>
            <button className="secondary-button" onClick={reload}>
              Lọc
            </button>
          </div>
        </div>
        <div className="admin-review-list">
          {reviews.map((review) => (
            <article key={review.id}>
              <header>
                <span>
                  <strong>{review.profileName}</strong>
                  <small>
                    {new Date(review.createdAt).toLocaleString("vi-VN")} · Phim:{" "}
                    {review.movieId}
                  </small>
                </span>
                <b>
                  {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </b>
              </header>
              <p>{review.content}</p>
              <footer>
                <i className={`review-state ${review.status}`}>
                  {review.status}
                </i>
                <span>
                  {review.likeCount} lượt hữu ích
                  {review.spoiler ? " · Có spoiler" : ""}
                </span>
                <div>
                  {review.status !== "approved" && (
                    <button
                      className="approve"
                      onClick={() => moderate(review.id, "approved")}
                    >
                      <Check />
                      Duyệt
                    </button>
                  )}
                  <button onClick={() => moderate(review.id, "hidden")}>
                    <EyeOff />
                    Ẩn
                  </button>
                  <button onClick={() => moderate(review.id, "rejected")}>
                    <X />
                    Từ chối
                  </button>
                  <button className="danger" onClick={() => remove(review.id)}>
                    <Trash2 />
                    Xóa
                  </button>
                </div>
              </footer>
            </article>
          ))}
          {!reviews.length && (
            <div className="admin-empty">Không có đánh giá phù hợp bộ lọc.</div>
          )}
        </div>
      </section>
    </>
  );
}
function ReviewsTable({
  reviews,
  summary,
  pagination,
  status,
  setStatus,
  query,
  setQuery,
  rating,
  setRating,
  reported,
  setReported,
  selected,
  setSelected,
  reload,
  goPage,
  bulkModerate,
  moderate,
  remove,
}: {
  reviews: AdminReview[];
  summary: ReviewSummary;
  pagination: ReviewPagination;
  status: string;
  setStatus: (v: string) => void;
  query: string;
  setQuery: (v: string) => void;
  rating: string;
  setRating: (v: string) => void;
  reported: boolean;
  setReported: (v: boolean) => void;
  selected: string[];
  setSelected: (v: string[]) => void;
  reload: () => void;
  goPage: (page: number) => void;
  bulkModerate: (status: "approved" | "hidden" | "rejected") => void;
  moderate: (id: string, status: "approved" | "hidden" | "rejected") => void;
  remove: (id: string) => void;
}) {
  const allSelected =
    reviews.length > 0 && reviews.every((item) => selected.includes(item.id));
  const toggle = (id: string) =>
    setSelected(
      selected.includes(id)
        ? selected.filter((item) => item !== id)
        : [...selected, id],
    );
  return (
    <>
      <section className="review-admin-summary">
        <article>
          <span>Tổng bình luận</span>
          <strong>{summary.total}</strong>
        </article>
        <article>
          <span>Bị báo cáo</span>
          <strong>{summary.reported}</strong>
        </article>
        <article>
          <span>Đang ẩn</span>
          <strong>{summary.hidden}</strong>
        </article>
        <article>
          <span>Điểm trung bình</span>
          <strong>{summary.average}/5</strong>
        </article>
      </section>
      <section className="admin-panel catalog-manager">
        <div className="admin-panel__heading admin-review-heading">
          <div>
            <span className="eyebrow">Moderation by exception</span>
            <h2>Quản lý bình luận</h2>
            <small>
              {pagination.total.toLocaleString("vi-VN")} kết quả · Bình luận
              được đăng ngay, không cần duyệt trước
            </small>
          </div>
          <div className="admin-review-toolbar">
            <label className="admin-search">
              <Search />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                list="admin-review-suggestions"
                placeholder="Nội dung, người dùng, tên phim..."
              />
              <datalist id="admin-review-suggestions">
                {reviews.slice(0, 10).flatMap((review) => [
                  <option key={`${review.id}-user`} value={review.profileName} />,
                  ...(review.movieTitle
                    ? [<option key={`${review.id}-movie`} value={review.movieTitle} />]
                    : []),
                ])}
              </datalist>
            </label>
            <select
              className="admin-review-filter"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Tất cả trạng thái</option>
              <option value="approved">Đang hiển thị</option>
              <option value="hidden">Đã ẩn</option>
              <option value="rejected">Đã từ chối</option>
            </select>
            <select
              className="admin-review-filter"
              value={rating}
              onChange={(e) => setRating(e.target.value)}
            >
              <option value="">Mọi điểm số</option>
              {[5, 4, 3, 2, 1].map((value) => (
                <option key={value} value={value}>
                  {value} sao
                </option>
              ))}
            </select>
            <label className="reported-only">
              <input
                type="checkbox"
                checked={reported}
                onChange={(e) => setReported(e.target.checked)}
              />{" "}
              Chỉ mục bị báo cáo
            </label>
          </div>
        </div>
        {selected.length > 0 && (
          <div className="review-bulk-bar">
            <strong>Đã chọn {selected.length}</strong>
            <button onClick={() => bulkModerate("hidden")}>
              <EyeOff />
              Ẩn
            </button>
            <button onClick={() => bulkModerate("approved")}>
              <Check />
              Khôi phục
            </button>
            <button onClick={() => setSelected([])}>Bỏ chọn</button>
          </div>
        )}
        <div className="admin-review-list">
          {reviews.length > 0 && (
            <label className="review-select-all">
              <input
                type="checkbox"
                checked={allSelected}
                onChange={() =>
                  setSelected(allSelected ? [] : reviews.map((item) => item.id))
                }
              />{" "}
              Chọn tất cả trên trang
            </label>
          )}
          {reviews.map((review) => (
            <article key={review.id}>
              <header>
                <input
                  type="checkbox"
                  checked={selected.includes(review.id)}
                  onChange={() => toggle(review.id)}
                />
                {review.moviePosterUrl && (
                  <img
                    className="admin-review-poster"
                    src={review.moviePosterUrl}
                    alt=""
                  />
                )}
                <span className="admin-review-identity">
                  <strong>{review.movieTitle || review.movieId}</strong>
                  <small>
                    {review.profileName} ·{" "}
                    {new Date(review.createdAt).toLocaleString("vi-VN")}
                  </small>
                </span>
                <b>
                  {"★".repeat(review.rating)}
                  {"☆".repeat(5 - review.rating)}
                </b>
              </header>
              <p>{review.content}</p>
              <footer>
                <i className={`review-state ${review.status}`}>
                  {review.status === "approved"
                    ? "Đang hiển thị"
                    : review.status === "hidden"
                      ? "Đã ẩn"
                      : "Từ chối"}
                </i>
                <span>
                  {review.reportCount > 0 && (
                    <b className="review-report-count">
                      {review.reportCount} báo cáo ·{" "}
                    </b>
                  )}
                  {review.likeCount} lượt hữu ích
                  {review.spoiler ? " · Có spoiler" : ""}
                </span>
                <div>
                  {review.status !== "approved" && (
                    <button
                      className="approve"
                      onClick={() => moderate(review.id, "approved")}
                    >
                      <Check />
                      Khôi phục
                    </button>
                  )}
                  {review.status !== "hidden" && (
                    <button onClick={() => moderate(review.id, "hidden")}>
                      <EyeOff />
                      Ẩn
                    </button>
                  )}
                  <button className="danger" onClick={() => remove(review.id)}>
                    <Trash2 />
                    Xóa
                  </button>
                </div>
              </footer>
            </article>
          ))}
          {!reviews.length && (
            <div className="admin-empty">
              Không có bình luận phù hợp bộ lọc.
            </div>
          )}
        </div>
        {pagination.totalPages > 1 && (
          <div className="admin-pagination">
            <button
              disabled={pagination.page <= 1}
              onClick={() => goPage(1)}
            >
              Trang đầu
            </button>
            <button
              disabled={pagination.page <= 1}
              onClick={() => goPage(pagination.page - 1)}
            >
              Trang trước
            </button>
            <span>
              Trang {pagination.page}/{pagination.totalPages} · Hiển thị{" "}
              {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)} /{" "}
              {pagination.total.toLocaleString("vi-VN")}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => goPage(pagination.page + 1)}
            >
              Trang sau
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => goPage(pagination.totalPages)}
            >
              Trang cuối
            </button>
          </div>
        )}
      </section>
    </>
  );
}

function SettingsPanel({value,savedValue,updatedAt,setValue,reset,save}:{value:SystemSettings;savedValue:SystemSettings|null;updatedAt:string|null;setValue:(v:SystemSettings)=>void;reset:()=>void;save:()=>Promise<void>}) {
  const [saving,setSaving]=useState(false),[message,setMessage]=useState("");
  const dirty=Boolean(savedValue&&JSON.stringify(value)!==JSON.stringify(savedValue));
  const submit=async(e:FormEvent)=>{
    e.preventDefault();
    if(value.maintenance_mode&&!savedValue?.maintenance_mode&&!confirm("Bật chế độ bảo trì? Người dùng có thể bị gián đoạn truy cập."))return;
    setSaving(true);setMessage("");
    try{await save();setMessage("Đã lưu cấu hình thành công.")}
    catch(error){setMessage(error instanceof Error?error.message:"Không thể lưu cấu hình.")}
    finally{setSaving(false)}
  };
  return <form className="admin-panel system-settings" onSubmit={submit}>
    <div className="admin-panel__heading"><div><span className="eyebrow">Cấu hình vận hành</span><h2>Chính sách hệ thống</h2><small>{updatedAt?`Cập nhật gần nhất ${new Date(updatedAt).toLocaleString("vi-VN")}`:"Thay đổi được lưu trong PostgreSQL."}</small></div><i className={`settings-state ${dirty?"dirty":"saved"}`}>{dirty?"Có thay đổi chưa lưu":"Đã đồng bộ"}</i></div>
    {value.maintenance_mode&&<div className="maintenance-warning"><strong>Chế độ bảo trì đang được chọn</strong><span>Hãy kiểm tra các dịch vụ trước khi lưu thay đổi này.</span></div>}
    <div className="settings-section"><h3>Truy cập và phiên đăng nhập</h3><div className="settings-grid"><label><span><strong>Thiết bị đăng nhập đồng thời</strong><small>Khi đăng nhập vượt giới hạn, phiên hoạt động cũ nhất sẽ bị thu hồi.</small></span><input type="number" min={1} max={20} value={value.max_concurrent_devices} onChange={e=>setValue({...value,max_concurrent_devices:Number(e.target.value)})}/></label></div></div>
    <div className="settings-section"><h3>Kênh thông báo</h3><div className="settings-grid"><label><span><strong>Thông báo email</strong><small>Cho phép hàng đợi gửi email giao dịch và hệ thống.</small></span><input type="checkbox" checked={value.email_notifications} onChange={e=>setValue({...value,email_notifications:e.target.checked})}/></label><label><span><strong>Thông báo đẩy</strong><small>Cho phép gửi push notification đến thiết bị.</small></span><input type="checkbox" checked={value.push_notifications} onChange={e=>setValue({...value,push_notifications:e.target.checked})}/></label></div></div>
    <div className="settings-section danger-zone"><h3>Vận hành khẩn cấp</h3><div className="settings-grid"><label className="danger-setting"><span><strong>Chế độ bảo trì</strong><small>Dùng khi triển khai hoặc xử lý sự cố cần tạm dừng truy cập người dùng.</small></span><input type="checkbox" checked={value.maintenance_mode} onChange={e=>setValue({...value,maintenance_mode:e.target.checked})}/></label></div></div>
    <footer><span className={message&&message!=="Đã lưu cấu hình thành công."?"settings-error":""}>{message}</span><button type="button" className="secondary-button" disabled={!dirty||saving} onClick={()=>{reset();setMessage("")}}>Hoàn tác</button><button className="primary-button" disabled={!dirty||saving}>{saving?"Đang lưu...":"Lưu thay đổi"}</button></footer>
  </form>
}

function ReportsPanel({
  report,
  days,
  changeDays,
}: {
  report: AdminReport | null;
  days: number;
  changeDays: (d: number) => void;
}) {
  const exportCsv = () => {
    if (!report) return;
    const rows = [
      ["Ngày", "Người dùng mới", "Lượt xem", "Phút xem", "Doanh thu", "Đăng ký mới", "Đã hủy"],
      ...report.daily.map((x) => [
        x.stat_date,
        x.new_users,
        x.total_views,
        x.watch_minutes,
        x.total_revenue,
        x.new_subscriptions ?? 0,
        x.cancelled_subscriptions ?? 0,
      ]),
    ];
    const blob = new Blob(
        ["\uFEFF" + rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n")],
        { type: "text/csv;charset=utf-8" },
      ),
      url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = `nexaplay-report-${days}-days.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const daily = report?.daily ?? [];
  const maxViews = Math.max(...daily.map((item) => item.total_views), 1);
  const averageWatch = report?.totals.views
    ? Math.round(report.totals.watchMinutes / report.totals.views)
    : 0;
  return (
    <>
      <div className="report-toolbar">
        <span>Khoảng báo cáo</span>
        <select
          value={days}
          onChange={(e) => changeDays(Number(e.target.value))}
        >
          <option value={7}>7 ngày</option>
          <option value={30}>30 ngày</option>
          <option value={90}>90 ngày</option>
          <option value={365}>1 năm</option>
        </select>
        <button className="secondary-button" onClick={exportCsv}>
          Xuất CSV
        </button>
      </div>
      <section className="review-admin-summary">
        <article>
          <span>Người dùng mới</span>
          <strong>{report?.totals.users.toLocaleString("vi-VN") ?? 0}</strong>
        </article>
        <article>
          <span>Lượt xem</span>
          <strong>{report?.totals.views.toLocaleString("vi-VN") ?? 0}</strong>
        </article>
        <article>
          <span>Phút xem · TB {averageWatch} phút/lượt</span>
          <strong>
            {report?.totals.watchMinutes.toLocaleString("vi-VN") ?? 0}
          </strong>
        </article>
        <article>
          <span>Doanh thu</span>
          <strong>
            {(report?.totals.revenue ?? 0).toLocaleString("vi-VN")}đ
          </strong>
        </article>
      </section>
      <section className="admin-content-grid">
        <article className="admin-panel">
          <span className="eyebrow">Hiệu suất nội dung</span>
          <h2>Top phim trong {days} ngày</h2>
          <div className="performance-list">
            {report?.topContent.map((item, index) => (
              <div key={item.contentId}>
                <strong>#{index + 1}</strong>
                <span>
                  {item.title}
                  <small>{item.completionRate}% hoàn thành</small>
                </span>
                <b>{item.views.toLocaleString("vi-VN")}</b>
              </div>
            ))}
            {!report?.topContent.length && (
              <div className="admin-empty">Chưa có dữ liệu nội dung trong khoảng này.</div>
            )}
          </div>
        </article>
        <article className="admin-panel">
          <span className="eyebrow">Dữ liệu theo ngày</span>
          <h2>Xu hướng lượt xem</h2>
          <div className="report-chart" role="img" aria-label={`Biểu đồ lượt xem ${days} ngày`}>
            {daily.map((item) => (
              <div className="report-chart__column" key={item.stat_date} title={`${new Date(item.stat_date).toLocaleDateString("vi-VN")}: ${item.total_views.toLocaleString("vi-VN")} lượt xem`}>
                <strong>{item.total_views.toLocaleString("vi-VN")}</strong>
                <i style={{ height: `${Math.max(4, item.total_views / maxViews * 100)}%` }} />
                <small>{new Date(item.stat_date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}</small>
              </div>
            ))}
          </div>
        </article>
      </section>
      <section className="admin-panel report-detail-panel">
        <div className="admin-panel__heading">
          <div><span className="eyebrow">Đối chiếu dữ liệu</span><h2>Chi tiết theo ngày</h2></div>
          <small>{daily.length.toLocaleString("vi-VN")} ngày dữ liệu</small>
        </div>
        <div className="report-detail-table">
          <div className="report-detail-row admin-table-head"><span>Ngày</span><span>Người dùng mới</span><span>Lượt xem</span><span>Phút xem</span><span>Doanh thu</span><span>Thuê bao ròng</span></div>
          {daily.slice().reverse().map((item) => (
            <div className="report-detail-row" key={item.stat_date}>
              <strong>{new Date(item.stat_date).toLocaleDateString("vi-VN")}</strong>
              <span>{item.new_users.toLocaleString("vi-VN")}</span>
              <span>{item.total_views.toLocaleString("vi-VN")}</span>
              <span>{item.watch_minutes.toLocaleString("vi-VN")}</span>
              <strong>{Number(item.total_revenue).toLocaleString("vi-VN")}đ</strong>
              <span>{(item.new_subscriptions ?? 0) - (item.cancelled_subscriptions ?? 0)}</span>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}

function BillingPanel({
  summary,
  plans,
  invoices,
  pagination,
  status,
  setStatus,
  query,
  setQuery,
  reload,
  goPage,
  save,
}: {
  summary: BillingSummary | null;
  plans: AdminPlan[];
  invoices: AdminInvoice[];
  pagination: ReviewPagination;
  status: string;
  setStatus: (v: string) => void;
  query: string;
  setQuery: (v: string) => void;
  reload: () => void;
  goPage: (p: number) => void;
  save: (id: string, payload: Record<string, unknown>) => Promise<void>;
}) {
  const [editingPlan,setEditingPlan]=useState<AdminPlan|null>(null),[showPlanForm,setShowPlanForm]=useState(false),[planDraft,setPlanDraft]=useState({name:"",price:99000,billingInterval:"month" as "month"|"year",maxProfiles:2,maxConcurrentStreams:1,maxQuality:"1080p",hasAds:false,allowDownload:false,downloadLimit:0,features:["Không quảng cáo"] as string[],isActive:false}),[planSaving,setPlanSaving]=useState(false),[planError,setPlanError]=useState("");
  const [selectedInvoice,setSelectedInvoice]=useState<AdminInvoiceDetail|null>(null),[invoiceLoading,setInvoiceLoading]=useState(false),[invoiceActionBusy,setInvoiceActionBusy]=useState(false),[invoiceError,setInvoiceError]=useState("");
  const openPlan=(plan:AdminPlan)=>{setEditingPlan(plan);setPlanDraft({name:plan.name,price:plan.price,billingInterval:plan.billingInterval??"month",maxProfiles:plan.maxProfiles,maxConcurrentStreams:plan.maxConcurrentStreams??1,maxQuality:plan.maxQuality,hasAds:plan.hasAds??false,allowDownload:plan.allowDownload,downloadLimit:plan.downloadLimit??0,features:plan.features,isActive:plan.isActive});setPlanError("");setShowPlanForm(true)};
  const openNewPlan=()=>{setEditingPlan(null);setPlanDraft({name:"",price:99000,billingInterval:"month",maxProfiles:2,maxConcurrentStreams:1,maxQuality:"1080p",hasAds:false,allowDownload:false,downloadLimit:0,features:["Không quảng cáo"],isActive:false});setPlanError("");setShowPlanForm(true)};
  const openInvoice=async(id:string)=>{setInvoiceLoading(true);setInvoiceError("");try{setSelectedInvoice(await api.adminInvoice(id) as AdminInvoiceDetail)}catch(error){setInvoiceError(error instanceof Error?error.message:"Không tải được hóa đơn")}finally{setInvoiceLoading(false)}};
  const changeInvoiceStatus=async(next:"pending"|"success"|"failed"|"refunded")=>{if(!selectedInvoice)return;let reason="";if(next==="failed"||next==="refunded"){const input=prompt(next==="refunded"?"Nhập lý do hoàn tiền":"Nhập lý do đánh dấu thất bại");if(input===null)return;reason=input.trim();if(reason.length<3)return alert("Lý do phải có ít nhất 3 ký tự.")}const labels={pending:"đưa giao dịch về trạng thái chờ",success:"xác nhận giao dịch thành công",failed:"đánh dấu giao dịch thất bại",refunded:"hoàn tiền giao dịch"};if(!confirm(`Bạn chắc chắn muốn ${labels[next]}?`))return;setInvoiceActionBusy(true);setInvoiceError("");try{await api.updateAdminInvoiceStatus(selectedInvoice.id,next,reason);await Promise.all([openInvoice(selectedInvoice.id),reload()])}catch(error){setInvoiceError(error instanceof Error?error.message:"Không cập nhật được giao dịch")}finally{setInvoiceActionBusy(false)}};
  const submitPlan=async(e:FormEvent)=>{e.preventDefault();setPlanSaving(true);setPlanError("");try{await save(editingPlan?.id??"",{...planDraft,features:planDraft.features.map(item=>item.trim()).filter(Boolean)});setShowPlanForm(false);setEditingPlan(null)}catch(error){setPlanError(error instanceof Error?error.message:"Không thể lưu gói") }finally{setPlanSaving(false)}};
  const editPrice = async (plan: AdminPlan) => {
    const raw = prompt(`Giá mới cho ${plan.name} (VND)`, String(plan.price));
    if (raw === null) return;
    const price = Number(raw);
    if (!Number.isFinite(price) || price < 0) return alert("Giá không hợp lệ");
    await save(plan.id, { price });
  };
  return (
    <>
      <section className="review-admin-summary billing-summary">
        <article>
          <span>Thuê bao hoạt động</span>
          <strong>{summary?.activeSubscriptions ?? 0}</strong>
        </article>
        <article>
          <span>Doanh thu tháng</span>
          <strong>
            {(summary?.monthlyRevenue ?? 0).toLocaleString("vi-VN")}đ
          </strong>
        </article>
        <article>
          <span>Sắp hủy</span>
          <strong>{summary?.cancelling ?? 0}</strong>
        </article>
        <article>
          <span>Thanh toán lỗi</span>
          <strong>{summary?.failedPayments ?? 0}</strong>
        </article>
      </section>
      <section className="admin-panel billing-plans">
        <div className="admin-panel__heading">
          <div>
            <span className="eyebrow">Sản phẩm đang bán</span>
            <h2>Gói đăng ký</h2>
          </div>
          <button className="primary-button" onClick={openNewPlan}><Plus/>Thêm gói mới</button>
        </div>
        <div className="billing-plan-grid">
          {plans.map((plan) => (
            <article key={plan.id}>
              <header>
                <span>
                  <strong>{plan.name}</strong>
                  <small>
                    {plan.code} · {plan.activeSubscribers} thuê bao
                  </small>
                </span>
                <i
                  className={`user-status ${plan.isActive ? "active" : "suspended"}`}
                >
                  {plan.isActive ? "Đang bán" : "Đã ẩn"}
                </i>
              </header>
              <h3>
                {plan.price.toLocaleString("vi-VN")}đ<small>/{plan.billingInterval==="year"?"năm":"tháng"}</small>
              </h3>
              <p>
                {plan.maxQuality} · {plan.maxProfiles} hồ sơ · {plan.maxConcurrentStreams} thiết bị xem cùng lúc
              </p>
              <small>{plan.hasAds?"Có quảng cáo":"Không quảng cáo"} · {plan.allowDownload?`Tải tối đa ${plan.downloadLimit} nội dung`:"Không tải offline"}</small>
              <footer>
                <button
                  className="secondary-button"
                  onClick={() => openPlan(plan)}
                >
                  Chỉnh sửa
                </button>
                <button
                  className="secondary-button"
                  onClick={() => save(plan.id, { isActive: !plan.isActive })}
                >
                  {plan.isActive ? "Ngừng bán" : "Mở bán"}
                </button>
              </footer>
            </article>
          ))}
        </div>
      </section>
      <section className="admin-panel billing-invoices">
        <div className="admin-panel__heading">
          <div>
            <span className="eyebrow">Đối soát</span>
            <h2>Giao dịch</h2>
            <small>{pagination.total.toLocaleString("vi-VN")} hóa đơn</small>
          </div>
          <div className="admin-user-search">
            <label className="admin-search">
              <Search />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Mã hóa đơn, người dùng, mã giao dịch..."
              />
            </label>
            <select
              className="admin-review-filter"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Mọi trạng thái</option>
              <option value="success">Thành công</option>
              <option value="pending">Đang chờ</option>
              <option value="failed">Thất bại</option>
              <option value="refunded">Hoàn tiền</option>
            </select>
          </div>
        </div>
        <div className="billing-table">
          <div className="billing-row admin-table-head">
            <span>Mã / thời gian</span>
            <span>Khách hàng</span>
            <span>Gói</span>
            <span>Cổng</span>
            <span>Số tiền</span>
            <span>Trạng thái</span>
            <span>Thao tác</span>
          </div>
          {invoices.map((item) => (
            <div className="billing-row" key={item.id}>
              <span>
                <strong>{item.id}</strong>
                <small>{new Date(item.issuedAt).toLocaleString("vi-VN")}</small>
              </span>
              <span>
                {item.userId}
                <small>{item.transactionId}</small>
              </span>
              <b>{item.planName}</b>
              <span>{item.provider || "—"}</span>
              <strong>{item.amount.toLocaleString("vi-VN")}đ</strong>
              <i
                className={`review-state ${item.status === "success" ? "approved" : "rejected"}`}
              >
                {item.status}
              </i>
              <button className="invoice-manage-button" onClick={() => void openInvoice(item.id)}>
                Quản lý
              </button>
            </div>
          ))}
          {!invoices.length && (
            <div className="admin-empty">Chưa có giao dịch phù hợp.</div>
          )}
        </div>
        {pagination.totalPages > 1 && (
          <div className="admin-pagination">
            <button
              disabled={pagination.page <= 1}
              onClick={() => goPage(1)}
            >
              Trang đầu
            </button>
            <button
              disabled={pagination.page <= 1}
              onClick={() => goPage(pagination.page - 1)}
            >
              Trang trước
            </button>
            <span>
              Trang {pagination.page}/{pagination.totalPages} · Hiển thị{" "}
              {(pagination.page - 1) * pagination.limit + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)} /{" "}
              {pagination.total.toLocaleString("vi-VN")}
            </span>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => goPage(pagination.page + 1)}
            >
              Trang sau
            </button>
            <button
              disabled={pagination.page >= pagination.totalPages}
              onClick={() => goPage(pagination.totalPages)}
            >
              Trang cuối
            </button>
          </div>
        )}
      </section>
      {(invoiceLoading||selectedInvoice)&&<div className="modal-shell"><section className="invoice-detail-modal">
        <header><div><span className="eyebrow">Chi tiết giao dịch</span><h2>{selectedInvoice?.id??"Đang tải..."}</h2></div><button className="icon-button" onClick={()=>setSelectedInvoice(null)}><X/></button></header>
        {invoiceLoading&&!selectedInvoice?<div className="admin-loading">Đang tải hóa đơn...</div>:selectedInvoice&&<>
          <div className="invoice-detail-grid"><span><small>Khách hàng</small><strong>{selectedInvoice.userId}</strong></span><span><small>Gói</small><strong>{selectedInvoice.planName}</strong></span><span><small>Số tiền</small><strong>{selectedInvoice.amount.toLocaleString("vi-VN")}đ</strong></span><span><small>Trạng thái</small><i className={`review-state ${selectedInvoice.status==="success"?"approved":"rejected"}`}>{selectedInvoice.status}</i></span><span><small>Cổng thanh toán</small><strong>{selectedInvoice.provider||"—"}</strong></span><span><small>Mã giao dịch</small><strong>{selectedInvoice.transactionId||"—"}</strong></span><span><small>Ngày phát hành</small><strong>{new Date(selectedInvoice.issuedAt).toLocaleString("vi-VN")}</strong></span><span><small>Kỳ thuê bao</small><strong>{new Date(selectedInvoice.periodStart).toLocaleDateString("vi-VN")} – {new Date(selectedInvoice.periodEnd).toLocaleDateString("vi-VN")}</strong></span></div>
          {invoiceError&&<p className="admin-error">{invoiceError}</p>}
          <div className="invoice-actions"><strong>Thao tác quản lý</strong>{selectedInvoice.status==="pending"&&<><button disabled={invoiceActionBusy} className="primary-button" onClick={()=>void changeInvoiceStatus("success")}>Xác nhận thành công</button><button disabled={invoiceActionBusy} className="secondary-button danger" onClick={()=>void changeInvoiceStatus("failed")}>Đánh dấu thất bại</button></>}{selectedInvoice.status==="failed"&&<button disabled={invoiceActionBusy} className="secondary-button" onClick={()=>void changeInvoiceStatus("pending")}>Đưa về chờ xử lý</button>}{selectedInvoice.status==="success"&&<button disabled={invoiceActionBusy} className="secondary-button danger" onClick={()=>void changeInvoiceStatus("refunded")}>Hoàn tiền</button>}{selectedInvoice.status==="refunded"&&<span>Giao dịch đã hoàn tiền, không còn thao tác khả dụng.</span>}</div>
          <div className="invoice-audit"><h3>Lịch sử xử lý</h3>{selectedInvoice.actions.map((action,index)=><div key={`${action.createdAt}-${index}`}><span><strong>{action.previousStatus} → {action.nextStatus}</strong><small>{new Date(action.createdAt).toLocaleString("vi-VN")} · {action.adminUserId}</small></span><p>{action.reason||"Không có ghi chú"}</p></div>)}{!selectedInvoice.actions.length&&<p>Chưa có thao tác quản trị.</p>}</div>
        </>}
      </section></div>}
      {showPlanForm&&<div className="modal-shell"><form className="plan-editor" onSubmit={submitPlan}>
        <header><div><span className="eyebrow">Sản phẩm thuê bao</span><h2>{editingPlan?`Chỉnh sửa ${editingPlan.name}`:"Tạo gói đăng ký"}</h2><p>Thiết lập giá bán và quyền sử dụng dành cho khách hàng.</p></div><button type="button" className="icon-button" onClick={()=>setShowPlanForm(false)}><X/></button></header>
        <div className="plan-editor__body">
          <section><h3>Thông tin và giá bán</h3><div className="plan-form-grid"><label className="wide"><span>Tên gói</span><input autoFocus required minLength={2} maxLength={80} placeholder="Ví dụ: Gia đình" value={planDraft.name} onChange={e=>setPlanDraft({...planDraft,name:e.target.value})}/><small>Mã kỹ thuật sẽ được hệ thống tự tạo.</small></label><label><span>Giá bán</span><div className="price-input"><input required type="number" min={0} step={1000} value={planDraft.price} onChange={e=>setPlanDraft({...planDraft,price:Number(e.target.value)})}/><b>VND</b></div></label><label><span>Chu kỳ thanh toán</span><select value={planDraft.billingInterval} onChange={e=>setPlanDraft({...planDraft,billingInterval:e.target.value as "month"|"year"})}><option value="month">Hàng tháng</option><option value="year">Hàng năm</option></select></label></div></section>
          <section><h3>Quyền xem phim</h3><div className="plan-form-grid"><label><span>Số hồ sơ</span><select value={planDraft.maxProfiles} onChange={e=>setPlanDraft({...planDraft,maxProfiles:Number(e.target.value)})}>{[1,2,3,4,5,6].map(x=><option key={x} value={x}>{x} hồ sơ</option>)}</select></label><label><span>Thiết bị xem đồng thời</span><select value={planDraft.maxConcurrentStreams} onChange={e=>setPlanDraft({...planDraft,maxConcurrentStreams:Number(e.target.value)})}>{[1,2,3,4,5,6].map(x=><option key={x} value={x}>{x} thiết bị</option>)}</select></label><label><span>Chất lượng tối đa</span><select value={planDraft.maxQuality} onChange={e=>setPlanDraft({...planDraft,maxQuality:e.target.value})}><option>720p</option><option>1080p</option><option>2K</option><option>4K</option></select></label><label><span>Trải nghiệm quảng cáo</span><select value={planDraft.hasAds?"ads":"none"} onChange={e=>setPlanDraft({...planDraft,hasAds:e.target.value==="ads"})}><option value="none">Không quảng cáo</option><option value="ads">Có quảng cáo</option></select></label></div></section>
          <section><h3>Tải xuống ngoại tuyến</h3><div className="plan-choice"><button type="button" className={!planDraft.allowDownload?"active":""} onClick={()=>setPlanDraft({...planDraft,allowDownload:false,downloadLimit:0})}><strong>Không hỗ trợ</strong><small>Chỉ xem khi có Internet</small></button><button type="button" className={planDraft.allowDownload?"active":""} onClick={()=>setPlanDraft({...planDraft,allowDownload:true,downloadLimit:planDraft.downloadLimit||10})}><strong>Cho phép tải xuống</strong><small>Xem nội dung khi ngoại tuyến</small></button></div>{planDraft.allowDownload&&<label className="download-limit"><span>Số nội dung tối đa trên mỗi tài khoản</span><input type="number" min={1} max={100} value={planDraft.downloadLimit} onChange={e=>setPlanDraft({...planDraft,downloadLimit:Number(e.target.value)})}/></label>}</section>
          <section><h3>Quyền lợi hiển thị</h3><div className="feature-editor">{planDraft.features.map((feature,index)=><div key={index}><input maxLength={120} value={feature} onChange={e=>setPlanDraft({...planDraft,features:planDraft.features.map((item,i)=>i===index?e.target.value:item)})}/><button type="button" onClick={()=>setPlanDraft({...planDraft,features:planDraft.features.filter((_,i)=>i!==index)})}><X/></button></div>)}<button type="button" className="add-feature" onClick={()=>setPlanDraft({...planDraft,features:[...planDraft.features,""]})}><Plus/>Thêm quyền lợi</button></div></section>
          <section><h3>Trạng thái phát hành</h3><div className="plan-choice"><button type="button" className={!planDraft.isActive?"active":""} onClick={()=>setPlanDraft({...planDraft,isActive:false})}><strong>Lưu bản nháp</strong><small>Người dùng chưa nhìn thấy gói</small></button><button type="button" className={planDraft.isActive?"active publish":""} onClick={()=>setPlanDraft({...planDraft,isActive:true})}><strong>Mở bán</strong><small>Hiển thị ngay trên trang chọn gói</small></button></div></section>
          {planError&&<p className="admin-error">{planError}</p>}
        </div><footer><button type="button" className="secondary-button" onClick={()=>setShowPlanForm(false)}>Hủy</button><button className="primary-button" disabled={planSaving}>{planSaving?"Đang lưu...":editingPlan?"Lưu thay đổi":"Tạo gói"}</button></footer>
      </form></div>}
    </>
  );
}

function GenresTable({
  genres,
  save,
  toggle,
  remove,
  move,
}: {
  genres: AdminGenre[];
  save: (
    g: AdminGenre | null,
    v: { name: string; slug: string; description: string },
  ) => Promise<void>;
  toggle: (g: AdminGenre) => void;
  remove: (g: AdminGenre) => void;
  move: (i: number, d: number) => void;
}) {
  const [editing, setEditing] = useState<AdminGenre | null | undefined>(
      undefined,
    ),
    [name, setName] = useState(""),
    [slug, setSlug] = useState(""),
    [description, setDescription] = useState(""),
    [saving, setSaving] = useState(false);
  function open(g: AdminGenre | null) {
    setEditing(g);
    setName(g?.name ?? "");
    setSlug(g?.slug ?? "");
    setDescription(g?.description ?? "");
  }
  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await save(editing ?? null, { name, slug, description });
      setEditing(undefined);
    } finally {
      setSaving(false);
    }
  }
  return (
    <>
      <section className="admin-panel catalog-manager">
        <div className="admin-panel__heading">
          <div>
            <span className="eyebrow">Catalog Taxonomy</span>
            <h2>{genres.length} thể loại</h2>
          </div>
          <button className="primary-button" onClick={() => open(null)}>
            <Plus />
            Thêm thể loại
          </button>
        </div>
        <div className="admin-genre-list">
          {genres.map((genre, index) => (
            <article key={genre.id}>
              <div className="genre-order">
                <button disabled={index === 0} onClick={() => move(index, -1)}>
                  <ChevronUp />
                </button>
                <button
                  disabled={index === genres.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ChevronDown />
                </button>
              </div>
              <span>
                <strong>{genre.name}</strong>
                <small>
                  /{genre.slug} · {genre._count.movies} phim
                </small>
              </span>
              <p>{genre.description || "Chưa có mô tả"}</p>
              <button
                className={`genre-toggle ${genre.active ? "active" : ""}`}
                onClick={() => toggle(genre)}
              >
                {genre.active ? "Đang hiển thị" : "Đang ẩn"}
              </button>
              <div className="admin-row-actions">
                <button onClick={() => open(genre)}>
                  <Edit3 />
                </button>
                <button onClick={() => remove(genre)}>
                  <Trash2 />
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>
      {editing !== undefined && (
        <div className="modal-shell">
          <form className="genre-form-modal" onSubmit={submit}>
            <header>
              <div>
                <span className="eyebrow">Thể loại</span>
                <h2>{editing ? "Chỉnh sửa" : "Thêm thể loại"}</h2>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setEditing(undefined)}
              >
                <X />
              </button>
            </header>
            <label>
              Tên thể loại
              <input
                required
                minLength={2}
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (!editing)
                    setSlug(
                      e.target.value
                        .normalize("NFD")
                        .replace(/[\u0300-\u036f]/g, "")
                        .toLowerCase()
                        .replace(/đ/g, "d")
                        .replace(/[^a-z0-9]+/g, "-")
                        .replace(/(^-|-$)/g, ""),
                    );
                }}
              />
            </label>
            <label>
              Slug
              <input
                required
                pattern="[a-z0-9-]+"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
              />
            </label>
            <label>
              Mô tả
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </label>
            <footer>
              <button
                type="button"
                className="secondary-button"
                onClick={() => setEditing(undefined)}
              >
                Hủy
              </button>
              <button className="primary-button" disabled={saving}>
                {saving ? "Đang lưu..." : "Lưu thể loại"}
              </button>
            </footer>
          </form>
        </div>
      )}
    </>
  );
}
function MovieForm({
  form,
  setForm,
  editing,
  busy,
  close,
  save,
}: {
  form: FormState;
  setForm: (f: FormState) => void;
  editing: boolean;
  busy: boolean;
  close: () => void;
  save: (e: FormEvent) => void;
}) {
  return (
    <div className="modal-shell">
      <form className="movie-form-modal" onSubmit={save}>
        <header>
          <div>
            <span className="eyebrow">
              <ShieldCheck />
              Catalog CMS
            </span>
            <h2>{editing ? "Chỉnh sửa phim" : "Thêm nội dung mới"}</h2>
          </div>
          <button type="button" className="icon-button" onClick={close}>
            <X />
          </button>
        </header>
        <div className="movie-form-grid">
          <label>
            Tên phim
            <input
              required
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </label>
          <label>
            Tên gốc
            <input
              value={form.originalTitle}
              onChange={(e) =>
                setForm({ ...form, originalTitle: e.target.value })
              }
            />
          </label>
          <label className="wide">
            Mô tả
            <textarea
              required
              minLength={10}
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
            />
          </label>
          <label>
            Năm
            <input
              type="number"
              value={form.year}
              onChange={(e) =>
                setForm({ ...form, year: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Thời lượng
            <input
              type="number"
              value={form.durationMinutes}
              onChange={(e) =>
                setForm({ ...form, durationMinutes: Number(e.target.value) })
              }
            />
          </label>
          <label>
            Độ tuổi
            <input
              value={form.ageRating}
              onChange={(e) => setForm({ ...form, ageRating: e.target.value })}
            />
          </label>
          <label>
            Loại
            <select
              value={form.type}
              onChange={(e) =>
                setForm({ ...form, type: e.target.value as "movie" | "series" })
              }
            >
              <option value="movie">Phim lẻ</option>
              <option value="series">Phim bộ</option>
            </select>
          </label>
          <label>
            Trạng thái
            <select
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value as FormState["status"],
                })
              }
            >
              <option value="draft">Bản nháp</option>
              <option value="published">Xuất bản</option>
              <option value="archived">Lưu trữ</option>
            </select>
          </label>
          <label>
            Đạo diễn
            <input
              required
              value={form.director}
              onChange={(e) => setForm({ ...form, director: e.target.value })}
            />
          </label>
          <label>
            Thể loại
            <input
              required
              value={form.genres}
              onChange={(e) => setForm({ ...form, genres: e.target.value })}
            />
          </label>
          <label className="wide">
            Diễn viên
            <input
              value={form.cast}
              onChange={(e) => setForm({ ...form, cast: e.target.value })}
            />
          </label>
          <label className="wide">
            Poster URL
            <input
              type="url"
              required
              value={form.posterUrl}
              onChange={(e) => setForm({ ...form, posterUrl: e.target.value })}
            />
          </label>
          <label className="wide">
            Backdrop URL
            <input
              type="url"
              required
              value={form.backdropUrl}
              onChange={(e) =>
                setForm({ ...form, backdropUrl: e.target.value })
              }
            />
          </label>
          <label className="wide">
            Trailer URL
            <input
              type="url"
              required
              value={form.trailerUrl}
              onChange={(e) => setForm({ ...form, trailerUrl: e.target.value })}
            />
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={form.isTrending}
              onChange={(e) =>
                setForm({ ...form, isTrending: e.target.checked })
              }
            />{" "}
            Đang thịnh hành
          </label>
          <label className="check-label">
            <input
              type="checkbox"
              checked={form.isFeatured}
              onChange={(e) =>
                setForm({ ...form, isFeatured: e.target.checked })
              }
            />{" "}
            Đưa lên banner
          </label>
        </div>
        <footer>
          <button type="button" className="secondary-button" onClick={close}>
            Hủy
          </button>
          <button className="primary-button" disabled={busy}>
            {busy ? "Đang lưu..." : "Lưu vào PostgreSQL"}
          </button>
        </footer>
      </form>
    </div>
  );
}
