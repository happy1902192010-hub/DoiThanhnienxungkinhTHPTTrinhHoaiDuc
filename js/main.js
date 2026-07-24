/* =======================================================
   FILE: main.js
   MỤC ĐÍCH: Xử lý toàn bộ "hành vi" của Trang chủ (và được
   TÁI SỬ DỤNG ở các trang khác cho menu mobile/back-to-top).

   Phần TIN TỨC giờ lấy dữ liệu THẬT từ Supabase (bảng
   news_posts) thay vì mảng tĩnh SAMPLE_NEWS — Admin đăng bài
   ở admin-news.html sẽ tự hiện ra đây, không cần sửa code.
   Nếu trang nào ĐÓ chưa nạp Supabase (biến supabaseClient
   không tồn tại), code sẽ tự động dùng lại SAMPLE_NEWS làm
   phương án dự phòng, tránh trang bị trắng/lỗi.
   ======================================================= */

document.addEventListener("DOMContentLoaded", () => {
  setFooterYear();                       // Cập nhật năm ở footer
  loadAnnouncementsData();               // Lấy thông báo (ưu tiên Supabase, dự phòng data mẫu)
  loadNewsData();                         // Lấy tin tức (ưu tiên Supabase, dự phòng data mẫu)
  initMobileNav();                        // Bật/tắt menu trên điện thoại
  initBackToTop();                        // Bật nút quay về đầu trang
  initSearchForm();                       // Gắn sự kiện cho ô tìm kiếm
  initAuthControl();                      // Hiện trạng thái đăng nhập ở góc phải header
  initLightbox();                         // Khởi tạo khung phóng to ảnh (nếu trang có #lightbox)
  initNewsQuickViewModal();               // Popup "Xem thêm" tin tức
});

/* =======================================================
   LIGHTBOX — phóng to ảnh khi bấm vào (DÙNG CHUNG cho mọi
   trang có ảnh: Thư viện ảnh, Chi tiết tin tức, Sự kiện,
   Giới thiệu...). Trang nào không có thẻ #lightbox trong HTML
   thì initLightbox() tự bỏ qua, không lỗi gì cả.

   HỖ TRỢ NHIỀU ẢNH: openLightbox() giờ nhận vào 1 MẢNG ảnh +
   vị trí bắt đầu, cho phép bấm nút ‹ › để chuyển qua lại giữa
   các ảnh trong CÙNG 1 bộ (VD: toàn bộ ảnh của 1 bài tin tức),
   không cần đóng lightbox rồi mở lại.
   ======================================================= */

// 2 biến "trạng thái" ghi nhớ: đang xem BỘ ảnh nào, và đang ở
// VỊ TRÍ thứ mấy trong bộ đó — dùng chung cho mọi trang
let lightboxImages = [];
let lightboxIndex = 0;

// images: MẢNG các đường dẫn ảnh (VD: ["a.jpg", "b.jpg"])
// startIndex: vị trí ảnh muốn hiện đầu tiên (0 = ảnh đầu tiên)
// Để tương thích với code CŨ (những chỗ gọi openLightbox(1_link, caption)
// kiểu cũ, chưa kịp sửa), hàm này TỰ NHẬN DIỆN: nếu "images" là
// 1 CHUỖI (không phải mảng), tự bọc nó thành mảng 1 phần tử.
function openLightbox(images, startIndex, caption) {
  const lightbox = document.getElementById("lightbox");
  if (!lightbox) return;

  lightboxImages = typeof images === "string" ? [images] : images;
  lightboxIndex = startIndex || 0;

  showCurrentLightboxImage(caption);
  lightbox.hidden = false;
  document.body.style.overflow = "hidden";
  updateLightboxNavButtons();
}

// Vẽ đúng ảnh tại vị trí lightboxIndex hiện tại lên khung to
function showCurrentLightboxImage(caption) {
  const img = document.getElementById("lightboxImg");
  if (!img) return;
  img.src = lightboxImages[lightboxIndex];
  img.alt = caption || "";
}

