import { db } from "./firebase.js";
import {
  get,
  ref
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

const grid = document.getElementById("seriesGrid");
let allSeries = [];
const genreLabels = {
  action: "أكشن",
  school: "مدرسي",
  drama: "دراما",
  comedy: "كوميديا",
  romance: "رومانسي",
  thriller: "تشويق",
  other: "أخرى"
};

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function renderSeries(filter = "all") {
  if (!grid) return;

  const filtered = allSeries.filter(series => {
    if (filter === "all") return true;
    return String(series.genre || "").toLowerCase().includes(filter);
  });

  if (filtered.length === 0) {
    grid.innerHTML = `
      <article class="empty-state">
        <span>✦</span>
        <h3>${allSeries.length ? "لا توجد نتائج" : "لا توجد مسلسلات حتى الآن"}</h3>
        <p>${allSeries.length
          ? "جرّب اختيار تصنيف آخر."
          : "أضف مسلسلات إلى Realtime Database لتظهر هنا."}</p>
      </article>`;
    return;
  }

  grid.innerHTML = filtered.map(series => {
    const id = encodeURIComponent(series.id);
    const name = escapeHTML(series.name || "مسلسل بدون اسم");
    const genre = escapeHTML(genreLabels[series.genre] || series.genre || "غير مصنف");
    const year = escapeHTML(series.year || "");
    const rating = Number(series.rating);
    const ratingText = Number.isFinite(rating) && rating > 0
      ? `<span class="series-rating">★ ${rating.toFixed(1)}</span>`
      : "";

    const cover = typeof series.coverUrl === "string"
      ? series.coverUrl.trim()
      : "";

    const image = /^https?:\/\//i.test(cover)
      ? `<img class="series-cover" src="${escapeHTML(cover)}" alt="${name}" loading="lazy">`
      : `<div class="series-cover-placeholder">✦</div>`;

    return `
      <a class="series-card" href="series-details.html?id=${id}" aria-label="عرض تفاصيل ${name}">
        <div class="series-poster">
          ${image}
          ${ratingText}
        </div>
        <div class="series-info">
          <h3>${name}</h3>
          <div class="series-meta">
            <span>${genre}</span>
            ${year ? `<span>${year}</span>` : ""}
          </div>
          <p>${escapeHTML(series.description || "")}</p>
        </div>
      </a>`;
  }).join("");
}

async function loadSeries() {
  if (!grid) return;

  grid.innerHTML = `
    <article class="empty-state">
      <span>✦</span>
      <h3>جارٍ تحميل المسلسلات...</h3>
      <p>لحظات من فضلك.</p>
    </article>`;

  try {
    const snapshot = await get(ref(db, "series"));
    const series = snapshot.val() || {};
    allSeries = Object.entries(series).map(([id, data]) => ({
      id,
      ...data
    }));

    renderSeries();
  } catch (error) {
    console.error("Failed to load series:", error);
    grid.innerHTML = `
      <article class="empty-state">
        <span>!</span>
        <h3>تعذر تحميل المسلسلات</h3>
        <p>تحقق من إعداد Realtime Database وقواعد الأمان، ثم حدّث الصفحة.</p>
      </article>`;
  }
}

document.querySelectorAll(".filter").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".filter").forEach(item => {
      item.classList.remove("active");
    });
    button.classList.add("active");
    renderSeries(button.dataset.filter || "all");
  });
});

loadSeries();
