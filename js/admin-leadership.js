/* =======================================================
   FILE: admin-leadership.js
   MỤC ĐÍCH: CRUD (Create-Read-Update-Delete) cho 3 bảng:
     - "leadership_terms"  -> mỗi dòng là 1 NHIỆM KỲ (tên, thời
       gian, ẢNH RIÊNG hiện ở trang Giới thiệu)
     - "leadership_levels" -> mỗi dòng là 1 CẤP BẬC, thuộc về 1
       nhiệm kỳ RIÊNG (term_id), có "card_size" (auto/large/
       medium/small) — y hệt cơ chế "org_levels" bên Cơ cấu tổ
       chức, nhưng ở đây MỖI NHIỆM KỲ có danh sách cấp RIÊNG
     - "leadership_members" -> mỗi dòng là 1 CHỈ HUY, thuộc về 1
       nhiệm kỳ (term_id) VÀ 1 cấp bậc (level_id, có thể để trống)

   Giao diện hiển thị dạng ACCORDION: mặc định mỗi nhiệm kỳ chỉ
   hiện tên + số lượng chỉ huy, bấm vào mới xổ ra để:
     1. Sửa/xóa THÔNG TIN NHIỆM KỲ (tên, thời gian, ảnh riêng)
     2. Quản lý CẤP BẬC riêng của nhiệm kỳ này (thêm/sửa/xóa/sắp
        xếp, chọn cỡ thẻ to/vừa/nhỏ)
     3. Thêm/sửa/xóa từng CHỈ HUY, gán vào đúng cấp bậc

   Cần: supabase-config.js (biến supabaseClient) nạp trước.
   Bucket lưu ảnh: "leadership.images" — thư mục "terms/" cho ảnh
   nhiệm kỳ, "members/" cho ảnh chỉ huy.
   ======================================================= */

const LEADERSHIP_NO_IMAGE_PLACEHOLDER =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2Y1ZjZmNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTEiIGZpbGw9IiM2NjY2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg==";

document.addEventListener("DOMContentLoaded", () => {
  loadLeadershipAdmin();
  initAddTermForm();
});

// Ghi nhớ dữ liệu VỪA TẢI VỀ (3 bảng), dùng lại khi render/sắp xếp
let allTerms = [];
let allLevels = [];
let allMembers = [];

/* =======================================================
   ĐỌC DỮ LIỆU (Read) — tải song song cả 3 bảng
   ======================================================= */
async function loadLeadershipAdmin() {
  const container = document.getElementById("leadershipAdminList");

  const [termsResult, levelsResult, membersResult] = await Promise.all([
    supabaseClient.from("leadership_terms").select("*").order("display_order", { ascending: true }),
    supabaseClient.from("leadership_levels").select("*").order("level_order", { ascending: true }),
    supabaseClient.from("leadership_members").select("*").order("display_order", { ascending: true }),
  ]);

  if (termsResult.error) {
    container.innerHTML = `<p class="admin-message admin-message-error">Lỗi tải danh sách nhiệm kỳ: ${termsResult.error.message}</p>`;
    return;
  }
  if (levelsResult.error) {
    container.innerHTML = `<p class="admin-message admin-message-error">Lỗi tải danh sách cấp bậc: ${levelsResult.error.message}</p>`;
    return;
  }
  if (membersResult.error) {
    container.innerHTML = `<p class="admin-message admin-message-error">Lỗi tải danh sách chỉ huy: ${membersResult.error.message}</p>`;
    return;
  }

  allTerms = termsResult.data || [];
  allLevels = levelsResult.data || [];
  allMembers = membersResult.data || [];

  renderLeadershipAdminList();
}

/* =======================================================
   XEM TRƯỚC CỠ THẺ CHO 1 CẤP BẬC — dùng chung công thức với
   trang công khai (chi-huy-qua-cac-nhiem-ky.js -> getEffectiveAvatarPx)
   để Admin luôn thấy đúng những gì khách sẽ thấy
   ======================================================= */
function getEffectiveAvatarPx(level, indexInTerm) {
  const virtualIndexMap = { large: 0, medium: 2, small: 5 };
  const i =
    level && level.card_size && virtualIndexMap[level.card_size] !== undefined
      ? virtualIndexMap[level.card_size]
      : indexInTerm;
  return Math.max(84, 156 - i * 14);
}