// Chuyển sang ảnh KẾ TIẾP — dùng phép chia lấy dư (%) để khi đến
// ảnh CUỐI CÙNG, bấm "tiếp" sẽ tự quay vòng về ảnh ĐẦU TIÊN
function lightboxNext() {
  if (lightboxImages.length === 0) return;
  lightboxIndex = (lightboxIndex + 1) % lightboxImages.length;
  showCurrentLightboxImage();
}

// Chuyển sang ảnh TRƯỚC — cộng thêm lightboxImages.length trước khi
// chia dư, để tránh kết quả bị ÂM khi đang ở ảnh đầu tiên (vị trí 0)
function lightboxPrev() {
  if (lightboxImages.length === 0) return;
  lightboxIndex = (lightboxIndex - 1 + lightboxImages.length) % lightboxImages.length;
  showCurrentLightboxImage();
}

// Ẩn 2 nút chuyển ảnh đi nếu bộ ảnh CHỈ CÓ 1 tấm (không có gì để chuyển)
function updateLightboxNavButtons() {
  const showNav = lightboxImages.length > 1;
  const prevBtn = document.getElementById("lightboxPrev");
  const nextBtn = document.getElementById("lightboxNext");
  if (prevBtn) prevBtn.style.display = showNav ? "flex" : "none";
  if (nextBtn) nextBtn.style.display = showNav ? "flex" : "none";
}

function closeLightbox() {
  const lightbox = document.getElementById("lightbox");
  if (!lightbox) return;
  lightbox.hidden = true;
  document.body.style.overflow = "";
}

function initLightbox() {
  const lightbox = document.getElementById("lightbox");
  const closeBtn = document.getElementById("lightboxClose");
  const prevBtn = document.getElementById("lightboxPrev");
  const nextBtn = document.getElementById("lightboxNext");
  if (!lightbox || !closeBtn) return;

  closeBtn.addEventListener("click", closeLightbox);

  // Bấm ra ngoài vùng ảnh (vào nền đen) cũng đóng luôn
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox) closeLightbox();
  });

  // 2 nút chuyển ảnh — dùng stopPropagation() để bấm vào nút KHÔNG
  // bị hiểu nhầm thành "bấm ra ngoài nền đen" (sẽ vô tình đóng luôn)
  if (prevBtn) {
    prevBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      lightboxPrev();
    });
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      lightboxNext();
    });
  }

  // Hỗ trợ bấm phím mũi tên trái/phải trên bàn phím để chuyển ảnh —
  // thói quen quen thuộc của người dùng khi xem ảnh toàn màn hình
  document.addEventListener("keydown", (e) => {
    if (lightbox.hidden) return;
    if (e.key === "Escape") closeLightbox();
    if (e.key === "ArrowRight") lightboxNext();
    if (e.key === "ArrowLeft") lightboxPrev();
  });
}

/* =======================================================
   KHU VỰC ĐĂNG NHẬP/TÀI KHOẢN (góc phải header)
   Hiển thị khác nhau tùy trạng thái:
   - Chưa đăng nhập  → nút "Đăng nhập"
   - Đã đăng nhập     → "Xin chào, [tên]" + nút Đăng xuất
                        (thêm link "Trang quản trị" nếu là Admin)
   ======================================================= */
