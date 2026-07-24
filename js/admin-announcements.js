/* =======================================================
   FILE: admin-announcements.js
   MỤC ĐÍCH: CRUD cho bảng "announcements" — dùng cho trang
   quản lý Thông báo nổi bật.

   Cần: supabase-config.js (biến supabaseClient) nạp trước.
   ======================================================= */

document.addEventListener("DOMContentLoaded", () => {
  loadAnnouncementsAdmin();
  initAddAnnouncementForm();
});

/* =======================================================
   ĐỌC DỮ LIỆU (Read)
   ======================================================= */
async function loadAnnouncementsAdmin() {
  const container = document.getElementById("announcementsAdminList");

  const { data, error } = await supabaseClient
    .from("announcements")
    .select("*")
    .order("announce_date", { ascending: false }); // Thông báo mới nhất lên đầu

  if (error) {
    container.innerHTML = `<p class="admin-message admin-message-error">Lỗi tải dữ liệu: ${error.message}</p>`;
    return;
  }

  renderAnnouncementsAdminList(data);
}

function renderAnnouncementsAdminList(items) {
  const container = document.getElementById("announcementsAdminList");

  if (!items || items.length === 0) {
    container.innerHTML = '<p class="loading-text">Chưa có thông báo nào. Thêm mới ở form phía trên.</p>';
    return;
  }

  container.innerHTML = items
    .map(
      (a) => `
      <div class="admin-position-row admin-announcement-row" data-id="${a.id}">
        <div class="admin-position-fields">
          <label>Nhãn hiển thị</label>
          <input type="text" class="input-tag" value="${escapeHtml(a.tag)}" />

          <label>Nội dung thông báo</label>
          <input type="text" class="input-title" value="${escapeHtml(a.title)}" />

          <label>Ngày đăng</label>
          <input type="date" class="input-date" value="${a.announce_date || ""}" />

          <label>Link liên kết</label>
          <input type="text" class="input-link" value="${escapeHtml(a.link_url || "")}" placeholder="Không có link" />
        </div>

        <div class="admin-position-actions">
          <button class="btn btn-primary btn-save-announcement">💾 Lưu</button>
          <button class="btn btn-danger btn-delete-announcement">🗑️ Xóa</button>
        </div>
      </div>
    `
    )
    .join("");

  attachAnnouncementRowEvents();
}

function escapeHtml(text) {
  return String(text).replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/* =======================================================
   TẠO MỚI (Create)
   ======================================================= */
function initAddAnnouncementForm() {
  const form = document.getElementById("addAnnouncementForm");
  const messageEl = document.getElementById("addMessage");
  const addBtn = document.getElementById("addBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const tag = document.getElementById("newTag").value.trim();
    const title = document.getElementById("newTitle").value.trim();
    const announce_date = document.getElementById("newDate").value || null;
    const link_url = document.getElementById("newLink").value.trim() || null;

    if (!tag || !title) return;

    addBtn.disabled = true;
    addBtn.textContent = "Đang thêm...";
    messageEl.hidden = true;

    const { error } = await supabaseClient.from("announcements").insert({
      tag,
      title,
      announce_date,
      link_url,
      display_order: 0,
    });

    addBtn.disabled = false;
    addBtn.textContent = "+ Thêm thông báo";

    if (error) {
      showMessage(messageEl, `Lỗi lưu dữ liệu: ${error.message}`, true);
      return;
    }

    showMessage(messageEl, "✅ Đã thêm thông báo mới!", false);
    form.reset();
    loadAnnouncementsAdmin();
  });
}

/* =======================================================
   CẬP NHẬT (Update) + XÓA (Delete)
   ======================================================= */
function attachAnnouncementRowEvents() {
  document.querySelectorAll(".btn-save-announcement").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const row = btn.closest(".admin-announcement-row");
      const id = row.dataset.id;

      const tag = row.querySelector(".input-tag").value.trim();
      const title = row.querySelector(".input-title").value.trim();
      const announce_date = row.querySelector(".input-date").value || null;
      const link_url = row.querySelector(".input-link").value.trim() || null;

      btn.disabled = true;
      btn.textContent = "Đang lưu...";

      const { error } = await supabaseClient
        .from("announcements")
        .update({ tag, title, announce_date, link_url })
        .eq("id", id);

      btn.disabled = false;
      btn.textContent = "💾 Lưu";

      if (error) {
        alert("Lỗi cập nhật: " + error.message);
        return;
      }

      loadAnnouncementsAdmin();
    });
  });

  document.querySelectorAll(".btn-delete-announcement").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const row = btn.closest(".admin-announcement-row");
      const id = row.dataset.id;
      const title = row.querySelector(".input-title").value;

      const confirmed = confirm(`Xóa thông báo "${title}"?`);
      if (!confirmed) return;

      const { error } = await supabaseClient.from("announcements").delete().eq("id", id);

      if (error) {
        alert("Lỗi xóa: " + error.message);
        return;
      }

      loadAnnouncementsAdmin();
    });
  });
}

function showMessage(el, text, isError) {
  el.textContent = text;
  el.hidden = false;
  el.className = isError ? "admin-message admin-message-error" : "admin-message admin-message-success";
}