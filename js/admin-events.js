/* =======================================================
   FILE: admin-events.js
   MỤC ĐÍCH: CRUD cho bảng "events" + xem danh sách người đã
   đăng ký tham gia (bảng "event_registrations", chỉ đọc, vì
   việc đăng ký do người dùng công khai tự thêm ở su-kien.html).

   Cần: supabase-config.js (biến supabaseClient) nạp trước.
   ======================================================= */

let newEventBlocksEditorApi = null;

document.addEventListener("DOMContentLoaded", () => {
  loadEventsAdmin();
  initAddEventForm();
  newEventBlocksEditorApi = initContentBlocksEditor(
    document.getElementById("newContentBlocksEditor"),
    [],
    uploadOneEventImage
  );
});

// Hàm upload 1 ảnh — dùng cho Block Editor (khác uploadEventImages
// vốn nhận vào 1 MẢNG file, ở đây Block Editor chỉ cần upload TỪNG ảnh 1)
async function uploadOneEventImage(file) {
  const { urls, error } = await uploadEventImages([file]);
  return { url: urls[0], error };
}

/* =======================================================
   ĐỌC DỮ LIỆU (Read)
   ======================================================= */
async function loadEventsAdmin() {
  const container = document.getElementById("eventsAdminList");

  const { data, error } = await supabaseClient
    .from("events")
    .select("*")
    .order("event_date", { ascending: true });

  if (error) {
    container.innerHTML = `<p class="admin-message admin-message-error">Lỗi tải dữ liệu: ${error.message}</p>`;
    return;
  }

  renderEventsAdminList(data);
}

function renderEventsAdminList(events) {
  const container = document.getElementById("eventsAdminList");

  if (!events || events.length === 0) {
    container.innerHTML = '<p class="loading-text">Chưa có sự kiện nào. Tạo mới ở form phía trên.</p>';
    return;
  }

  container.innerHTML = events
    .map(
      (ev) => `
      <div class="admin-position-row admin-event-row" data-id="${ev.id}" data-content-blocks="${encodeBlocksForAttr(ev.content_blocks)}">
        <div class="admin-multi-thumb-col">
          ${renderThumbGallery(ev.image_urls && ev.image_urls.length > 0 ? ev.image_urls : (ev.image_url ? [ev.image_url] : []), ev.id, "events")}
        </div>

        <div class="admin-position-fields">
          <label>Tên sự kiện</label>
          <input type="text" class="input-title" value="${escapeHtml(ev.title)}" />

          <label>Ngày giờ diễn ra</label>
          <input type="datetime-local" class="input-date" value="${toDatetimeLocalValue(ev.event_date)}" />

          <label>Địa điểm</label>
          <input type="text" class="input-location" value="${escapeHtml(ev.location || "")}" />

          <label>Mô tả</label>
          <textarea class="input-description" rows="2">${escapeHtml(ev.description || "")}</textarea>

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

          <!-- Nút xem danh sách người đăng ký — bấm mới tải, tránh
               gọi database cho MỌI sự kiện ngay khi vào trang (lãng phí) -->
          <button type="button" class="btn-toggle-registrations" data-event-id="${ev.id}">
            👥 Xem danh sách đăng ký
          </button>
          <div class="registrations-list" id="regList-${ev.id}" hidden></div>
        </div>

        <div class="admin-position-actions">
          <button class="btn btn-primary btn-save-event">💾 Lưu</button>
          <button class="btn btn-danger btn-delete-event">🗑️ Xóa</button>
        </div>
      </div>
    `
    )
    .join("");

  attachEventRowEvents();
}

