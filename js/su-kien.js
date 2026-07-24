/* =======================================================
   FILE: su-kien.js
   MỤC ĐÍCH: Lấy danh sách sự kiện TỪ SUPABASE (bảng events)
   và hiển thị cho khách xem + đăng ký tham gia (ghi vào bảng
   event_registrations — KHÔNG cần đăng nhập, vì đây là hành
   động công khai, ai cũng đăng ký được).

   Cần: js/supabase-config.js (biến supabaseClient) nạp TRƯỚC.
   ======================================================= */

document.addEventListener("DOMContentLoaded", () => {
  loadEvents();
});

/* --------- Lấy danh sách sự kiện và vẽ ra màn hình --------- */
async function loadEvents() {
  const container = document.getElementById("eventsList");
  if (!container) return;

  const { data, error } = await supabaseClient
    .from("events")
    .select("*")
    .order("event_date", { ascending: true }); // Sự kiện gần nhất lên đầu

  if (error) {
    container.innerHTML = '<p class="loading-text">Không tải được dữ liệu. Vui lòng thử lại sau.</p>';
    console.error("Lỗi tải events:", error);
    return;
  }

  renderEvents(data);
}

/* --------- Vẽ danh sách sự kiện dạng thẻ --------- */
function renderEvents(events) {
  const container = document.getElementById("eventsList");

  if (!events || events.length === 0) {
    container.innerHTML = '<p class="loading-text">Hiện chưa có sự kiện nào sắp diễn ra.</p>';
    return;
  }

  container.innerHTML = events
    .map((ev) => {
      // Sự kiện đã QUA (ngày diễn ra nhỏ hơn hiện tại) thì đánh dấu
      // khác đi (mờ hơn, không cho đăng ký nữa) — tránh người dùng
      // đăng ký nhầm vào sự kiện đã kết thúc
      const isPast = new Date(ev.event_date) < new Date();

      // Gom toàn bộ ảnh của sự kiện: ưu tiên mảng "image_urls" (nhiều
      // ảnh); nếu sự kiện cũ chưa có mảng này thì dùng tạm "image_url"
      const images = ev.image_urls && ev.image_urls.length > 0 ? ev.image_urls : ev.image_url ? [ev.image_url] : [];
      const mainImage = images[0];
      const extraImages = images.slice(1); // Các ảnh còn lại (từ ảnh thứ 2 trở đi)

      return `
      <article class="event-card ${isPast ? "event-card-past" : ""}">
        ${
          mainImage
            ? `<img src="${mainImage}" alt="${ev.title}" class="event-card-img event-card-img-clickable" data-images='${JSON.stringify(images)}' data-index="0" data-caption="${ev.title}" />`
            : ""
        }

        <div class="event-card-body">
          <span class="event-card-date">📅 ${formatEventDate(ev.event_date)}</span>
          <h3 class="event-card-title">${ev.title}</h3>
          ${ev.location ? `<p class="event-card-location">📍 ${ev.location}</p>` : ""}
          ${ev.description ? `<p class="event-card-desc">${ev.description}</p>` : ""}

          ${
            extraImages.length > 0
              ? `
            <div class="event-card-extra-images">
              ${extraImages
                .map(
                  (url, i) => `
                <img src="${url}" alt="${ev.title}" class="event-card-thumb" data-images='${JSON.stringify(images)}' data-index="${i + 1}" data-caption="${ev.title}" />
              `
                )
                .join("")}
            </div>
          `
              : ""
          }

          ${
            isPast
              ? `<p class="event-past-label">Sự kiện đã diễn ra</p>`
              : `
              <button type="button" class="btn btn-primary btn-toggle-register" data-event-id="${ev.id}">
                Đăng ký tham gia
              </button>

              <!-- Form đăng ký — ẩn mặc định, hiện ra khi bấm nút trên -->
              <form class="register-form" id="registerForm-${ev.id}" data-event-id="${ev.id}" hidden>
                <label>Họ và tên <span class="required">*</span></label>
                <input type="text" class="reg-name" required />

                <label>Email</label>
                <input type="email" class="reg-email" />

                <label>Số điện thoại</label>
                <input type="tel" class="reg-phone" />

                <button type="submit" class="btn btn-primary">Gửi đăng ký</button>
              </form>
              <p class="register-message" id="registerMessage-${ev.id}" hidden></p>
            `
          }
        </div>
      </article>
    `;
    })
    .join("");

  attachEventCardEvents();
}

