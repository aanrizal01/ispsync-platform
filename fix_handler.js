const fs = require('fs');

const file = 'internal/handler/api_handler.go';
let content = fs.readFileSync(file, 'utf8');

// Fix errorResponse
content = content.replace(/h\.errorResponse\(w, "Gagal memuat tiket", http\.StatusInternalServerError\)/g, 'h.errorResponse(w, http.StatusInternalServerError, "Gagal memuat tiket")');
content = content.replace(/h\.errorResponse\(w, "Payload tidak valid", http\.StatusBadRequest\)/g, 'h.errorResponse(w, http.StatusBadRequest, "Payload tidak valid")');
content = content.replace(/h\.errorResponse\(w, "Gagal membuat tiket", http\.StatusInternalServerError\)/g, 'h.errorResponse(w, http.StatusInternalServerError, "Gagal membuat tiket")');
content = content.replace(/h\.errorResponse\(w, "Gagal mengupdate tiket", http\.StatusInternalServerError\)/g, 'h.errorResponse(w, http.StatusInternalServerError, "Gagal mengupdate tiket")');

// Fix jsonResponse
content = content.replace(/h\.jsonResponse\(w, map\[string\]interface\{\}\{"data": tickets\}\)/g, 'h.jsonResponse(w, http.StatusOK, map[string]interface{}{"data": tickets})');
content = content.replace(/h\.jsonResponse\(w, map\[string\]interface\{\}\{"message": "Tiket berhasil dibuat", "data": t\}\)/g, 'h.jsonResponse(w, http.StatusOK, map[string]interface{}{"message": "Tiket berhasil dibuat", "data": t})');
content = content.replace(/h\.jsonResponse\(w, map\[string\]interface\{\}\{"message": "Tiket berhasil diupdate", "data": t\}\)/g, 'h.jsonResponse(w, http.StatusOK, map[string]interface{}{"message": "Tiket berhasil diupdate", "data": t})');

fs.writeFileSync(file, content);
