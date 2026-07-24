/* =======================================================
   FILE: thu-vien.js
   MỤC ĐÍCH: Lấy ảnh TỪ SUPABASE (bảng gallery_images) và hiển
   thị dạng lưới. Bấm vào 1 ảnh sẽ phóng to xem toàn màn hình
   nhờ hàm openLightbox() dùng chung (định nghĩa trong main.js).

   Cần: js/supabase-config.js (biến supabaseClient) VÀ js/main.js
   (chứa openLightbox/initLightbox) nạp TRƯỚC file này.
   ======================================================= */

document.addEventListener("DOMContentLoaded", () => {
  loadGallery();
  // Lưu ý: initLightbox() KHÔNG gọi ở đây nữa — main.js đã tự gọi
  // sẵn trong DOMContentLoaded của nó rồi (dùng chung cho mọi trang)
});

/* --------- Lấy ảnh từ Supabase và vẽ ra màn hình --------- */
async function loadGallery() {
  const container = document.getElementById("galleryGrid");
  if (!container) return;

  const { data, error } = await supabaseClient
    .from("gallery_images")
    .select("*")
    .order("created_at", { ascending: false }); // Ảnh mới nhất lên đầu

  if (error) {
    container.innerHTML = '<p class="loading-text">Không tải được ảnh. Vui lòng thử lại sau.</p>';
    console.error("Lỗi tải gallery_images:", error);
    return;
  }

  renderGallery(data);
}

function renderGallery(images) {
  const container = document.getElementById("galleryGrid");

  if (!images || images.length === 0) {
    container.innerHTML = '<p class="loading-text">Thư viện chưa có ảnh nào.</p>';
    return;
  }

  container.innerHTML = images
    .map(
      (img) => `
      <div class="gallery-item" data-caption="${escapeHtml(img.caption || "")}">
        <img src="${img.image_url}" alt="${escapeHtml(img.caption || "Ảnh hoạt động Đội TNXK")}" loading="lazy" />
      </div>
    `
    )
    .join("");

  // Gom TOÀN BỘ ảnh trong thư viện thành 1 mảng URL — để bấm vào
  // BẤT KỲ ảnh nào cũng có thể dùng nút ‹ › duyệt qua HẾT thư viện,
  // không chỉ xem đúng 1 tấm rồi hết
  const allImageUrls = images.map((img) => img.image_url);

  attachGalleryItemEvents(allImageUrls);
}

function escapeHtml(text) {
  return String(text).replace(/"/g, "&quot;");
}

function attachGalleryItemEvents(allImageUrls) {
  const items = document.querySelectorAll(".gallery-item");
  items.forEach((item, index) => {
    item.addEventListener("click", () => {
      // Truyền vào CẢ MẢNG toàn bộ ảnh + đúng VỊ TRÍ ảnh vừa bấm,
      // để lightbox biết phải bắt đầu từ đâu và duyệt tiếp thế nào
      openLightbox(allImageUrls, index, item.dataset.caption);
    });
  });
}