function tierBadgeHTML(avatarPx) {
  let emoji = "⚪";
  let label = "Nhỏ";
  if (avatarPx >= 156) {
    emoji = "🥇";
    label = "To nhất";
  } else if (avatarPx >= 125) {
    emoji = "🥈";
    label = "Lớn";
  } else if (avatarPx >= 105) {
    emoji = "🥉";
    label = "Vừa";
  } else if (avatarPx >= 90) {
    label = "Nhỏ";
  } else {
    label = "Nhỏ nhất";
  }
  return `<span class="admin-level-size-badge">${emoji} ${label} (${avatarPx}px)</span>`;
}

/* =======================================================
   HIỂN THỊ DẠNG ACCORDION
   ======================================================= */
function renderLeadershipAdminList() {
  const container = document.getElementById("leadershipAdminList");

  if (allTerms.length === 0) {
    container.innerHTML = '<p class="loading-text">Chưa có nhiệm kỳ nào. Thêm mới ở form phía trên.</p>';
    return;
  }

  container.innerHTML = allTerms
    .map((t, termIndex) => {
      const heading = t.term_name + (t.period ? " • " + t.period : "");
      const termMembers = allMembers.filter((m) => m.term_id === t.id);
      const termLevels = allLevels.filter((lv) => lv.term_id === t.id);
      const countLabel = termMembers.length === 1 ? "1 chỉ huy" : `${termMembers.length} chỉ huy`;

      /* --------- Khối sửa THÔNG TIN NHIỆM KỲ --------- */
      const termEditHtml = `
        <div class="admin-position-row" data-term-id="${t.id}">
          <img
            src="${t.image_url || LEADERSHIP_NO_IMAGE_PLACEHOLDER}"
            alt="${escapeHtml(t.term_name)}"
            class="admin-position-thumb"
          />

          <div class="admin-position-fields">
            <label>Tên nhiệm kỳ</label>
            <input type="text" class="input-term-name" value="${escapeHtml(t.term_name)}" />

            <label>Khoảng thời gian</label>
            <input type="text" class="input-term-period" value="${escapeHtml(t.period || "")}" />

            <label>Đổi ảnh nhiệm kỳ (không bắt buộc)</label>
            <input type="file" class="input-term-image" accept="image/*" />
          </div>

          <div class="admin-position-actions">
            <div class="admin-level-order-controls" style="margin-bottom:8px;">
              <button type="button" class="btn-term-up" ${termIndex === 0 ? "disabled" : ""} title="Đưa nhiệm kỳ này lên trước">▲</button>
              <button type="button" class="btn-term-down" ${
                termIndex === allTerms.length - 1 ? "disabled" : ""
              } title="Đưa nhiệm kỳ này xuống sau">▼</button>
            </div>
            <button class="btn btn-primary btn-save-term">💾 Lưu nhiệm kỳ</button>
            <button class="btn btn-danger btn-delete-term">🗑️ Xóa cả nhiệm kỳ</button>
          </div>
        </div>
      `;

      /* --------- Khối "Quản lý cấp bậc" RIÊNG của nhiệm kỳ này --------- */
      const levelsListHtml =
        termLevels.length === 0
          ? '<p class="loading-text" style="margin-bottom:10px;">Chưa có cấp bậc nào cho nhiệm kỳ này. Mọi chỉ huy sẽ hiện cùng 1 cỡ mặc định.</p>'
          : termLevels
              .map((lv, lvIndex) => {
                const avatarPx = getEffectiveAvatarPx(lv, lvIndex);
                const sizeValue = lv.card_size || "auto";
                return `
                <div class="admin-level-row" data-level-id="${lv.id}">
                  <div class="admin-level-order-controls">
                    <button type="button" class="btn-level-up" ${lvIndex === 0 ? "disabled" : ""} title="Lên trước">▲</button>
                    <button type="button" class="btn-level-down" ${
                      lvIndex === termLevels.length - 1 ? "disabled" : ""
                    } title="Xuống sau">▼</button>
                  </div>
                  <input type="text" class="input-level-name" value="${escapeHtml(lv.name)}" />
                  <select class="input-level-size" title="Kích thước thẻ ở trang công khai">
                    <option value="auto" ${sizeValue === "auto" ? "selected" : ""}>Tự động (theo thứ tự)</option>
                    <option value="large" ${sizeValue === "large" ? "selected" : ""}>🥇 To nhất</option>
                    <option value="medium" ${sizeValue === "medium" ? "selected" : ""}>🥈 Vừa</option>
                    <option value="small" ${sizeValue === "small" ? "selected" : ""}>🥉 Nhỏ</option>
                  </select>
                  ${tierBadgeHTML(avatarPx)}
                  <button type="button" class="btn btn-primary btn-save-level">💾</button>
                  <button type="button" class="btn btn-danger btn-delete-level">🗑️</button>
                </div>
              `;
              })
              .join("");

      const addLevelFormHtml = `
        <form class="admin-level-add-form add-level-to-term-form" data-term-id="${t.id}">
          <input type="text" class="input-new-level-name" placeholder='VD: "Ban chỉ huy", "Trưởng ban"...' required />
          <button type="submit" class="btn btn-primary">+ Thêm cấp</button>
        </form>
      `;

      /* --------- Form thêm nhanh 1 chỉ huy vào nhiệm kỳ này --------- */
      const levelOptionsHtml =
        '<option value="">-- Chưa phân cấp --</option>' +
        termLevels.map((lv) => `<option value="${lv.id}">${escapeHtml(lv.name)}</option>`).join("");

      const addMemberFormHtml = `
        <form
          class="admin-form add-member-to-term-form"
          data-term-id="${t.id}"
          hidden
          style="padding:14px; margin-bottom:16px; border:1px dashed var(--color-border); border-radius:var(--radius); background-color:var(--color-bg-alt);"
        >
          <label>Tên chỉ huy <span class="required">*</span></label>
          <input type="text" class="input-new-member-name" required />

          <label>Chức vụ</label>
          <input type="text" class="input-new-member-position" placeholder="VD: Đội trưởng, Đội phó, Ủy viên..." />

          <label>Cấp bậc</label>
          <select class="input-new-member-level">${levelOptionsHtml}</select>

          <label>Giới thiệu ngắn</label>
          <textarea class="input-new-member-bio" rows="2"></textarea>

          <label>Ghi chú thêm</label>
          <input type="text" class="input-new-member-note" />

          <label>Ảnh đại diện (không bắt buộc)</label>
          <input type="file" class="input-new-member-image" accept="image/*" />

          <div class="admin-message add-member-message" hidden></div>

          <div style="display:flex; gap:10px; margin-top:16px;">
            <button type="submit" class="btn btn-primary btn-save-new-member">+ Thêm vào nhiệm kỳ này</button>
            <button
              type="button"
              class="btn btn-cancel-new-member"
              style="background:none; border:1px solid var(--color-border); color:var(--color-text-muted); cursor:pointer;"
            >Hủy</button>
          </div>
        </form>
      `;

      /* --------- Danh sách chỉ huy, GOM NHÓM theo cấp bậc --------- */
      const memberGroups = termLevels.map((lv) => ({
        level: lv,
        items: termMembers.filter((m) => m.level_id === lv.id),
      }));
      const unassignedMembers = termMembers.filter(
        (m) => !m.level_id || !termLevels.some((lv) => lv.id === m.level_id)
      );
      if (unassignedMembers.length > 0) {
        memberGroups.push({ level: null, items: unassignedMembers });
      }

      const membersHtml =
        termMembers.length === 0
          ? '<p class="loading-text">Chưa có chỉ huy nào trong nhiệm kỳ này.</p>'
          : memberGroups
              .filter((g) => g.items.length > 0)
              .map((g) => {
                const groupTitle = g.level ? escapeHtml(g.level.name) : "Chưa phân cấp";
                const rowsHtml = g.items
                  .map(
                    (m, memberIndex) => `
                  <div class="admin-position-row" data-member-id="${m.id}">
                    <img
                      src="${m.image_url || LEADERSHIP_NO_IMAGE_PLACEHOLDER}"
                      alt="${escapeHtml(m.leader_name)}"
                      class="admin-position-thumb"
                    />

                    <div class="admin-position-fields">
                      <label>Tên chỉ huy</label>
                      <input type="text" class="input-member-name" value="${escapeHtml(m.leader_name)}" />

                      <label>Chức vụ</label>
                      <input type="text" class="input-member-position" value="${escapeHtml(m.position || "")}" placeholder="VD: Đội trưởng" />

                      <label>Cấp bậc</label>
                      <select class="input-member-level" data-current-level-id="${m.level_id || ""}">${levelOptionsHtml}</select>

                      <label>Giới thiệu ngắn</label>
                      <textarea class="input-member-bio" rows="2">${escapeHtml(m.bio || "")}</textarea>

                      <label>Ghi chú thêm</label>
                      <input type="text" class="input-member-note" value="${escapeHtml(m.note || "")}" />

                      <label>Đổi ảnh (không bắt buộc)</label>
                      <input type="file" class="input-member-image" accept="image/*" />
                    </div>

                    <div class="admin-position-actions">
                      <div class="admin-level-order-controls" style="margin-bottom:8px;">
                        <button type="button" class="btn-member-up" ${memberIndex === 0 ? "disabled" : ""} title="Lên trước">▲</button>
                        <button type="button" class="btn-member-down" ${
                          memberIndex === g.items.length - 1 ? "disabled" : ""
                        } title="Xuống sau">▼</button>
                      </div>
                      <button class="btn btn-primary btn-save-member">💾 Lưu</button>
                      <button class="btn btn-danger btn-delete-member">🗑️ Xóa</button>
                    </div>
                  </div>
                `
                  )
                  .join("");

                return `
                  <div class="admin-level-group" data-member-group>
                    <h3 class="admin-level-group-title">${groupTitle}</h3>
                    <div class="admin-level-group-items">${rowsHtml}</div>
                  </div>
                `;
              })
              .join("");

      return `
        <div class="leadership-admin-group">
          <div class="leadership-admin-group-header-row" style="display:flex; align-items:center; gap:10px;">
            <button
              type="button"
              class="leadership-admin-group-header"
              aria-expanded="false"
              data-term-id="${t.id}"
              style="flex:1;"
            >
              <span class="leadership-admin-group-title">${escapeHtml(heading)}</span>
              <span class="leadership-admin-group-count">${countLabel}</span>
              <span class="leadership-admin-group-arrow">▸</span>
            </button>
            <button
              type="button"
              class="btn btn-primary btn-add-member-to-term"
              data-term-id="${t.id}"
              style="white-space:nowrap; border:none; cursor:pointer; flex-shrink:0;"
            >+ Thêm chỉ huy</button>
          </div>
          <div class="leadership-admin-group-body" hidden>
            <h4 style="margin:12px 0 8px; font-size:0.9rem; color:var(--color-text-muted);">Thông tin nhiệm kỳ</h4>
            ${termEditHtml}

            <h4 style="margin:20px 0 8px; font-size:0.9rem; color:var(--color-text-muted);">Cấp bậc trong nhiệm kỳ này</h4>
            <p class="admin-hint" style="margin-bottom:10px;">💡 Cấp CÀNG TO (🥇) hiện ở trang công khai với thẻ CÀNG LỚN, viền vàng nổi bật — kéo ▲▼ để đổi thứ tự cấp.</p>
            <div class="admin-levels-list" style="margin-bottom:12px;">${levelsListHtml}</div>
            ${addLevelFormHtml}

            <h4 style="margin:24px 0 8px; font-size:0.9rem; color:var(--color-text-muted);">Chỉ huy trong nhiệm kỳ</h4>
            ${addMemberFormHtml}
            ${membersHtml}
          </div>
        </div>
      `;
    })
    .join("");

  attachGroupToggleEvents();
  attachTermRowEvents();
  attachLevelEvents();
  attachAddMemberToTermEvents();
  attachMemberRowEvents();
}