async function initAuthControl() {
  const container = document.getElementById("authControl");
  // Nếu trang này không nạp Supabase (an toàn phòng hờ) thì bỏ qua
  if (!container || typeof supabaseClient === "undefined") return;

  const { data } = await supabaseClient.auth.getSession();

  if (!data.session) {
    // Chưa đăng nhập — giữ nguyên nút "Đăng nhập" mặc định đã có sẵn
    // trong HTML, không cần vẽ lại gì thêm
    return;
  }

  // Đã đăng nhập — tra thêm bảng profiles để biết tên hiển thị + vai trò
  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("full_name, role")
    .eq("id", data.session.user.id)
    .single();

  const displayName = (profile && profile.full_name) || data.session.user.email;
  const isAdmin = profile && profile.role === "admin";

  container.innerHTML = `
    <div class="user-menu">
      <span class="user-greeting">Xin chào, ${escapeAuthHtml(displayName)}</span>
      ${isAdmin ? `<a href="admin-dashboard.html" class="admin-panel-link">Trang quản trị</a>` : ""}
      <button type="button" class="logout-btn" id="publicLogoutBtn">Đăng xuất</button>
    </div>
  `;

  document.getElementById("publicLogoutBtn").addEventListener("click", async () => {
    await supabaseClient.auth.signOut();
    window.location.reload(); // Tải lại trang để header cập nhật về trạng thái "Đăng nhập"
  });
}

