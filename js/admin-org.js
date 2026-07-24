/* =======================================================
   FILE: admin-org.js
   MỤC ĐÍCH: Toàn bộ logic CRUD (Create-Read-Update-Delete)
   cho bảng "org_positions" (chức vụ) VÀ "org_levels" (cấp bậc)
   trong Supabase — dùng cho trang quản lý Cơ cấu tổ chức.

   Ý TƯỞNG: Mỗi CHỨC VỤ (org_positions) thuộc về 1 CẤP BẬC
   (org_levels, VD: "Ban chỉ huy", "Ủy viên"...). Danh sách được
   GOM NHÓM theo cấp bậc để dễ quản lý khi có nhiều chức vụ.
   - Thứ tự các CẤP BẬC: cột level_order (đổi bằng nút ▲▼ ở khung
     "Quản lý cấp bậc").
   - Thứ tự CÁC CHỨC VỤ trong CÙNG 1 cấp: cột display_order (đổi
     bằng nút ▲▼ ngay trên từng chức vụ).

   Cần: supabase-config.js (biến supabaseClient) nạp trước.
   Tên bucket lưu ảnh: "org.images" (đã tạo sẵn trên Supabase).
   ======================================================= */

document.addEventListener("DOMContentLoaded", () => {
  loadLevels();
  loadPositions();
  initAddLevelForm();
  initAddForm();
});

// Biến ghi nhớ danh sách cấp bậc VỪA TẢI VỀ, dùng để: (1) gom nhóm
// chức vụ theo cấp, (2) đổ vào các ô <select> chọn cấp bậc
let allOrgLevels = [];

/* =======================================================
   PHẦN 1: QUẢN LÝ CẤP BẬC (org_levels)
   ======================================================= */
async function loadLevels() {
  const container = document.getElementById("levelsList");

  const { data, error } = await supabaseClient
    .from("org_levels")
    .select("*")
    .order("level_order", { ascending: true });

  if (error) {
    container.innerHTML = `<p class="admin-message admin-message-error">Lỗi tải danh sách cấp bậc: ${error.message}</p>`;
    return;
  }

  allOrgLevels = data || [];
  renderLevelsList();
  fillLevelSelects(); // Đổ danh sách cấp bậc vào các ô <select> (form thêm mới + từng dòng chức vụ)
  renderPositionsList(allLoadedPositions); // Vẽ lại danh sách chức vụ để cập nhật tên nhóm cấp bậc mới nhất
}