/* --------- Bấm vào tiêu đề 1 nhiệm kỳ → mở/đóng khung bên trong --------- */
function attachGroupToggleEvents() {
  document.querySelectorAll(".leadership-admin-group-header").forEach((headerBtn) => {
    headerBtn.addEventListener("click", () => {
      const body = headerBtn.closest(".leadership-admin-group").querySelector(".leadership-admin-group-body");
      if (!body) return;

      const isCurrentlyOpen = !body.hidden;
      body.hidden = isCurrentlyOpen;
      headerBtn.setAttribute("aria-expanded", String(!isCurrentlyOpen));
      headerBtn.classList.toggle("is-open", !isCurrentlyOpen);
    });
  });
}

function escapeHtml(text) {
  return String(text).replace(/"/g, "&quot;").replace(/</g, "&lt;");
}

/* =======================================================
   TẠO MỚI (Create) — THÊM 1 NHIỆM KỲ MỚI
   ======================================================= */
function initAddTermForm() {
  const form = document.getElementById("addTermForm");
  const messageEl = document.getElementById("addTermMessage");
  const addBtn = document.getElementById("addTermBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const term_name = document.getElementById("newTermName").value.trim();
    const period = document.getElementById("newPeriod").value.trim();
    const rawImageFile = document.getElementById("newTermImage").files[0];

    if (!term_name) return;

    let imageFile = undefined;
    if (rawImageFile) {
      const picked = await openImagePicker([rawImageFile]);
      if (picked.length === 0) return;
      imageFile = picked[0];
    }

    addBtn.disabled = true;
    addBtn.textContent = "Đang thêm...";
    messageEl.hidden = true;

    let imageUrl = null;
    if (imageFile) {
      const { url, error: uploadError } = await uploadLeadershipImage(imageFile, "terms");
      if (uploadError) {
        showMessage(messageEl, `Lỗi upload ảnh: ${uploadError}`, true);
        addBtn.disabled = false;
        addBtn.textContent = "+ Thêm nhiệm kỳ";
        return;
      }
      imageUrl = url;
    }

    const maxOrder = allTerms.reduce((max, t) => Math.max(max, t.display_order || 0), 0);

    const { error: insertError } = await supabaseClient.from("leadership_terms").insert({
      term_name,
      period,
      image_url: imageUrl,
      display_order: maxOrder + 1,
    });

    addBtn.disabled = false;
    addBtn.textContent = "+ Thêm nhiệm kỳ";

    if (insertError) {
      showMessage(messageEl, `Lỗi lưu dữ liệu: ${insertError.message}`, true);
      return;
    }

    showMessage(messageEl, "✅ Đã thêm nhiệm kỳ mới!", false);
    form.reset();
    loadLeadershipAdmin();
  });
}

