/* =======================================================
   FILE: admin-news.js
   MỤC ĐÍCH: CRUD cho bảng "news_posts" — HỖ TRỢ NHIỀU ẢNH
   trong 1 bài viết (lưu trong cột "image_urls", kiểu MẢNG).

   Cột "image_url" (số ít, ảnh đại diện) VẪN được giữ song song
   — tự động lấy ẢNH ĐẦU TIÊN trong mảng — để các đoạn code khác
   (thẻ tin tức ở Trang chủ...) không cần sửa gì vẫn hiển thị
   đúng ảnh đại diện.

   Cần: supabase-config.js (biến supabaseClient) nạp trước.
   ======================================================= */

// API của bộ soạn khối nội dung (chữ/ảnh) cho FORM ĐĂNG TIN MỚI.
// Được gán khi trang tải xong, dùng lại mỗi lần bấm "+ Đăng tin".
let newContentBlocksEditorApi = null;

document.addEventListener("DOMContentLoaded", () => {
  loadNewsAdmin();
  initAddNewsForm();
  newContentBlocksEditorApi = initContentBlocksEditor(
    document.getElementById("newContentBlocksEditor"),
    [],
    uploadOneNewsImage
  );
});

// Hàm upload 1 ảnh — dùng cho Block Editor (khác uploadNewsImages vốn
// nhận vào 1 MẢNG file, ở đây Block Editor chỉ cần upload TỪNG ảnh 1)
async function uploadOneNewsImage(file) {
  const { urls, error } = await uploadNewsImages([file]);
  return { url: urls[0], error };
}

/* =======================================================
   ĐỌC DỮ LIỆU (Read)
   ======================================================= */
async function loadNewsAdmin() {
  const container = document.getElementById("newsAdminList");

  const { data, error } = await supabaseClient
    .from("news_posts")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    container.innerHTML = `<p class="admin-message admin-message-error">Lỗi tải dữ liệu: ${error.message}</p>`;
    return;
  }

  renderNewsAdminList(data);
}

function renderNewsAdminList(newsItems) {
  const container = document.getElementById("newsAdminList");

  if (!newsItems || newsItems.length === 0) {
    container.innerHTML = '<p class="loading-text">Chưa có tin tức nào. Đăng tin mới ở form phía trên.</p>';
    return;
  }

  container.innerHTML = newsItems
    .map((n) => {
      // images: mảng ảnh thật sự đang có của bài này. Nếu image_urls
      // rỗng/chưa có (bài cũ trước khi có tính năng nhiều ảnh) thì
      // dùng tạm image_url (ảnh đơn cũ) để không bị mất hiển thị.
      const images = n.image_urls && n.image_urls.length > 0 ? n.image_urls : n.image_url ? [n.image_url] : [];

      return `
      <div class="admin-position-row" data-id="${n.id}" data-content-blocks="${encodeBlocksForAttr(n.content_blocks)}">
        <div class="admin-multi-thumb-col">
          ${renderThumbGallery(images, n.id)}
        </div>

        <div class="admin-position-fields">
          <label>Danh mục</label>
          <input type="text" class="input-category" value="${escapeHtml(n.category)}" />

          <label>Tiêu đề</label>
          <input type="text" class="input-title" value="${escapeHtml(n.title)}" />

          <label>Mô tả ngắn</label>
          <textarea class="input-excerpt" rows="2">${escapeHtml(n.excerpt || "")}</textarea>

          <label>Người đăng</label>
          <input type="text" class="input-author" value="${escapeHtml(n.author || "")}" />

          <label>Thêm ảnh mới vào thư viện ảnh (không bắt buộc, chọn được nhiều ảnh)</label>
          <input type="file" class="input-image" accept="image/*" multiple />

          <label>Nội dung chi tiết bài viết (thêm từng khối chữ/ảnh, dùng ▲▼ để sắp xếp thứ tự)</label>
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
          <button class="btn btn-primary btn-save-news">💾 Lưu</button>
          <button class="btn btn-danger btn-delete-news">🗑️ Xóa</button>
        </div>
      </div>
    `;
    })
    .join("");

  attachNewsRowEvents();
}

// Vẽ dãy ảnh nhỏ (thumbnail) hiện có của 1 bài, mỗi ảnh có nút ✕
// để XÓA RIÊNG ảnh đó (không cần xóa cả bài)
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
          <button type="button" class="btn-remove-thumb" data-url="${escapeHtml(url)}" title="Xóa ảnh này">✕</button>
        </div>
      `
        )
        .join("")}
    </div>
  `;
}

