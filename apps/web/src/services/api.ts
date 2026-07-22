import { ApiResponse, AppNotification, Genre, Movie, Plan, Profile, Review, ReviewBundle, User } from "../../../../packages/shared-types/src/index";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
const TOKEN_KEY = "movie-platform-token";
const REFRESH_KEY = "movie-platform-refresh-token";
const ERROR_MESSAGES:Record<string,string>={
  EMAIL_EXISTS:"Email này đã được đăng ký. Hãy chuyển sang tab Đăng nhập.",
  INVALID_CREDENTIALS:"Email hoặc mật khẩu không chính xác.",
  ACCOUNT_SUSPENDED:"Tài khoản này đang bị tạm khóa.",
  VALIDATION_ERROR:"Thông tin nhập vào chưa hợp lệ.",
  SERVICE_UNAVAILABLE:"Dịch vụ đang tạm thời gián đoạn. Vui lòng thử lại."
};

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export function setRefreshToken(token: string | null) {
  if (token) localStorage.setItem(REFRESH_KEY, token);
  else localStorage.removeItem(REFRESH_KEY);
}

async function request<T>(path: string, options: RequestInit = {}, retry = true): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers
    }
  });

  const payload = (await response.json()) as ApiResponse<T>;
  if (response.status === 401 && retry && localStorage.getItem(REFRESH_KEY) && path !== "/v1/auth/refresh") {
    const refreshed = await request<{ accessToken: string; refreshToken: string }>("/v1/auth/refresh", { method: "POST", body: JSON.stringify({ refreshToken: localStorage.getItem(REFRESH_KEY) }) }, false);
    setToken(refreshed.accessToken); setRefreshToken(refreshed.refreshToken);
    return request<T>(path, options, false);
  }
  if (!response.ok || !payload.success) {
    throw new Error((payload.error?.code&&ERROR_MESSAGES[payload.error.code])||payload.error?.message||"Không thể thực hiện yêu cầu.");
  }
  return payload.data;
}

