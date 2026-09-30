# ISP Billing API — Dockerfile
# Multi-stage build: dev (with air hot-reload) + production

# ──────────────────────────────────────────────────────────
# Stage: base — download dependencies
# ──────────────────────────────────────────────────────────
FROM golang:1.23-alpine AS base

RUN apk add --no-cache git ca-certificates tzdata

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download && go mod verify

# ──────────────────────────────────────────────────────────
# Stage: dev — with Air hot-reload for development
# ──────────────────────────────────────────────────────────
FROM base AS dev

RUN go install github.com/air-verse/air@latest

COPY . .

EXPOSE 8080
CMD ["air", "-c", ".air.toml"]

# ──────────────────────────────────────────────────────────
# Stage: builder — compile production binary
# ──────────────────────────────────────────────────────────
FROM base AS builder

COPY . .

# Build API binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build \
    -ldflags="-s -w -X main.version=${VERSION:-dev}" \
    -o /out/api \
    ./cmd/api

# Build Worker binary
RUN CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \
    go build \
    -ldflags="-s -w -X main.version=${VERSION:-dev}" \
    -o /out/worker \
    ./cmd/worker

# ──────────────────────────────────────────────────────────
# Stage: production — distroless minimal image
# ──────────────────────────────────────────────────────────
FROM gcr.io/distroless/static-debian12 AS production

# Copy timezone data and CA certs from builder
COPY --from=builder /usr/share/zoneinfo /usr/share/zoneinfo
COPY --from=builder /etc/ssl/certs/ca-certificates.crt /etc/ssl/certs/

# Copy compiled binaries
COPY --from=builder /out/api /api
COPY --from=builder /out/worker /worker

# Copy migrations (API runs migrations on startup)
COPY --from=builder /app/migrations /migrations

EXPOSE 8080

ENTRYPOINT ["/api"]