// Tính NHÃN XEM TRƯỚC kích thước thẻ cho 1 cấp bậc, dùng CHUNG 1 công
// thức với trang công khai (co-cau-to-chuc.js -> getLevelSizeInfo) để
// admin luôn thấy đúng những gì khách sẽ thấy — kể cả khi có RẤT NHIỀU
// cấp bậc (không bị "kẹt cứng" ở 3 mức như phiên bản trước)
//
// GHI CHÚ CẬP NHẬT: sàn (số đầu Math.max) tăng từ 70 lên 84, đồng
// bộ với co-cau-to-chuc.js; các mốc nhãn (156/125/105/90) cũng được
// giãn lại tương ứng để phân loại "To nhất/Lớn/Vừa/Nhỏ" vẫn hợp lý.
function getEffectiveAvatarPx(level, index) {
  const virtualIndexMap = { large: 0, medium: 2, small: 5 };
  const i =
    level && level.card_size && virtualIndexMap[level.card_size] !== undefined
      ? virtualIndexMap[level.card_size]
      : index;
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

function renderLevelsList() {
  const container = document.getElementById("levelsList");

  if (allOrgLevels.length === 0) {
    container.innerHTML =
      '<p class="loading-text">Chưa có cấp bậc nào. Thêm ở ô phía trên (VD: "Ban chỉ huy").</p>';
    return;
  }

  container.innerHTML = allOrgLevels
    .map((lv, index) => {
      const avatarPx = getEffectiveAvatarPx(lv, index);
      const sizeValue = lv.card_size || "auto";

      return `
      <div class="admin-level-row" data-id="${lv.id}">
        <div class="admin-level-order-controls">
          <button type="button" class="btn-level-up" ${index === 0 ? "disabled" : ""} title="Đưa cấp này lên cao hơn">▲</button>
          <button type="button" class="btn-level-down" ${
            index === allOrgLevels.length - 1 ? "disabled" : ""
          } title="Đưa cấp này xuống thấp hơn">▼</button>
        </div>
        <input type="text" class="input-level-name" value="${escapeHtml(lv.name)}" />

        <select class="input-level-size" title="Kích thước thẻ ở trang công khai">
          <option value="auto" ${sizeValue === "auto" ? "selected" : ""}>Tự động (theo thứ tự)</option>
          <option value="large" ${sizeValue === "large" ? "selected" : ""}>🥇 To nhất</option>
          <option value="medium" ${sizeValue === "medium" ? "selected" : ""}>🥈 Vừa</option>
          <option value="small" ${sizeValue === "small" ? "selected" : ""}>🥉 Nhỏ</option>
        </select>

        ${tierBadgeHTML(avatarPx)}

        <button type="button" class="btn btn-primary btn-save-level">💾 Lưu</button>
        <button type="button" class="btn btn-danger btn-delete-level">🗑️ Xóa</button>
      </div>
    `;
    })
    .join("");

  attachLevelRowEvents();
}

function initAddLevelForm() {
  const form = document.getElementById("addLevelForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nameInput = document.getElementById("newLevelName");
    const name = nameInput.value.trim();
    if (!name) return;

    // Cấp mới luôn xếp XUỐNG CUỐI danh sách cấp bậc hiện có (level_order
    // lớn nhất + 1); admin có thể dùng ▲▼ để đổi vị trí sau
    const maxOrder = allOrgLevels.reduce((max, lv) => Math.max(max, lv.level_order || 0), 0);

    const { error } = await supabaseClient.from("org_levels").insert({
      name,
      level_order: maxOrder + 1,
    });

    if (error) {
      alert("Lỗi thêm cấp bậc: " + error.message);
      return;
    }

    nameInput.value = "";
    loadLevels();
  });
}

function attachLevelRowEvents() {
  // ▲ / ▼ — đổi thứ tự cấp bậc bằng cách HOÁN ĐỔI level_order với cấp liền kề
  document.querySelectorAll(".btn-level-up").forEach((btn, index) => {
    btn.addEventListener("click", () => swapLevelOrder(index, index - 1));
  });
  document.querySelectorAll(".btn-level-down").forEach((btn, index) => {
    btn.addEventListener("click", () => swapLevelOrder(index, index + 1));
  });

  // "Lưu" — đổi tên cấp bậc + kích thước thẻ (auto/large/medium/small)
  document.querySelectorAll(".btn-save-level").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const row = btn.closest(".admin-level-row");
      const id = row.dataset.id;
      const name = row.querySelector(".input-level-name").value.trim();
      const cardSize = row.querySelector(".input-level-size").value; // "auto" | "large" | "medium" | "small"
      if (!name) return;

      btn.disabled = true;
      const { error } = await supabaseClient
        .from("org_levels")
        .update({ name, card_size: cardSize })
        .eq("id", id);
      btn.disabled = false;

      if (error) {
        alert("Lỗi lưu cấp bậc: " + error.message);
        return;
      }
      loadLevels();
    });
  });

  // "Xóa" — xóa cấp bậc (các chức vụ đang thuộc cấp này sẽ chuyển về "Chưa phân cấp")
  document.querySelectorAll(".btn-delete-level").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const row = btn.closest(".admin-level-row");
      const id = row.dataset.id;
      const name = row.querySelector(".input-level-name").value;

      const confirmed = confirm(
        `Xóa cấp bậc "${name}"? Các chức vụ đang thuộc cấp này sẽ chuyển về mục "Chưa phân cấp" (không bị xóa).`
      );
      if (!confirmed) return;

      const { error } = await supabaseClient.from("org_levels").delete().eq("id", id);
      if (error) {
        alert("Lỗi xóa cấp bậc: " + error.message);
        return;
      }
      loadLevels();
      loadPositions();
    });
  });
}

