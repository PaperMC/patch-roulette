# API

The API is served by the Cloudflare Worker under `/api`. Deployed hosts are protected by Cloudflare Access. Browser requests use the Access session; CLI requests use a Managed OAuth bearer token, which Access authenticates before the request reaches the Worker.

The Worker extracts the Access identity and maps it to an internal user. It does not implement a second token system.

Timestamps, durations, and statistics are JSON numbers in epoch milliseconds. Successful commands without a useful response return `204 No Content`. Errors use the HTTP status and a useful plain-text message.

## Identity

```http
GET /api/me
```

Response:

```json
{
  "id": "user-id",
  "username": "brave-glow-squid"
}
```

```http
PATCH /api/me
Content-Type: application/json

{"username":"redstone-wizard"}
```

Returns the updated user.

Legacy ownership claiming is documented in [legacy migration](legacy.md): `POST /api/me/claim-legacy`.

## Patches

```http
GET /api/patches?minecraftVersion=1.21.4
GET /api/patches/available?minecraftVersion=1.21.4
```

The first returns patch objects. The second returns available patch paths.

```json
{
  "minecraftVersion": "1.21.4",
  "path": "foo.patch",
  "status": "AVAILABLE",
  "responsibleUser": null,
  "updatedAt": 1787116168152,
  "duration": null
}
```

Patch operations are explicit actions rather than generic collection CRUD:

```http
POST /api/patches/init
POST /api/patches/clear
POST /api/patches/start
POST /api/patches/complete
POST /api/patches/cancel
POST /api/patches/undo
```

`init` and `start` accept a non-empty patch list:

```json
{ "minecraftVersion": "1.21.4", "paths": ["foo.patch", "bar.patch"] }
```

`clear` accepts a version object:

```json
{ "minecraftVersion": "1.21.4" }
```

`complete`, `cancel`, and `undo` accept a patch ID:

```json
{ "minecraftVersion": "1.21.4", "path": "foo.patch" }
```

`init` only succeeds when the Minecraft version has no patches. Clear the version before initializing it again. `init` and `clear` return `204`. `start` returns the claimed patches; the other lifecycle operations return the updated patch.

## Other routes

```http
GET /api/versions
GET /api/stats?minecraftVersion=1.21.4
```

`stats` returns aggregate patch counts, total time spent, and a ranked leaderboard:

```json
{
  "total": 42,
  "available": 8,
  "wip": 4,
  "done": 30,
  "timeSpent": 123456,
  "leaderboard": [
    {
      "userId": "018f6ac5-…",
      "username": "redstone-wizard",
      "rank": 1,
      "wip": 1,
      "done": 12,
      "timeSpent": 45678
    }
  ]
}
```

`timeSpent` values are milliseconds. `userId` is a stable internal identifier;
`username` is the user's mutable display name.

## Legacy import

The legacy import route is:

```http
POST /api/import-legacy-data
```

The Worker does not expose an export route. The corresponding Spring export and migration procedure are documented in [legacy migration](legacy.md).
