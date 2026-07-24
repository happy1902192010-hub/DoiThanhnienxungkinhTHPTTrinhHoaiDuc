/* =======================================================
   FILE: admin-achievements.js
   MỤC ĐÍCH: CRUD cho bảng "achievements" — dùng cho trang
   quản lý Thành tích. Cấu trúc giống admin-org.js/admin-news.js.

   Cần: supabase-config.js (biến supabaseClient) nạp trước.
   Tên bucket ảnh: "achievements.images"
   ======================================================= */

let newAchievementBlocksEditorApi = null;

document.addEventListener("DOMContentLoaded", () => {
  loadAchievementsAdmin();
  initAddAchievementForm();
  newAchievementBlocksEditorApi = initContentBlocksEditor(
    document.getElementById("newContentBlocksEditor"),
    [],
    uploadOneAchievementImage
  );
});

// Hàm upload 1 ảnh — dùng cho Block Editor (khác uploadAchievementImages
// vốn nhận vào 1 MẢNG file, ở đây Block Editor chỉ cần upload TỪNG ảnh 1)
async function uploadOneAchievementImage(file) {
  const { urls, error } = await uploadAchievementImages([file]);
  return { url: urls[0], error };
}

/* =======================================================
   ĐỌC DỮ LIỆU (Read)
   ======================================================= */
async function loadAchievementsAdmin() {
  const container = document.getElementById("achievementsList");

  const { data, error } = await supabaseClient
    .from("achievements")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    container.innerHTML = `<p class="admin-message admin-message-error">Lỗi tải dữ liệu: ${error.message}</p>`;
    return;
  }

  renderAchievementsList(data);
}

function renderAchievementsList(items) {
  const container = document.getElementById("achievementsList");

  if (!items || items.length === 0) {
    container.innerHTML = '<p class="loading-text">Chưa có thành tích nào. Thêm mới ở form phía trên.</p>';
    return;
  }

  container.innerHTML = items
    .map(
      (a) => `
      <div class="admin-position-row" data-id="${a.id}" data-content-blocks="${encodeBlocksForAttr(a.content_blocks)}">
        <div class="admin-multi-thumb-col">
          ${renderThumbGallery(a.image_urls && a.image_urls.length > 0 ? a.image_urls : (a.image_url ? [a.image_url] : []), a.id)}
        </div>

        <div class="admin-position-fields">
          <label>Tên thành tích</label>
          <input type="text" class="input-title" value="${escapeHtml(a.title)}" />

          <label>Năm</label>
          <input type="text" class="input-year" value="${escapeHtml(a.year || "")}" />

          <label>Mô tả</label>
          <textarea class="input-description" rows="2">${escapeHtml(a.description || "")}</textarea>

          <label>Thêm ảnh mới (không bắt buộc, chọn được nhiều ảnh)</label>
          <input type="file" class="input-image" accept="image/*" multiple />

          <label>Nội dung chi tiết (thêm từng khối chữ/ảnh, dùng ▲▼ để sắp xếp thứ tự)</label>
          <div class="content-blocks-editor">
            <div class="content-blocks-list"></div>
            <div class="content-blocks-toolbar">
              <button type="button" class="btn btn-outline-dark btn-add-text-block">+ Thêm khối chữ</button>
              <label class="btn btn-outline-dark btn-add-image-block-label">
                + Thêm khối ảnh
                <input type="file" accept="image/*" multiple class="btn-add-image-block-input" hidden />
              </label>
            </div>
          </div>
        </div>

        <div class="admin-position-actions">
          <button class="btn btn-primary btn-save-achievement">💾 Lưu</button>
          <button class="btn btn-danger btn-delete-achievement">🗑️ Xóa</button>
        </div>
      </div>
    `
    )
    .join("");

  attachAchievementRowEvents();
}

