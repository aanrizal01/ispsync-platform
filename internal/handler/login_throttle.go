package handler

import (
	"sync"
	"time"
)

// loginThrottle membatasi percobaan login gagal per (IP, tenant, username).
type loginThrottle struct {
	mu       sync.Mutex
	failures map[string][]time.Time
}

const (
	maxLoginFailures = 5
	loginWindow      = 15 * time.Minute
)

func newLoginThrottle() *loginThrottle {
	return &loginThrottle{failures: map[string][]time.Time{}}
}

func (t *loginThrottle) prune(key string, now time.Time) []time.Time {
	var keep []time.Time
	for _, ts := range t.failures[key] {
		if now.Sub(ts) < loginWindow {
			keep = append(keep, ts)
		}
	}
	if len(keep) == 0 {
		delete(t.failures, key)
	} else {
		t.failures[key] = keep
	}
	return keep
}

// Blocked true bila kunci sudah mencapai batas gagal dalam jendela waktu.
func (t *loginThrottle) Blocked(key string) bool {
	t.mu.Lock()
	defer t.mu.Unlock()
	return len(t.prune(key, time.Now())) >= maxLoginFailures
}

func (t *loginThrottle) Fail(key string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	now := time.Now()
	t.prune(key, now)
	t.failures[key] = append(t.failures[key], now)
}

func (t *loginThrottle) Reset(key string) {
	t.mu.Lock()
	defer t.mu.Unlock()
	delete(t.failures, key)
}
