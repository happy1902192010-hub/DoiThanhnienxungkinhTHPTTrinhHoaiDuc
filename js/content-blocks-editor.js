/* =======================================================
   FILE: content-blocks-editor.js
   MỤC ĐÍCH: Bộ soạn "NỘI DUNG THEO KHỐI" (khối chữ hoặc khối
   ảnh, sắp xếp được thứ tự bằng nút ▲▼) — DÙNG CHUNG cho mọi
   trang Admin cần nội dung chi tiết dạng chữ+ảnh xen kẽ (Tin
   tức, Thành tích, Sự kiện...).

   CÁCH DÙNG (trong file admin-xxx.js của từng trang):
     const editor = initContentBlocksEditor(editorEl, initialBlocks, uploadFn);
     const blocks = await editor.getBlocksForSave(); // gọi lúc Lưu/Đăng

   - editorEl: thẻ <div class="content-blocks-editor"> chứa sẵn
     <div class="content-blocks-list"> + toolbar (2 nút thêm khối)
   - initialBlocks: mảng khối CÓ SẴN (rỗng [] nếu đang tạo mới)
   - uploadFn: hàm async(file) => {url, error} — MỖI TRANG dùng
     bucket ảnh khác nhau, hàm upload được TRUYỀN VÀO từ ngoài

   Cần: js/image-picker.js (hàm openImagePicker) nạp TRƯỚC file này.
   ======================================================= */

function initContentBlocksEditor(editorEl, initialBlocks, uploadFn) {
  const state = { blocks: (initialBlocks || []).map((b) => ({ ...b })) };

  function escapeHtmlLocal(text) {
    return String(text || "").replace(/"/g, "&quot;").replace(/</g, "&lt;");
  }

  function renderBlockItemHTML(block, index, total) {
    const orderControls = `
      <div class="content-block-order-controls">
        <button type="button" class="btn-block-up" ${index === 0 ? "disabled" : ""} title="Di chuyển lên">▲</button>
        <span class="content-block-order-num">${index + 1}</span>
        <button type="button" class="btn-block-down" ${index === total - 1 ? "disabled" : ""} title="Di chuyển xuống">▼</button>
      </div>
    `;

    const body =
      block.type === "text"
        ? `<textarea class="content-block-text-input" rows="3" placeholder="Nhập nội dung đoạn văn...">${escapeHtmlLocal(
            block.text || ""
          )}</textarea>`
        : `<img src="${block.url || block.previewUrl}" class="content-block-image-preview" alt="Ảnh nội dung" />`;

    return `
      <div class="content-block-item" data-index="${index}" data-type="${block.type}">
        ${orderControls}
        <div class="content-block-body">${body}</div>
        <button type="button" class="btn-block-remove" title="Xóa khối này">🗑️</button>
      </div>
    `;
  }

  function renderList() {
    const listEl = editorEl.querySelector(".content-blocks-list");

    listEl.innerHTML =
      state.blocks.length === 0
        ? '<p class="content-blocks-empty">Chưa có khối nội dung nào. Bấm "+ Thêm khối chữ" hoặc "+ Thêm khối ảnh" bên dưới.</p>'
        : state.blocks.map((b, i) => renderBlockItemHTML(b, i, state.blocks.length)).join("");

    attachListEvents();
  }

  function attachListEvents() {
    editorEl.querySelectorAll(".content-block-text-input").forEach((textarea, i) => {
      textarea.addEventListener("input", () => {
        state.blocks[i].text = textarea.value;
      });
    });

    editorEl.querySelectorAll(".btn-block-up").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.closest(".content-block-item").dataset.index);
        if (i > 0) {
          [state.blocks[i - 1], state.blocks[i]] = [state.blocks[i], state.blocks[i - 1]];
          renderList();
        }
      });
    });

    editorEl.querySelectorAll(".btn-block-down").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.closest(".content-block-item").dataset.index);
        if (i < state.blocks.length - 1) {
          [state.blocks[i + 1], state.blocks[i]] = [state.blocks[i], state.blocks[i + 1]];
          renderList();
        }
      });
    });

    editorEl.querySelectorAll(".btn-block-remove").forEach((btn) => {
      btn.addEventListener("click", () => {
        const i = Number(btn.closest(".content-block-item").dataset.index);
        state.blocks.splice(i, 1);
        renderList();
      });
    });
  }

  editorEl.querySelector(".btn-add-text-block").addEventListener("click", () => {
    state.blocks.push({ type: "text", text: "" });
    renderList();
  });

  editorEl.querySelector(".btn-add-image-block-input").addEventListener("change", async (e) => {
    const rawFiles = Array.from(e.target.files);
    e.target.value = "";

    const picked = await openImagePicker(rawFiles);
    if (picked.length === 0) return;

    picked.forEach((file) => {
      state.blocks.push({ type: "image", file, previewUrl: URL.createObjectURL(file) });
    });
    renderList();
  });

  renderList();

  const api = {
    async getBlocksForSave() {
      const result = [];
      for (const b of state.blocks) {
        if (b.type === "text") {
          result.push({ type: "text", text: (b.text || "").trim() });
        } else if (b.type === "image" && b.url) {
          result.push({ type: "image", url: b.url });
        } else if (b.type === "image" && b.file) {
          const { url, error } = await uploadFn(b.file);
          if (error) throw new Error(error);
          result.push({ type: "image", url });
        }
      }
      return result;
    },
    reset() {
      state.blocks = [];
      renderList();
    },
  };

  editorEl._blocksApi = api;
  return api;
}

function encodeBlocksForAttr(blocks) {
  return btoa(unescape(encodeURIComponent(JSON.stringify(blocks || []))));
}

function decodeBlocksFromAttr(str) {
  if (!str) return [];
  try {
    return JSON.parse(decodeURIComponent(escape(atob(str))));
  } catch (e) {
    return [];
  }
}