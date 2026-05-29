/**
 * Resume Critique — frontend logic.
 *
 * Backend contract (you'll implement in Python):
 *   POST /api/critique
 *     Content-Type: multipart/form-data
 *     Fields:
 *       - file        (optional) the uploaded resume
 *       - resume_text (optional) pasted resume text
 *       - role        (optional) target role string
 *
 *   Expected JSON response:
 *     {
 *       "score": 78,                          // 0-100
 *       "summary": "Overall the resume is...", // short paragraph
 *       "strengths": ["...", "..."],
 *       "improvements": ["...", "..."],
 *       "sections": [
 *         { "name": "Experience", "score": 85, "feedback": "..." },
 *         ...
 *       ]
 *     }
 *
 * Change API_ENDPOINT below to point at your Python backend.
 */

const API_ENDPOINT = "/api/critique";
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
];
const ALLOWED_EXT = /\.(pdf|docx?|txt)$/i;

// ---------- DOM refs ----------
const form = document.getElementById("resume-form");
const dropzone = document.getElementById("dropzone");
const fileInput = document.getElementById("file");
const fileInfo = document.getElementById("file-info");
const fileNameEl = document.getElementById("file-name");
const fileRemove = document.getElementById("file-remove");
const dropzoneContent = dropzone.querySelector(".dropzone-content");
const textarea = document.getElementById("resume-text");
const roleInput = document.getElementById("role");
const submitBtn = document.getElementById("submit-btn");
const resetBtn = document.getElementById("reset-btn");
const errorEl = document.getElementById("form-error");
const resultEl = document.getElementById("result");

document.getElementById("year").textContent = new Date().getFullYear();

// ---------- File handling ----------
function setFile(file) {
  if (!file) return clearFile();

  if (file.size > MAX_FILE_SIZE) {
    return showError("File is too large. Maximum size is 5MB.");
  }
  if (!ALLOWED_TYPES.includes(file.type) && !ALLOWED_EXT.test(file.name)) {
    return showError("Unsupported file type. Please upload PDF, DOCX, or TXT.");
  }

  // Sync to the hidden input via DataTransfer
  const dt = new DataTransfer();
  dt.items.add(file);
  fileInput.files = dt.files;

  fileNameEl.textContent = `📄 ${file.name} (${formatBytes(file.size)})`;
  dropzoneContent.hidden = true;
  fileInfo.hidden = false;
  hideError();
}

function clearFile() {
  fileInput.value = "";
  fileNameEl.textContent = "";
  dropzoneContent.hidden = false;
  fileInfo.hidden = true;
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

dropzone.addEventListener("click", (e) => {
  if (e.target.closest("#file-info")) return;
  fileInput.click();
});
dropzone.addEventListener("keydown", (e) => {
  if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    fileInput.click();
  }
});
fileInput.addEventListener("change", () => setFile(fileInput.files[0]));
fileRemove.addEventListener("click", (e) => {
  e.stopPropagation();
  clearFile();
});

["dragenter", "dragover"].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    dropzone.classList.add("is-dragover");
  })
);
["dragleave", "drop"].forEach((ev) =>
  dropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    dropzone.classList.remove("is-dragover");
  })
);
dropzone.addEventListener("drop", (e) => {
  const file = e.dataTransfer.files?.[0];
  if (file) setFile(file);
});

// ---------- Error helpers ----------
function showError(msg) {
  errorEl.textContent = msg;
  errorEl.hidden = false;
}
function hideError() {
  errorEl.hidden = true;
  errorEl.textContent = "";
}

// ---------- Submit ----------
form.addEventListener("submit", async (e) => {
  e.preventDefault();
  hideError();

  const hasFile = fileInput.files && fileInput.files.length > 0;
  const text = textarea.value.trim();

  if (!hasFile && !text) {
    return showError("Please upload a file or paste your resume text.");
  }
  if (text && text.length < 50 && !hasFile) {
    return showError("Pasted resume seems too short. Please add more detail.");
  }

  const fd = new FormData();
  if (hasFile) fd.append("file", fileInput.files[0]);
  if (text) fd.append("resume_text", text);
  const role = roleInput.value.trim();
  if (role) fd.append("role", role);

  setLoading(true);
  try {
    const res = await fetch(API_ENDPOINT, { method: "POST", body: fd });
    if (!res.ok) {
      const detail = await safeReadError(res);
      throw new Error(detail || `Request failed (${res.status})`);
    }
    const data = await res.json();
    renderResult(data);
  } catch (err) {
    console.error(err);
    showError(err.message || "Something went wrong. Please try again.");
  } finally {
    setLoading(false);
  }
});

resetBtn.addEventListener("click", () => {
  clearFile();
  hideError();
  resultEl.hidden = true;
});

async function safeReadError(res) {
  try {
    const data = await res.json();
    return data.error || data.message;
  } catch {
    try { return await res.text(); } catch { return null; }
  }
}

function setLoading(loading) {
  submitBtn.disabled = loading;
  submitBtn.classList.toggle("is-loading", loading);
  submitBtn.querySelector(".btn-label").textContent = loading
    ? "Analyzing..."
    : "Get my critique";
}

// ---------- Render result ----------
function renderResult(data) {
  const score = clamp(Number(data.score) || 0, 0, 100);
  const ring = document.getElementById("score-ring");
  ring.style.setProperty("--score", score);
  document.getElementById("score-value").textContent = score;

  document.getElementById("result-time").textContent =
    new Date().toLocaleString();
  document.getElementById("result-summary").textContent =
    data.summary || "No summary provided.";

  fillList("result-strengths", data.strengths, "No strengths listed.");
  fillList("result-improvements", data.improvements, "No improvements listed.");

  const sectionsEl = document.getElementById("result-sections");
  sectionsEl.innerHTML = "";
  if (Array.isArray(data.sections) && data.sections.length) {
    const heading = document.createElement("h3");
    heading.textContent = "Section-by-section";
    heading.style.margin = "0 0 4px";
    sectionsEl.appendChild(heading);
    data.sections.forEach((s) => {
      const item = document.createElement("div");
      item.className = "section-item";
      item.innerHTML = `
        <h4>
          <span></span>
          <span class="section-score"></span>
        </h4>
        <p></p>`;
      item.querySelector("h4 span:first-child").textContent = s.name || "Section";
      item.querySelector(".section-score").textContent =
        (s.score != null ? `${clamp(Number(s.score), 0, 100)}/100` : "");
      item.querySelector("p").textContent = s.feedback || "";
      sectionsEl.appendChild(item);
    });
  }

  resultEl.hidden = false;
  resultEl.scrollIntoView({ behavior: "smooth", block: "start" });
}

function fillList(id, items, fallback) {
  const ul = document.getElementById(id);
  ul.innerHTML = "";
  if (!Array.isArray(items) || items.length === 0) {
    const li = document.createElement("li");
    li.className = "muted";
    li.textContent = fallback;
    ul.appendChild(li);
    return;
  }
  items.forEach((text) => {
    const li = document.createElement("li");
    li.textContent = String(text);
    ul.appendChild(li);
  });
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