// Hàm nhỏ chống lỗi hiển thị nếu tên chứa ký tự đặc biệt
function escapeAuthHtml(text) {
  return String(text).replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/* --------- Lấy dữ liệu tin tức: ưu tiên Supabase, dự phòng data mẫu --------- */
async function loadNewsData() {
  // typeof supabaseClient !== "undefined": kiểm tra xem biến này CÓ
  // TỒN TẠI hay không, TRƯỚC KHI dùng nó. Cách kiểm tra an toàn này
  // tránh lỗi "supabaseClient is not defined" ở các trang KHÔNG nạp
  // file supabase-config.js (VD: gioi-thieu.html hiện tại).
  if (typeof supabaseClient !== "undefined") {
    const { data, error } = await supabaseClient
      .from("news_posts")
      .select("*")
      .order("created_at", { ascending: false }); // Tin mới nhất lên đầu

    if (!error && data) {
      initNewsSection(data);
      return; // Lấy Supabase thành công → dừng lại, không chạy phần dự phòng bên dưới
    }
  }

  // Chạy tới đây nghĩa là: hoặc không có supabaseClient, hoặc gọi
  // Supabase bị lỗi → dùng tạm dữ liệu mẫu để trang không bị trống
  initNewsSection(SAMPLE_NEWS);
}

/* --------- Lấy dữ liệu thông báo: ưu tiên Supabase, dự phòng data mẫu --------- */
async function loadAnnouncementsData() {
  if (typeof supabaseClient !== "undefined") {
    const { data, error } = await supabaseClient
      .from("announcements")
      .select("*")
      .order("announce_date", { ascending: false });

    if (!error && data) {
      renderAnnouncements(data);
      return;
    }
  }

  renderAnnouncements(SAMPLE_ANNOUNCEMENTS);
}

/* --------- HÀM: Cập nhật năm hiện tại ở footer --------- */
function setFooterYear() {
  // Tìm thẻ <span id="year"> trong index.html
  const el = document.getElementById("year");

  // Nếu tìm thấy (el khác null), ghi năm hiện tại vào bên trong nó.
  // new Date().getFullYear() trả về năm hiện tại, ví dụ: 2026
  if (el) el.textContent = new Date().getFullYear();
}

/* --------- HÀM: Định dạng ngày kiểu Việt Nam (dd/mm/yyyy) --------- */
// Input: isoDate dạng chuỗi "2026-06-30" (định dạng chuẩn ISO)
// Output: chuỗi dạng "30/6/2026" (dễ đọc hơn cho người Việt)
function formatDate(isoDate) {
  const d = new Date(isoDate);           // Chuyển chuỗi thành đối tượng Date

  // Nếu chuyển đổi thất bại (ngày không hợp lệ), trả về nguyên bản
  // để tránh hiển thị chữ "Invalid Date" khó hiểu cho người dùng
  if (isNaN(d)) return isoDate;

  // toLocaleDateString("vi-VN") tự động format theo chuẩn Việt Nam
  return d.toLocaleDateString("vi-VN");
}

/* --------- HÀM: Cắt ngắn văn bản theo RANH GIỚI TỪ hoàn chỉnh --------- */
// Input: text gốc (có thể rất dài), maxLength: số ký tự tối đa muốn giữ
// Output: chuỗi đã cắt ngắn, KHÔNG cắt vỡ giữa từ, có dấu "..." ở cuối
// Cách làm: cắt thô theo maxLength trước, sau đó lùi lại tới khoảng
// trắng GẦN NHẤT phía trước — đảm bảo từ cuối cùng hiển thị luôn
// TRỌN VẸN, không bị đứt nửa chừng như line-clamp thuần CSS hay bị.
function truncateText(text, maxLength = 140) {
  if (!text) return "";

  // Nếu văn bản đã ngắn hơn giới hạn, trả về nguyên bản, khỏi cắt
  if (text.length <= maxLength) return text;

  // Cắt thô tới đúng vị trí maxLength
  const cut = text.slice(0, maxLength);

  // lastIndexOf(" ") tìm khoảng trắng CUỐI CÙNG trong đoạn đã cắt —
  // đó chính là ranh giới giữa 2 từ, an toàn để cắt tại đó
  const lastSpace = cut.lastIndexOf(" ");

  // Nếu tìm thấy khoảng trắng hợp lý (không quá gần đầu chuỗi),
  // cắt tại đó. Nếu không (VD gặp 1 từ siêu dài không có dấu cách),
  // đành cắt cứng tại maxLength để tránh vòng lặp vô hạn/lỗi.
  const safeText = lastSpace > 0 ? cut.slice(0, lastSpace) : cut;

  return safeText.trim() + "...";
}

/* =======================================================
   PHẦN 1: THÔNG BÁO NỔI BẬT (announcements)
   ======================================================= */

// Hàm này nhận vào một MẢNG thông báo, rồi "vẽ" (render)
// chúng thành HTML và chèn vào trong trang.
function renderAnnouncements(announcements) {
  // Lấy thẻ <div id="announcementsList"> — nơi sẽ chứa danh sách
  const container = document.getElementById("announcementsList");

  // Nếu không tìm thấy thẻ này trong HTML thì dừng hàm luôn,
  // tránh lỗi khi cố truy cập container.innerHTML của null
  if (!container) return;

  // Trường hợp không có thông báo nào (mảng rỗng hoặc null/undefined)
  if (!announcements || announcements.length === 0) {
    container.innerHTML = '<p class="loading-text">Chưa có thông báo nào.</p>';
    return; // Dừng hàm tại đây, không chạy code phía dưới
  }

  // .map() chạy qua TỪNG phần tử trong mảng announcements,
  // với mỗi phần tử (đặt tên là "item"), ta tạo ra 1 đoạn HTML
  // dạng chuỗi (template string, dùng dấu backtick `...`).
  // Sau đó .join("") ghép tất cả đoạn HTML đó lại thành 1 chuỗi duy nhất.
  container.innerHTML = announcements
    .map((item) => {
      // Nếu thông báo CÓ đường link (link_url), bọc nội dung trong
      // thẻ <a> để bấm vào được; nếu KHÔNG có link, giữ nguyên thẻ
      // <div> như cũ (không thể bấm). "wrapperTag" quyết định dùng
      // thẻ nào, "linkAttr" thêm href="..." nếu cần.
      const hasLink = !!item.link_url;
      const wrapperTag = hasLink ? "a" : "div";
      const linkAttr = hasLink ? `href="${item.link_url}"` : "";

      return `
      <${wrapperTag} class="announcement-item" ${linkAttr}>
        <span class="badge">${item.tag}</span>
        <div class="content">
          <strong>${item.title}</strong>
          <span class="date">${formatDate(item.announce_date || item.date)}</span>
        </div>
        ${hasLink ? '<span class="announcement-arrow">→</span>' : ""}
      </${wrapperTag}>
    `;
    })
    .join("");
  // Cuối cùng, chuỗi HTML này được gán vào container.innerHTML,
  // trình duyệt sẽ tự động "vẽ" nó thành các thẻ HTML thật sự.
}

/* =======================================================
   PHẦN 2: TIN TỨC — render + lọc theo danh mục + tìm kiếm
   ======================================================= */

// 3 biến "toàn cục" (global) dùng để ghi nhớ TRẠNG THÁI hiện tại
// của phần tin tức, để các hàm khác nhau có thể cùng đọc/sửa chúng.
let allNewsData = [];        // Toàn bộ tin tức gốc (không đổi trong suốt phiên dùng web)
let currentCategory = "all"; // Danh mục đang được chọn để lọc (mặc định "all" = tất cả)
let currentSearchTerm = "";  // Từ khóa tìm kiếm hiện tại (mặc định rỗng = không lọc)

// Hàm khởi tạo toàn bộ phần tin tức: gọi 1 lần duy nhất lúc trang tải xong
function initNewsSection(newsData) {
  allNewsData = newsData;              // Lưu lại dữ liệu gốc vào biến toàn cục
  renderCategoryFilters(newsData);     // Vẽ ra các nút lọc danh mục (VD: "Hoạt động", "Thành tích"...)
  renderNewsList(newsData);            // Vẽ danh sách tin tức lần đầu (chưa lọc gì)

  // Lấy thẻ chứa các nút lọc để gắn sự kiện click
  const filtersContainer = document.getElementById("newsFilters");

  if (filtersContainer) {
    // Thay vì gắn sự kiện click cho TỪNG nút riêng lẻ, ta gắn
    // MỘT sự kiện click duy nhất cho cả container (kỹ thuật gọi là
    // "event delegation"). Lợi ích: kể cả khi ta thêm nút mới bằng JS
    // sau này, chúng vẫn hoạt động mà không cần gắn lại sự kiện.
    filtersContainer.addEventListener("click", (e) => {
      // e.target là phần tử NGƯỜI DÙNG THỰC SỰ đã bấm vào
      // (có thể là chữ bên trong nút, không chắc là thẻ <button>).
      // .closest(".filter-btn") tìm ngược lên cây HTML để lấy
      // đúng thẻ <button class="filter-btn"> gần nhất.
      const btn = e.target.closest(".filter-btn");

      // Nếu người dùng bấm vào chỗ khác (không phải nút lọc) thì bỏ qua
      if (!btn) return;

      // Bỏ class "active" (đang highlight) khỏi TẤT CẢ các nút...
      filtersContainer
        .querySelectorAll(".filter-btn")
        .forEach((b) => b.classList.remove("active"));

      // ...rồi chỉ thêm class "active" cho nút vừa được bấm
      btn.classList.add("active");

      // Đọc thuộc tính data-category của nút (VD: data-category="Hoạt động")
      // và lưu vào biến trạng thái currentCategory
      currentCategory = btn.dataset.category;

      // Gọi hàm áp dụng lại bộ lọc (kết hợp cả category + từ khóa tìm kiếm)
      applyNewsFilters();
    });
  }
}

// Hàm tự động tạo ra các nút lọc danh mục dựa trên dữ liệu tin tức
// (thay vì phải gõ tay từng nút trong HTML)
function renderCategoryFilters(newsData) {
  const filtersContainer = document.getElementById("newsFilters");
  if (!filtersContainer) return;

  // newsData.map(n => n.category) lấy ra danh mục của TỪNG tin tức
  // => ví dụ: ["Hoạt động", "Thành tích", "Tuyển thành viên", "Hoạt động"]
  // new Set(...) loại bỏ các giá trị TRÙNG LẶP
  // [...Set] chuyển Set trở lại thành mảng thường
  // => kết quả: ["Hoạt động", "Thành tích", "Tuyển thành viên"]
  const categories = [...new Set(newsData.map((n) => n.category))];

  // Tạo chuỗi HTML cho từng danh mục, mỗi cái là 1 nút <button>
  const buttonsHtml = categories
    .map(
      (cat) => `<button class="filter-btn" data-category="${cat}">${cat}</button>`
    )
    .join("");

  // insertAdjacentHTML("beforeend", ...) nghĩa là: CHÈN THÊM html này
  // vào NGAY TRƯỚC thẻ đóng của container (tức là thêm vào cuối),
  // KHÔNG xóa nút "Tất cả" đã có sẵn trong index.html
  filtersContainer.insertAdjacentHTML("beforeend", buttonsHtml);
}

// Hàm áp dụng đồng thời 2 điều kiện lọc: danh mục + từ khóa tìm kiếm
// Được gọi lại mỗi khi người dùng đổi danh mục HOẶC gõ tìm kiếm
function applyNewsFilters() {
  // Bắt đầu từ toàn bộ dữ liệu gốc
  let filtered = allNewsData;

  // Lọc theo danh mục — nếu không phải "all" thì chỉ giữ tin
  // có category TRÙNG với currentCategory
  if (currentCategory !== "all") {
    filtered = filtered.filter((n) => n.category === currentCategory);
  }

  // Lọc theo từ khóa tìm kiếm — nếu người dùng có gõ gì đó
  if (currentSearchTerm.trim() !== "") {
    // .toLowerCase() chuyển hết về chữ thường để so sánh
    // không phân biệt HOA/thường (VD: "Hoạt Động" == "hoạt động")
    const term = currentSearchTerm.toLowerCase();

    filtered = filtered.filter(
      (n) =>
        // .includes(term) kiểm tra xem tiêu đề HOẶC mô tả ngắn
        // có CHỨA từ khóa hay không
        n.title.toLowerCase().includes(term) ||
        n.excerpt.toLowerCase().includes(term)
    );
  }

  // Sau khi lọc xong, vẽ lại danh sách tin tức với kết quả mới
  renderNewsList(filtered);
}

// Hàm vẽ (render) danh sách tin tức ra màn hình
// Được tái sử dụng cả lúc tải trang đầu tiên VÀ mỗi khi lọc/tìm kiếm
function renderNewsList(newsData) {
  const container = document.getElementById("newsList");
  if (!container) return;

  // Nếu không có tin nào khớp điều kiện lọc, hiện thông báo thân thiện
  // thay vì để trống trơn (trải nghiệm người dùng tốt hơn)
  if (!newsData || newsData.length === 0) {
    container.innerHTML = '<p class="no-results">Không tìm thấy tin tức phù hợp.</p>';
    return;
  }

  // Cấu trúc mỗi thẻ tin tức:
  // - Ảnh + tiêu đề: bọc trong thẻ <a> RIÊNG, bấm vào SẼ chuyển
  //   sang trang chi tiết đầy đủ (tin-tuc-chi-tiet.html)
  // - Nút "Xem thêm": là <button> THƯỜNG (không phải link), bấm
  //   vào chỉ MỞ RỘNG đoạn mô tả ngắn ngay tại chỗ, KHÔNG chuyển
  //   trang — xử lý bằng JS ở hàm attachNewsReadMoreEvents() bên dưới
  //
  // LƯU Ý: dữ liệu THẬT từ Supabase dùng tên cột "image_url" và
  // "created_at", trong khi data mẫu cũ (SAMPLE_NEWS, dùng khi
  // Supabase lỗi/chưa cấu hình) dùng tên "image" và "date". Dòng
  // "item.image_url || item.image" nghĩa là: ƯU TIÊN dùng image_url
  // nếu có, KHÔNG THÌ dùng image — nhờ vậy 1 đoạn code chạy đúng
  // với CẢ HAI nguồn dữ liệu mà không cần viết 2 hàm riêng.
  container.innerHTML = newsData
    .map(
      (item) => `
      <article class="news-card">
        <a href="tin-tuc-chi-tiet.html?id=${item.id}" class="news-card-img-wrap">
          <img src="${item.image_url || item.image || ""}" alt="${item.title}" loading="lazy" />
        </a>
        <div class="news-card-body">
          <span class="news-card-category">${item.icon ? item.icon + " " : ""}${item.category}</span>
          <a href="tin-tuc-chi-tiet.html?id=${item.id}" class="news-card-title-link">
            <h3 class="news-card-title">${item.title}</h3>
          </a>
          <p class="news-card-excerpt">${truncateText(item.excerpt, 140)}</p>
          <div class="news-card-meta">
            <span>${item.author || ""}</span>
            <span>${formatDate(item.created_at || item.date)}</span>
          </div>
          <button type="button" class="news-card-readmore-btn" data-id="${item.id}">Xem thêm</button>
        </div>
      </article>
    `
      // Ghi chú: loading="lazy" trên thẻ <img> giúp trình duyệt
      // chỉ tải ảnh khi nó SẮP xuất hiện trong tầm nhìn của người dùng,
      // giúp trang tải nhanh hơn nếu có nhiều ảnh.
    )
    .join("");

  // Lưu lại TOÀN BỘ dữ liệu tin tức vừa vẽ ra, để khi bấm "Xem thêm"
  // ở 1 thẻ, ta tra lại đúng nội dung đầy đủ của bài đó (không cần
  // gọi lại Supabase — dữ liệu đã có sẵn trong tay)
  currentRenderedNews = newsData;
  attachNewsReadMoreEvents();
}

// Biến ghi nhớ dữ liệu tin tức ĐANG hiển thị (dùng chung cho hàm mở popup)
let currentRenderedNews = [];

/* --------- Nút "Xem thêm": mở KHUNG POPUP riêng hiện đầy đủ nội
   dung — KHÔNG mở rộng ngay trong thẻ (cách cũ làm cả HÀNG lưới bị
   giãn theo, ảnh hưởng tới thẻ bên cạnh không liên quan) --------- */
function attachNewsReadMoreEvents() {
  document.querySelectorAll(".news-card-readmore-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".news-card");
      const excerptEl = card.querySelector(".news-card-excerpt");
      const id = btn.dataset.id;

      // QUAN TRỌNG: từ khi có truncateText(), thẻ .news-card-excerpt
      // trong HTML CHỈ còn chứa bản đã rút gọn (140 ký tự) — bản gốc
      // đầy đủ không còn nằm trong HTML nữa. Vì vậy phải TRA LẠI nội
      // dung gốc từ currentRenderedNews (mảng dữ liệu đầy đủ đã lưu
      // lúc render) dựa theo id của bài viết, chứ không thể lấy trực
      // tiếp từ trong thẻ như cách cũ (cách cũ chỉ toggle CSS, không
      // cần tra lại vì HTML lúc đó vẫn giữ đủ nội dung gốc).
      const item = currentRenderedNews.find((n) => String(n.id) === String(id));
      const fullText = item ? item.excerpt || "" : excerptEl.textContent;

      const isExpanded = excerptEl.classList.toggle("expanded");

      if (isExpanded) {
        // Bấm "Xem thêm" → thay nội dung thẻ bằng bản ĐẦY ĐỦ, chưa cắt
        excerptEl.textContent = fullText;
      } else {
        // Bấm "Thu gọn" → trả lại đúng bản rút gọn ban đầu
        excerptEl.textContent = truncateText(fullText, 140);
      }

      btn.textContent = isExpanded ? "Thu gọn" : "Xem thêm";
    });
  });
}

