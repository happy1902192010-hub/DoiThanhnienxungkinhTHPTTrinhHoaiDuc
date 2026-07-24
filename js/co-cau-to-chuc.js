/* =======================================================
   FILE: co-cau-to-chuc.js
   MỤC ĐÍCH: Lấy danh sách chức vụ TỪ SUPABASE (bảng
   org_positions) và hiển thị dạng LƯỚI THẺ (card grid) —
   mỗi thẻ gồm ảnh + chức danh + tên.

   Trước đây trang này dùng dữ liệu tĩnh ORG_STRUCTURE (dạng
   cây), giờ đã đổi sang dữ liệu THẬT, Admin có thể thêm/sửa/
   xóa trực tiếp tại admin-org.html mà không cần sửa code.

   Cần: js/supabase-config.js (biến supabaseClient) nạp TRƯỚC.
   ======================================================= */

document.addEventListener("DOMContentLoaded", () => {
  loadOrgPositions();

  // LƯU Ý QUAN TRỌNG: initMobileNav(), initBackToTop(), setFooterYear()
  // KHÔNG được gọi lại ở đây nữa — chúng ĐÃ được gọi sẵn bên trong
  // main.js (cũng lắng nghe DOMContentLoaded). main.js luôn nạp TRƯỚC
  // file này (xem thứ tự <script> trong co-cau-to-chuc.html), nên tới
  // lúc DOMContentLoaded bắn ra, main.js chắc chắn đã kịp gắn xong.
  // Gọi lại lần nữa ở đây sẽ khiến initMobileNav() gắn THÊM 1 sự kiện
  // click trùng lặp vào nút hamburger → bấm 1 cái, menu bật lên rồi
  // tự đóng lại ngay lập tức (2 listener toggle triệt tiêu nhau) →
  // đây chính là nguyên nhân khiến menu mobile "im re" trên trang này.
  initOrgDetailModal();
});

/* --------- Lấy dữ liệu từ Supabase và vẽ ra màn hình --------- */
async function loadOrgPositions() {
  const container = document.getElementById("orgPositionsList");
  if (!container) return;

  // Tải SONG SONG cả 2 bảng: cấp bậc (org_levels) và chức vụ (org_positions)
  // để có thể GOM NHÓM chức vụ theo đúng cấp bậc và đúng thứ tự cấp bậc
  const [levelsResult, positionsResult] = await Promise.all([
    supabaseClient.from("org_levels").select("*").order("level_order", { ascending: true }),
    supabaseClient.from("org_positions").select("*").order("display_order", { ascending: true }),
  ]);

  if (levelsResult.error || positionsResult.error) {
    // Nếu lỗi (VD: mất mạng, cấu hình sai...), hiện thông báo thân thiện
    // thay vì để trang trắng khó hiểu
    container.innerHTML =
      '<p class="loading-text">Không tải được dữ liệu. Vui lòng thử lại sau.</p>';
    console.error("Lỗi tải org_levels/org_positions:", levelsResult.error, positionsResult.error);
    return;
  }

  renderOrgPositions(positionsResult.data, levelsResult.data);
}

// Biến ghi nhớ toàn bộ danh sách chức vụ VỪA TẢI VỀ, để khi bấm vào
// 1 thẻ, ta tra lại đúng thông tin đầy đủ (kể cả "bio") của người đó
// mà không cần gọi lại Supabase lần nữa (dữ liệu đã có sẵn trong tay)
let allOrgPositions = [];