/* --------- Định dạng ngày giờ sự kiện kiểu Việt Nam --------- */
function formatEventDate(isoString) {
  const d = new Date(isoString);
  const dateStr = d.toLocaleDateString("vi-VN");
  const timeStr = d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return `${timeStr} - ${dateStr}`;
}

/* --------- Gắn sự kiện: bấm "Đăng ký tham gia" để mở form,
   và xử lý khi submit form đăng ký --------- */
function attachEventCardEvents() {
  // Bấm vào ảnh (chính hoặc ảnh phụ) → phóng to xem, duyệt được
  // qua lại TRONG ĐÚNG bộ ảnh của sự kiện đó (không lẫn sang sự
  // kiện khác) nhờ đọc lại mảng JSON đã gắn vào data-images
  document.querySelectorAll(".event-card-img-clickable, .event-card-thumb").forEach((img) => {
    img.addEventListener("click", () => {
      const images = JSON.parse(img.dataset.images);
      const index = Number(img.dataset.index);
      openLightbox(images, index, img.dataset.caption);
    });
  });

  // Bấm nút → hiện/ẩn form đăng ký tương ứng với ĐÚNG sự kiện đó
  document.querySelectorAll(".btn-toggle-register").forEach((btn) => {
    btn.addEventListener("click", () => {
      const eventId = btn.dataset.eventId;
      const form = document.getElementById(`registerForm-${eventId}`);
      form.hidden = !form.hidden; // Đảo trạng thái ẩn/hiện
      btn.textContent = form.hidden ? "Đăng ký tham gia" : "Ẩn form đăng ký";
    });
  });

  // Xử lý khi người dùng gửi form đăng ký
  document.querySelectorAll(".register-form").forEach((form) => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const eventId = form.dataset.eventId;
      const fullName = form.querySelector(".reg-name").value.trim();
      const email = form.querySelector(".reg-email").value.trim();
      const phone = form.querySelector(".reg-phone").value.trim();
      const messageEl = document.getElementById(`registerMessage-${eventId}`);

      const submitBtn = form.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = "Đang gửi...";

      // Chèn bản ghi mới vào bảng event_registrations — KHÔNG cần
      // đăng nhập, vì policy INSERT đã cho phép "public" (mọi người)
      const { error } = await supabaseClient.from("event_registrations").insert({
        event_id: eventId,
        full_name: fullName,
        email,
        phone,
      });

      submitBtn.disabled = false;
      submitBtn.textContent = "Gửi đăng ký";

      if (error) {
        messageEl.textContent = "❌ Có lỗi xảy ra, vui lòng thử lại: " + error.message;
        messageEl.className = "register-message register-message-error";
        messageEl.hidden = false;
        return;
      }

      // Đăng ký thành công → ẩn form đi, hiện lời cảm ơn thay vào đó
      messageEl.textContent = "✅ Cảm ơn bạn đã đăng ký tham gia! Ban tổ chức sẽ liên hệ khi cần.";
      messageEl.className = "register-message register-message-success";
      messageEl.hidden = false;
      form.reset();
      form.hidden = true;

      // Đưa nút bấm về lại trạng thái ban đầu (đề phòng người dùng
      // muốn đăng ký thêm 1 người khác cho cùng sự kiện)
      const btn = document.querySelector(`.btn-toggle-register[data-event-id="${eventId}"]`);
      if (btn) btn.textContent = "Đăng ký tham gia";
    });
  });
}