/* =======================================================
   CẬP NHẬT (Update) + XÓA (Delete) + SẮP XẾP — NHIỆM KỲ
   ======================================================= */
function attachTermRowEvents() {
  document.querySelectorAll(".btn-save-term").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const row = btn.closest(".admin-position-row");
      const id = row.dataset.termId;

      const term_name = row.querySelector(".input-term-name").value.trim();
      const period = row.querySelector(".input-term-period").value.trim();
      const rawImageFile = row.querySelector(".input-term-image").files[0];

      if (!term_name) {
        alert("Tên nhiệm kỳ không được để trống.");
        return;
      }

      let imageFile = undefined;
      if (rawImageFile) {
        const picked = await openImagePicker([rawImageFile]);
        if (picked.length === 0) return;
        imageFile = picked[0];
      }

      btn.disabled = true;
      btn.textContent = "Đang lưu...";

      const updates = { term_name, period };

      if (imageFile) {
        const { url, error: uploadError } = await uploadLeadershipImage(imageFile, "terms");
        if (uploadError) {
          alert("Lỗi upload ảnh: " + uploadError);
          btn.disabled = false;
          btn.textContent = "💾 Lưu nhiệm kỳ";
          return;
        }
        updates.image_url = url;
      }

      const { error } = await supabaseClient.from("leadership_terms").update(updates).eq("id", id);

      btn.disabled = false;
      btn.textContent = "💾 Lưu nhiệm kỳ";

      if (error) {
        alert("Lỗi cập nhật: " + error.message);
        return;
      }

      loadLeadershipAdmin();
    });
  });

  document.querySelectorAll(".btn-delete-term").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const row = btn.closest(".admin-position-row");
      const id = row.dataset.termId;
      const name = row.querySelector(".input-term-name").value;

      const confirmed = confirm(
        `Xóa nhiệm kỳ "${name}"? TOÀN BỘ cấp bậc và chỉ huy đang thuộc nhiệm kỳ này cũng sẽ bị xóa theo. Hành động này KHÔNG thể hoàn tác.`
      );
      if (!confirmed) return;

      const { error } = await supabaseClient.from("leadership_terms").delete().eq("id", id);

      if (error) {
        alert("Lỗi xóa: " + error.message);
        return;
      }

      loadLeadershipAdmin();
    });
  });

  document.querySelectorAll(".btn-term-up").forEach((btn, index) => {
    btn.addEventListener("click", () => swapTermOrder(index, index - 1));
  });
  document.querySelectorAll(".btn-term-down").forEach((btn, index) => {
    btn.addEventListener("click", () => swapTermOrder(index, index + 1));
  });
}

