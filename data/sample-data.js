/* =======================================================
   FILE: sample-data.js
   MỤC ĐÍCH: Chứa dữ liệu MẪU (giả) để hiển thị lên Trang chủ,
   trong lúc chưa có backend/database thật.
   ======================================================= */

const SAMPLE_ANNOUNCEMENTS = [
  {
    id: 1,
    tag: "Khẩn",
    title: "Lịch nghỉ hè và tổng kết hoạt động năm 2026",
    date: "2026-07-01",
  },
  {
    id: 2,
    tag: "Thông báo",
    title: "Mở đăng ký thành viên mới đợt 2 năm 2026",
    date: "2026-06-28",
  },
  {
    id: 3,
    tag: "Sự kiện",
    title: "Chương trình tình nguyện mùa hè xanh sắp khởi động",
    date: "2026-06-20",
  },
];

const SAMPLE_NEWS = [
  {
    id: 1,
    category: "Hoạt động",
    title: "Đội TNXK tổ chức chương trình hiến máu nhân đạo",
    excerpt: "Hơn 200 đơn vị máu đã được thu thập trong chương trình hiến máu tổ chức tại trường vào cuối tuần qua.",
    image: "assets/news-placeholder-1.jpg",
    date: "2026-06-30",
    author: "Ban truyền thông",
  },
  {
    id: 2,
    category: "Thành tích",
    title: "Đội TNXK nhận bằng khen từ Đoàn trường",
    excerpt: "Ghi nhận những đóng góp tích cực trong công tác tình nguyện và phong trào thanh niên năm học vừa qua.",
    image: "assets/news-placeholder-2.jpg",
    date: "2026-06-25",
    author: "Ban truyền thông",
  },
  {
    id: 3,
    category: "Tuyển thành viên",
    title: "Mở đơn tuyển thành viên mới - Nhiệm kỳ 2026-2027",
    excerpt: "Cơ hội gia nhập đội hình xung kích, rèn luyện kỹ năng và tham gia các hoạt động cộng đồng ý nghĩa.",
    image: "assets/news-placeholder-3.jpg",
    date: "2026-06-18",
    author: "Ban nhân sự",
  },
  {
    id: 4,
    category: "Hoạt động",
    title: "Ra quân chiến dịch Mùa hè xanh 2026",
    excerpt: "Hàng chục thành viên lên đường tham gia các hoạt động tình nguyện tại các địa phương khó khăn.",
    image: "assets/news-placeholder-4.jpg",
    date: "2026-06-10",
    author: "Ban truyền thông",
  },
];

/* =======================================================
   DỮ LIỆU CHO TRANG GIỚI THIỆU (gioi-thieu.html)
   👉 Toàn bộ nội dung dưới đây là PLACEHOLDER, bạn tự thay
   bằng thông tin thật của Đội TNXK.
   ======================================================= */

const FOUNDER_INFO = {
  name: "[Tên người sáng lập]",
  foundedYear: "20xx",
  description: "[Mô tả ngắn về bối cảnh và lý do thành lập Đội Thanh Niên Xung Kích]",
};

const OPERATION_GOALS = [
  "[Mục tiêu hoạt động thứ 1]",
  "[Mục tiêu hoạt động thứ 2]",
  "[Mục tiêu hoạt động thứ 3]",
];