// Hoán đổi level_order giữa 2 cấp bậc ở vị trí indexA và indexB trong
// mảng allOrgLevels (dùng chung cho cả nút ▲ và ▼)
async function swapLevelOrder(indexA, indexB) {
  if (indexB < 0 || indexB >= allOrgLevels.length) return;

  const levelA = allOrgLevels[indexA];
  const levelB = allOrgLevels[indexB];

  const { error } = await supabaseClient
    .from("org_levels")
    .update({ level_order: levelB.level_order })
    .eq("id", levelA.id);
  if (error) {
    alert("Lỗi đổi thứ tự cấp bậc: " + error.message);
    return;
  }

  await supabaseClient.from("org_levels").update({ level_order: levelA.level_order }).eq("id", levelB.id);

  loadLevels();
}

// Đổ danh sách cấp bậc vào TẤT CẢ các ô <select class="input-level">
// đang có trên trang (form thêm mới + từng dòng chức vụ), giữ nguyên
// giá trị đang chọn nếu ô đó đã có sẵn (VD: đang sửa 1 chức vụ)
function fillLevelSelects() {
  document.querySelectorAll(".js-level-select").forEach((select) => {
    const currentValue = select.dataset.currentLevelId || select.value || "";
    select.innerHTML =
      '<option value="">-- Chưa phân cấp --</option>' +
      allOrgLevels.map((lv) => `<option value="${lv.id}">${escapeHtml(lv.name)}</option>`).join("");
    select.value = currentValue;
  });
}

/* =======================================================
   PHẦN 2: CHỨC VỤ (org_positions) — ĐỌC (Read)
   ======================================================= */

// Biến ghi nhớ danh sách chức vụ VỪA TẢI VỀ, để renderPositionsList()
// có thể gọi lại độc lập (VD: sau khi loadLevels() xong) mà không cần
// gọi lại Supabase
let allLoadedPositions = [];

async function loadPositions() {
  const container = document.getElementById("positionsList");

  const { data, error } = await supabaseClient
    .from("org_positions")
    .select("*")
    .order("display_order", { ascending: true });

  if (error) {
    container.innerHTML = `<p class="admin-message admin-message-error">Lỗi tải dữ liệu: ${error.message}</p>`;
    return;
  }

  allLoadedPositions = data || [];
  renderPositionsList(allLoadedPositions);
}

/* --------- Vẽ danh sách chức vụ, GOM NHÓM theo cấp bậc --------- */
function renderPositionsList(positions) {
  const container = document.getElementById("positionsList");

  if (!positions) return; // Chưa tải xong lần nào, chưa có gì để vẽ

  if (positions.length === 0) {
    container.innerHTML = '<p class="loading-text">Chưa có chức vụ nào. Thêm mới ở form phía trên.</p>';
    return;
  }

  // Gom chức vụ theo level_id. Nhóm "Chưa phân cấp" (level_id = null)
  // luôn hiển thị CUỐI CÙNG để không "chen" vào giữa các cấp đã sắp xếp
  const groups = allOrgLevels.map((lv) => ({
    level: lv,
    items: positions.filter((p) => p.level_id === lv.id),
  }));

  const unassigned = positions.filter((p) => !p.level_id || !allOrgLevels.some((lv) => lv.id === p.level_id));
  if (unassigned.length > 0) {
    groups.push({ level: null, items: unassigned });
  }

  container.innerHTML = groups
    .map((group) => {
      const groupTitle = group.level ? escapeHtml(group.level.name) : "Chưa phân cấp";
      if (group.items.length === 0) return ""; // Cấp bậc chưa có chức vụ nào -> không hiện nhóm rỗng

      return `
        <div class="admin-level-group">
          <h3 class="admin-level-group-title">${groupTitle}</h3>
          <div class="admin-level-group-items">
            ${group.items.map((p, index) => renderPositionRowHTML(p, index, group.items.length)).join("")}
          </div>
        </div>
      `;
    })
    .join("");

  fillLevelSelects();
  attachRowEvents();
}

