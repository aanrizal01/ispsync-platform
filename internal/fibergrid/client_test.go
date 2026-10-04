package fibergrid

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
)

func newTestClient(srv *httptest.Server, key string) *Client {
	return &Client{baseURL: srv.URL, key: key, http: srv.Client()}
}

func TestLookupONT(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Internal-Key") != "k" {
			w.WriteHeader(http.StatusUnauthorized)
			return
		}
		if r.URL.Query().Get("sn") == "SN1" {
			_, _ = w.Write([]byte(`{"success":true,"data":{"serial_number":"SN1","status":"ONLINE","signal_rx_dbm":-21.5}}`))
			return
		}
		w.WriteHeader(http.StatusNotFound)
		_, _ = w.Write([]byte(`{"success":false,"error":"ONT tidak ditemukan"}`))
	}))
	defer srv.Close()

	c := newTestClient(srv, "k")
	o, err := c.LookupONT(context.Background(), "SN1")
	if err != nil || o.SerialNumber != "SN1" || o.Status != "ONLINE" || o.SignalRxDBM != -21.5 {
		t.Fatalf("lookup gagal: %+v %v", o, err)
	}
	if _, err := c.LookupONT(context.Background(), "NOPE"); !errors.Is(err, ErrNotFound) {
		t.Fatalf("harus ErrNotFound, dapat %v", err)
	}
	if _, err := newTestClient(srv, "salah").LookupONT(context.Background(), "SN1"); err == nil {
		t.Fatal("key salah harus gagal")
	}
	if _, err := newTestClient(srv, "").LookupONT(context.Background(), "SN1"); !errors.Is(err, ErrNotConfigured) {
		t.Fatalf("tanpa key harus ErrNotConfigured, dapat %v", err)
	}
}