/* --------- Vẽ danh sách chức vụ, GOM NHÓM theo cấp bậc (cao → thấp) --------- */
function renderOrgPositions(positions, levels) {
  const container = document.getElementById("orgPositionsList");
  allOrgPositions = positions || []; // Lưu lại để hàm mở modal dùng sau

  if (!positions || positions.length === 0) {
    container.innerHTML =
      '<p class="loading-text">Chưa có thông tin cơ cấu tổ chức.</p>';
    return;
  }

  // Mỗi nhóm = 1 cấp bậc, chứa các chức vụ thuộc cấp đó (đã được sắp
  // xếp sẵn theo display_order từ câu truy vấn phía trên)
  const groups = (levels || []).map((lv) => ({
    level: lv,
    items: positions.filter((p) => p.level_id === lv.id),
  }));

  // Chức vụ CHƯA GÁN cấp bậc nào (hoặc cấp đã bị xóa) — gom vào cuối
  const levelIds = (levels || []).map((lv) => lv.id);
  const unassigned = positions.filter((p) => !p.level_id || !levelIds.includes(p.level_id));
  if (unassigned.length > 0) {
    groups.push({ level: null, items: unassigned });
  }

  // data-id gắn vào mỗi thẻ, để khi bấm vào biết CHÍNH XÁC đang bấm
  // vào chức vụ nào trong mảng allOrgPositions
  //
  // Bước 1: tính kích thước thẻ cho TỪNG nhóm trước (dựa theo thứ tự
  // trong "Quản lý cấp bậc", hoặc kích thước Admin đã CHỌN THỦ CÔNG)
  const groupsWithSize = groups
    .filter((group) => group.items.length > 0) // Cấp chưa có ai giữ chức -> không hiện mục rỗng
    .map((group, index) => ({
      ...group,
      sizeInfo: getLevelSizeInfo(group.level, index),
    }));

  // Bước 2: SẮP XẾP LẠI theo đúng KÍCH THƯỚC vừa tính — cấp có thẻ TO
  // NHẤT luôn hiện Ở TRÊN CÙNG, nhỏ dần xuống dưới. Nhờ vậy dù Admin
  // đổi thứ tự cấp bậc ở khung quản lý, hay chọn size thủ công (to/vừa/
  // nhỏ) không khớp với thứ tự đó, trang công khai VẪN LUÔN hiển thị
  // đúng "từ lớn nhất đến bé nhất", không bao giờ bị lệch như trước
  groupsWithSize.sort((a, b) => b.sizeInfo.avatar - a.sizeInfo.avatar);

  container.innerHTML = groupsWithSize
    .map((group, sortedIndex) => {
      const css = buildSizeCss(group.sizeInfo, sortedIndex === 0);
      return `
      <div class="org-level-section" style="${css}">
        ${group.level ? `<h3 class="org-level-section-title">${group.level.name}</h3>` : ""}
        <div class="org-cards-grid">
          ${group.items.map((p) => renderOrgCardHTML(p)).join("")}
        </div>
      </div>
    `;
    })
    .join("");

  attachOrgCardEvents();
}

// TÍNH KÍCH THƯỚC THẺ cho 1 cấp bậc, trả về { avatar, css } — avatar
// (số px) dùng để SẮP XẾP THỨ TỰ (to → nhỏ), css là chuỗi
// style="--op-...: ...;" gán thẳng vào thẻ .org-level-section (đọc
// bằng CSS var() trong style.css). Viền vàng nổi bật được quyết định
// SAU KHI SẮP XẾP (xem renderOrgPositions) — luôn thuộc về cấp có
// thẻ TO NHẤT trong danh sách, bất kể "i" bên dưới là bao nhiêu.
//
// - Nếu Admin ĐÃ CHỌN THỦ CÔNG kích thước ở trang Quản lý cấp bậc
//   (card_size = "large"/"medium"/"small"), dùng "chỉ số ảo" tương ứng
//   (0 / 2 / 5) đưa vào ĐÚNG 1 công thức bên dưới — để 3 lựa chọn này
//   luôn ra kích thước NHẤT QUÁN với chế độ tự động.
// - Nếu để "auto" (mặc định), dùng THẲNG vị trí cấp bậc đó trong danh
//   sách (index, đếm từ 0) — CÀNG NHIỀU CẤP thì kích thước càng giảm
//   dần MƯỢT theo công thức, KHÔNG bị giới hạn cứng ở 3 mức như trước.
//   Có giá trị SÀN (Math.max) để không bao giờ nhỏ tới mức không đọc được.
//
// GHI CHÚ CẬP NHẬT: tăng các giá trị SÀN (số đầu tiên trong mỗi
// Math.max) để các cấp NHỎ (Vừa/Nhỏ/Nhỏ nhất — i lớn) không bị co
// quá bé; cấp To nhất (i=0) không đổi vì chưa bao giờ chạm sàn.
function getLevelSizeInfo(level, index) {
  const virtualIndexMap = { large: 0, medium: 2, small: 5 };
  const i =
    level && level.card_size && virtualIndexMap[level.card_size] !== undefined
      ? virtualIndexMap[level.card_size]
      : index;

  const avatar = Math.max(84, 156 - i * 14); // px
  const cardW = Math.max(185, 265 - i * 20); // px
  const padY = Math.max(20, 36 - i * 3); // px
  const padX = Math.max(16, 27 - i * 2); // px
  const nameSize = Math.max(1.1, 1.55 - i * 0.08); // rem
  const titleSize = Math.max(0.76, 0.92 - i * 0.02); // rem
  const iconSize = Math.max(1.5, 2.6 - i * 0.15); // rem
  // Chiều cao thẻ: đủ chỗ cho ảnh + khoảng đệm + khối chữ (chức danh +
  // tên tối đa 2 dòng), để mọi thẻ CÙNG 1 cấp cao bằng nhau tuyệt đối
  const cardH = Math.round(avatar + padY * 2 + 14 + nameSize * 16 * 2.3 + titleSize * 16 * 1.6);

  return { avatar, cardW, padY, padX, nameSize, titleSize, iconSize, cardH };
}

