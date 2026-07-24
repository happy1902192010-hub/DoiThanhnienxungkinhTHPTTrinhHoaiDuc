/* =======================================================
   FILE: chi-huy-qua-cac-nhiem-ky.js
   MỤC ĐÍCH: Xử lý logic RIÊNG cho trang "Chỉ huy qua các
   nhiệm kỳ".

   CẬP NHẬT (cấp bậc riêng theo từng nhiệm kỳ): dữ liệu giờ lấy
   từ 3 bảng trong Supabase:
     - "leadership_terms"  -> mỗi dòng là 1 NHIỆM KỲ
     - "leadership_levels" -> mỗi dòng là 1 CẤP BẬC, thuộc về 1
       nhiệm kỳ RIÊNG (term_id), có "card_size" (auto/large/
       medium/small) y hệt cơ chế "org_levels" bên Cơ cấu tổ chức
     - "leadership_members" -> mỗi dòng là 1 CHỈ HUY, thuộc về 1
       nhiệm kỳ (term_id) VÀ 1 cấp bậc (level_id, có thể để trống)

   Trong MỖI nhiệm kỳ, chỉ huy được GOM NHÓM theo cấp bậc (giống
   hệt cách "co-cau-to-chuc.js" gom nhóm chức vụ theo org_levels),
   thẻ to/nhỏ tùy theo "card_size" của cấp đó — dùng lại ĐÚNG các
   biến CSS --op-... đã có sẵn trong style.css (class .org-card /
   .org-level-section), không cần thêm CSS mới cho phần thẻ.

   QUAN TRỌNG: hàm slugifyLeadershipTerm() ở đây PHẢI tạo ra
   CHÍNH XÁC cùng 1 chuỗi id như hàm cùng tên bên gioi-thieu.js —
   nếu sau này sửa 1 bên, nhớ sửa luôn bên kia cho khớp, không thì
   link sẽ dẫn sai chỗ.
   ======================================================= */

document.addEventListener("DOMContentLoaded", () => {
  loadLeadershipByTerm();
  initLeadershipDetailModal();

  // LƯU Ý: initMobileNav(), initBackToTop(), setFooterYear() đã
  // được gọi sẵn bên trong main.js (cũng lắng nghe DOMContentLoaded,
  // và main.js nạp TRƯỚC file này). Không gọi lại ở đây để tránh
  // gắn trùng sự kiện (giống lưu ý đã có ở gioi-thieu.js).
});

/* =======================================================
   TẠO CHUỖI ID NEO (anchor) DUY NHẤT CHO 1 NHIỆM KỲ
   ======================================================= */
function slugifyLeadershipTerm(termName, period) {
  const raw = `${termName || ""} ${period || ""}`;
  const slug = raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return "nk-" + slug;
}

// Ảnh giữ chỗ dùng khi CHƯA có ảnh đại diện — nhúng thẳng dạng SVG
// (không phụ thuộc dịch vụ bên ngoài như via.placeholder.com, vốn đã
// NGỪNG HOẠT ĐỘNG, khiến ảnh bị vỡ và trình duyệt hiện chữ alt đè lên)
const LEADERSHIP_NO_IMAGE_PLACEHOLDER =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNjAiIGhlaWdodD0iMTYwIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZjVmNmY3Ii8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIxNCIgZmlsbD0iIzk5OTk5OSIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZG9taW5hbnQtYmFzZWxpbmU9Im1pZGRsZSI+Q2jGsGEgY8OzIOG6o25oPC90ZXh0Pjwvc3ZnPg==";

/* =======================================================
   TÍNH CỠ THẺ THEO CẤP BẬC (card_size: auto/large/medium/small)
   ---------------------------------------------------------
   Dùng CHUNG 1 công thức với cách admin-org.js xem trước cỡ thẻ
   (getEffectiveAvatarPx): "auto" thì to nhỏ dần theo thứ tự cấp
   (level_order), còn large/medium/small thì cố định ở 1 mốc cỡ
   nhất định — đảm bảo Admin chọn cỡ nào, thẻ NGOÀI TRANG CÔNG
   KHAI to nhỏ đúng y như vậy.
   ======================================================= */
