import { db } from "./firebase.js";
import {
  get,
  ref,
  update
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

const list = document.getElementById("sliderSeriesList");
const status = document.getElementById("sliderAdminStatus");
const count = document.getElementById("sliderSelectionCount");
const saveButton = document.getElementById("saveSliderSelection");
let originalEntries = {};

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

function updateSelectionCount() {
  const selected = list.querySelectorAll('input[name="sliderSeries"]:checked').length;
  count.textContent = selected
    ? `تم اختيار ${selected} مسلسل`
    : "لم يتم اختيار مسلسلات";
  saveButton.disabled = false;
}

function renderSeriesList(seriesMap) {
  const entries = Object.entries(seriesMap || {});
  if (entries.length === 0) {
    list.innerHTML = `<p class="empty-state">لا توجد مسلسلات للاختيار. أضف مسلسلًا أولًا.</p>`;
    saveButton.disabled = true;
    return;
  }

  const selectedIds = new Set(Object.values(originalEntries));
  list.innerHTML = entries.map(([id, series]) => {
    const name = escapeHTML(series.name || "مسلسل بدون اسم");
    const cover = validHttpUrl(series.coverUrl);
    const image = cover
      ? `<img src="${escapeHTML(cover)}" alt="" loading="lazy">`
      : `<span class="slider-series-placeholder" aria-hidden="true">✦</span>`;
    return `
      <label class="slider-series-option">
        <input name="sliderSeries" type="checkbox" value="${escapeHTML(id)}"${selectedIds.has(id) ? " checked" : ""}>
        ${image}
        <span class="slider-series-option-copy">
          <strong>${name}</strong>
          <span>${series.year ? escapeHTML(series.year) : "السنة غير محددة"}</span>
          <code>${escapeHTML(id)}</code>
        </span>
      </label>`;
  }).join("");
  updateSelectionCount();
}

list.addEventListener("change", event => {
  if (event.target.matches('input[name="sliderSeries"]')) updateSelectionCount();
});

saveButton.addEventListener("click", async () => {
  const selectedIds = [...list.querySelectorAll('input[name="sliderSeries"]:checked')]
    .map(input => input.value);
  const updates = {};
  Object.keys(originalEntries).forEach(key => {
    updates[key] = null;
  });
  selectedIds.forEach((id, index) => {
    updates[String(index)] = id;
  });

  saveButton.disabled = true;
  status.textContent = "جارٍ حفظ اختيار السلايدر...";
  status.classList.remove("slider-admin-error");
  try {
    if (Object.keys(updates).length) {
      await update(ref(db, "slider"), updates);
    }
    originalEntries = Object.fromEntries(selectedIds.map((id, index) => [String(index), id]));
    status.textContent = "تم حفظ اختيار السلايدر بنجاح.";
  } catch (error) {
    console.error("Failed to save slider selection:", error);
    status.textContent = error.code === "PERMISSION_DENIED"
      ? "رفضت قواعد قاعدة البيانات الحفظ. انشر قواعد Realtime Database المحدّثة."
      : `تعذر حفظ الاختيار (${error.code || "خطأ غير معروف"}): ${error.message || "تحقق من الاتصال."}`;
    status.classList.add("slider-admin-error");
  } finally {
    updateSelectionCount();
  }
});

async function loadSliderManager() {
  try {
    const [seriesSnapshot, sliderSnapshot] = await Promise.all([
      get(ref(db, "series")),
      get(ref(db, "slider"))
    ]);
    originalEntries = sliderSnapshot.val() || {};
    renderSeriesList(seriesSnapshot.val());
    status.textContent = "حدد المسلسلات التي تريد عرضها في السلايدر.";
  } catch (error) {
    console.error("Failed to load slider manager:", error);
    status.textContent = "تعذر تحميل المسلسلات. تحقق من الاتصال وقواعد Realtime Database.";
    status.classList.add("slider-admin-error");
    saveButton.disabled = true;
  }
}

loadSliderManager();
