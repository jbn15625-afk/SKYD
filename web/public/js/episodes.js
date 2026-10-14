import { db } from "./firebase.js";
import {
  get,
  ref,
  push,
  set
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

const form = document.getElementById("episodeForm");
const statusBox = document.getElementById("episodeStatus");
const list = document.getElementById("episodeList");
const seriesSelect = document.getElementById("episodeSeriesId");
const saveButton = document.getElementById("saveEpisodeBtn");

let seriesItems = [];
let saving = false;

function showStatus(message, error = false) {
  statusBox.textContent = message;
  statusBox.style.color = error ? "#ff8585" : "#9ee6a8";
}

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);
}

function formText(data, name) {
  return String(data.get(name) || "").trim();
}

function validUrl(value, label, required = false) {
  const text = String(value || "").trim();
  if (!text) {
    if (required) throw new Error(`أدخل رابط ${label}.`);
    return "";
  }
  if (/^[a-z][a-z\d+.-]*:/i.test(text) && !/^https?:\/\//i.test(text)) {
    throw new Error(`رابط ${label} غير صحيح.`);
  }

  try {
    const normalized = /^https?:\/\//i.test(text)
      ? text
      : text.startsWith("//")
        ? `https:${text}`
        : `https://${text}`;
    const url = new URL(normalized);
    if (!["https:", "http:"].includes(url.protocol) || !url.hostname) {
      throw new Error();
    }
    return url.href;
  } catch {
    throw new Error(`رابط ${label} غير صحيح.`);
  }
}

function getEpisodeData(data, id) {
  const seriesId = formText(data, "seriesId");
  if (!seriesItems.some(series => series.id === seriesId)) {
    throw new Error("اختر مسلسلًا موجودًا.");
  }

  const episodeName = formText(data, "episodeName");
  if (!episodeName) throw new Error("اكتب اسم الحلقة.");

  const durationText = formText(data, "duration");
  const duration = durationText ? Number(durationText) : 0;
  if (!Number.isInteger(duration) || duration < 0) {
    throw new Error("تحقق من مدة الحلقة.");
  }

  return {
    seriesId,
    episodeId: id,
    episodeGroupName: formText(data, "episodeGroupName"),
    episodeUrl: validUrl(formText(data, "episodeUrl"), "الحلقة", true),
    episodeName,
    duration,
    additionalUrl: validUrl(formText(data, "additionalUrl"), "الرابط الإضافي"),
    description: formText(data, "description")
  };
}

async function loadSeries() {
  try {
    const snapshot = await get(ref(db, "series"));
    const series = snapshot.val() || {};
    seriesItems = Object.entries(series).map(([id, data]) => ({
      ...data,
      id
    }));

    if (seriesItems.length === 0) {
      seriesSelect.innerHTML = '<option value="">أضف مسلسلًا أولًا</option>';
      seriesSelect.disabled = true;
      saveButton.disabled = true;
      return;
    }

    seriesSelect.innerHTML = [
      '<option value="">اختر المسلسل</option>',
      ...seriesItems.map(series =>
        `<option value="${escapeHTML(series.id)}">${escapeHTML(series.name || series.id)}</option>`
      )
    ].join("");
    seriesSelect.disabled = false;
    saveButton.disabled = false;
  } catch (error) {
    console.error("Load series failed:", error);
    seriesSelect.innerHTML = '<option value="">تعذر تحميل المسلسلات</option>';
    seriesSelect.disabled = true;
    saveButton.disabled = true;
    showStatus("تعذر تحميل قائمة المسلسلات. تحقق من قواعد Realtime Database.", true);
  }
}

async function loadEpisodes() {
  list.textContent = "جارٍ تحميل الحلقات...";
  try {
    const snapshot = await get(ref(db, "episodes"));
    const episodes = snapshot.val() || {};
    const items = Object.entries(episodes).map(([id, episode]) => ({
      ...episode,
      id
    }));

    if (items.length === 0) {
      list.textContent = "لا توجد حلقات حتى الآن.";
      return;
    }

    list.innerHTML = items.map(episode => {
      const parentSeries = seriesItems.find(series => series.id === episode.seriesId);
      const details = [
        `معرّف الحلقة: ${episode.episodeId || episode.id}`,
        `المسلسل: ${parentSeries?.name || episode.seriesId}`,
        episode.episodeGroupName && `المجموعة: ${episode.episodeGroupName}`,
        episode.duration > 0 && `المدة: ${episode.duration} دقيقة`
      ].filter(Boolean).map(escapeHTML).join(" · ");
      const watchUrl = escapeHTML(episode.episodeUrl || "");

      return `
        <article class="series-item">
          <h3>${escapeHTML(episode.episodeName || "حلقة بدون اسم")}</h3>
          <div class="muted">${details}</div>
          <p class="muted">${escapeHTML(episode.description || "")}</p>
          ${watchUrl ? `<a class="episode-link" href="${watchUrl}" target="_blank" rel="noopener noreferrer">رابط مشاهدة الحلقة</a>` : ""}
        </article>`;
    }).join("");
  } catch (error) {
    console.error("Load episodes failed:", error);
    list.textContent = "تعذر تحميل الحلقات. تحقق من قواعد Realtime Database.";
  }
}

form.addEventListener("submit", async event => {
  event.preventDefault();
  if (saving) return;

  saving = true;
  saveButton.disabled = true;
  try {
    const episodeRef = push(ref(db, "episodes"));
    const data = getEpisodeData(new FormData(form), episodeRef.key);
    await set(episodeRef, data);
    showStatus(`تمت إضافة الحلقة بنجاح. المعرّف: ${episodeRef.key}`);
    form.reset();
    await loadEpisodes();
  } catch (error) {
    console.error("Save episode failed:", error);
    showStatus(
      error.message && !error.code
        ? error.message
        : `تعذر حفظ الحلقة (${error.code || "خطأ غير معروف"}). تحقق من قواعد Realtime Database المنشورة.`,
      true
    );
  } finally {
    saving = false;
    saveButton.disabled = seriesItems.length === 0;
  }
});

async function initializePage() {
  await loadSeries();
  await loadEpisodes();
}

initializePage();