function renderPositionRowHTML(p, indexInGroup, groupSize) {
  return `
      <div class="admin-position-row" data-id="${p.id}">
        <div class="admin-position-order-controls">
          <button type="button" class="btn-position-up" ${
            indexInGroup === 0 ? "disabled" : ""
          } title="Lên trước (trong cùng cấp bậc)">▲</button>
          <button type="button" class="btn-position-down" ${
            indexInGroup === groupSize - 1 ? "disabled" : ""
          } title="Xuống sau (trong cùng cấp bậc)">▼</button>
        </div>

        <img
          src="${p.image_url || "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MCIgaGVpZ2h0PSI4MCI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2Y1ZjZmNyIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTEiIGZpbGw9IiM2NjY2NjYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPk5vIEltYWdlPC90ZXh0Pjwvc3ZnPg=="}"
          alt="${p.title}"
          class="admin-position-thumb"
        />

        <div class="admin-position-fields">
          <label>Chức danh</label>
          <input type="text" class="input-title" value="${escapeHtml(p.title)}" />

          <label>Cấp bậc</label>
          <select class="input-level js-level-select" data-current-level-id="${p.level_id || ""}"></select>

          <label>Tên</label>
          <input type="text" class="input-name" value="${escapeHtml(p.name || "")}" />

          <label>Giới thiệu ngắn</label>
          <textarea class="input-bio" rows="2">${escapeHtml(p.bio || "")}</textarea>

          <label>Đổi ảnh (không bắt buộc)</label>
          <input type="file" class="input-image" accept="image/*" />
        </div>

        <div class="admin-position-actions">
          <button class="btn btn-primary btn-save-position">💾 Lưu</button>
          <button class="btn btn-danger btn-delete-position">🗑️ Xóa</button>
        </div>
      </div>
    `;
}

// Hàm nhỏ chống lỗi hiển thị nếu tên/chức danh chứa ký tự đặc biệt
// như dấu ngoặc kép — tránh làm hỏng cấu trúc HTML khi chèn vào value="..."
function escapeHtml(text) {
  return String(text).replace(/"/g, "&quot;");
}

/* =======================================================
   TẠO MỚI (Create) — xử lý form "Thêm chức vụ mới"
   ======================================================= */
function initAddForm() {
  const form = document.getElementById("addPositionForm");
  const messageEl = document.getElementById("addMessage");
  const addBtn = document.getElementById("addBtn");
  const levelSelect = document.getElementById("newLevel");
  levelSelect.classList.add("js-level-select"); // Để fillLevelSelects() tự đổ dữ liệu vào ô này

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("newTitle").value.trim();
    const levelId = levelSelect.value || null;
    const name = document.getElementById("newName").value.trim();
    const bio = document.getElementById("newBio").value.trim();
    const rawImageFile = document.getElementById("newImage").files[0]; // undefined nếu không chọn ảnh

    if (!title) return; // Chức danh là bắt buộc (đã có "required" ở HTML, đây là kiểm tra thêm cho chắc)

    // Nếu có chọn ảnh, mở khung SẮP XẾP + CẮT/CĂN CHỈNH ảnh (kéo khung
    // tự do, giống chỉnh avatar Facebook) trước khi thật sự upload
    let imageFile = undefined;
    if (rawImageFile) {
      const picked = await openImagePicker([rawImageFile]);
      if (picked.length === 0) return; // người dùng bấm Hủy ở bước căn chỉnh ảnh -> dừng lại, không đăng
      imageFile = picked[0];
    }

    addBtn.disabled = true;
    addBtn.textContent = "Đang thêm...";
    messageEl.hidden = true;

    // Nếu có chọn ảnh, upload ảnh TRƯỚC, lấy về URL công khai
    let imageUrl = null;
    if (imageFile) {
      const { url, error: uploadError } = await uploadPositionImage(imageFile);
      if (uploadError) {
        showMessage(messageEl, `Lỗi upload ảnh: ${uploadError}`, true);
        addBtn.disabled = false;
        addBtn.textContent = "+ Thêm chức vụ";
        return;
      }
      imageUrl = url;
    }

    // Chức vụ mới xếp CUỐI trong cấp bậc của nó (display_order lớn nhất
    // trong cùng level + 1), để không bị chen lên trước các chức vụ có sẵn
    const sameLevelItems = allLoadedPositions.filter((p) => (p.level_id || null) === levelId);
    const maxOrder = sameLevelItems.reduce((max, p) => Math.max(max, p.display_order || 0), 0);

    // Chèn 1 bản ghi mới vào bảng org_positions
    const { error: insertError } = await supabaseClient.from("org_positions").insert({
      title,
      level_id: levelId,
      name,
      bio,
      image_url: imageUrl,
      display_order: maxOrder + 1,
    });

    addBtn.disabled = false;
    addBtn.textContent = "+ Thêm chức vụ";

    if (insertError) {
      showMessage(messageEl, `Lỗi lưu dữ liệu: ${insertError.message}`, true);
      return;
    }

    showMessage(messageEl, "✅ Đã thêm chức vụ mới thành công!", false);
    form.reset(); // Xóa trắng form sau khi thêm thành công
    loadPositions(); // Tải lại danh sách để hiện chức vụ vừa thêm
  });
}