function openNewsQuickViewModal(item) {
  const modal = document.getElementById("newsExcerptOverlay");
  if (!modal) return;
  document.getElementById("newsExcerptTitle").textContent = item.title;
  document.getElementById("newsExcerptContent").textContent = item.excerpt || "";
  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeNewsQuickViewModal() {
  const modal = document.getElementById("newsExcerptOverlay");
  if (!modal) return;
  modal.hidden = true;
  document.body.style.overflow = "";
}

function initNewsQuickViewModal() {
  const modal = document.getElementById("newsExcerptOverlay");
  const closeBtn = document.getElementById("newsExcerptClose");
  if (!modal || !closeBtn) return;

  closeBtn.addEventListener("click", closeNewsQuickViewModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeNewsQuickViewModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeNewsQuickViewModal();
  });
}

/* =======================================================
   PHẦN 3: TÌM KIẾM (ô search trên thanh header)
   ======================================================= */
function initSearchForm() {
  // Lấy thẻ <form id="searchForm"> và ô nhập <input id="searchInput">
  const form = document.getElementById("searchForm");
  const input = document.getElementById("searchInput");

  // Nếu 1 trong 2 không tồn tại thì dừng (phòng trường hợp HTML bị đổi)
  if (!form || !input) return;

  // Lắng nghe sự kiện "submit" của form — xảy ra khi người dùng
  // nhấn nút tìm kiếm HOẶC nhấn Enter trong ô input
  form.addEventListener("submit", (e) => {
    // e.preventDefault() CHẶN hành vi mặc định của form là
    // "tải lại trang" (reload) — vì ta muốn xử lý bằng JS,
    // không muốn mất trạng thái trang hiện tại
    e.preventDefault();

    // Lưu giá trị người dùng gõ vào biến trạng thái toàn cục
    currentSearchTerm = input.value;

    // Áp dụng lại bộ lọc với từ khóa mới
    applyNewsFilters();

    // Cuộn mượt (smooth) xuống khu vực tin tức để người dùng
    // thấy ngay kết quả tìm kiếm, không cần tự cuộn tay.
    // Dấu ?. (optional chaining) nghĩa là: nếu getElementById
    // trả về null thì bỏ qua .scrollIntoView(), không báo lỗi.
    document.getElementById("news-section")?.scrollIntoView({ behavior: "smooth" });
  });
}

