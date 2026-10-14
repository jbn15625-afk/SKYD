import { db } from "./firebase.js";
import {
  get,
  ref
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

const list = document.getElementById("selectedSliders");

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

function renderSelectedSliders(seriesList) {
  if (!seriesList.length) {
    list.innerHTML = `
      <div class="selected-sliders-empty">
        <h2>لا توجد سلايدرات مختارة</h2>
        <p>اختر المسلسلات من صفحة إدارة السلايدر لتظهر هنا.</p>
        <a class="primary-button" href="slider.html">اختيار أنميات السلايدر</a>
      </div>`;
    return;
  }

  list.innerHTML = seriesList.map(series => {
    const name = escapeHTML(series.name || "مسلسل بدون اسم");
    const year = series.year ? escapeHTML(series.year) : "السنة غير محددة";
    const description = series.description
      ? escapeHTML(series.description)
      : "لا يوجد وصف لهذا المسلسل.";
    const background = validHttpUrl(series.desktopBackgroundUrl);
    const image = background
      ? `<img class="selected-slider-background" src="${escapeHTML(background)}" alt="خلفية الكمبيوتر لمسلسل ${name}" loading="lazy">`
      : `<div class="selected-slider-placeholder" aria-label="لا توجد خلفية كمبيوتر">لا توجد صورة كمبيوتر</div>`;

    return `
      <article class="selected-slider-card">
        <div class="selected-slider-image">${image}</div>
        <div class="selected-slider-info">
          <h2>${name}</h2>
          <p class="selected-slider-year">${year}</p>
          <p class="selected-slider-description">${description}</p>
        </div>
      </article>`;
  }).join("");
}

async function loadSelectedSliders() {
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
    renderSelectedSliders(seriesList);
  } catch (error) {
    console.error("Failed to load selected sliders:", error);
    list.innerHTML = `
      <p class="selected-sliders-state selected-sliders-error" role="status">
        تعذر تحميل السلايدرات. تحقق من الاتصال وقواعد Realtime Database ثم أعد تحميل الصفحة.
      </p>`;
  }
}

loadSelectedSliders();