/* =======================================================
   CẬP NHẬT (Update) + XÓA (Delete) + SẮP XẾP — gắn sự kiện cho từng hàng
   ======================================================= */
function attachRowEvents() {
  // ▲ / ▼ — đổi thứ tự GIỮA CÁC CHỨC VỤ CÙNG 1 CẤP BẬC (hoán đổi display_order
  // với chức vụ liền kề TRONG CÙNG NHÓM, không ảnh hưởng nhóm khác)
  document.querySelectorAll(".admin-level-group-items").forEach((groupEl) => {
    const rows = Array.from(groupEl.querySelectorAll(".admin-position-row"));

    rows.forEach((row, index) => {
      const upBtn = row.querySelector(".btn-position-up");
      const downBtn = row.querySelector(".btn-position-down");

      upBtn.addEventListener("click", () => swapPositionOrder(rows, index, index - 1));
      downBtn.addEventListener("click", () => swapPositionOrder(rows, index, index + 1));
    });
  });

  // "Lưu" — cập nhật 1 chức vụ
  document.querySelectorAll(".btn-save-position").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const row = btn.closest(".admin-position-row");
      const id = row.dataset.id; // Đọc lại mã số bản ghi từ data-id

      const title = row.querySelector(".input-title").value.trim();
      const levelId = row.querySelector(".input-level").value || null;
      const name = row.querySelector(".input-name").value.trim();
      const bio = row.querySelector(".input-bio").value.trim();
      const rawImageFile = row.querySelector(".input-image").files[0];

      // Nếu có chọn ảnh mới, mở khung sắp xếp + cắt/căn chỉnh trước khi upload
      let imageFile = undefined;
      if (rawImageFile) {
        const picked = await openImagePicker([rawImageFile]);
        if (picked.length === 0) return; // hủy ở bước căn chỉnh ảnh -> không lưu
        imageFile = picked[0];
      }

      btn.disabled = true;
      btn.textContent = "Đang lưu...";

      // Bản ghi CẬP NHẬT — mặc định đổi title/level_id/name/bio,
      // chỉ thêm image_url vào nếu người dùng CÓ chọn ảnh mới
      const updates = { title, level_id: levelId, name, bio };

      if (imageFile) {
        const { url, error: uploadError } = await uploadPositionImage(imageFile);
        if (uploadError) {
          alert("Lỗi upload ảnh: " + uploadError);
          btn.disabled = false;
          btn.textContent = "💾 Lưu";
          return;
        }
        updates.image_url = url;
      }

      // .eq("id", id): chỉ áp dụng update cho ĐÚNG bản ghi có id này
      const { error } = await supabaseClient.from("org_positions").update(updates).eq("id", id);

      btn.disabled = false;
      btn.textContent = "💾 Lưu";

      if (error) {
        alert("Lỗi cập nhật: " + error.message);
        return;
      }

      loadPositions(); // Tải lại để thấy ảnh/tên/nhóm cấp bậc mới ngay lập tức
    });
  });

  // "Xóa" — xóa 1 chức vụ (có xác nhận trước để tránh bấm nhầm)
  document.querySelectorAll(".btn-delete-position").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const row = btn.closest(".admin-position-row");
      const id = row.dataset.id;
      const title = row.querySelector(".input-title").value;

      // confirm() hiện hộp thoại xác nhận của trình duyệt, trả về
      // true nếu người dùng bấm "OK", false nếu bấm "Cancel"
      const confirmed = confirm(`Bạn có chắc muốn xóa chức vụ "${title}"?`);
      if (!confirmed) return;

      const { error } = await supabaseClient.from("org_positions").delete().eq("id", id);

      if (error) {
        alert("Lỗi xóa: " + error.message);
        return;
      }

      loadPositions(); // Tải lại danh sách (bản ghi vừa xóa sẽ biến mất)
    });
  });
}

