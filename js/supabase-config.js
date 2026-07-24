/* =======================================================
   FILE: supabase-config.js
   MỤC ĐÍCH: Khởi tạo kết nối tới Supabase (database + đăng
   nhập + lưu trữ ảnh). File này PHẢI được nạp TRƯỚC bất kỳ
   file JS nào khác cần dùng "supabaseClient" (VD: admin-org.js,
   co-cau-to-chuc.js...).

   Cách hoạt động: thẻ <script> nạp thư viện "supabase-js" từ
   CDN (giống như bạn dùng jQuery/Bootstrap qua CDN), thư viện
   đó tạo ra biến toàn cục "supabase" chứa hàm createClient().
   Ta dùng hàm đó để tạo ra "supabaseClient" — đối tượng đại
   diện cho kết nối tới đúng project Supabase của Đội TNXK.
   ======================================================= */

// 👉 2 giá trị dưới đây LẤY TỪ Supabase Dashboard > Settings > API
// Đây là khóa "public" (Publishable key) — AN TOÀN để hiển thị
// công khai trong code frontend, KHÔNG phải khóa bí mật (secret key).
const SUPABASE_URL = "https://klofaekkkkiizmqhmtmo.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_K1BIRrRaxyblao8esN6qfQ_ACO6HGHy";

// window.supabase là biến do thư viện CDN tạo ra (nạp trong thẻ
// <script> TRƯỚC file này trong HTML). .createClient(...) tạo ra
// 1 "kênh kết nối" tới đúng project của bạn.
const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);