function escapeHtml(text) {
  return String(text).replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/* =======================================================
   MÃ HÓA / GIẢI MÃ mảng "content_blocks" — dùng hàm chung trong
   js/content-blocks-editor.js
   ======================================================= */

/* =======================================================
   TẠO MỚI (Create)
   ======================================================= */
function initAddNewsForm() {
  const form = document.getElementById("addNewsForm");
  const messageEl = document.getElementById("addMessage");
  const addBtn = document.getElementById("addBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const category = document.getElementById("newCategory").value.trim();
    const title = document.getElementById("newTitle").value.trim();
    const excerpt = document.getElementById("newExcerpt").value.trim();
    const author = document.getElementById("newAuthor").value.trim();
    // .files trả về DANH SÁCH file (vì input có thuộc tính "multiple"),
    // Array.from(...) chuyển nó thành mảng JS bình thường để dùng .map/.length
    const rawImageFiles = Array.from(document.getElementById("newImage").files);

    if (!category || !title) return;

    // Nếu có chọn ảnh, mở khung sắp xếp thứ tự + cắt/căn chỉnh trước khi upload
    let imageFiles = [];
    if (rawImageFiles.length > 0) {
      imageFiles = await openImagePicker(rawImageFiles);
      if (imageFiles.length === 0) return; // hủy ở bước sắp xếp/căn chỉnh -> không đăng
    }

    addBtn.disabled = true;
    addBtn.textContent = "Đang đăng...";
    messageEl.hidden = true;

    // Upload TỪNG ảnh một, gom lại thành 1 mảng URL
    let imageUrls = [];
    if (imageFiles.length > 0) {
      const { urls, error: uploadError } = await uploadNewsImages(imageFiles);
      if (uploadError) {
        showMessage(messageEl, `Lỗi upload ảnh: ${uploadError}`, true);
        addBtn.disabled = false;
        addBtn.textContent = "+ Đăng tin";
        return;
      }
      imageUrls = urls;
    }

    // Lấy nội dung chi tiết dạng khối (chữ + ảnh, đúng thứ tự đã sắp
    // xếp bằng ▲▼); ảnh nào trong khối chưa upload sẽ được upload ở đây
    let contentBlocks = [];
    try {
      contentBlocks = await newContentBlocksEditorApi.getBlocksForSave();
    } catch (blocksError) {
      showMessage(messageEl, `Lỗi upload ảnh trong nội dung chi tiết: ${blocksError.message}`, true);
      addBtn.disabled = false;
      addBtn.textContent = "+ Đăng tin";
      return;
    }

    const { error: insertError } = await supabaseClient.from("news_posts").insert({
      category,
      title,
      excerpt,
      author,
      image_urls: imageUrls,
      image_url: imageUrls[0] || null, // Ảnh đầu tiên = ảnh đại diện, cho tương thích ngược
      content_blocks: contentBlocks,
      display_order: 0,
    });

    addBtn.disabled = false;
    addBtn.textContent = "+ Đăng tin";

    if (insertError) {
      showMessage(messageEl, `Lỗi lưu dữ liệu: ${insertError.message}`, true);
      return;
    }

    showMessage(messageEl, "✅ Đã đăng tin thành công!", false);
    form.reset();
    newContentBlocksEditorApi.reset();
    loadNewsAdmin();
  });
}

/* =======================================================
   CẬP NHẬT (Update) + XÓA CẢ BÀI (Delete) + XÓA 1 ẢNH RIÊNG
   ======================================================= */
