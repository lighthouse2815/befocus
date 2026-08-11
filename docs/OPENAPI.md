# OpenAPI and API access

The backend generates an OpenAPI document from the running application.

| Resource | Local URL |
| --- | --- |
| Swagger UI | <http://localhost:8080/swagger-ui.html> |
| OpenAPI JSON | <http://localhost:8080/v3/api-docs> |
| Health | <http://localhost:8080/actuator/health> |
| REST base | <http://localhost:8080/api/v1> |

The Nginx frontend also proxies API requests at `http://localhost:5173/api/v1`, which matches the browser's production topology.

## Authentication

Register or log in, then send the access token as a bearer token:

```bash
curl -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"your-password"}'

curl http://localhost:8080/api/v1/users/me \
  -H "Authorization: Bearer ACCESS_TOKEN"
```

In Swagger UI, use the **Authorize** control and paste the access token. The refresh-token endpoint rotates refresh credentials; clients should replace both stored tokens with the values returned by refresh.

## Dates and time

- Timestamps are ISO-8601 UTC instants.
- Habit entry dates are local calendar dates in `YYYY-MM-DD` form.
- Date-range query parameters are inclusive unless an operation explicitly documents otherwise.
- The authenticated user's timezone controls habit-day and streak boundaries.

## Error envelope

Validation, authentication, authorization, conflict, and not-found errors use one shape:

```json
{
  "timestamp": "2026-08-12T10:00:00Z",
  "status": 400,
  "code": "VALIDATION_ERROR",
  "message": "Please check the highlighted fields.",
  "errors": {
    "email": "Enter a valid email address."
  }
}
```

Clients should branch on the stable `code` and HTTP status, not parse human-readable text. Stack traces and internal exception details are not part of the response.

## Production exposure

The health endpoint is intentionally unauthenticated for the container orchestrator. Treat the generated API document and Swagger UI according to deployment policy: they are useful for a private/internal service, but can be restricted at the reverse proxy for a public production deployment without changing the REST API itself.

The curated route and schema overview is in [API_CONTRACT.md](API_CONTRACT.md).