function escapeHtml(text) {
  return String(text).replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

function renderThumbGallery(images, itemId) {
  if (!images || images.length === 0) {
    return `<div class="admin-no-image">Chưa có ảnh</div>`;
  }

  return `
    <div class="admin-thumb-gallery" data-item-id="${itemId}">
      ${images
        .map(
          (url, index) => `
        <div class="admin-thumb-item">
          <img src="${url}" alt="Ảnh ${index + 1}" />
          <button type="button" class="btn-remove-thumb" data-url="${String(url).replace(/"/g, "&quot;")}" title="Xóa ảnh này">✕</button>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

/* =======================================================
   TẠO MỚI (Create)
   ======================================================= */
function initAddAchievementForm() {
  const form = document.getElementById("addAchievementForm");
  const messageEl = document.getElementById("addMessage");
  const addBtn = document.getElementById("addBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("newTitle").value.trim();
    const year = document.getElementById("newYear").value.trim();
    const description = document.getElementById("newDescription").value.trim();
    const rawImageFiles = Array.from(document.getElementById("newImage").files);

    if (!title) return;

    // Nếu có chọn ảnh, mở khung sắp xếp thứ tự + cắt/căn chỉnh trước khi upload
    let imageFiles = [];
    if (rawImageFiles.length > 0) {
      imageFiles = await openImagePicker(rawImageFiles);
      if (imageFiles.length === 0) return; // hủy ở bước sắp xếp/căn chỉnh -> không đăng
    }

    addBtn.disabled = true;
    addBtn.textContent = "Đang thêm...";
    messageEl.hidden = true;

    let imageUrls = [];
    if (imageFiles.length > 0) {
      const { urls, error: uploadError } = await uploadAchievementImages(imageFiles);
      if (uploadError) {
        showMessage(messageEl, `Lỗi upload ảnh: ${uploadError}`, true);
        addBtn.disabled = false;
        addBtn.textContent = "+ Thêm thành tích";
        return;
      }
      imageUrls = urls;
    }

    // Lấy nội dung chi tiết dạng khối (chữ + ảnh, đúng thứ tự đã sắp
    // xếp bằng ▲▼); ảnh nào trong khối chưa upload sẽ được upload ở đây
    let contentBlocks = [];
    try {
      contentBlocks = await newAchievementBlocksEditorApi.getBlocksForSave();
    } catch (blocksError) {
      showMessage(messageEl, `Lỗi upload ảnh trong nội dung chi tiết: ${blocksError.message}`, true);
      addBtn.disabled = false;
      addBtn.textContent = "+ Thêm thành tích";
      return;
    }

    const { error: insertError } = await supabaseClient.from("achievements").insert({
      title,
      year,
      description,
      image_urls: imageUrls,
      image_url: imageUrls[0] || null,
      content_blocks: contentBlocks,
      display_order: 0,
    });

    addBtn.disabled = false;
    addBtn.textContent = "+ Thêm thành tích";

    if (insertError) {
      showMessage(messageEl, `Lỗi lưu dữ liệu: ${insertError.message}`, true);
      return;
    }

    showMessage(messageEl, "✅ Đã thêm thành tích thành công!", false);
    form.reset();
    newAchievementBlocksEditorApi.reset();
    loadAchievementsAdmin();
  });
}

/* =======================================================
   CẬP NHẬT (Update) + XÓA (Delete)
   ======================================================= */
