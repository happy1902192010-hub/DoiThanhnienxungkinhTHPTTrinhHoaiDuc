/* =======================================================
   FILE: admin-contact.js
   MỤC ĐÍCH: Xem danh sách tin nhắn liên hệ (bảng
   contact_messages) — đánh dấu đã đọc, xóa tin nhắn.
   Đây là bảng CHỈ ADMIN xem được (RLS đã chặn người ngoài đọc).

   Cần: supabase-config.js (biến supabaseClient) nạp trước.
   ======================================================= */

document.addEventListener("DOMContentLoaded", () => {
  loadMessages();
});

/* --------- Lấy danh sách tin nhắn --------- */
async function loadMessages() {
  const container = document.getElementById("messagesList");

  const { data, error } = await supabaseClient
    .from("contact_messages")
    .select("*")
    .order("created_at", { ascending: false }); // Tin mới nhất lên đầu

  if (error) {
    container.innerHTML = `<p class="admin-message admin-message-error">Lỗi tải dữ liệu: ${error.message}</p>`;
    return;
  }

  renderMessages(data);
  updateUnreadBadge(data);
}

/* --------- Hiện số lượng tin CHƯA đọc ở đầu trang --------- */
function updateUnreadBadge(messages) {
  const badge = document.getElementById("unreadBadge");
  const unreadCount = messages.filter((m) => !m.is_read).length;

  if (unreadCount > 0) {
    badge.textContent = `${unreadCount} tin chưa đọc`;
    badge.hidden = false;
  } else {
    badge.hidden = true;
  }
}

/* --------- Vẽ danh sách tin nhắn ra màn hình --------- */
function renderMessages(messages) {
  const container = document.getElementById("messagesList");

  if (!messages || messages.length === 0) {
    container.innerHTML = '<p class="loading-text">Chưa có tin nhắn nào.</p>';
    return;
  }

  container.innerHTML = messages
    .map((m) => {
      // class "message-unread" dùng để CSS làm nổi bật tin CHƯA đọc
      // (viền trái đậm hơn) — giúp Admin dễ nhận ra tin mới ngay
      const unreadClass = m.is_read ? "" : "message-unread";

      return `
        <div class="admin-message-card ${unreadClass}" data-id="${m.id}">
          <div class="admin-message-header">
            <div>
              <strong>${escapeHtml(m.full_name)}</strong>
              ${m.email ? `<span class="admin-message-email"> — ${escapeHtml(m.email)}</span>` : ""}
            </div>
            <span class="admin-message-date">${formatDateTime(m.created_at)}</span>
          </div>

          <p class="admin-message-body">${escapeHtml(m.message)}</p>

          <div class="admin-message-actions">
            ${
              m.is_read
                ? `<span class="read-label">✓ Đã đọc</span>`
                : `<button class="btn-mark-read" data-id="${m.id}">Đánh dấu đã đọc</button>`
            }
            <button class="btn-delete-message" data-id="${m.id}">🗑️ Xóa</button>
          </div>
        </div>
      `;
    })
    .join("");

  attachMessageEvents();
}

function escapeHtml(text) {
  return String(text).replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function formatDateTime(isoString) {
  const d = new Date(isoString);
  const dateStr = d.toLocaleDateString("vi-VN");
  const timeStr = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return `${timeStr} ${dateStr}`;
}

/* --------- Gắn sự kiện: đánh dấu đã đọc + xóa --------- */
function attachMessageEvents() {
  document.querySelectorAll(".btn-mark-read").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.dataset.id;
      await supabaseClient.from("contact_messages").update({ is_read: true }).eq("id", id);
      loadMessages(); // Tải lại để cập nhật giao diện + số đếm chưa đọc
    });
  });

  document.querySelectorAll(".btn-delete-message").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const confirmed = confirm("Xóa tin nhắn này?");
      if (!confirmed) return;

      const id = btn.dataset.id;
      await supabaseClient.from("contact_messages").delete().eq("id", id);
      loadMessages();
    });
  });
}