/* =======================================================
   PHẦN 4: MENU MOBILE (hiện/ẩn menu trên màn hình nhỏ)
   ======================================================= */
function initMobileNav() {
  // Nút hamburger (3 gạch ngang) và khối chứa menu điều hướng
  const toggle = document.getElementById("navToggle");
  const nav = document.getElementById("mainNav");
  if (!toggle || !nav) return;

  toggle.addEventListener("click", () => {
    // classList.toggle("open") : nếu class "open" ĐANG có thì XÓA đi,
    // nếu CHƯA có thì THÊM vào. Hàm trả về true/false tương ứng.
    // Class "open" này được định nghĩa trong style.css để hiện menu.
    const isOpen = nav.classList.toggle("open");

    // Cập nhật thuộc tính aria-expanded — giúp phần mềm đọc màn hình
    // (screen reader) cho người khiếm thị biết menu đang mở hay đóng
    toggle.setAttribute("aria-expanded", String(isOpen));
  });
}

/* =======================================================
   PHẦN 5: NÚT "QUAY VỀ ĐẦU TRANG"
   ======================================================= */
function initBackToTop() {
  const btn = document.getElementById("backToTop");
  if (!btn) return;

  // Lắng nghe sự kiện cuộn trang (chạy liên tục khi người dùng scroll)
  window.addEventListener("scroll", () => {
    // window.scrollY = số pixel đã cuộn xuống từ đầu trang
    // Nếu cuộn xuống hơn 400px, HIỆN nút; ngược lại thì ẨN đi
    if (window.scrollY > 400) {
      btn.classList.add("visible");
    } else {
      btn.classList.remove("visible");
    }
  });

  // Khi bấm nút, cuộn mượt về đúng vị trí đầu trang (top: 0)
  btn.addEventListener("click", () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
}