async function swapTermOrder(indexA, indexB) {
  if (indexB < 0 || indexB >= allTerms.length) return;

  const termA = allTerms[indexA];
  const termB = allTerms[indexB];

  const { error } = await supabaseClient
    .from("leadership_terms")
    .update({ display_order: termB.display_order })
    .eq("id", termA.id);
  if (error) {
    alert("Lỗi đổi thứ tự: " + error.message);
    return;
  }

  await supabaseClient.from("leadership_terms").update({ display_order: termA.display_order }).eq("id", termB.id);

  loadLeadershipAdmin();
}

/* =======================================================
   CẤP BẬC (leadership_levels) — CRUD + sắp xếp, RIÊNG theo
   từng nhiệm kỳ (mọi thao tác đều lọc theo đúng term_id)
   ======================================================= */
function attachLevelEvents() {
  // Thêm cấp bậc mới vào ĐÚNG nhiệm kỳ (term_id lấy từ data-term-id
  // của chính form, không cho gõ tay để tránh gán nhầm nhiệm kỳ)
  document.querySelectorAll(".add-level-to-term-form").forEach((form) => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const term_id = Number(form.dataset.termId);
      const nameInput = form.querySelector(".input-new-level-name");
      const name = nameInput.value.trim();
      if (!name) return;

      const sameTermLevels = allLevels.filter((lv) => lv.term_id === term_id);
      const maxOrder = sameTermLevels.reduce((max, lv) => Math.max(max, lv.level_order || 0), 0);

      const { error } = await supabaseClient.from("leadership_levels").insert({
        term_id,
        name,
        level_order: maxOrder + 1,
      });

      if (error) {
        alert("Lỗi thêm cấp bậc: " + error.message);
        return;
      }

      loadLeadershipAdmin();
    });
  });

  // Lưu tên + cỡ thẻ của 1 cấp bậc
  document.querySelectorAll(".btn-save-level").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const row = btn.closest(".admin-level-row");
      const id = row.dataset.levelId;
      const name = row.querySelector(".input-level-name").value.trim();
      const cardSize = row.querySelector(".input-level-size").value;
      if (!name) return;

      btn.disabled = true;
      const { error } = await supabaseClient
        .from("leadership_levels")
        .update({ name, card_size: cardSize })
        .eq("id", id);
      btn.disabled = false;

      if (error) {
        alert("Lỗi lưu cấp bậc: " + error.message);
        return;
      }
      loadLeadershipAdmin();
    });
  });

  // Xóa 1 cấp bậc — chỉ huy đang thuộc cấp này sẽ chuyển về "Chưa
  // phân cấp" (không bị xóa theo, giống hệt cơ chế org_levels)
  document.querySelectorAll(".btn-delete-level").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const row = btn.closest(".admin-level-row");
      const id = row.dataset.levelId;
      const name = row.querySelector(".input-level-name").value;

      const confirmed = confirm(
        `Xóa cấp bậc "${name}"? Các chỉ huy đang thuộc cấp này sẽ chuyển về "Chưa phân cấp" (không bị xóa).`
      );
      if (!confirmed) return;

      const { error } = await supabaseClient.from("leadership_levels").delete().eq("id", id);
      if (error) {
        alert("Lỗi xóa cấp bậc: " + error.message);
        return;
      }
      loadLeadershipAdmin();
    });
  });

  // ▲ / ▼ — đổi thứ tự GIỮA CÁC CẤP BẬC CÙNG 1 NHIỆM KỲ (không ảnh
  // hưởng cấp bậc của nhiệm kỳ khác)
  document.querySelectorAll(".admin-levels-list").forEach((listEl) => {
    const rows = Array.from(listEl.querySelectorAll(".admin-level-row"));
    rows.forEach((row, index) => {
      const upBtn = row.querySelector(".btn-level-up");
      const downBtn = row.querySelector(".btn-level-down");
      upBtn.addEventListener("click", () => swapLevelOrder(rows, index, index - 1));
      downBtn.addEventListener("click", () => swapLevelOrder(rows, index, index + 1));
    });
  });
}

