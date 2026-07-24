/* =======================================================
   FILE: admin-auth-guard.js
   MỤC ĐÍCH: "Người gác cổng" cho MỌI trang Admin. Nạp file
   này ở ĐẦU mỗi trang Admin để chặn truy cập nếu:
   1. Chưa đăng nhập, HOẶC
   2. Đã đăng nhập nhưng là tài khoản Thành viên thường
      (role "member"), KHÔNG PHẢI Admin

   Cần js/supabase-config.js nạp TRƯỚC file này.
   ======================================================= */

(async function guardAdminPage() {
  const { data } = await supabaseClient.auth.getSession();

  // Trường hợp 1: chưa đăng nhập → đá về trang đăng nhập
  if (!data.session) {
    window.location.href = "admin-login.html";
    return;
  }

  // Trường hợp 2: đã đăng nhập, nhưng cần kiểm tra ĐÚNG là Admin
  // (không phải Thành viên thường cố tình gõ URL trang Admin)
  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("role")
    .eq("id", data.session.user.id)
    .single();

  if (error || !profile || profile.role !== "admin") {
    // Không phải Admin → đá về Trang chủ, KHÔNG cho vào khu vực quản trị
    alert("Tài khoản của bạn không có quyền truy cập khu vực quản trị.");
    window.location.href = "index.html";
  }
})();

/* --------- Hàm đăng xuất — dùng chung cho mọi trang Admin --------- */
async function logoutAdmin() {
  await supabaseClient.auth.signOut();
  window.location.href = "admin-login.html";
}