function escapeHtml(text) {
  return String(text).replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

// Vẽ dãy ảnh nhỏ (thumbnail) hiện có, mỗi ảnh có nút ✕ để xóa RIÊNG
// ảnh đó. "bucketKey" (VD: "events") giúp hàm xóa biết gọi update
// bảng nào — dùng chung được cho cả events và achievements.
function renderThumbGallery(images, itemId, tableName) {
  if (!images || images.length === 0) {
    return `<div class="admin-no-image">Chưa có ảnh</div>`;
  }

  return `
    <div class="admin-thumb-gallery" data-item-id="${itemId}" data-table="${tableName}">
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

// Chuyển timestamp Supabase (VD: "2026-08-15T09:00:00+00:00") sang
// định dạng ô <input type="datetime-local"> cần (VD: "2026-08-15T09:00")
function toDatetimeLocalValue(isoString) {
  const d = new Date(isoString);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/* =======================================================
   TẠO MỚI (Create)
   ======================================================= */
function initAddEventForm() {
  const form = document.getElementById("addEventForm");
  const messageEl = document.getElementById("addMessage");
  const addBtn = document.getElementById("addBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("newTitle").value.trim();
    const eventDate = document.getElementById("newDate").value; // dạng "2026-08-15T09:00"
    const location = document.getElementById("newLocation").value.trim();
    const description = document.getElementById("newDescription").value.trim();
    const rawImageFiles = Array.from(document.getElementById("newImage").files);

    if (!title || !eventDate) return;

    // Nếu có chọn ảnh, mở khung sắp xếp thứ tự + cắt/căn chỉnh từng ảnh
    // trước khi thật sự upload (đúng thứ tự đã sắp xếp trong khung này)
    let imageFiles = [];
    if (rawImageFiles.length > 0) {
      imageFiles = await openImagePicker(rawImageFiles);
      if (imageFiles.length === 0) return; // hủy ở bước sắp xếp/căn chỉnh -> không tạo sự kiện
    }

    addBtn.disabled = true;
    addBtn.textContent = "Đang tạo...";
    messageEl.hidden = true;

    let imageUrls = [];
    if (imageFiles.length > 0) {
      const { urls, error: uploadError } = await uploadEventImages(imageFiles);
      if (uploadError) {
        showMessage(messageEl, `Lỗi upload ảnh: ${uploadError}`, true);
        addBtn.disabled = false;
        addBtn.textContent = "+ Tạo sự kiện";
        return;
      }
      imageUrls = urls;
    }

    // Lấy nội dung chi tiết dạng khối (chữ + ảnh, đúng thứ tự đã sắp
    // xếp bằng ▲▼); ảnh nào trong khối chưa upload sẽ được upload ở đây
    let contentBlocks = [];
    try {
      contentBlocks = await newEventBlocksEditorApi.getBlocksForSave();
    } catch (blocksError) {
      showMessage(messageEl, `Lỗi upload ảnh trong nội dung chi tiết: ${blocksError.message}`, true);
      addBtn.disabled = false;
      addBtn.textContent = "+ Tạo sự kiện";
      return;
    }

    const { error: insertError } = await supabaseClient.from("events").insert({
      title,
      event_date: eventDate,
      location,
      description,
      image_urls: imageUrls,
      image_url: imageUrls[0] || null,
      content_blocks: contentBlocks,
    });

    addBtn.disabled = false;
    addBtn.textContent = "+ Tạo sự kiện";

    if (insertError) {
      showMessage(messageEl, `Lỗi lưu dữ liệu: ${insertError.message}`, true);
      return;
    }

    showMessage(messageEl, "✅ Đã tạo sự kiện thành công!", false);
    form.reset();
    newEventBlocksEditorApi.reset();
    loadEventsAdmin();
  });
}

/* =======================================================
   CẬP NHẬT (Update) + XÓA (Delete) + XEM ĐĂNG KÝ
   ======================================================= */
function attachEventRowEvents() {
  document.querySelectorAll(".admin-event-row").forEach((row) => {
    const editorEl = row.querySelector(".content-blocks-editor");
    if (editorEl) {
      const initialBlocks = decodeBlocksFromAttr(row.dataset.contentBlocks);
      initContentBlocksEditor(editorEl, initialBlocks, uploadOneEventImage);
    }
  });

  // "Lưu"
  document.querySelectorAll(".btn-save-event").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const row = btn.closest(".admin-event-row");
      const id = row.dataset.id;

      const title = row.querySelector(".input-title").value.trim();
      const eventDate = row.querySelector(".input-date").value;
      const location = row.querySelector(".input-location").value.trim();
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

      const updates = { title, event_date: eventDate, location, description };

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
        const { urls, error: uploadError } = await uploadEventImages(newFiles);
        if (uploadError) {
          alert("Lỗi upload ảnh: " + uploadError);
          btn.disabled = false;
          btn.textContent = "💾 Lưu";
          return;
        }

        const { data: current } = await supabaseClient
          .from("events")
          .select("image_urls")
          .eq("id", id)
          .single();

        const existingImages = (current && current.image_urls) || [];
        const combinedImages = [...existingImages, ...urls];

        updates.image_urls = combinedImages;
        updates.image_url = combinedImages[0] || null;
      }

      const { error } = await supabaseClient.from("events").update(updates).eq("id", id);

      btn.disabled = false;
      btn.textContent = "💾 Lưu";

      if (error) {
        alert("Lỗi cập nhật: " + error.message);
        return;
      }

      loadEventsAdmin();
    });
  });

  // "Xóa" — nhắc rõ việc xóa sự kiện sẽ xóa LUÔN toàn bộ danh sách đăng ký liên quan
  // (vì bảng event_registrations có "on delete cascade" trỏ tới events)
  document.querySelectorAll(".btn-delete-event").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const row = btn.closest(".admin-event-row");
      const id = row.dataset.id;
      const title = row.querySelector(".input-title").value;

      const confirmed = confirm(
        `Xóa sự kiện "${title}"? Toàn bộ danh sách đăng ký của sự kiện này cũng sẽ bị xóa theo.`
      );
      if (!confirmed) return;

      const { error } = await supabaseClient.from("events").delete().eq("id", id);

      if (error) {
        alert("Lỗi xóa: " + error.message);
        return;
      }

      loadEventsAdmin();
    });
  });

  // "Xem danh sách đăng ký" — bấm mới tải (tiết kiệm số lần gọi database)
  document.querySelectorAll(".btn-toggle-registrations").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const eventId = btn.dataset.eventId;
      const listEl = document.getElementById(`regList-${eventId}`);

      // Nếu đang MỞ → bấm lần nữa để ĐÓNG lại, không cần tải lại dữ liệu
      if (!listEl.hidden) {
        listEl.hidden = true;
        btn.textContent = "👥 Xem danh sách đăng ký";
        return;
      }

      btn.textContent = "Đang tải...";

      const { data, error } = await supabaseClient
        .from("event_registrations")
        .select("*")
        .eq("event_id", eventId)
        .order("created_at", { ascending: true });

      if (error) {
        listEl.innerHTML = `<p class="admin-message admin-message-error">Lỗi: ${error.message}</p>`;
      } else if (!data || data.length === 0) {
        listEl.innerHTML = '<p class="loading-text">Chưa có ai đăng ký.</p>';
      } else {
        listEl.innerHTML = `
          <table class="registrations-table">
            <thead>
              <tr><th>Họ tên</th><th>Email</th><th>SĐT</th><th></th></tr>
            </thead>
            <tbody>
              ${data
                .map(
                  (r) => `
                <tr data-reg-id="${r.id}">
                  <td>${escapeHtml(r.full_name)}</td>
                  <td>${escapeHtml(r.email || "")}</td>
                  <td>${escapeHtml(r.phone || "")}</td>
                  <td><button class="btn-delete-registration" data-reg-id="${r.id}">🗑️</button></td>
                </tr>
              `
                )
                .join("")}
            </tbody>
          </table>
          <p class="admin-hint">Tổng: ${data.length} người đăng ký</p>
        `;

        // Gắn sự kiện xóa cho từng dòng đăng ký vừa vẽ ra
        listEl.querySelectorAll(".btn-delete-registration").forEach((delBtn) => {
          delBtn.addEventListener("click", async () => {
            const regId = delBtn.dataset.regId;
            const confirmed = confirm("Xóa lượt đăng ký này?");
            if (!confirmed) return;

            await supabaseClient.from("event_registrations").delete().eq("id", regId);
            delBtn.closest("tr").remove(); // Xóa luôn dòng đó khỏi bảng, không cần tải lại cả danh sách
          });
        });
      }

      listEl.hidden = false;
      btn.textContent = "👥 Ẩn danh sách đăng ký";
    });
  });

  // "✕" trên từng ảnh nhỏ — xóa RIÊNG 1 ảnh khỏi mảng
  document.querySelectorAll(".btn-remove-thumb").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const galleryEl = btn.closest(".admin-thumb-gallery");
      const itemId = galleryEl.dataset.itemId;
      const urlToRemove = btn.dataset.url;

      const confirmed = confirm("Xóa ảnh này khỏi sự kiện?");
      if (!confirmed) return;

      const { data: current } = await supabaseClient
        .from("events")
        .select("image_urls")
        .eq("id", itemId)
        .single();

      const remainingImages = (current.image_urls || []).filter((url) => url !== urlToRemove);

      await supabaseClient
        .from("events")
        .update({ image_urls: remainingImages, image_url: remainingImages[0] || null })
        .eq("id", itemId);

      loadEventsAdmin();
    });
  });
}

/* =======================================================
   HÀM DÙNG CHUNG: Upload ảnh sự kiện lên Supabase Storage
   ======================================================= */
async function uploadEventImages(files) {
  const urls = [];

  for (const file of files) {
    const cleanFileName = sanitizeFileName(file.name);
    const filePath = `events/${Date.now()}_${cleanFileName}`;

    const { error: uploadError } = await supabaseClient.storage.from("events.images").upload(filePath, file);

    if (uploadError) {
      return { urls: [], error: uploadError.message };
    }

    const { data } = supabaseClient.storage.from("events.images").getPublicUrl(filePath);
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