// Hoán đổi display_order giữa 2 chức vụ TRONG CÙNG 1 NHÓM CẤP BẬC
// (rows: mảng các .admin-position-row thuộc đúng 1 nhóm đang hiển thị)
async function swapPositionOrder(rows, indexA, indexB) {
  if (indexB < 0 || indexB >= rows.length) return;

  const idA = rows[indexA].dataset.id;
  const idB = rows[indexB].dataset.id;

  const posA = allLoadedPositions.find((p) => String(p.id) === String(idA));
  const posB = allLoadedPositions.find((p) => String(p.id) === String(idB));
  if (!posA || !posB) return;

  const { error } = await supabaseClient
    .from("org_positions")
    .update({ display_order: posB.display_order })
    .eq("id", posA.id);
  if (error) {
    alert("Lỗi đổi thứ tự: " + error.message);
    return;
  }

  await supabaseClient.from("org_positions").update({ display_order: posA.display_order }).eq("id", posB.id);

  loadPositions();
}

/* =======================================================
   HÀM DÙNG CHUNG: Upload ảnh lên Supabase Storage
   ======================================================= */
// Trả về { url, error } — nếu thành công: url có giá trị, error = null
// Nếu thất bại: url = null, error có thông báo lỗi
async function uploadPositionImage(file) {
  // Tên file gốc có thể chứa dấu tiếng Việt, khoảng trắng, ký tự đặc
  // biệt (VD: "Ảnh chụp màn hình 2025.png") — Supabase Storage KHÔNG
  // chấp nhận các ký tự này trong đường dẫn file, sẽ báo lỗi "Invalid key".
  // Ta cần "làm sạch" tên file trước khi upload:
  const cleanFileName = sanitizeFileName(file.name);

  // Tạo tên file DUY NHẤT bằng cách ghép timestamp (số mili-giây hiện tại)
  // vào trước tên đã làm sạch, tránh trường hợp 2 người cùng up file
  // trùng tên đè lên nhau
  const filePath = `positions/${Date.now()}_${cleanFileName}`;

  const { error: uploadError } = await supabaseClient.storage.from("org.images").upload(filePath, file);

  if (uploadError) {
    return { url: null, error: uploadError.message };
  }

  // getPublicUrl KHÔNG gọi mạng, chỉ tự GHÉP CHUỖI ra đường dẫn công khai
  // dựa trên cấu hình bucket (vì bucket đã đặt là "Public" lúc tạo)
  const { data } = supabaseClient.storage.from("org.images").getPublicUrl(filePath);

  return { url: data.publicUrl, error: null };
}

// Hàm làm sạch tên file: bỏ dấu tiếng Việt, đổi khoảng trắng thành
// dấu gạch dưới, chỉ giữ lại chữ cái/số/dấu chấm/gạch ngang/gạch dưới
function sanitizeFileName(fileName) {
  return fileName
    .normalize("NFD") // Tách dấu ra khỏi chữ cái (VD: "ả" → "a" + dấu hỏi riêng)
    .replace(/[\u0300-\u036f]/g, "") // Xóa các dấu vừa tách ra (dấu sắc, huyền, hỏi, ngã, nặng...)
    .replace(/đ/g, "d") // Xử lý riêng chữ "đ" vì .normalize() không tách được ký tự này
    .replace(/Đ/g, "D")
    .replace(/\s+/g, "_") // Đổi mọi khoảng trắng (kể cả nhiều dấu cách liên tiếp) thành "_"
    .replace(/[^a-zA-Z0-9._-]/g, ""); // Xóa hết ký tự KHÔNG PHẢI chữ/số/chấm/gạch ngang/gạch dưới
}

/* --------- Hàm nhỏ hiển thị thông báo thành công/lỗi --------- */
function showMessage(el, text, isError) {
  el.textContent = text;
  el.hidden = false;
  el.className = isError ? "admin-message admin-message-error" : "admin-message admin-message-success";
}