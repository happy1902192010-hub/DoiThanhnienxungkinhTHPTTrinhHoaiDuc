/* =======================================================
   FILE: admin-about.js
   MỤC ĐÍCH: Đọc + cập nhật bảng "about_page" — bảng này CHỈ
   CÓ ĐÚNG 1 DÒNG DUY NHẤT (id = 1), vì trang Giới thiệu chỉ có
   1 bộ nội dung "Người sáng lập" + "Mục tiêu hoạt động", không
   phải danh sách nhiều bản ghi như Tin tức/Sự kiện. Vì vậy ở
   đây KHÔNG có nút "Thêm mới" hay "Xóa" — chỉ có "Lưu" (update).

   Cần: supabase-config.js (biến supabaseClient) nạp trước.
   ======================================================= */

document.addEventListener("DOMContentLoaded", () => {
  loadAboutPageData();
  initFounderForm();
  initGoalsForm();
});

/* --------- Tải dữ liệu hiện có, điền sẵn vào 2 form --------- */
async function loadAboutPageData() {
  const { data, error } = await supabaseClient
    .from("about_page")
    .select("*")
    .eq("id", 1)
    .single();

  if (error) {
    console.error("Lỗi tải about_page:", error);
    return;
  }

  // Điền sẵn dữ liệu hiện có vào các ô input, để Admin thấy ngay
  // nội dung đang có và chỉ cần sửa thay vì gõ lại từ đầu
  document.getElementById("founderName").value = data.founder_name || "";
  document.getElementById("foundedYear").value = data.founded_year || "";
  document.getElementById("founderDescription").value = data.founder_description || "";

  // goals là 1 MẢNG (VD: ["Mục tiêu 1", "Mục tiêu 2"]) — nối lại
  // thành 1 chuỗi có xuống dòng để hiện trong ô textarea
  const goals = data.goals || [];
  document.getElementById("goalsTextarea").value = goals.join("\n");
}

/* =======================================================
   FORM 1: Lịch sử thành lập
   ======================================================= */
function initFounderForm() {
  const form = document.getElementById("founderForm");
  const messageEl = document.getElementById("founderMessage");
  const btn = document.getElementById("saveFounderBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const founder_name = document.getElementById("founderName").value.trim();
    const founded_year = document.getElementById("foundedYear").value.trim();
    const founder_description = document.getElementById("founderDescription").value.trim();

    btn.disabled = true;
    btn.textContent = "Đang lưu...";
    messageEl.hidden = true;

    // .eq("id", 1): CHỈ cập nhật đúng dòng duy nhất (id = 1) đã tạo sẵn
    const { error } = await supabaseClient
      .from("about_page")
      .update({ founder_name, founded_year, founder_description })
      .eq("id", 1);

    btn.disabled = false;
    btn.textContent = "💾 Lưu Lịch sử thành lập";

    if (error) {
      showMessage(messageEl, `Lỗi lưu dữ liệu: ${error.message}`, true);
      return;
    }

    showMessage(messageEl, "✅ Đã lưu Lịch sử thành lập!", false);
  });
}

/* =======================================================
   FORM 2: Mục tiêu hoạt động
   ======================================================= */
function initGoalsForm() {
  const form = document.getElementById("goalsForm");
  const messageEl = document.getElementById("goalsMessage");
  const btn = document.getElementById("saveGoalsBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const rawText = document.getElementById("goalsTextarea").value;

    // Tách chuỗi nhiều dòng thành MẢNG các dòng riêng lẻ:
    // - .split("\n"): cắt tại mỗi lần xuống dòng
    // - .map(g => g.trim()): xóa khoảng trắng thừa đầu/cuối mỗi dòng
    // - .filter(g => g !== ""): loại bỏ dòng trống (nếu người dùng
    //   lỡ để trống 1 dòng ở giữa hoặc cuối)
    const goals = rawText
      .split("\n")
      .map((g) => g.trim())
      .filter((g) => g !== "");

    btn.disabled = true;
    btn.textContent = "Đang lưu...";
    messageEl.hidden = true;

    const { error } = await supabaseClient.from("about_page").update({ goals }).eq("id", 1);

    btn.disabled = false;
    btn.textContent = "💾 Lưu Mục tiêu hoạt động";

    if (error) {
      showMessage(messageEl, `Lỗi lưu dữ liệu: ${error.message}`, true);
      return;
    }

    showMessage(messageEl, "✅ Đã lưu Mục tiêu hoạt động!", false);
  });
}

function showMessage(el, text, isError) {
  el.textContent = text;
  el.hidden = false;
  el.className = isError ? "admin-message admin-message-error" : "admin-message admin-message-success";
}