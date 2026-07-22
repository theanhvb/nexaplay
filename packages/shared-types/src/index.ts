export type ApiResponse<T> = {
  success: boolean;
  data: T;
  meta?: Record<string, unknown> | null;
  error: { code: string; message: string } | null;
};

export type Profile = {
  id: string;
  name: string;
  avatarUrl: string;
  isKids: boolean;
  maturityLevel?: number;
};

export type User = {
  id: string;
  email: string;
  displayName: string;
  role: "admin" | "super_admin" | "content_editor" | "support" | "user";
  subscriptionTier: "Free" | "Basic" | "Premium";
  profiles: Profile[];
};

export type Genre = {
  id: string;
  name: string;
  slug: string;
};

export type Movie = {
  id: string;
  title: string;
  originalTitle: string;
  description: string;
  year: number;
  durationMinutes: number;
  ageRating: string;
  rating: number;
  matchScore: number;
  type: "movie" | "series";
  genres: string[];
  genreSlugs?: string[];
  cast: string[];
  director: string;
  posterUrl: string;
  backdropUrl: string;
  trailerUrl: string;
  progress?: number;
  episodeSlug?: string;
  episodeName?: string;
  serverName?: string;
  isTrending: boolean;
  isFeatured: boolean;
  hotRank?: number;
  slug?: string;
  quality?: string;
  language?: string;
  episodeCurrent?: string;
  country?: string[];
  episodes?: MovieServer[];
};

export type MovieEpisode = { name: string; slug: string; filename?: string; embedUrl: string; m3u8Url?: string };
export type MovieServer = { name: string; episodes: MovieEpisode[] };

export type Review = { id: string; movieId: string; profileId: string; profileName: string; rating: number; content: string; spoiler: boolean; likeCount: number; likedByMe: boolean; createdAt: string; updatedAt: string };
export type ReviewBundle = { reviews: Review[]; summary: { total: number; average: number } };
export type Plan = { id: string; code: string; name: string; price: number; currency: string; maxProfiles: number; maxQuality: string; allowDownload: boolean; features: string[] };
export type AppNotification = { id: string; title: string; message: string; type: string; deepLink?: string; readAt: string | null; createdAt: string };
