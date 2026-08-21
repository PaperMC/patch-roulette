# Legacy migration

This is a one-time migration path from the Spring backend to the Cloudflare Worker. It is not a general backup format or a design for future import/export features.

## Export from Spring

The deployed legacy Spring service has the temporary `GET /api/export-legacy-data` route. Any existing Spring user can call it with the existing Basic authentication:

```sh
curl -u USERNAME:PASSWORD \
  https://spring-host.example/api/export-legacy-data \
  > patch-roulette-legacy-data.json
```

The export contains:

```json
{
    "exportedAt": 1787116168152,
    "legacyUsers": [
        {
            "username": "alice",
            "passwordHash": "{bcrypt}..."
        }
    ],
    "patches": [
        {
            "minecraftVersion": "1.21.4",
            "path": "foo.patch",
            "status": "DONE",
            "responsibleUser": "alice",
            "updatedAt": 1787116168152,
            "duration": 123456
        }
    ]
}
```

`exportedAt`, `updatedAt`, and `duration` are epoch milliseconds. `updatedAt` is required for every patch. `duration` is null when a patch has no accumulated work time.

The configured Spring users are exported as bcrypt hashes so an Access-authenticated Worker user can claim the corresponding legacy account later.

## Import into the Worker

Send the retained file to the Access-protected Worker using the normal API authentication:

```sh
curl -X POST \
  -H 'Content-Type: application/json' \
  --data-binary @patch-roulette-legacy-data.json \
  https://worker-host.example/api/import-legacy-data
```

The import:

- validates the complete payload;
- requires at least one patch record;
- requires the Durable Object patch table to be empty;
- writes the legacy users and patches transactionally; and
- returns `204 No Content` on success.

Invalid data, including an empty patch list, returns `400`. A second import of a nonempty archive returns `409` with a useful plain-text message.

## Claiming legacy ownership

After import, an Access-authenticated user can claim a legacy account through:

```http
POST /api/me/claim-legacy
Content-Type: application/json

{
  "username": "alice",
  "password": "legacy-password"
}
```

Claiming moves that account's patch ownership to the current Access identity and disables the legacy credential. It is a low-use migration feature, not an application authentication system.

## Cutover

1. Ensure the legacy Spring image containing the export route is deployed.
2. Run the export with `curl` and retain the JSON file.
3. Deploy the Worker version.
4. Import the retained file.
5. Verify patches, owners, timestamps, durations, and statistics.
6. Disable the old Spring infrastructure and retire the backend as a whole.
