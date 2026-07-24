/* =======================================================
   FILE: admin-login.js
   MỤC ĐÍCH: Xử lý đăng nhập bằng email + mật khẩu (dùng CHUNG
   cho cả Admin và Thành viên thường), thông qua Supabase Auth.

   Sau khi đăng nhập thành công, hệ thống tra bảng "profiles"
   để biết tài khoản đó có role "admin" hay "member":
   - "admin"  → chuyển sang trang quản trị (admin-dashboard.html)
   - "member" → quay về Trang chủ, tiếp tục dùng web bình thường
                (nhưng giờ đã ở trạng thái ĐĂNG NHẬP)

   Cần js/supabase-config.js (biến supabaseClient) nạp TRƯỚC file này.
   ======================================================= */

document.addEventListener("DOMContentLoaded", () => {
  checkIfAlreadyLoggedIn();
  prefillRememberedEmail();
  initLoginForm();
});

/* --------- Nếu trước đó có tích "Ghi nhớ", tự điền sẵn email --------- */
// localStorage là nơi lưu dữ liệu NGAY TRÊN trình duyệt của người dùng,
// vẫn còn đó dù tắt trình duyệt/tắt máy, cho tới khi bị xóa thủ công.
// Chỉ lưu EMAIL (không lưu mật khẩu) — mật khẩu để trình duyệt tự lưu
// qua trình quản lý mật khẩu riêng của nó, an toàn hơn nhiều so với
// việc code tự lưu mật khẩu dạng chữ thường vào máy người dùng.
function prefillRememberedEmail() {
  const rememberedEmail = localStorage.getItem("rememberedEmail");
  if (rememberedEmail) {
    document.getElementById("email").value = rememberedEmail;
    document.getElementById("rememberMe").checked = true;
  }
}

/* --------- Nếu đã đăng nhập rồi, tự động điều hướng đúng vai trò --------- */
async function checkIfAlreadyLoggedIn() {
  const { data } = await supabaseClient.auth.getSession();

  if (data.session) {
    await redirectByRole(data.session.user.id);
  }
}

/* --------- Tra bảng "profiles" để biết vai trò, rồi điều hướng --------- */
async function redirectByRole(userId) {
  const { data: profile } = await supabaseClient
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single(); // .single(): chỉ mong đợi ĐÚNG 1 dòng kết quả (vì id là primary key)

  if (profile && profile.role === "admin") {
    window.location.href = "admin-dashboard.html";
  } else {
    // Thành viên thường (hoặc không tra được profile vì lý do nào đó)
    // → quay về Trang chủ, không có quyền vào khu vực Admin
    window.location.href = "index.html";
  }
}

/* --------- Xử lý khi bấm nút "Đăng nhập" --------- */
function initLoginForm() {
  const form = document.getElementById("loginForm");
  const errorEl = document.getElementById("loginError");
  const loginBtn = document.getElementById("loginBtn");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    loginBtn.disabled = true;
    loginBtn.textContent = "Đang đăng nhập...";
    errorEl.hidden = true;

    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      errorEl.textContent = "Email hoặc mật khẩu không đúng. Vui lòng thử lại.";
      errorEl.hidden = false;
      loginBtn.disabled = false;
      loginBtn.textContent = "Đăng nhập";
      return;
    }

    // Đăng nhập THÀNH CÔNG → xử lý việc ghi nhớ email trước khi điều hướng
    const rememberMe = document.getElementById("rememberMe").checked;
    if (rememberMe) {
      localStorage.setItem("rememberedEmail", email);
    } else {
      localStorage.removeItem("rememberedEmail");
    }

    // Tra vai trò rồi điều hướng đúng chỗ
    await redirectByRole(data.user.id);
  });
}