function getEffectiveAvatarPx(level, indexInTerm) {
  const virtualIndexMap = { large: 0, medium: 2, small: 5 };
  const i =
    level && level.card_size && virtualIndexMap[level.card_size] !== undefined
      ? virtualIndexMap[level.card_size]
      : indexInTerm;
  return Math.max(84, 156 - i * 14);
}

// Từ cỡ avatar (px), suy ra TOÀN BỘ các biến CSS --op-... cho 1 cấp
// bậc: cấp CÀNG TO (avatar càng lớn) thì thẻ càng rộng, viền càng
// dày và có màu vàng nổi bật (giống nhóm chức vụ cao nhất bên Cơ
// cấu tổ chức); cấp nhỏ hơn thì viền mảnh, màu viền mặc định.
function buildLevelSizeVars(avatarPx) {
  let cardW, padY, padX, borderW, borderColor, titleSize, nameSize;

  if (avatarPx >= 156) {
    // To nhất — viền vàng nổi bật (dùng --color-secondary có sẵn)
    cardW = 220;
    padY = 24;
    padX = 20;
    borderW = 3;
    borderColor = "var(--color-secondary)";
    titleSize = "0.85rem";
    nameSize = "1.2rem";
  } else if (avatarPx >= 125) {
    cardW = 200;
    padY = 20;
    padX = 18;
    borderW = 2;
    borderColor = "var(--color-primary)";
    titleSize = "0.8rem";
    nameSize = "1.1rem";
  } else if (avatarPx >= 105) {
    cardW = 180;
    padY = 18;
    padX = 16;
    borderW = 1;
    borderColor = "var(--color-border)";
    titleSize = "0.78rem";
    nameSize = "1.02rem";
  } else {
    cardW = 160;
    padY = 16;
    padX = 14;
    borderW = 1;
    borderColor = "var(--color-border)";
    titleSize = "0.75rem";
    nameSize = "0.95rem";
  }

  return `
    --op-card-w: ${cardW}px;
    --op-avatar: ${avatarPx}px;
    --op-pad-y: ${padY}px;
    --op-pad-x: ${padX}px;
    --op-border-w: ${borderW}px;
    --op-border-color: ${borderColor};
    --op-title-size: ${titleSize};
    --op-name-size: ${nameSize};
  `;
}

/* =======================================================
   LẤY DỮ LIỆU (CẢ 3 BẢNG) + GOM NHÓM
   ======================================================= */
async function loadLeadershipByTerm() {
  const container = document.getElementById("leadershipByTermContainer");
  if (!container) return;

  const [termsResult, levelsResult, membersResult] = await Promise.all([
    supabaseClient.from("leadership_terms").select("*").order("display_order", { ascending: true }),
    supabaseClient.from("leadership_levels").select("*").order("level_order", { ascending: true }),
    supabaseClient.from("leadership_members").select("*").order("display_order", { ascending: true }),
  ]);

  if (termsResult.error || levelsResult.error || membersResult.error) {
    container.innerHTML = '<p class="loading-text">Không tải được dữ liệu. Vui lòng thử lại sau.</p>';
    console.error("Lỗi tải dữ liệu Các đời chỉ huy:", termsResult.error || levelsResult.error || membersResult.error);
    return;
  }

  renderLeadershipByTerm(termsResult.data, levelsResult.data, membersResult.data);
}

// Ghi nhớ toàn bộ danh sách CHỈ HUY (dạng phẳng) để hàm mở modal chi
// tiết tra lại được đầy đủ thông tin của từng người
let allMembersFlat = [];