async function swapLevelOrder(rows, indexA, indexB) {
  if (indexB < 0 || indexB >= rows.length) return;

  const idA = rows[indexA].dataset.levelId;
  const idB = rows[indexB].dataset.levelId;

  const levelA = allLevels.find((lv) => String(lv.id) === String(idA));
  const levelB = allLevels.find((lv) => String(lv.id) === String(idB));
  if (!levelA || !levelB) return;

  const { error } = await supabaseClient
    .from("leadership_levels")
    .update({ level_order: levelB.level_order })
    .eq("id", levelA.id);
  if (error) {
    alert("Lỗi đổi thứ tự cấp bậc: " + error.message);
    return;
  }

  await supabaseClient.from("leadership_levels").update({ level_order: levelA.level_order }).eq("id", levelB.id);

  loadLeadershipAdmin();
}

/* =======================================================
   THÊM 1 CHỈ HUY VÀO 1 NHIỆM KỲ ĐÃ CÓ SẴN
   ======================================================= */
function attachAddMemberToTermEvents() {
  document.querySelectorAll(".btn-add-member-to-term").forEach((btn) => {
    btn.addEventListener("click", () => {
      const group = btn.closest(".leadership-admin-group");
      const headerBtn = group.querySelector(".leadership-admin-group-header");
      const body = group.querySelector(".leadership-admin-group-body");
      const form = group.querySelector(".add-member-to-term-form");
      if (!body || !form) return;

      body.hidden = false;
      headerBtn.setAttribute("aria-expanded", "true");
      headerBtn.classList.add("is-open");

      form.hidden = !form.hidden;
      if (!form.hidden) {
        form.querySelector(".input-new-member-name").focus();
      }
    });
  });

  document.querySelectorAll(".btn-cancel-new-member").forEach((btn) => {
    btn.addEventListener("click", () => {
      const form = btn.closest(".add-member-to-term-form");
      form.reset();
      form.hidden = true;
    });
  });

  document.querySelectorAll(".add-member-to-term-form").forEach((form) => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const term_id = Number(form.dataset.termId);
      const leader_name = form.querySelector(".input-new-member-name").value.trim();
      const position = form.querySelector(".input-new-member-position").value.trim();
      const levelSelect = form.querySelector(".input-new-member-level");
      const level_id = levelSelect.value ? Number(levelSelect.value) : null;
      const bio = form.querySelector(".input-new-member-bio").value.trim();
      const note = form.querySelector(".input-new-member-note").value.trim();
      const rawImageFile = form.querySelector(".input-new-member-image").files[0];
      const messageEl = form.querySelector(".add-member-message");
      const submitBtn = form.querySelector(".btn-save-new-member");

      if (!leader_name) return;

      let imageFile = undefined;
      if (rawImageFile) {
        const picked = await openImagePicker([rawImageFile]);
        if (picked.length === 0) return;
        imageFile = picked[0];
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Đang thêm...";
      if (messageEl) messageEl.hidden = true;

      let imageUrl = null;
      if (imageFile) {
        const { url, error: uploadError } = await uploadLeadershipImage(imageFile, "members");
        if (uploadError) {
          if (messageEl) showMessage(messageEl, `Lỗi upload ảnh: ${uploadError}`, true);
          submitBtn.disabled = false;
          submitBtn.textContent = "+ Thêm vào nhiệm kỳ này";
          return;
        }
        imageUrl = url;
      }

      const sameTermMembers = allMembers.filter((m) => m.term_id === term_id);
      const maxOrder = sameTermMembers.reduce((max, m) => Math.max(max, m.display_order || 0), 0);

      const { error: insertError } = await supabaseClient.from("leadership_members").insert({
        term_id,
        level_id,
        leader_name,
        position,
        bio,
        note,
        image_url: imageUrl,
        display_order: maxOrder + 1,
      });

      submitBtn.disabled = false;
      submitBtn.textContent = "+ Thêm vào nhiệm kỳ này";

      if (insertError) {
        if (messageEl) showMessage(messageEl, `Lỗi lưu dữ liệu: ${insertError.message}`, true);
        return;
      }

      loadLeadershipAdmin();
    });
  });
}

