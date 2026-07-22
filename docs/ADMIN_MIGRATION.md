# Admin Dashboard migration

The admin application reuses the existing microservice databases. Catalog changes are additive: legacy `movies.genres`, `movies.cast_members`, poster, banner and trailer columns remain intact.

## 1. Back up

```powershell
pg_dump -U postgres -d catalog_db -F c -f catalog_db_before_admin.dump
pg_dump -U postgres -d identity_db -F c -f identity_db_before_admin.dump
```

## 2. Apply identity RBAC

```powershell
psql -U postgres -d identity_db -f database/08_admin_rbac.sql
```

Existing `admin` accounts retain Super Admin behavior. New roles are `super_admin`, `content_editor`, and `support`.

## 3. Apply catalog migration

Set the connection string for the catalog database, then deploy the checked-in Prisma migration:

```powershell
$env:CATALOG_DATABASE_URL="postgresql://postgres:12345@localhost:5432/catalog_db"
npm run db:migrate:catalog
npm run db:generate:catalog
```

The migration creates seasons, episodes, media, subtitles, normalized people/category tables, and backfills movie/genre links.

## 4. Run

Start the backend and website in separate terminals:

```powershell
npm run start:backend
npm run start:web
```

- Customer site: `http://localhost:5173`
- Admin area: `http://localhost:5173/admin`
- API health: `http://localhost:4000/health`

Sign in to Admin with an existing admin account. The default seeded account is `admin@movieapp.dev`.
