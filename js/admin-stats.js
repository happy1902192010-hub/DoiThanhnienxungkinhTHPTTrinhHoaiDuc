/* =======================================================
   FILE: admin-stats.js
   MỤC ĐÍCH:
   1. Đếm số liệu tổng quan (thành viên, tin tức, sự kiện,
      lượt đăng ký, ảnh) — dùng { count: "exact", head: true }
      để CHỈ đếm số lượng, KHÔNG tải toàn bộ dữ liệu về (nhanh
      hơn nhiều so với .select("*") rồi đếm .length).
   2. CRUD danh sách thành viên (bảng members).
   3. CRUD thư viện ảnh (bảng gallery_images + bucket gallery.images).

   Cần: supabase-config.js (biến supabaseClient) nạp trước.
   ======================================================= */

document.addEventListener("DOMContentLoaded", () => {
  loadStats();
  loadMembers();
  initAddMemberForm();
  loadGalleryAdmin();
  initAddGalleryForm();
});

/* =======================================================
   PHẦN 1: SỐ LIỆU TỔNG QUAN
   ======================================================= */
async function loadStats() {
  // Chạy CẢ 5 câu đếm CÙNG LÚC bằng Promise.all, thay vì đếm
  // lần lượt từng cái — giúp trang tải nhanh hơn nhiều lần,
  // vì không phải chờ câu này xong mới chạy câu tiếp theo.
  const [members, news, events, registrations, gallery] = await Promise.all([
    countRows("members"),
    countRows("news_posts"),
    countRows("events"),
    countRows("event_registrations"),
    countRows("gallery_images"),
  ]);

  document.getElementById("statMembers").textContent = members;
  document.getElementById("statNews").textContent = news;
  document.getElementById("statEvents").textContent = events;
  document.getElementById("statRegistrations").textContent = registrations;
  document.getElementById("statGallery").textContent = gallery;
}

// Hàm dùng chung: đếm số dòng trong 1 bảng bất kỳ
async function countRows(tableName) {
  // { count: "exact", head: true }: yêu cầu Supabase chỉ trả về
  // CON SỐ tổng số dòng, KHÔNG trả về dữ liệu thật — tiết kiệm
  // băng thông đáng kể so với lấy hết dữ liệu rồi đếm .length
  const { count, error } = await supabaseClient
    .from(tableName)
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error(`Lỗi đếm bảng ${tableName}:`, error);
    return "?"; // Hiện dấu hỏi thay vì làm hỏng cả trang nếu 1 bảng bị lỗi
  }

  return count;
}

/* =======================================================
   PHẦN 2: QUẢN LÝ THÀNH VIÊN
   ======================================================= */
async function loadMembers() {
  const container = document.getElementById("membersList");

  const { data, error } = await supabaseClient
    .from("members")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    container.innerHTML = `<p class="admin-message admin-message-error">Lỗi tải dữ liệu: ${error.message}</p>`;
    return;
  }

  renderMembersList(data);
}

function renderMembersList(members) {
  const container = document.getElementById("membersList");

  if (!members || members.length === 0) {
    container.innerHTML = '<p class="loading-text">Chưa có thành viên nào.</p>';
    return;
  }

  container.innerHTML = `
    <table class="registrations-table">
      <thead>
        <tr><th>Họ tên</th><th>Email</th><th>SĐT</th><th>Ngày tham gia</th><th></th></tr>
      </thead>
      <tbody>
        ${members
          .map(
            (m) => `
          <tr>
            <td>${escapeHtml(m.full_name)}</td>
            <td>${escapeHtml(m.email || "")}</td>
            <td>${escapeHtml(m.phone || "")}</td>
            <td>${m.join_date ? new Date(m.join_date).toLocaleDateString("vi-VN") : ""}</td>
            <td><button class="btn-delete-member" data-id="${m.id}">🗑️</button></td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;

  document.querySelectorAll(".btn-delete-member").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const confirmed = confirm("Xóa thành viên này khỏi danh sách?");
      if (!confirmed) return;

      await supabaseClient.from("members").delete().eq("id", btn.dataset.id);
      loadMembers(); // Tải lại danh sách
      loadStats(); // Cập nhật lại số đếm ở phần Số liệu tổng quan
    });
  });
}