/* =======================================================
   CẬP NHẬT (Update) + XÓA (Delete) + SẮP XẾP — CHỈ HUY
   ======================================================= */
function attachMemberRowEvents() {
  document.querySelectorAll(".btn-save-member").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const row = btn.closest(".admin-position-row");
      const id = row.dataset.memberId;

      const leader_name = row.querySelector(".input-member-name").value.trim();
      const position = row.querySelector(".input-member-position").value.trim();
      const levelSelect = row.querySelector(".input-member-level");
      const level_id = levelSelect.value ? Number(levelSelect.value) : null;
      const bio = row.querySelector(".input-member-bio").value.trim();
      const note = row.querySelector(".input-member-note").value.trim();
      const rawImageFile = row.querySelector(".input-member-image").files[0];

      if (!leader_name) {
        alert("Tên chỉ huy không được để trống.");
        return;
      }

      let imageFile = undefined;
      if (rawImageFile) {
        const picked = await openImagePicker([rawImageFile]);
        if (picked.length === 0) return;
        imageFile = picked[0];
      }

      btn.disabled = true;
      btn.textContent = "Đang lưu...";

      const updates = { leader_name, position, level_id, bio, note };

      if (imageFile) {
        const { url, error: uploadError } = await uploadLeadershipImage(imageFile, "members");
        if (uploadError) {
          alert("Lỗi upload ảnh: " + uploadError);
          btn.disabled = false;
          btn.textContent = "💾 Lưu";
          return;
        }
        updates.image_url = url;
      }

      const { error } = await supabaseClient.from("leadership_members").update(updates).eq("id", id);

      btn.disabled = false;
      btn.textContent = "💾 Lưu";

      if (error) {
        alert("Lỗi cập nhật: " + error.message);
        return;
      }

      loadLeadershipAdmin();
    });
  });

  document.querySelectorAll(".btn-delete-member").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const row = btn.closest(".admin-position-row");
      const id = row.dataset.memberId;
      const name = row.querySelector(".input-member-name").value;

      const confirmed = confirm(`Xóa chỉ huy "${name}"?`);
      if (!confirmed) return;

      const { error } = await supabaseClient.from("leadership_members").delete().eq("id", id);

      if (error) {
        alert("Lỗi xóa: " + error.message);
        return;
      }

      loadLeadershipAdmin();
    });
  });

  // ▲ / ▼ — đổi thứ tự GIỮA CÁC CHỈ HUY CÙNG 1 NHÓM CẤP BẬC (trong
  // CÙNG 1 nhiệm kỳ), không ảnh hưởng nhóm/nhiệm kỳ khác
  document.querySelectorAll("[data-member-group]").forEach((groupEl) => {
    const rows = Array.from(groupEl.querySelectorAll(".admin-position-row"));
    rows.forEach((row, index) => {
      const upBtn = row.querySelector(".btn-member-up");
      const downBtn = row.querySelector(".btn-member-down");
      upBtn.addEventListener("click", () => swapMemberOrder(rows, index, index - 1));
      downBtn.addEventListener("click", () => swapMemberOrder(rows, index, index + 1));
    });
  });
}

