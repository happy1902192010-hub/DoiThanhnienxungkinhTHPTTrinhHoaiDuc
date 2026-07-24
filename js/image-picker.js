/* =======================================================
   FILE: image-picker.js
   MỤC ĐÍCH: Bộ chọn ảnh DÙNG CHUNG cho toàn bộ trang admin.

   Khi người dùng chọn 1 hoặc NHIỀU ảnh cùng lúc từ input file,
   thay vì tải lên ngay, gọi hàm openImagePicker(files) để hiện
   lên 1 khung xem trước với:
     - Đánh số thứ tự (1, 2, 3...) cho từng ảnh
     - Kéo-thả để đổi thứ tự đăng
     - Nút "✂️ Cắt ảnh" mở khung căn chỉnh TỰ DO (kéo góc để đổi
       kích thước, kéo giữa để di chuyển, thanh trượt để thu phóng)
       giống kiểu chỉnh ảnh đại diện trên Facebook

   CÁCH DÙNG (thay cho việc đọc input.files trực tiếp):

     const chosen = Array.from(inputEl.files);
     const files = await openImagePicker(chosen);
     // files: mảng File đã căn chỉnh xong + ĐÚNG THỨ TỰ người
     // dùng sắp xếp. Mảng RỖNG [] nếu người dùng bấm "Hủy".
     if (files.length === 0) return; // người dùng hủy, dừng lại

   Cần thư viện Cropper.js đã nhúng qua CDN (xem trong mỗi file
   .html trước thẻ <script src="js/image-picker.js">):
     cropper.min.css + cropper.min.js
   ======================================================= */

