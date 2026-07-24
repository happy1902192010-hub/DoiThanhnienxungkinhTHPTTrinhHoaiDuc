/* =======================================================
   FILE: admin-advisors.js
   MỤC ĐÍCH: CRUD cho bảng "advisor_teachers" — dùng cho trang
   quản lý Giáo viên cố vấn. Cấu trúc giống admin-leadership.js.

   Cần: supabase-config.js (biến supabaseClient) nạp trước.
   Tên bucket ảnh: "advisors.images"
   ======================================================= */

document.addEventListener("DOMContentLoaded", () => {
  loadAdvisorsAdmin();
  initAddAdvisorForm();
});

/* =======================================================
   ĐỌC DỮ LIỆU (Read)
   ======================================================= */
async function loadAdvisorsAdmin() {
  const container = document.getElementById("advisorsList");

  const { data, error } = await supabaseClient
    .from("advisor_teachers")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    container.innerHTML = `<p class="admin-message admin-message-error">Lỗi tải dữ liệu: ${error.message}</p>`;
    return;
  }

  renderAdvisorsAdminList(data);
}

function renderAdvisorsAdminList(items) {
  const container = document.getElementById("advisorsList");

  if (!items || items.length === 0) {
    container.innerHTML = '<p class="loading-text">Chưa có giáo viên cố vấn nào. Thêm mới ở form phía trên.</p>';
    return;
  }

  container.innerHTML = items
    .map(
      (t) => `
      <div class="admin-position-row" data-id="${t.id}">
        <img
          src="${t.image_url || "https://via.placeholder.com/80x80?text=No+Image"}"
          alt="${escapeHtml(t.name)}"
          class="admin-position-thumb"
        />

        <div class="admin-position-fields">
          <label>Họ tên</label>
          <input type="text" class="input-name" value="${escapeHtml(t.name)}" />

          <label>Chức danh</label>
          <input type="text" class="input-title" value="${escapeHtml(t.title || "")}" />

          <label>Giới thiệu ngắn</label>
          <textarea class="input-bio" rows="2">${escapeHtml(t.bio || "")}</textarea>

          <label>Đổi ảnh (không bắt buộc)</label>
          <input type="file" class="input-image" accept="image/*" />
        </div>

        <div class="admin-position-actions">
          <button class="btn btn-primary btn-save-advisor">💾 Lưu</button>
          <button class="btn btn-danger btn-delete-advisor">🗑️ Xóa</button>
        </div>
      </div>
    `
    )
    .join("");

  attachAdvisorRowEvents();
}

function escapeHtml(text) {
  return String(text).replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/* =======================================================
   TẠO MỚI (Create)
   ======================================================= */
function initAddAdvisorForm() {
  const form = document.getElementById("addAdvisorForm");
  const messageEl = document.getElementById("addMessage");
  const addBtn = document.getElementById("addBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("newName").value.trim();
    const title = document.getElementById("newTitle").value.trim();
    const bio = document.getElementById("newBio").value.trim();
    const imageFile = document.getElementById("newImage").files[0];

    if (!name) return;

    addBtn.disabled = true;
    addBtn.textContent = "Đang thêm...";
    messageEl.hidden = true;

    let imageUrl = null;
    if (imageFile) {
      const { url, error: uploadError } = await uploadAdvisorImage(imageFile);
      if (uploadError) {
        showMessage(messageEl, `Lỗi upload ảnh: ${uploadError}`, true);
        addBtn.disabled = false;
        addBtn.textContent = "+ Thêm giáo viên";
        return;
      }
      imageUrl = url;
    }

    const { error: insertError } = await supabaseClient.from("advisor_teachers").insert({
      name,
      title,
      bio,
      image_url: imageUrl,
      display_order: 0,
    });

    addBtn.disabled = false;
    addBtn.textContent = "+ Thêm giáo viên";

    if (insertError) {
      showMessage(messageEl, `Lỗi lưu dữ liệu: ${insertError.message}`, true);
      return;
    }

    showMessage(messageEl, "✅ Đã thêm giáo viên cố vấn!", false);
    form.reset();
    document.getElementById("newTitle").value = "Giáo viên cố vấn";
    loadAdvisorsAdmin();
  });
}

/* =======================================================
   CẬP NHẬT (Update) + XÓA (Delete)
   ======================================================= */
function attachAdvisorRowEvents() {
  document.querySelectorAll(".btn-save-advisor").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const row = btn.closest(".admin-position-row");
      const id = row.dataset.id;

      const name = row.querySelector(".input-name").value.trim();
      const title = row.querySelector(".input-title").value.trim();
      const bio = row.querySelector(".input-bio").value.trim();
      const imageFile = row.querySelector(".input-image").files[0];

      btn.disabled = true;
      btn.textContent = "Đang lưu...";

      const updates = { name, title, bio };

      if (imageFile) {
        const { url, error: uploadError } = await uploadAdvisorImage(imageFile);
        if (uploadError) {
          alert("Lỗi upload ảnh: " + uploadError);
          btn.disabled = false;
          btn.textContent = "💾 Lưu";
          return;
        }
        updates.image_url = url;
      }

      const { error } = await supabaseClient.from("advisor_teachers").update(updates).eq("id", id);

      btn.disabled = false;
      btn.textContent = "💾 Lưu";

      if (error) {
        alert("Lỗi cập nhật: " + error.message);
        return;
      }

      loadAdvisorsAdmin();
    });
  });

  document.querySelectorAll(".btn-delete-advisor").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const row = btn.closest(".admin-position-row");
      const id = row.dataset.id;
      const name = row.querySelector(".input-name").value;

      const confirmed = confirm(`Xóa giáo viên cố vấn "${name}"?`);
      if (!confirmed) return;

      const { error } = await supabaseClient.from("advisor_teachers").delete().eq("id", id);

      if (error) {
        alert("Lỗi xóa: " + error.message);
        return;
      }

      loadAdvisorsAdmin();
    });
  });
}

/* =======================================================
   HÀM DÙNG CHUNG: Upload ảnh lên Supabase Storage
   ======================================================= */
async function uploadAdvisorImage(file) {
  const cleanFileName = sanitizeFileName(file.name);
  const filePath = `advisors/${Date.now()}_${cleanFileName}`;

  const { error: uploadError } = await supabaseClient.storage.from("advisors.images").upload(filePath, file);

  if (uploadError) {
    return { url: null, error: uploadError.message };
  }

  const { data } = supabaseClient.storage.from("advisors.images").getPublicUrl(filePath);
  return { url: data.publicUrl, error: null };
}

function sanitizeFileName(fileName) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "");
}

function showMessage(el, text, isError) {
  el.textContent = text;
  el.hidden = false;
  el.className = isError ? "admin-message admin-message-error" : "admin-message admin-message-success";
}