async function swapMemberOrder(rows, indexA, indexB) {
  if (indexB < 0 || indexB >= rows.length) return;

  const idA = rows[indexA].dataset.memberId;
  const idB = rows[indexB].dataset.memberId;

  const memberA = allMembers.find((m) => String(m.id) === String(idA));
  const memberB = allMembers.find((m) => String(m.id) === String(idB));
  if (!memberA || !memberB) return;

  const { error } = await supabaseClient
    .from("leadership_members")
    .update({ display_order: memberB.display_order })
    .eq("id", memberA.id);
  if (error) {
    alert("Lỗi đổi thứ tự: " + error.message);
    return;
  }

  await supabaseClient
    .from("leadership_members")
    .update({ display_order: memberA.display_order })
    .eq("id", memberB.id);

  loadLeadershipAdmin();
}

/* =======================================================
   HÀM DÙNG CHUNG: Upload ảnh lên Supabase Storage
   prefix: "terms" (ảnh nhiệm kỳ) hoặc "members" (ảnh chỉ huy)
   ======================================================= */
async function uploadLeadershipImage(file, prefix) {
  const cleanFileName = sanitizeFileName(file.name);
  const filePath = `${prefix}/${Date.now()}_${cleanFileName}`;

  const { error: uploadError } = await supabaseClient.storage.from("leadership.images").upload(filePath, file);

  if (uploadError) {
    return { url: null, error: uploadError.message };
  }

  const { data } = supabaseClient.storage.from("leadership.images").getPublicUrl(filePath);
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