function renderLeadershipByTerm(terms, levels, members) {
  const container = document.getElementById("leadershipByTermContainer");
  allMembersFlat = members || [];

  if (!terms || terms.length === 0) {
    container.innerHTML = '<p class="loading-text">Chưa có dữ liệu nhiệm kỳ.</p>';
    return;
  }

  container.innerHTML = terms
    .map((t) => {
      const anchorId = slugifyLeadershipTerm(t.term_name, t.period);
      const heading = t.term_name + (t.period ? " • " + t.period : "");

      const termLevels = (levels || []).filter((lv) => lv.term_id === t.id);
      const termMembers = allMembersFlat.filter((m) => m.term_id === t.id);

      if (termMembers.length === 0) {
        return `
          <section id="${anchorId}" class="org-level-section">
            <h2 class="org-level-section-title">${heading}</h2>
            <p class="loading-text">Chưa có chỉ huy nào được thêm cho nhiệm kỳ này.</p>
          </section>
        `;
      }

      // Gom nhóm chỉ huy theo cấp bậc (giống co-cau-to-chuc.js gom
      // theo org_levels). Nhóm "Chưa phân cấp" (level_id null hoặc
      // trỏ tới cấp đã bị xóa) luôn hiện SAU CÙNG.
      const groups = termLevels.map((lv, index) => ({
        level: lv,
        indexInTerm: index,
        items: termMembers.filter((m) => m.level_id === lv.id),
      }));

      const unassigned = termMembers.filter((m) => !m.level_id || !termLevels.some((lv) => lv.id === m.level_id));
      if (unassigned.length > 0) {
        groups.push({ level: null, indexInTerm: termLevels.length, items: unassigned });
      }

      const groupsHtml = groups
        .filter((g) => g.items.length > 0)
        .map((g) => {
          const avatarPx = getEffectiveAvatarPx(g.level, g.indexInTerm);
          const sizeVars = buildLevelSizeVars(avatarPx);
          const groupTitle = g.level ? g.level.name : "Chưa phân cấp";

          const cardsHtml = g.items
            .map(
              (m) => `
              <div class="org-card" data-id="${m.id}">
                <img
                  src="${m.image_url || LEADERSHIP_NO_IMAGE_PLACEHOLDER}"
                  alt="${m.leader_name}"
                  class="org-card-img"
                />
                <div>
                  <span class="org-card-title">${m.position || "Chỉ huy"}</span>
                  <h3 class="org-card-name">${m.leader_name}</h3>
                </div>
              </div>
            `
            )
            .join("");

          // Chỉ hiện tiêu đề CẤP nếu nhiệm kỳ này có từ 2 nhóm trở
          // lên (VD nhiệm kỳ chỉ có 1 chỉ huy, không cần phân cấp
          // thì khỏi hiện tiêu đề "Chưa phân cấp" thừa thãi)
          const showGroupTitle = groups.filter((gr) => gr.items.length > 0).length > 1;

          return `
            <div class="leadership-level-group" style="${sizeVars}">
              ${showGroupTitle ? `<h4 class="leadership-level-title">${groupTitle}</h4>` : ""}
              <div class="org-cards-grid">
                ${cardsHtml}
              </div>
            </div>
          `;
        })
        .join("");

      return `
        <section id="${anchorId}" class="org-level-section">
          <h2 class="org-level-section-title">${heading}</h2>
          ${groupsHtml}
        </section>
      `;
    })
    .join("");

  attachLeadershipCardEvents();
  scrollToHashIfPresent();
}

function scrollToHashIfPresent() {
  if (!window.location.hash) return;
  const target = document.querySelector(window.location.hash);
  if (target) {
    target.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

/* --------- Bấm vào 1 thẻ chỉ huy → mở khung chi tiết (modal) --------- */
function attachLeadershipCardEvents() {
  document.querySelectorAll("#leadershipByTermContainer .org-card").forEach((card) => {
    card.addEventListener("click", () => {
      const id = card.dataset.id;
      const member = allMembersFlat.find((m) => m.id == id);
      if (member) openLeadershipDetailModal(member);
    });
  });
}

function openLeadershipDetailModal(member) {
  const modal = document.getElementById("leadershipDetailModal");
  if (!modal) return;

  document.getElementById("leadershipDetailImg").src =
    member.image_url || LEADERSHIP_NO_IMAGE_PLACEHOLDER;
  document.getElementById("leadershipDetailImg").alt = member.leader_name;
  document.getElementById("leadershipDetailTitle").textContent = member.position || "Chỉ huy";
  document.getElementById("leadershipDetailName").textContent = member.leader_name;

  const bioEl = document.getElementById("leadershipDetailBio");
  bioEl.textContent = member.bio || member.note || "Chưa có giới thiệu.";

  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeLeadershipDetailModal() {
  const modal = document.getElementById("leadershipDetailModal");
  if (!modal) return;
  modal.hidden = true;
  document.body.style.overflow = "";
}

function initLeadershipDetailModal() {
  const modal = document.getElementById("leadershipDetailModal");
  const closeBtn = document.getElementById("leadershipDetailClose");
  if (!modal || !closeBtn) return;

  closeBtn.addEventListener("click", closeLeadershipDetailModal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeLeadershipDetailModal();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeLeadershipDetailModal();
  });
}