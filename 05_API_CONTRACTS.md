# API CONTRACTS MẪU (RÚT GỌN)

> Chuẩn REST, tiền tố qua Gateway: `https://api.domain.com/v1/{service}/...`. Toàn bộ endpoint (trừ auth công khai) yêu cầu header `Authorization: Bearer <JWT>`.

## Auth Service (`/v1/auth`)
```
POST   /auth/register              { email, password, displayName }
POST   /auth/login                 { email, password } -> { accessToken, refreshToken }
POST   /auth/refresh               { refreshToken }
POST   /auth/logout
POST   /auth/oauth/google
POST   /auth/forgot-password       { email }
POST   /auth/reset-password        { token, newPassword }
```

## User Service (`/v1/users`)
```
GET    /users/me
PATCH  /users/me
GET    /users/me/profiles
POST   /users/me/profiles          { name, avatarUrl, isKids }
PATCH  /users/me/profiles/:id
DELETE /users/me/profiles/:id
```

## Catalog Service (`/v1/catalog`)
```
GET    /catalog/movies?genre=&page=&sort=trending
GET    /catalog/movies/:id
GET    /catalog/series/:id/seasons/:seasonNo/episodes
GET    /catalog/genres
POST   /catalog/movies              (admin)
PUT    /catalog/movies/:id          (admin)
DELETE /catalog/movies/:id          (admin)
```

## Streaming Service (`/v1/streaming`)
```
POST   /streaming/:contentId/session      -> { manifestUrl, token, expiresAt }
POST   /streaming/:contentId/progress     { positionSeconds, durationSeconds }
GET    /streaming/:contentId/subtitles
POST   /streaming/upload                  (admin, multipart) -> triggers transcode job
GET    /streaming/jobs/:jobId/status      (admin)
```

## Engagement Service (`/v1/engagement`)
```
GET    /engagement/continue-watching
GET    /engagement/watchlist
POST   /engagement/watchlist              { contentId }
DELETE /engagement/watchlist/:contentId
GET    /engagement/history
```

## Review Service (`/v1/reviews`)
```
GET    /reviews/content/:contentId
POST   /reviews/content/:contentId        { rating, comment }
POST   /reviews/:reviewId/replies         { comment }
POST   /reviews/:reviewId/like
```

## Payment Service (`/v1/billing`)
```
GET    /billing/plans
POST   /billing/subscribe                 { planId, paymentMethod }
POST   /billing/webhook/vnpay             (server-to-server callback)
GET    /billing/invoices
POST   /billing/cancel
```

## Recommendation Service (`/v1/recommendations`)
```
GET    /recommendations/for-you
GET    /recommendations/similar/:contentId
```

## Search Service (`/v1/search`)
```
GET    /search?q=&type=movie|series|actor
GET    /search/autocomplete?q=
```

## Notification Service (`/v1/notifications`)
```
GET    /notifications
PATCH  /notifications/:id/read
POST   /notifications/preferences         { emailNewEpisode, pushTrending }
```

## Social / Watch Party Service (`/v1/social`)
```
POST   /social/watch-party                { contentId } -> { roomId, inviteLink }
POST   /social/watch-party/:roomId/join
WS     /social/watch-party/:roomId/ws     (sự kiện: play, pause, seek, chat_message, user_joined)
```

## Analytics/Admin Service (`/v1/admin`)
```
GET    /admin/stats/overview              { totalUsers, totalViews, revenue }
GET    /admin/stats/top-content?range=7d
GET    /admin/users?search=&page=
```
