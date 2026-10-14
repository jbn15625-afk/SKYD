import { db } from "./firebase.js";
import {
  get,
  ref,
  update
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

const details = document.getElementById("seriesDetails");
const state = document.getElementById("detailsState");
let currentSeries;
let currentEpisodes;
let currentSeriesId = "";
let isEditing = false;
let saveMessage = "";

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function safeText(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function validHttpUrl(value) {
  const text = safeText(value);
  if (!text) return "";
  try {
    const url = new URL(text);
    return ["https:", "http:"].includes(url.protocol) ? url.href : "";
  } catch {
    return "";
  }
}

const seriesFields = [
  ["id", "معرّف المسلسل (ID)"],
  ["name", "اسم المسلسل"],
  ["type", "النوع"],
  ["year", "سنة الإنتاج"],
  ["countries", "الدول المنتجة"],
  ["description", "الوصف"],
  ["audioLanguage", "لغة الصوت"],
  ["subtitleLanguage", "لغة الترجمة"],
  ["genre", "التصنيف"],
  ["likes", "عدد الإعجابات"],
  ["studio", "الاستوديو المنتج"],
  ["rating", "التقييم"],
  ["episodeCount", "عدد الحلقات"],
  ["platform", "المنصة"],
  ["seasonCount", "عدد المواسم"],
  ["previousSeasonId", "معرّف الموسم السابق"],
  ["nextSeasonId", "معرّف الموسم التالي"]
];

const seriesImageFields = [
  ["coverUrl", "صورة الغلاف"],
  ["desktopBackgroundUrl", "خلفية الكمبيوتر"],
  ["mobileBackgroundUrl", "خلفية الهاتف"]
];

const genreOptions = [
  ["action", "أكشن"],
  ["school", "مدرسي"],
  ["drama", "دراما"],
  ["comedy", "كوميديا"],
  ["romance", "رومانسي"],
  ["thriller", "تشويق"],
  ["other", "أخرى"]
];

const numericFields = new Set(["year", "likes", "rating", "episodeCount", "seasonCount"]);

function formatDatabaseValue(value) {
  if (value === null) return "null";
  if (value === undefined || value === "") return "فارغ";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

function seriesFieldControl(field) {
  const value = field.value ?? "";
  const name = escapeHTML(field.name);
  const escapedValue = escapeHTML(value);

  if (field.name === "id") {
    return `<input name="${name}" value="${escapedValue}" readonly aria-label="${escapeHTML(field.label)}">`;
  }
  if (field.name === "description") {
    return `<textarea name="${name}" maxlength="3000" aria-label="${escapeHTML(field.label)}">${escapedValue}</textarea>`;
  }
  if (field.name === "genre") {
    const selectedOption = genreOptions.some(([key]) => key === String(value))
      ? ""
      : `<option value="${escapedValue}" selected>${escapedValue}</option>`;
    return `
      <select name="${name}" required aria-label="${escapeHTML(field.label)}">
        ${selectedOption}
        ${genreOptions.map(([key, label]) => `
          <option value="${key}"${key === String(value) ? " selected" : ""}>${label}</option>
        `).join("")}
      </select>`;
  }

  const type = numericFields.has(field.name) ? "number" : "text";
  let numericAttributes = "";
  if (type === "number") {
    numericAttributes = field.name === "year"
      ? 'min="0" max="2100" step="1"'
      : field.name === "rating"
        ? 'min="0" max="10" step="any"'
        : 'min="0" step="1"';
  }
  const maxLength = field.name === "type"
    ? 'maxlength="60"'
    : field.name === "audioLanguage" || field.name === "subtitleLanguage"
      ? 'maxlength="100"'
      : field.name === "countries"
      ? 'maxlength="300"'
      : field.name === "studio" || field.name === "platform"
        ? 'maxlength="150"'
        : field.name === "previousSeasonId" || field.name === "nextSeasonId"
          ? 'maxlength="150"'
          : field.name === "name"
            ? 'maxlength="150" required'
            : "";

  return `<input name="${name}" type="${type}" value="${escapedValue}" ${numericAttributes} ${maxLength} aria-label="${escapeHTML(field.label)}">`;
}

function databaseFieldItem(field) {
  if (isEditing && seriesFields.some(([key]) => key === field.name)) {
    return `
      <div class="detail-fact">
        <dt>${escapeHTML(field.label)} <code>${escapeHTML(field.name)}</code></dt>
        <dd>${seriesFieldControl(field)}</dd>
      </div>`;
  }

  const text = formatDatabaseValue(field.value);
  const url = validHttpUrl(text);
  const renderedValue = url
    ? `<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">${escapeHTML(text)}</a>`
    : `<span>${escapeHTML(text)}</span>`;

  return `
    <div class="detail-fact">
      <dt>${escapeHTML(field.label)} <code>${escapeHTML(field.name)}</code></dt>
      <dd>${renderedValue}</dd>
    </div>`;
}

function renderSeriesImages(series) {
  return `
    <section class="details-section">
      <h2>صور المسلسل</h2>
      <div class="series-image-gallery">
        ${seriesImageFields.map(([key, label]) => {
          const url = validHttpUrl(series[key]);
          return `
            <figure class="series-image-card">
              <figcaption>${escapeHTML(label)}</figcaption>
              ${url
                ? `<a href="${escapeHTML(url)}" target="_blank" rel="noopener noreferrer">
                    <img src="${escapeHTML(url)}" alt="${escapeHTML(label)}" loading="lazy">
                  </a>`
                : `<div class="series-image-placeholder">لا توجد صورة</div>`}
              ${isEditing ? `
                <label class="image-url-editor">
                  <span>رابط الصورة</span>
                  <input name="${escapeHTML(key)}" type="text" maxlength="2048" value="${escapeHTML(series[key] ?? "")}" aria-label="رابط ${escapeHTML(label)}">
                </label>` : ""}
            </figure>`;
        }).join("")}
      </div>
    </section>`;
}

function renderEpisodes(episodes, seriesId) {
  const matching = Object.entries(episodes || {})
    .map(([id, episode]) => ({ ...episode, id }))
    .filter(episode => episode.seriesId === seriesId);

  if (matching.length === 0) {
    return `
      <section class="details-section">
        <h2>الحلقات</h2>
        <p class="details-empty">لم تتم إضافة حلقات لهذا المسلسل بعد.</p>
      </section>`;
  }

  const groups = new Map();
  for (const episode of matching) {
    const groupName = safeText(episode.episodeGroupName) || "الحلقات";
    if (!groups.has(groupName)) groups.set(groupName, []);
    groups.get(groupName).push(episode);
  }

  const groupHtml = [...groups.entries()].map(([groupName, groupEpisodes]) => `
    <section class="episode-group">
      <h3>${escapeHTML(groupName)}</h3>
      <div class="episode-cards">
        ${groupEpisodes.map(episode => {
          const watchUrl = validHttpUrl(episode.episodeUrl);
          const additionalUrl = validHttpUrl(episode.additionalUrl);
          const title = escapeHTML(episode.episodeName || "حلقة بدون اسم");
          return `
            <article class="episode-card">
              <div class="episode-card-heading">
                <span class="episode-play" aria-hidden="true">▶</span>
                <div>
                  <h4>${title}</h4>
                  <p class="muted">
                    ${episode.duration > 0 ? `${escapeHTML(episode.duration)} دقيقة` : ""}
                    ${episode.episodeId ? ` · رقم الحلقة: ${escapeHTML(episode.episodeId)}` : ""}
                  </p>
                </div>
              </div>
              ${episode.description ? `<p>${escapeHTML(episode.description)}</p>` : ""}
              <div class="episode-links">
                ${watchUrl ? `<a class="primary-button" href="${escapeHTML(watchUrl)}" target="_blank" rel="noopener noreferrer">مشاهدة الحلقة</a>` : ""}
                ${additionalUrl ? `<a class="episode-secondary-link" href="${escapeHTML(additionalUrl)}" target="_blank" rel="noopener noreferrer">رابط إضافي</a>` : ""}
              </div>
            </article>`;
        }).join("")}
      </div>
    </section>`).join("");

  return `
    <section class="details-section">
      <h2>الحلقات <span class="section-count">${matching.length}</span></h2>
      ${groupHtml}
    </section>`;
}

function renderSeries(series, episodes, id) {
  currentSeries = { ...series, id: safeText(series.id) || id };
  currentEpisodes = episodes;
  currentSeriesId = id;
  series = currentSeries;
  const name = safeText(series.name) || "مسلسل بدون اسم";
  const previousId = safeText(series.previousSeasonId);
  const nextId = safeText(series.nextSeasonId);

  document.title = `${name} | AniMerc`;
  details.innerHTML = `
    <div id="seriesEditForm">
      <div class="series-edit-toolbar">
        ${isEditing
          ? `<button class="primary-button" type="button" data-series-action="save">حفظ التعديلات</button>
             <button class="secondary-button" type="button" data-series-action="cancel">إلغاء</button>`
          : `<button class="primary-button" type="button" data-series-action="edit">تعديل البيانات</button>`}
        <p id="seriesEditStatus" role="status">${escapeHTML(saveMessage)}</p>
      </div>
    <div class="series-detail-columns">
      <section class="details-section">
        <h2>معلومات المسلسل</h2>
        <dl class="details-facts">
          ${[
            ...seriesFields.map(([key, label]) => ({
              name: key,
              label,
              value: series[key]
            })),
            ...Object.keys(series)
              .filter(key => !seriesFields.some(([knownKey]) => knownKey === key)
                && !seriesImageFields.some(([imageKey]) => imageKey === key))
              .map(key => ({ name: key, label: key, value: series[key] }))
          ].map(databaseFieldItem).join("")}
        </dl>
        ${(previousId || nextId) ? `
          <div class="season-navigation">
            ${previousId ? `<a href="series-details.html?id=${encodeURIComponent(previousId)}">← الموسم السابق</a>` : ""}
            ${nextId ? `<a href="series-details.html?id=${encodeURIComponent(nextId)}">الموسم التالي →</a>` : ""}
          </div>` : ""}
      </section>

      ${renderSeriesImages(series)}
    </div>
    </div>

    <div id="seriesEpisodes">
      ${renderEpisodes(episodes, id)}
    </div>`;

  state.hidden = true;
  details.hidden = false;
}

async function saveSeries(form) {
  const controls = [...form.querySelectorAll("[name]")];
  if (!controls.every(control => control.reportValidity())) return;

  const updates = {};
  for (const control of controls) {
    const { name: key, value } = control;
    updates[key] = numericFields.has(key) ? Number(value) : String(value);
  }
  if (updates.year !== 0 && (updates.year < 1900 || updates.year > 2100)) {
    const yearInput = form.querySelector('[name="year"]');
    yearInput.setCustomValidity("أدخل 0 أو سنة بين 1900 و2100.");
    yearInput.reportValidity();
    yearInput.setCustomValidity("");
    return;
  }

  const saveButton = form.querySelector('[data-series-action="save"]');
  const status = form.querySelector("#seriesEditStatus");
  saveButton.disabled = true;
  status.textContent = "جارٍ حفظ التعديلات...";
  status.classList.remove("series-edit-error");

  try {
    await update(ref(db, `series/${currentSeriesId}`), updates);
    currentSeries = { ...currentSeries, ...updates };
    isEditing = false;
    saveMessage = "تم حفظ التعديلات بنجاح.";
    renderSeries(currentSeries, currentEpisodes, currentSeriesId);
  } catch (error) {
    console.error("Save series changes failed:", error);
    status.textContent = error.code === "PERMISSION_DENIED"
      ? "رفضت قواعد قاعدة البيانات الحفظ. تأكد من نشر القواعد وتحقق من صحة القيم المدخلة."
      : `تعذر حفظ التعديلات (${error.code || "خطأ غير معروف"}): ${error.message || "تحقق من الاتصال ثم أعد المحاولة."}`;
    status.classList.add("series-edit-error");
    saveButton.disabled = false;
  }
}

details.addEventListener("click", async event => {
  const button = event.target.closest("[data-series-action]");
  if (!button) return;

  if (button.dataset.seriesAction === "save") {
    await saveSeries(button.closest("#seriesEditForm"));
    return;
  }

  isEditing = button.dataset.seriesAction === "edit";
  saveMessage = "";
  renderSeries(currentSeries, currentEpisodes, currentSeriesId);
});

async function loadSeriesDetails() {
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) {
    state.innerHTML = "<h1>لم يتم تحديد المسلسل</h1><p>ارجع إلى قائمة المسلسلات واختر مسلسلًا.</p>";
    return;
  }

  try {
    const [seriesSnapshot, episodesSnapshot] = await Promise.all([
      get(ref(db, `series/${id}`)),
      get(ref(db, "episodes"))
    ]);

    if (!seriesSnapshot.exists()) {
      state.innerHTML = "<h1>المسلسل غير موجود</h1><p>ربما حُذف المسلسل أو أن الرابط غير صحيح.</p>";
      return;
    }

    renderSeries(seriesSnapshot.val(), episodesSnapshot.val() || {}, id);
  } catch (error) {
    console.error("Load series details failed:", error);
    state.innerHTML = "<h1>تعذر تحميل معلومات المسلسل</h1><p>تحقق من الاتصال وقواعد Realtime Database ثم أعد المحاولة.</p>";
  }
}

loadSeriesDetails();