function openImagePicker(files) {
  return new Promise((resolve) => {
    if (!files || files.length === 0) {
      resolve([]);
      return;
    }

    // Mỗi phần tử: { id, file (File gốc hoặc đã cắt), url (blob URL xem trước) }
    const items = files.map((file, i) => ({
      id: `imgpick_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 7)}`,
      file,
      url: URL.createObjectURL(file),
    }));

    const overlay = document.createElement("div");
    overlay.className = "image-picker-overlay";
    document.body.appendChild(overlay);

    let cropper = null; // instance Cropper.js đang mở (nếu đang ở màn hình cắt ảnh)
    let draggedId = null;

    function cleanupAndResolve(result) {
      if (cropper) {
        cropper.destroy();
        cropper = null;
      }
      items.forEach((it) => URL.revokeObjectURL(it.url));
      overlay.remove();
      resolve(result);
    }

    function renderGrid() {
      const countText = items.length === 1 ? "1 ảnh" : `${items.length} ảnh`;

      overlay.innerHTML = `
        <div class="image-picker-modal">
          <div class="image-picker-header">
            <h3 class="image-picker-title">Sắp xếp &amp; căn chỉnh ảnh (${countText})</h3>
            <p class="image-picker-hint">Kéo-thả ô ảnh để đổi thứ tự đăng. Bấm "✂️ Cắt ảnh" để tự do căn chỉnh khung ảnh trước khi đăng.</p>
          </div>

          <div class="image-picker-grid">
            ${items
              .map(
                (it, index) => `
              <div class="image-picker-item" draggable="true" data-id="${it.id}">
                <span class="image-picker-order-badge">${index + 1}</span>
                <img src="${it.url}" class="image-picker-thumb" alt="Ảnh thứ ${index + 1}" />
                <div class="image-picker-item-actions">
                  <button type="button" class="image-picker-btn-crop" data-id="${it.id}" title="Cắt / căn chỉnh ảnh">✂️ Cắt ảnh</button>
                  <button type="button" class="image-picker-btn-remove" data-id="${it.id}" title="Bỏ ảnh này">✕</button>
                </div>
              </div>
            `
              )
              .join("")}
          </div>

          <div class="image-picker-footer">
            <button type="button" class="btn btn-outline-dark image-picker-cancel-all">Hủy</button>
            <button type="button" class="btn btn-primary image-picker-confirm-all" ${
              items.length === 0 ? "disabled" : ""
            }>✓ Xong, dùng ${countText} này</button>
          </div>
        </div>
      `;

      attachGridEvents();
    }

    function attachGridEvents() {
      overlay.querySelector(".image-picker-cancel-all").addEventListener("click", () => cleanupAndResolve([]));

      overlay.querySelector(".image-picker-confirm-all").addEventListener("click", () => {
        cleanupAndResolve(items.map((it) => it.file));
      });

      overlay.querySelectorAll(".image-picker-btn-remove").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.dataset.id;
          const idx = items.findIndex((it) => it.id === id);
          if (idx > -1) {
            URL.revokeObjectURL(items[idx].url);
            items.splice(idx, 1);
          }
          if (items.length === 0) {
            cleanupAndResolve([]);
          } else {
            renderGrid();
          }
        });
      });

      overlay.querySelectorAll(".image-picker-btn-crop").forEach((btn) => {
        btn.addEventListener("click", () => {
          const item = items.find((it) => it.id === btn.dataset.id);
          if (item) openCropView(item);
        });
      });

      // Kéo-thả để đổi thứ tự đăng ảnh (HTML5 drag & drop thuần, không cần thư viện)
      overlay.querySelectorAll(".image-picker-item").forEach((el) => {
        el.addEventListener("dragstart", () => {
          draggedId = el.dataset.id;
          el.classList.add("is-dragging");
        });
        el.addEventListener("dragend", () => el.classList.remove("is-dragging"));
        el.addEventListener("dragover", (e) => e.preventDefault());
        el.addEventListener("drop", (e) => {
          e.preventDefault();
          const targetId = el.dataset.id;
          if (!draggedId || draggedId === targetId) return;
          const fromIdx = items.findIndex((it) => it.id === draggedId);
          const toIdx = items.findIndex((it) => it.id === targetId);
          if (fromIdx > -1 && toIdx > -1) {
            const [moved] = items.splice(fromIdx, 1);
            items.splice(toIdx, 0, moved);
            renderGrid();
          }
        });
      });
    }

    // Danh sách tỉ lệ cho người đăng chọn — "null" nghĩa là TỰ DO
    // (không ép khung theo tỉ lệ cố định nào, kéo góc thoải mái)
    const ASPECT_RATIOS = [
      { label: "Tự do", value: null },
      { label: "1:1", value: 1 },
      { label: "4:3", value: 4 / 3 },
      { label: "3:4", value: 3 / 4 },
      { label: "16:9", value: 16 / 9 },
    ];

    function openCropView(item) {
      overlay.innerHTML = `
        <div class="image-picker-modal">
          <div class="image-picker-header">
            <h3 class="image-picker-title">Cắt / căn chỉnh ảnh</h3>
            <p class="image-picker-hint">Chọn tỉ lệ khung bên dưới, kéo góc khung để đổi kích thước, kéo giữa khung để di chuyển, dùng thanh trượt để thu phóng ảnh.</p>
          </div>

          <div class="image-picker-crop-canvas-wrap">
            <img src="${item.url}" class="image-picker-crop-img" id="imagePickerCropTarget" />
          </div>

          <div class="image-picker-crop-controls">
            <div class="image-picker-ratio-row">
              ${ASPECT_RATIOS.map(
                (r, i) => `
                <button type="button" class="image-picker-ratio-btn ${i === 0 ? "is-active" : ""}" data-ratio-index="${i}">${r.label}</button>
              `
              ).join("")}
            </div>

            <label class="image-picker-zoom-label">
              🔍 Thu phóng
              <input type="range" class="image-picker-zoom" min="0" max="1" step="0.01" value="0" />
            </label>
          </div>

          <div class="image-picker-footer">
            <button type="button" class="btn btn-outline-dark image-picker-crop-cancel">← Quay lại</button>
            <button type="button" class="btn btn-primary image-picker-crop-apply">✓ Áp dụng</button>
          </div>
        </div>
      `;

      const imgEl = overlay.querySelector("#imagePickerCropTarget");

      imgEl.onload = () => {
        cropper = new Cropper(imgEl, {
          viewMode: 1,
          dragMode: "move",
          autoCropArea: 0.9,
          background: false,
          responsive: true,
          aspectRatio: NaN, // Mặc định "Tự do" khi vừa mở, người dùng bấm nút bên dưới để đổi
          cropBoxResizable: true,
          cropBoxMovable: true,
          zoomOnWheel: true,
        });
      };

      // Bấm 1 trong 5 nút tỉ lệ (Tự do/1:1/4:3/3:4/16:9) -> ép khung
      // cắt đổi ngay theo tỉ lệ đó, đồng thời tô đậm nút đang chọn
      overlay.querySelectorAll(".image-picker-ratio-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          if (!cropper) return;
          const ratio = ASPECT_RATIOS[Number(btn.dataset.ratioIndex)].value;
          cropper.setAspectRatio(ratio === null ? NaN : ratio);

          overlay.querySelectorAll(".image-picker-ratio-btn").forEach((b) => b.classList.remove("is-active"));
          btn.classList.add("is-active");
        });
      });

      overlay.querySelector(".image-picker-zoom").addEventListener("input", (e) => {
        if (!cropper) return;
        const ratio = Number(e.target.value); // 0..1 -> quy đổi thành mức zoom hợp lý
        cropper.zoomTo(0.3 + ratio * 2.7);
      });

      overlay.querySelector(".image-picker-crop-cancel").addEventListener("click", () => {
        if (cropper) {
          cropper.destroy();
          cropper = null;
        }
        renderGrid();
      });

      overlay.querySelector(".image-picker-crop-apply").addEventListener("click", () => {
        if (!cropper) return;

        const canvas = cropper.getCroppedCanvas({ imageSmoothingQuality: "high" });

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const originalName = item.file.name || "image.jpg";
              const croppedFile = new File([blob], originalName, { type: blob.type || "image/jpeg" });
              URL.revokeObjectURL(item.url);
              item.file = croppedFile;
              item.url = URL.createObjectURL(croppedFile);
            }

            cropper.destroy();
            cropper = null;
            renderGrid();
          },
          "image/jpeg",
          0.92
        );
      });
    }

    renderGrid();
  });
}