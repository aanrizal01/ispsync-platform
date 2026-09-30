package logger

import (
	"log/slog"
	"os"
)

// New creates a structured slog.Logger based on format and level.
// format: "json" | "console" (anything else defaults to json)
// level:  "debug" | "info" | "warn" | "error"
func New(format, level string) *slog.Logger {
	var lvl slog.Level
	switch level {
	case "debug":
		lvl = slog.LevelDebug
	case "warn":
		lvl = slog.LevelWarn
	case "error":
		lvl = slog.LevelError
	default:
		lvl = slog.LevelInfo
	}

	opts := &slog.HandlerOptions{
		Level:     lvl,
		AddSource: lvl == slog.LevelDebug,
	}

	var handler slog.Handler
	if format == "console" {
		handler = slog.NewTextHandler(os.Stdout, opts)
	} else {
		handler = slog.NewJSONHandler(os.Stdout, opts)
	}

	return slog.New(handler)
}

// With returns a logger with additional key-value pairs.
func With(logger *slog.Logger, args ...any) *slog.Logger {
	return logger.With(args...)
}