export const api = {
  ophimHome() { return request<Movie[]>("/v1/ophim/home"); },
  ophimHot() { return request<Movie[]>("/v1/ophim/hot"); },
  ophimMovies(params = "") { return request<Movie[]>(`/v1/ophim/movies${params}`); },
  ophimMovie(slug: string) { return request<Movie>(`/v1/ophim/movies/${encodeURIComponent(slug)}`); },
  ophimGenres() { return request<Genre[]>("/v1/ophim/genres"); },
  ophimSearch(q: string) { return request<Movie[]>(`/v1/ophim/search?q=${encodeURIComponent(q)}`); },
  login(email: string, password: string) {
    return request<{ accessToken: string; refreshToken: string; user: User }>("/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password })
    });
  },
  register(email: string, password: string, displayName: string) {
    return request<{ accessToken: string; refreshToken: string; user: User }>("/v1/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, displayName })
    });
  },
  logout() { return request<{loggedOut:boolean}>("/v1/auth/logout",{method:"POST"},false); },
  forgotPassword(email:string) { return request<{accepted:boolean;delivery:"manual"|"email";message:string;devResetToken?:string}>("/v1/auth/forgot-password",{method:"POST",body:JSON.stringify({email})}); },
  resetPassword(token:string,password:string) { return request<{reset:boolean}>("/v1/auth/reset-password",{method:"POST",body:JSON.stringify({token,password})}); },
  me() {
    return request<User>("/v1/users/me");
  },
  profiles() {
    return request<Profile[]>("/v1/users/me/profiles");
  },
  updateMe(displayName:string) { return request<User>("/v1/users/me",{method:"PATCH",body:JSON.stringify({displayName})}); },
  changePassword(currentPassword:string,newPassword:string) { return request<{changed:boolean}>("/v1/users/me/password",{method:"PATCH",body:JSON.stringify({currentPassword,newPassword})}); },
  sessions() { return request<Array<{id:string;userAgent:string;ipAddress:string;lastSeenAt:string;createdAt:string;expiresAt:string;current:boolean}>>("/v1/users/me/sessions"); },
  revokeSession(id:string) { return request(`/v1/users/me/sessions/${encodeURIComponent(id)}`,{method:"DELETE"}); },
  revokeOtherSessions() { return request<{revoked:number}>("/v1/users/me/sessions",{method:"DELETE"}); },
  createProfile(payload:{name:string;avatarUrl?:string;isKids:boolean}) { return request<Profile>("/v1/users/me/profiles",{method:"POST",body:JSON.stringify(payload)}); },
  updateProfile(id:string,payload:Partial<{name:string;avatarUrl:string;isKids:boolean;maturityLevel:number}>) { return request<Profile>(`/v1/users/me/profiles/${encodeURIComponent(id)}`,{method:"PATCH",body:JSON.stringify(payload)}); },
  deleteProfile(id:string) { return request<{deleted:string}>(`/v1/users/me/profiles/${encodeURIComponent(id)}`,{method:"DELETE"}); },
  movies(params = "") {
    return request<Movie[]>(`/v1/catalog/movies${params}`);
  },
  movie(id: string) {
    return request<Movie>(`/v1/catalog/movies/${id}`);
  },
  genres() {
    return request<Genre[]>("/v1/catalog/genres");
  },
  search(q: string) {
    return request<Movie[]>(`/v1/search?q=${encodeURIComponent(q)}`);
  },
  adminStats() {
    return request<{ totalUsers: number; totalViews: number; revenue: number; watchMinutes: number; topContent: Array<{ contentId: string; title: string; views: number; completionRate: number }>; trend: Array<{ stat_date: string; new_users: number; total_views: number; total_revenue: number }> }>("/v1/admin/stats/overview");
  },
  setActiveProfile(profileId: string) {
    return request<{ activeProfileId: string; accessToken: string }>("/v1/users/me/active-profile", {
      method: "POST",
      body: JSON.stringify({ profileId })
    });
  },
  getWatchlist() {
    return request<Movie[]>("/v1/users/me/watchlist");
  },
  continueWatching() {
    return request<Movie[]>("/v1/users/me/continue-watching");
  },
  addToWatchlist(movieId: string) {
    return request<{ added: string }>("/v1/users/me/watchlist", {
      method: "POST",
      body: JSON.stringify({ movieId })
    });
  },
  removeFromWatchlist(movieId: string) {
    return request<{ removed: string }>(`/v1/users/me/watchlist/${movieId}`, {
      method: "DELETE"
    });
  },
  updateProgress(movieId: string, progress: number, playback?: { episodeSlug?: string; episodeName?: string; serverName?: string }) {
    return request<{ movieId: string; progress: number }>("/v1/users/me/progress", {
      method: "POST",
      body: JSON.stringify({ movieId, progress, ...playback })
    });
  },
  reviews(movieId: string) { return request<ReviewBundle>(`/v1/reviews/content/${movieId}`); },
  saveReview(movie: Pick<Movie,"id"|"title"|"posterUrl">, rating: number, content: string, profileName: string) { return request(`/v1/reviews/content/${movie.id}`, { method: "POST", body: JSON.stringify({ rating, content, profileName, contentTitle:movie.title, contentPosterUrl:movie.posterUrl, spoiler: false }) }); },
  plans() { return request<Plan[]>("/v1/billing/plans"); },
  subscription() { return request<{ plan: string; status: string; currentPeriodEnd: string } | null>("/v1/billing/subscription"); },
  subscribe(planId: string) { return request("/v1/billing/subscribe", { method: "POST", body: JSON.stringify({ planId, paymentMethod: "demo" }) }); },
  notifications() { return request<{ items: AppNotification[]; unreadCount: number }>("/v1/notifications"); },
  readNotification(id: string) { return request(`/v1/notifications/${id}/read`, { method: "PATCH" }); },
  history() { return request<Array<{ contentId: string; progress: number; completed: boolean; lastWatchedAt: string }>>("/v1/engagement/history"); }
  ,watchedEpisodes(movieId: string) { return request<Array<{ episodeSlug: string; lastWatchedAt: string }>>(`/v1/engagement/watched-episodes/${encodeURIComponent(movieId)}`); }
  ,createMovie(payload: Record<string, unknown>) { return request<Movie>("/v1/catalog/movies", { method: "POST", body: JSON.stringify(payload) }); }
  ,updateMovie(id: string, payload: Record<string, unknown>) { return request<Movie>(`/v1/catalog/movies/${id}`, { method: "PUT", body: JSON.stringify(payload) }); }
  ,archiveMovie(id: string) { return request<{ archived: string }>(`/v1/catalog/movies/${id}`, { method: "DELETE" }); }
  ,adminContent(params = "") { return request<{items:Movie[];pagination:{page:number;limit:number;total:number;totalPages:number}}>(`/v1/admin/content${params}`); }
  ,adminUsers(params = "") { return request<{items:Array<{id:string;email:string;displayName:string;role:string;status:string;subscriptionTier:string;lastLoginAt:string|null;createdAt:string;profileCount:number;activeDevices:number}>;pagination:{page:number;limit:number;total:number;totalPages:number}}>(`/v1/admin/users${params}`); }
  ,adminUser(id:string) { return request<{id:string;email:string;displayName:string;role:string;status:string;subscriptionTier:string;lastLoginAt:string|null;createdAt:string;profiles:Array<{id:string;name:string;avatar_url?:string;is_kids:boolean;maturity_level:string}>;devices:Array<{id:string;user_agent:string;ip_address:string;last_seen_at:string;expires_at:string;revoked_at:string|null}>}>(`/v1/admin/users/${id}`); }
  ,updateAdminUserStatus(id:string,status:"active"|"suspended") { return request<{id:string;status:string}>(`/v1/admin/users/${id}/status`,{method:"PATCH",body:JSON.stringify({status})}); }
  ,updateAdminUserRole(id:string,role:string) { return request<{id:string;role:string}>(`/v1/admin/users/${id}/role`,{method:"PATCH",body:JSON.stringify({role})}); }
  ,createAdminPasswordReset(id:string) { return request<{resetToken:string;expiresInMinutes:number}>(`/v1/admin/users/${id}/password-reset`,{method:"POST"}); }
  ,adminGenres() { return request<Array<{id:string;name:string;slug:string;description?:string;active:boolean;position:number;_count:{movies:number}}>>("/v1/admin/genres"); }
  ,createAdminGenre(payload:Record<string,unknown>) { return request("/v1/admin/genres",{method:"POST",body:JSON.stringify(payload)}); }
  ,updateAdminGenre(id:string,payload:Record<string,unknown>) { return request(`/v1/admin/genres/${id}`,{method:"PATCH",body:JSON.stringify(payload)}); }
  ,deleteAdminGenre(id:string) { return request(`/v1/admin/genres/${id}`,{method:"DELETE"}); }
  ,reorderAdminGenres(ids:string[]) { return request("/v1/admin/genres/reorder/all",{method:"PUT",body:JSON.stringify({ids})}); }
  ,adminReviews(params="") { return request<{items:Array<Review&{movieTitle?:string;moviePosterUrl?:string;reportCount:number;status:string;moderatedBy?:string;moderatedAt?:string}>;summary:{total:number;hidden:number;reported:number;average:number};pagination:{page:number;limit:number;total:number;totalPages:number}}>(`/v1/admin/reviews${params}`); }
  ,moderateReview(id:string,status:"approved"|"hidden"|"rejected") { return request(`/v1/admin/reviews/${id}/status`,{method:"PATCH",body:JSON.stringify({status})}); }
  ,bulkModerateReviews(ids:string[],status:"approved"|"hidden"|"rejected") { return request("/v1/admin/reviews/bulk/status",{method:"PATCH",body:JSON.stringify({ids,status})}); }
  ,reportReview(id:string,reason:"spam"|"abuse"|"spoiler"|"harassment"|"other",detail?:string) { return request(`/v1/reviews/${id}/report`,{method:"POST",body:JSON.stringify({reason,detail})}); }
  ,deleteAdminReview(id:string) { return request(`/v1/admin/reviews/${id}`,{method:"DELETE"}); }
  ,adminBillingSummary(){return request<{activeSubscriptions:number;cancelling:number;monthlyRevenue:number;failedPayments:number}>("/v1/admin/billing/summary");}
  ,adminPlans(){return request<Array<{id:string;code:string;name:string;price:number;currency:string;billingInterval:"month"|"year";maxProfiles:number;maxConcurrentStreams:number;maxQuality:string;hasAds:boolean;allowDownload:boolean;downloadLimit:number;features:string[];isActive:boolean;activeSubscribers:number}>>("/v1/admin/billing/plans");}
  ,saveAdminPlan(id:string,payload:Record<string,unknown>){return request(id?`/v1/admin/billing/plans/${id}`:"/v1/admin/billing/plans",{method:id?"PATCH":"POST",body:JSON.stringify(payload)});}
  ,adminInvoices(params=""){return request<{items:Array<{id:string;userId:string;planName:string;amount:number;currency:string;status:string;provider:string;transactionId:string;issuedAt:string;paidAt:string|null}>;pagination:{page:number;limit:number;total:number;totalPages:number}}>(`/v1/admin/billing/invoices${params}`);}
  ,adminInvoice(id:string){return request<{id:string;userId:string;subscriptionId:string;subscriptionStatus:string;periodStart:string;periodEnd:string;planName:string;amount:number;currency:string;status:string;provider:string;transactionId:string;issuedAt:string;paidAt:string|null;actions:Array<{adminUserId:string;previousStatus:string;nextStatus:string;reason:string|null;createdAt:string}>}>(`/v1/admin/billing/invoices/${encodeURIComponent(id)}`);}
  ,updateAdminInvoiceStatus(id:string,status:"pending"|"success"|"failed"|"refunded",reason=""){return request(`/v1/admin/billing/invoices/${encodeURIComponent(id)}/status`,{method:"PATCH",body:JSON.stringify({status,reason})});}
  ,adminReports(days=30){return request<{days:number;totals:{users:number;views:number;watchMinutes:number;revenue:number};daily:Array<{stat_date:string;new_users:number;total_views:number;watch_minutes:number;total_revenue:number;new_subscriptions?:number;cancelled_subscriptions?:number}>;topContent:Array<{contentId:string;title:string;views:number;completionRate:number}>}>(`/v1/admin/reports?days=${days}`);}
  ,adminSettings(){return request<Record<string,{value:unknown;description:string;updatedBy?:string;updatedAt?:string}>>("/v1/admin/settings");}
  ,saveAdminSettings(payload:{max_concurrent_devices:number;email_notifications:boolean;push_notifications:boolean;maintenance_mode:boolean}){return request("/v1/admin/settings",{method:"PUT",body:JSON.stringify(payload)});}
  ,trackView(movie:Movie,completionRate:number) { return request("/v1/events/view",{method:"POST",body:JSON.stringify({contentId:movie.id,title:movie.title,watchMinutes:Math.max(1,Math.round((movie.durationMinutes||1)*completionRate/100)),completionRate})}); }
};