// Ghép các số đo đã tính ở trên thành chuỗi style="--op-...: ...;",
// KÈM quyết định viền vàng nổi bật hay không (isTopTier = true nếu
// đây là cấp có thẻ TO NHẤT sau khi đã SẮP XẾP LẠI theo kích thước)
function buildSizeCss(sizeInfo, isTopTier) {
  const { avatar, cardW, padY, padX, nameSize, titleSize, iconSize, cardH } = sizeInfo;
  const borderW = isTopTier ? 2 : 1;
  const borderColor = isTopTier ? "var(--color-secondary)" : "var(--color-border)";

  return (
    `--op-avatar:${avatar}px; --op-card-w:${cardW}px; --op-card-h:${cardH}px; ` +
    `--op-pad-y:${padY}px; --op-pad-x:${padX}px; --op-name-size:${nameSize}rem; ` +
    `--op-title-size:${titleSize}rem; --op-icon-size:${iconSize}rem; ` +
    `--op-border-w:${borderW}px; --op-border-color:${borderColor};`
  );
}

function renderOrgCardHTML(p) {
  return `
      <div class="org-card" data-id="${p.id}">
        ${p.icon ? `<span class="org-card-icon">${p.icon}</span>` : ""}
        <img
          src="${p.image_url || "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNjAiIGhlaWdodD0iMTYwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNmY3Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY2NjY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+Q2jGsGEgY8OzIOG6o25oPC90ZXh0Pjwvc3ZnPg=="}"
          alt="${p.title}"
          class="org-card-img"
        />
        <div>
          <span class="org-card-title">${p.title}</span>
          ${p.name ? `<h3 class="org-card-name">${p.name}</h3>` : ""}
        </div>
      </div>
    `;
}

/* --------- Bấm vào 1 thẻ → mở khung chi tiết (modal) --------- */
function attachOrgCardEvents() {
  document.querySelectorAll(".org-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.dataset.id;
      // == thay vì === vì data-id đọc ra là CHUỖI, còn p.id trong
      // dữ liệu Supabase là SỐ — "==" tự động so sánh linh hoạt,
      // bỏ qua sự khác biệt kiểu dữ liệu này
      const position = allOrgPositions.find((p) => p.id == id);
      if (position) openOrgDetailModal(position);
    });
  });
}

function openOrgDetailModal(position) {
  const modal = document.getElementById("orgDetailModal");
  if (!modal) return;

  document.getElementById("orgDetailImg").src =
    position.image_url || "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNjAiIGhlaWdodD0iMTYwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNmY3Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzY2NjY2NiIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+Q2jGsGEgY8OzIOG6o25oPC90ZXh0Pjwvc3ZnPg==";
  document.getElementById("orgDetailImg").alt = position.title;
  document.getElementById("orgDetailTitle").textContent = position.title;
  document.getElementById("orgDetailName").textContent = position.name || "";

  const bioEl = document.getElementById("orgDetailBio");
  bioEl.textContent = position.bio || "Chưa có giới thiệu.";

  modal.hidden = false;
  document.body.style.overflow = "hidden"; // Khóa cuộn trang nền khi modal đang mở
}

function closeOrgDetailModal() {
  const modal = document.getElementById("orgDetailModal");
  if (!modal) return;
  modal.hidden = true;
  document.body.style.overflow = "";
}

function initOrgDetailModal() {
  const modal = document.getElementById("orgDetailModal");
  const closeBtn = document.getElementById("orgDetailClose");
  if (!modal || !closeBtn) return;

  closeBtn.addEventListener("click", closeOrgDetailModal);

  // Bấm ra ngoài vùng nội dung (vào nền mờ) cũng đóng luôn
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeOrgDetailModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeOrgDetailModal();
  });
}