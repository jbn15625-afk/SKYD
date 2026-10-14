import { db } from "./firebase.js";
import {
  get,
  ref
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

const slider = document.getElementById("homeSlider");

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function validHttpUrl(value) {
  if (typeof value !== "string" || !value.trim()) return "";
  try {
    const url = new URL(value.trim());
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

function renderSlider(seriesList) {
  if (seriesList.length === 0) {
    slider.innerHTML = `
      <div class="slider-empty">
        <h2>لا توجد مسلسلات مختارة للسلايدر</h2>
        <p>اختر المسلسلات التي تريدها من صفحة إدارة السلايدر.</p>
        <a class="primary-button" href="slider.html">اختيار المسلسلات</a>
      </div>`;
    return;
  }

  slider.innerHTML = `
    <div class="slider-track">
      ${seriesList.map((series, index) => {
        const name = escapeHTML(series.name || "مسلسل بدون اسم");
        const year = series.year ? escapeHTML(series.year) : "";
        const cover = validHttpUrl(series.coverUrl);
        const background = validHttpUrl(series.desktopBackgroundUrl) || cover;
        const style = background
          ? ` style="--slide-background: url(&quot;${escapeHTML(background)}&quot;)"`
          : "";
        const poster = cover
          ? `<img class="home-slide-poster" src="${escapeHTML(cover)}" alt="غلاف ${name}" loading="${index === 0 ? "eager" : "lazy"}">`
          : `<div class="home-slide-poster-placeholder" aria-hidden="true">✦</div>`;
        return `
          <article class="home-slide${index === 0 ? " active" : ""}"${style} aria-hidden="${index !== 0}">
            <div class="home-slide-content">
              ${poster}
              <div class="home-slide-copy">
                <span class="eyebrow">اختيار AniMerc</span>
                <h2>${name}</h2>
                ${year ? `<p class="home-slide-year">${year}</p>` : ""}
                <a class="primary-button" href="series-details.html?id=${encodeURIComponent(series.id)}">عرض التفاصيل</a>
              </div>
            </div>
          </article>`;
      }).join("")}
    </div>
    ${seriesList.length > 1 ? `
      <div class="home-slider-controls">
        <button type="button" data-slider-step="-1" aria-label="المسلسل السابق">السابق</button>
        <div class="home-slider-dots" aria-label="اختيار مسلسل">
          ${seriesList.map((series, index) => `
            <button type="button" data-slider-index="${index}" aria-label="عرض ${escapeHTML(series.name || `المسلسل ${index + 1}`)}" aria-current="${index === 0}"></button>
          `).join("")}
        </div>
        <button type="button" data-slider-step="1" aria-label="المسلسل التالي">التالي</button>
      </div>` : ""}`;

  let activeIndex = 0;
  const slides = [...slider.querySelectorAll(".home-slide")];
  const dots = [...slider.querySelectorAll("[data-slider-index]")];

  function showSlide(index) {
    activeIndex = (index + slides.length) % slides.length;
    slides.forEach((slide, slideIndex) => {
      const active = slideIndex === activeIndex;
      slide.classList.toggle("active", active);
      slide.setAttribute("aria-hidden", String(!active));
    });
    dots.forEach((dot, dotIndex) => {
      dot.setAttribute("aria-current", String(dotIndex === activeIndex));
    });
  }

  slider.addEventListener("click", event => {
    const control = event.target.closest("[data-slider-step], [data-slider-index]");
    if (!control) return;
    if (control.hasAttribute("data-slider-step")) {
      showSlide(activeIndex + Number(control.dataset.sliderStep));
    } else {
      showSlide(Number(control.dataset.sliderIndex));
    }
  });
}

async function loadSlider() {
  try {
    const [sliderSnapshot, seriesSnapshot] = await Promise.all([
      get(ref(db, "slider")),
      get(ref(db, "series"))
    ]);
    const selectedIds = Object.values(sliderSnapshot.val() || {});
    const seriesById = seriesSnapshot.val() || {};
    const seriesList = selectedIds
      .filter(id => typeof id === "string" && seriesById[id])
      .map(id => ({ id, ...seriesById[id] }));
    renderSlider(seriesList);
  } catch (error) {
    console.error("Failed to load homepage slider:", error);
    slider.innerHTML = `
      <div class="slider-empty" role="status">
        <h2>تعذر تحميل السلايدر</h2>
        <p>تحقق من الاتصال وقواعد Realtime Database ثم أعد تحميل الصفحة.</p>
      </div>`;
  }
}

loadSlider();
