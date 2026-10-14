import { db } from "./firebase.js";

import {
  ref,
  push,
  set
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-database.js";

const seriesForm = document.getElementById("seriesForm");
const seriesStatus = document.getElementById("status");
const saveSeriesBtn = document.getElementById("saveBtn");

let savingSeries = false;

function showStatus(element, message, error = false) {
  element.textContent = message;
  element.style.color = error ? "#ff8585" : "#9ee6a8";
}

function validUrl(value, fieldName) {
  const text = String(value || "").trim();
  if (!text) return "";
  if (/^[a-z][a-z\d+.-]*:/i.test(text) && !/^https?:\/\//i.test(text)) {
    throw new Error(`رابط ${fieldName} غير صحيح.`);
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
    throw new Error(`رابط ${fieldName} غير صحيح.`);
  }
}

function optionalInteger(formData, fieldName, label, min, max = Number.MAX_SAFE_INTEGER) {
  const value = String(formData.get(fieldName) || "").trim();
  if (!value) return 0;

  const number = Number(value);
  if (!Number.isInteger(number) || number < min || number > max) {
    throw new Error(`تحقق من قيمة ${label}.`);
  }
  return number;
}

function optionalRating(formData) {
  const value = String(formData.get("rating") || "").trim();
  if (!value) return 0;

  const rating = Number(value);
  if (!Number.isFinite(rating) || rating < 0 || rating > 10) {
    throw new Error("التقييم يجب أن يكون بين 0 و10.");
  }
  return rating;
}

function formText(formData, fieldName) {
  return String(formData.get(fieldName) || "").trim();
}

function getSeriesData(formData, id) {
  const name = formText(formData, "name");
  if (!name) throw new Error("اكتب اسم المسلسل.");

  const year = optionalInteger(formData, "year", "سنة الإصدار", 1900, 2100);
  const result = {
    id,
    name,
    type: formText(formData, "type"),
    year,
    countries: formText(formData, "countries"),
    description: formText(formData, "description"),
    audioLanguage: formText(formData, "audioLanguage"),
    subtitleLanguage: formText(formData, "subtitleLanguage"),
    genre: formText(formData, "genre") || "other",
    coverUrl: validUrl(formText(formData, "coverUrl"), "الغلاف"),
    desktopBackgroundUrl: validUrl(
      formText(formData, "desktopBackgroundUrl"),
      "خلفية الكمبيوتر"
    ),
    mobileBackgroundUrl: validUrl(
      formText(formData, "mobileBackgroundUrl"),
      "خلفية الهاتف"
    ),
    likes: optionalInteger(formData, "likes", "عدد الإعجابات", 0),
    studio: formText(formData, "studio"),
    rating: optionalRating(formData),
    episodeCount: optionalInteger(formData, "episodeCount", "عدد الحلقات", 0),
    platform: formText(formData, "platform"),
    seasonCount: optionalInteger(formData, "seasonCount", "عدد المواسم", 0),
    previousSeasonId: formText(formData, "previousSeasonId"),
    nextSeasonId: formText(formData, "nextSeasonId")
  };

  return result;
}

seriesForm.addEventListener("submit", async event => {
  event.preventDefault();
  if (savingSeries) return;

  savingSeries = true;
  saveSeriesBtn.disabled = true;
  try {
    const newSeriesRef = push(ref(db, "series"));
    const data = getSeriesData(new FormData(seriesForm), newSeriesRef.key);
    await set(newSeriesRef, data);
    showStatus(seriesStatus, `تمت إضافة المسلسل بنجاح. المعرّف: ${newSeriesRef.key}`);
    seriesForm.reset();
  } catch (error) {
    console.error("Save series failed:", error);
    showStatus(
      seriesStatus,
      error.message && !error.code
        ? error.message
        : `تعذر حفظ المسلسل (${error.code || "خطأ غير معروف"}). تحقق من قواعد Realtime Database المنشورة.`,
      true
    );
  } finally {
    savingSeries = false;
    saveSeriesBtn.disabled = false;
  }
});