function attachAchievementRowEvents() {
  document.querySelectorAll(".admin-position-row").forEach((row) => {
    const editorEl = row.querySelector(".content-blocks-editor");
    if (editorEl) {
      const initialBlocks = decodeBlocksFromAttr(row.dataset.contentBlocks);
      initContentBlocksEditor(editorEl, initialBlocks, uploadOneAchievementImage);
    }
  });

  document.querySelectorAll(".btn-save-achievement").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const row = btn.closest(".admin-position-row");
      const id = row.dataset.id;

      const title = row.querySelector(".input-title").value.trim();
      const year = row.querySelector(".input-year").value.trim();
      const description = row.querySelector(".input-description").value.trim();
      const rawNewFiles = Array.from(row.querySelector(".input-image").files);

      // Nếu có chọn ảnh mới, mở khung sắp xếp thứ tự + cắt/căn chỉnh trước khi upload
      let newFiles = [];
      if (rawNewFiles.length > 0) {
        newFiles = await openImagePicker(rawNewFiles);
        if (newFiles.length === 0) return; // hủy ở bước sắp xếp/căn chỉnh -> không lưu
      }

      btn.disabled = true;
      btn.textContent = "Đang lưu...";

      const updates = { title, year, description };

      const blocksEditorEl = row.querySelector(".content-blocks-editor");
      try {
        updates.content_blocks = await blocksEditorEl._blocksApi.getBlocksForSave();
      } catch (blocksError) {
        alert("Lỗi upload ảnh trong nội dung chi tiết: " + blocksError.message);
        btn.disabled = false;
        btn.textContent = "💾 Lưu";
        return;
      }

      if (newFiles.length > 0) {
        const { urls, error: uploadError } = await uploadAchievementImages(newFiles);
        if (uploadError) {
          alert("Lỗi upload ảnh: " + uploadError);
          btn.disabled = false;
          btn.textContent = "💾 Lưu";
          return;
        }

        const { data: current } = await supabaseClient
          .from("achievements")
          .select("image_urls")
          .eq("id", id)
          .single();

        const existingImages = (current && current.image_urls) || [];
        const combinedImages = [...existingImages, ...urls];

        updates.image_urls = combinedImages;
        updates.image_url = combinedImages[0] || null;
      }

      const { error } = await supabaseClient.from("achievements").update(updates).eq("id", id);

      btn.disabled = false;
      btn.textContent = "💾 Lưu";

      if (error) {
        alert("Lỗi cập nhật: " + error.message);
        return;
      }

      loadAchievementsAdmin();
    });
  });

  document.querySelectorAll(".btn-delete-achievement").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const row = btn.closest(".admin-position-row");
      const id = row.dataset.id;
      const title = row.querySelector(".input-title").value;

      const confirmed = confirm(`Bạn có chắc muốn xóa thành tích "${title}"?`);
      if (!confirmed) return;

      const { error } = await supabaseClient.from("achievements").delete().eq("id", id);

      if (error) {
        alert("Lỗi xóa: " + error.message);
        return;
      }

      loadAchievementsAdmin();
    });
  });

  document.querySelectorAll(".btn-remove-thumb").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const galleryEl = btn.closest(".admin-thumb-gallery");
      const itemId = galleryEl.dataset.itemId;
      const urlToRemove = btn.dataset.url;

      const confirmed = confirm("Xóa ảnh này khỏi thành tích?");
      if (!confirmed) return;

      const { data: current } = await supabaseClient
        .from("achievements")
        .select("image_urls")
        .eq("id", itemId)
        .single();

      const remainingImages = (current.image_urls || []).filter((url) => url !== urlToRemove);

      await supabaseClient
        .from("achievements")
        .update({ image_urls: remainingImages, image_url: remainingImages[0] || null })
        .eq("id", itemId);

      loadAchievementsAdmin();
    });
  });
}

/* =======================================================
   HÀM DÙNG CHUNG: Upload NHIỀU ảnh thành tích
   ======================================================= */
async function uploadAchievementImages(files) {
  const urls = [];

  for (const file of files) {
    const cleanFileName = sanitizeFileName(file.name);
    const filePath = `achievements/${Date.now()}_${cleanFileName}`;

    const { error: uploadError } = await supabaseClient.storage.from("achievements.images").upload(filePath, file);

    if (uploadError) {
      return { urls: [], error: uploadError.message };
    }

    const { data } = supabaseClient.storage.from("achievements.images").getPublicUrl(filePath);
    urls.push(data.publicUrl);
  }

  return { urls, error: null };
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