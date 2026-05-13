FROM golang:1.26-alpine AS build
WORKDIR /app
COPY go.mod go.sum ./
COPY cmd/ ./cmd/
COPY internal/ ./internal/
RUN CGO_ENABLED=0 go build -o /agent ./cmd/agent/

FROM alpine:3.21
RUN apk add --no-cache ca-certificates
COPY --from=build /agent /agent
CMD ["/agent"]