function initAddMemberForm() {
  const form = document.getElementById("addMemberForm");
  const messageEl = document.getElementById("addMemberMessage");
  const btn = document.getElementById("addMemberBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const full_name = document.getElementById("newMemberName").value.trim();
    const email = document.getElementById("newMemberEmail").value.trim();
    const phone = document.getElementById("newMemberPhone").value.trim();

    if (!full_name) return;

    btn.disabled = true;
    btn.textContent = "Đang thêm...";

    const { error } = await supabaseClient.from("members").insert({ full_name, email, phone });

    btn.disabled = false;
    btn.textContent = "+ Thêm thành viên";

    if (error) {
      showMessage(messageEl, `Lỗi: ${error.message}`, true);
      return;
    }

    showMessage(messageEl, "✅ Đã thêm thành viên!", false);
    form.reset();
    loadMembers();
    loadStats(); // Số đếm thành viên tăng lên ngay, không cần tải lại trang
  });
}

/* =======================================================
   PHẦN 3: QUẢN LÝ THƯ VIỆN ẢNH
   ======================================================= */
async function loadGalleryAdmin() {
  const container = document.getElementById("galleryAdminGrid");

  const { data, error } = await supabaseClient
    .from("gallery_images")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    container.innerHTML = `<p class="admin-message admin-message-error">Lỗi tải dữ liệu: ${error.message}</p>`;
    return;
  }

  renderGalleryAdminGrid(data);
}

function renderGalleryAdminGrid(images) {
  const container = document.getElementById("galleryAdminGrid");

  if (!images || images.length === 0) {
    container.innerHTML = '<p class="loading-text">Thư viện chưa có ảnh nào.</p>';
    return;
  }

  container.innerHTML = images
    .map(
      (img) => `
      <div class="gallery-admin-item">
        <img src="${img.image_url}" alt="${escapeHtml(img.caption || "")}" />
        <p class="gallery-caption">${escapeHtml(img.caption || "(không có chú thích)")}</p>
        <button class="btn btn-danger btn-delete-gallery" data-id="${img.id}">🗑️ Xóa</button>
      </div>
    `
    )
    .join("");

  document.querySelectorAll(".btn-delete-gallery").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const confirmed = confirm("Xóa ảnh này khỏi thư viện?");
      if (!confirmed) return;

      // Lưu ý: chỉ xóa bản ghi trong bảng gallery_images (đường dẫn
      // tới ảnh), KHÔNG xóa file ảnh thật trong Storage — để đơn
      // giản hóa code. File ảnh cũ sẽ vẫn còn trong Storage nhưng
      // không hiển thị ở đâu nữa (không ảnh hưởng tới hoạt động web).
      await supabaseClient.from("gallery_images").delete().eq("id", btn.dataset.id);
      loadGalleryAdmin();
      loadStats();
    });
  });
}

function initAddGalleryForm() {
  const form = document.getElementById("addGalleryForm");
  const messageEl = document.getElementById("addGalleryMessage");
  const btn = document.getElementById("addGalleryBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const rawImageFile = document.getElementById("newGalleryImage").files[0];
    const caption = document.getElementById("newGalleryCaption").value.trim();

    if (!rawImageFile) return;

    // Mở khung sắp xếp + cắt/căn chỉnh ảnh trước khi upload
    const picked = await openImagePicker([rawImageFile]);
    if (picked.length === 0) return; // hủy ở bước căn chỉnh ảnh -> không đăng
    const imageFile = picked[0];

    btn.disabled = true;
    btn.textContent = "Đang tải lên...";
    messageEl.hidden = true;

    const cleanFileName = sanitizeFileName(imageFile.name);
    const filePath = `gallery/${Date.now()}_${cleanFileName}`;

    const { error: uploadError } = await supabaseClient.storage
      .from("gallery.images")
      .upload(filePath, imageFile);

    if (uploadError) {
      showMessage(messageEl, `Lỗi upload ảnh: ${uploadError.message}`, true);
      btn.disabled = false;
      btn.textContent = "+ Tải ảnh lên";
      return;
    }

    const { data: urlData } = supabaseClient.storage.from("gallery.images").getPublicUrl(filePath);

    const { error: insertError } = await supabaseClient.from("gallery_images").insert({
      image_url: urlData.publicUrl,
      caption,
      display_order: 0,
    });

    btn.disabled = false;
    btn.textContent = "+ Tải ảnh lên";

    if (insertError) {
      showMessage(messageEl, `Lỗi lưu dữ liệu: ${insertError.message}`, true);
      return;
    }

    showMessage(messageEl, "✅ Đã tải ảnh lên thư viện!", false);
    form.reset();
    loadGalleryAdmin();
    loadStats();
  });
}

/* =======================================================
   HÀM DÙNG CHUNG
   ======================================================= */
function sanitizeFileName(fileName) {
  return fileName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "");
}

function escapeHtml(text) {
  return String(text).replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function showMessage(el, text, isError) {
  el.textContent = text;
  el.hidden = false;
  el.className = isError ? "admin-message admin-message-error" : "admin-message admin-message-success";
}