function attachNewsRowEvents() {
  // Khởi tạo bộ soạn "nội dung theo khối" cho từng dòng, dùng đúng
  // dữ liệu content_blocks đã lưu của bài đó (đọc từ data-content-blocks)
  document.querySelectorAll(".admin-position-row").forEach((row) => {
    const editorEl = row.querySelector(".content-blocks-editor");
    if (editorEl) {
      const initialBlocks = decodeBlocksFromAttr(row.dataset.contentBlocks);
      initContentBlocksEditor(editorEl, initialBlocks, uploadOneNewsImage);
    }
  });

  // "Lưu" — cập nhật text + THÊM ảnh mới (nếu có chọn) vào mảng hiện có
  document.querySelectorAll(".btn-save-news").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const row = btn.closest(".admin-position-row");
      const id = row.dataset.id;

      const category = row.querySelector(".input-category").value.trim();
      const title = row.querySelector(".input-title").value.trim();
      const excerpt = row.querySelector(".input-excerpt").value.trim();
      const author = row.querySelector(".input-author").value.trim();
      const rawNewFiles = Array.from(row.querySelector(".input-image").files);

      // Nếu có chọn ảnh mới, mở khung sắp xếp thứ tự + cắt/căn chỉnh trước khi upload
      let newFiles = [];
      if (rawNewFiles.length > 0) {
        newFiles = await openImagePicker(rawNewFiles);
        if (newFiles.length === 0) return; // hủy ở bước sắp xếp/căn chỉnh -> không lưu
      }

      btn.disabled = true;
      btn.textContent = "Đang lưu...";

      const updates = { category, title, excerpt, author };

      // Lấy nội dung chi tiết dạng khối theo đúng thứ tự đã sắp xếp;
      // ảnh nào mới thêm trong khối sẽ được upload ở đây
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
        const { urls, error: uploadError } = await uploadNewsImages(newFiles);
        if (uploadError) {
          alert("Lỗi upload ảnh: " + uploadError);
          btn.disabled = false;
          btn.textContent = "💾 Lưu";
          return;
        }

        // Lấy mảng ảnh HIỆN CÓ của bài này (đọc lại từ database để
        // chắc chắn không bị lệch dữ liệu), rồi NỐI THÊM ảnh mới vào
        const { data: current } = await supabaseClient
          .from("news_posts")
          .select("image_urls")
          .eq("id", id)
          .single();

        const existingImages = (current && current.image_urls) || [];
        const combinedImages = [...existingImages, ...urls];

        updates.image_urls = combinedImages;
        updates.image_url = combinedImages[0] || null;
      }

      const { error } = await supabaseClient.from("news_posts").update(updates).eq("id", id);

      btn.disabled = false;
      btn.textContent = "💾 Lưu";

      if (error) {
        alert("Lỗi cập nhật: " + error.message);
        return;
      }

      loadNewsAdmin();
    });
  });

  // "Xóa" cả bài viết
  document.querySelectorAll(".btn-delete-news").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const row = btn.closest(".admin-position-row");
      const id = row.dataset.id;
      const title = row.querySelector(".input-title").value;

      const confirmed = confirm(`Bạn có chắc muốn xóa tin "${title}"?`);
      if (!confirmed) return;

      const { error } = await supabaseClient.from("news_posts").delete().eq("id", id);

      if (error) {
        alert("Lỗi xóa: " + error.message);
        return;
      }

      loadNewsAdmin();
    });
  });

  // "✕" trên từng ảnh nhỏ — xóa RIÊNG 1 ảnh khỏi mảng, không đụng
  // tới các ảnh khác hay phần text của bài
  document.querySelectorAll(".btn-remove-thumb").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const galleryEl = btn.closest(".admin-thumb-gallery");
      const itemId = galleryEl.dataset.itemId;
      const urlToRemove = btn.dataset.url;

      const confirmed = confirm("Xóa ảnh này khỏi bài viết?");
      if (!confirmed) return;

      const { data: current } = await supabaseClient
        .from("news_posts")
        .select("image_urls")
        .eq("id", itemId)
        .single();

      const remainingImages = (current.image_urls || []).filter((url) => url !== urlToRemove);

      await supabaseClient
        .from("news_posts")
        .update({
          image_urls: remainingImages,
          image_url: remainingImages[0] || null,
        })
        .eq("id", itemId);

      loadNewsAdmin(); // Vẽ lại toàn bộ danh sách cho cập nhật ngay
    });
  });
}

/* =======================================================
   HÀM DÙNG CHUNG: Upload NHIỀU ảnh cùng lúc lên Supabase Storage
   ======================================================= */
// Trả về { urls, error } — urls là MẢNG đường dẫn công khai của
// TẤT CẢ ảnh upload thành công
async function uploadNewsImages(files) {
  const urls = [];

  // Upload LẦN LƯỢT từng file (dùng vòng lặp for...of thay vì
  // .map, vì cần "await" tuần tự — chạy xong file này mới upload
  // file tiếp theo, tránh làm quá tải cùng lúc)
  for (const file of files) {
    const cleanFileName = sanitizeFileName(file.name);
    const filePath = `news/${Date.now()}_${cleanFileName}`;

    const { error: uploadError } = await supabaseClient.storage.from("news.images").upload(filePath, file);

    if (uploadError) {
      return { urls: [], error: uploadError.message };
    }

    const { data } = supabaseClient.storage.from("news.images").getPublicUrl(filePath);
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