/* =======================================================
   FILE: lien-he.js
   MỤC ĐÍCH: Xử lý form Liên hệ — khi người dùng gửi, tin nhắn
   được lưu vào bảng "contact_messages" trên Supabase (KHÔNG
   cần đăng nhập, vì đây là form công khai cho mọi khách).
   Admin xem tin nhắn trực tiếp trong Supabase Table Editor
   (mục contact_messages) — trang này chưa cần giao diện Admin
   riêng vì không nằm trong yêu cầu ưu tiên cao ban đầu.

   Cần: js/supabase-config.js (biến supabaseClient) nạp TRƯỚC.
   ======================================================= */

document.addEventListener("DOMContentLoaded", () => {
  initContactForm();
});

function initContactForm() {
  const form = document.getElementById("contactForm");
  const statusEl = document.getElementById("contactMessage-status");
  const submitBtn = document.getElementById("contactSubmitBtn");
  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const full_name = document.getElementById("contactName").value.trim();
    const email = document.getElementById("contactEmail").value.trim();
    const message = document.getElementById("contactMessage").value.trim();

    submitBtn.disabled = true;
    submitBtn.textContent = "Đang gửi...";
    statusEl.hidden = true;

    const { error } = await supabaseClient.from("contact_messages").insert({
      full_name,
      email,
      message,
    });

    submitBtn.disabled = false;
    submitBtn.textContent = "Gửi tin nhắn";

    if (error) {
      statusEl.textContent = "❌ Có lỗi xảy ra, vui lòng thử lại: " + error.message;
      statusEl.className = "admin-message admin-message-error";
      statusEl.hidden = false;
      return;
    }

    statusEl.textContent = "✅ Cảm ơn bạn đã liên hệ! Chúng tôi sẽ phản hồi sớm nhất có thể.";
    statusEl.className = "admin-message admin-message-success";
    statusEl.hidden = false;
    form.reset();
  });
}