/* =======================================================
   FILE: tin-tuc-chi-tiet.js
   MỤC ĐÍCH: Đọc tham số "id" trên URL (VD: tin-tuc-chi-tiet.html?id=5),
   lấy đúng bài viết đó từ Supabase (bảng news_posts) và hiển thị
   đầy đủ nội dung.

   Cần: js/supabase-config.js (biến supabaseClient) nạp TRƯỚC.
   ======================================================= */

document.addEventListener("DOMContentLoaded", () => {
  loadNewsDetail();
});

async function loadNewsDetail() {
  const container = document.getElementById("newsDetail");
  if (!container) return;

  // URLSearchParams đọc phần "?id=5" trên đường dẫn trang hiện tại.
  // window.location.search trả về CHUỖI "?id=5", URLSearchParams
  // biến nó thành 1 đối tượng dễ tra cứu theo tên tham số.
  const params = new URLSearchParams(window.location.search);
  const newsId = params.get("id");

  if (!newsId) {
    container.innerHTML = '<p class="loading-text">Không tìm thấy bài viết (thiếu mã tin tức).</p>';
    return;
  }

  // .eq("id", newsId): chỉ lấy ĐÚNG 1 dòng có id khớp
  // .single(): báo Supabase biết ta CHỈ MONG ĐỢI 1 kết quả duy nhất
  const { data, error } = await supabaseClient
    .from("news_posts")
    .select("*")
    .eq("id", newsId)
    .single();

  if (error || !data) {
    container.innerHTML = `
      <p class="loading-text">Không tìm thấy bài viết này. Có thể bài viết đã bị xóa.</p>
      <a href="tin-tuc.html" class="btn btn-primary">← Về danh sách tin tức</a>
    `;
    return;
  }

  renderNewsDetail(data);

  // Cập nhật luôn tiêu đề tab trình duyệt cho đúng tên bài viết,
  // giúp người dùng dễ nhận ra khi có nhiều tab đang mở cùng lúc
  document.title = `Đội TNXK - ${data.title}`;
}

function renderNewsDetail(item) {
  const container = document.getElementById("newsDetail");

  const hasBlocks = item.content_blocks && item.content_blocks.length > 0;

  container.innerHTML = `
    <span class="news-detail-category">${item.icon ? item.icon + " " : ""}${item.category}</span>
    <h1 class="news-detail-title">${item.title}</h1>

    <div class="news-detail-meta">
      ${item.author ? `<span>✍️ ${item.author}</span>` : ""}
      <span>📅 ${formatDate(item.created_at)}</span>
    </div>

    <div class="news-detail-body" id="newsDetailBody"></div>
  `;

  const bodyEl = document.getElementById("newsDetailBody");

  if (hasBlocks) {
    // Bài có "content_blocks" (chữ + ảnh xen kẽ theo đúng thứ tự
    // Admin sắp xếp) — vẽ TỪNG khối đúng theo thứ tự trong mảng
    renderContentBlocks(bodyEl, item.content_blocks, item.title);
  } else {
    // Bài CŨ chưa có content_blocks (đăng trước khi có tính năng
    // này) — dự phòng bằng cách cũ: hiện ảnh (nếu có) + đoạn mô tả
    const images = item.image_urls && item.image_urls.length > 0 ? item.image_urls : item.image_url ? [item.image_url] : [];
    bodyEl.innerHTML = `
      ${images.length > 0 ? renderDetailGallery(images, item.title) : ""}
      ${item.excerpt ? `<p>${item.excerpt}</p>` : "<p>Bài viết chưa có nội dung chi tiết.</p>"}
    `;
    attachDetailGalleryEvents(images, item.title);
  }
}

/* --------- Vẽ nội dung dạng "khối" (content_blocks): mỗi khối
   là 1 đoạn văn hoặc 1 ảnh, hiển thị ĐÚNG THEO THỨ TỰ trong mảng.
   Các khối ảnh được gom lại để bấm vào phóng to (lightbox) có thể
   chuyển qua lại giữa các ảnh trong CÙNG bài, giống các ảnh cũ. --------- */
function renderContentBlocks(container, blocks, title) {
  // Lọc riêng ra danh sách URL của các khối ẢNH (bỏ qua khối văn bản),
  // dùng để cung cấp cho lightbox duyệt qua lại
  const imageUrls = blocks.filter((b) => b.type === "image").map((b) => b.url);

  let imageIndexCounter = 0; // Đếm số thứ tự ảnh đã gặp, để gán data-index đúng

  container.innerHTML = blocks
    .map((block) => {
      if (block.type === "text") {
        return `<p class="news-block-text">${block.content}</p>`;
      }
      // block.type === "image"
      const thisIndex = imageIndexCounter;
      imageIndexCounter++;
      return `<img src="${block.url}" alt="${title}" class="news-block-img" data-index="${thisIndex}" />`;
    })
    .join("");

  container.querySelectorAll(".news-block-img").forEach((img) => {
    img.addEventListener("click", () => {
      openLightbox(imageUrls, Number(img.dataset.index), title);
    });
  });
}

/* --------- Vẽ dãy ảnh của bài viết — 1 ảnh thì hiện to full-width,
   NHIỀU ảnh thì hiện dạng lưới các ảnh nhỏ hơn, đều bấm phóng to được --------- */
function renderDetailGallery(images, title) {
  if (images.length === 1) {
    return `
      <img
        src="${images[0]}"
        alt="${title}"
        class="news-detail-img news-detail-img-clickable"
        data-index="0"
      />
    `;
  }

  return `
    <div class="news-detail-gallery">
      ${images
        .map(
          (url, index) => `
        <img
          src="${url}"
          alt="${title}"
          class="news-detail-gallery-item"
          data-index="${index}"
        />
      `
        )
        .join("")}
    </div>
  `;
}

function attachDetailGalleryEvents(images, title) {
  document.querySelectorAll(".news-detail-img-clickable, .news-detail-gallery-item").forEach((img) => {
    img.addEventListener("click", () => {
      // Bấm ảnh nào trong bài, mở lightbox với TOÀN BỘ ảnh của
      // BÀI ĐÓ, bắt đầu đúng từ ảnh vừa bấm (data-index)
      openLightbox(images, Number(img.dataset.index), title);
    });
  });
}