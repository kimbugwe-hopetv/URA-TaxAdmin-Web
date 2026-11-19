const collections = {
  taxpayers: { label: "Taxpayers", description: "Taxpayer profiles, registration details and operating status." },
  tax_assessments: { label: "Tax assessments", description: "Assessment periods, tax heads, declared values and liabilities." },
  tax_incentives_exemptions: { label: "Tax incentives & exemptions", description: "Approved incentives, exemption benefits and validity periods." },
  efris_transactions: { label: "EFRIS transactions", description: "Fiscal document records, parties, items and transaction values." }
};
let activeCollection = "taxpayers";
let currentRecords = [];
let editingId = null;
let searchTimer;

const $ = (id) => document.getElementById(id);
const titleCase = (s) => s.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
const pretty = (value) => value === null || value === undefined ? "—" :
  typeof value === "object" ? JSON.stringify(value) : typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);

async function api(url, options={}) {
  const response = await fetch(url, { headers: { "Content-Type":"application/json" }, ...options });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.success === false) throw new Error(body.message || `Request failed (${response.status})`);
  return body;
}
function toast(message) {
  $("toast").textContent = message;
  $("toast").classList.add("show");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => $("toast").classList.remove("show"), 2800);
}
function setConnection(online) {
  $("connection-status").classList.toggle("online", online);
  $("connection-status").innerHTML = `<i></i>${online ? "MongoDB Atlas connected" : "Database unavailable"}`;
  $("side-dot").classList.toggle("online", online);
  $("side-status").textContent = online ? "Database connected" : "Connection unavailable";
}
async function checkConnection() {
  try { await api("/api/health.js"); setConnection(true); return true; }
  catch (e) { setConnection(false); return false; }
}
async function loadStats() {
  const result = await api("/api/stats.js");
  const d = result.data;
  $("stat-total").textContent = Number(d.total || 0).toLocaleString();
  Object.keys(collections).forEach(name => {
    $(`stat-${name}`).textContent = Number(d[name] || 0).toLocaleString();
    $(`nav-${name}`).textContent = Number(d[name] || 0).toLocaleString();
  });
}
async function loadCollection(name=activeCollection, search="") {
  activeCollection = name;
  const meta = collections[name];
  $("page-title").textContent = meta.label;
  $("collection-heading").textContent = meta.label;
  $("collection-description").textContent = meta.description;
  $("overview-view").hidden = true;
  $("collection-view").hidden = false;
  document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.collection === name));
  $("table-wrap").innerHTML = '<div class="empty-state">Loading records...</div>';
  try {
    const result = await api(`/api/records?collection=${encodeURIComponent(name)}&limit=100&search=${encodeURIComponent(search)}`);
    currentRecords = result.data || [];
    renderTable();
    $("record-count").textContent = `${currentRecords.length} record${currentRecords.length === 1 ? "" : "s"}`;
    $("table-footnote").textContent = "Showing up to 100 records";
  } catch (e) {
    currentRecords = [];
    $("table-wrap").innerHTML = `<div class="empty-state error">${escapeHtml(e.message)}</div>`;
    $("record-count").textContent = "Unable to load";
    setConnection(false);
  }
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}
function renderTable() {
  if (!currentRecords.length) {
    $("table-wrap").innerHTML = '<div class="empty-state">No records found in this collection.</div>';
    return;
  }
  const keys = [...new Set(currentRecords.flatMap(record => Object.keys(record)))];
  const visibleKeys = keys.filter(k => k !== "__v");
  const head = visibleKeys.map(k => `<th>${escapeHtml(titleCase(k))}</th>`).join("");
  const rows = currentRecords.map((record, index) => {
    const cells = visibleKeys.map(k => {
      const value = record[k];
      const shown = value && typeof value === "object" ? `<span class="cell-json">${Array.isArray(value) ? `Array (${value.length})` : "Nested object"} · ${escapeHtml(JSON.stringify(value).slice(0,100))}${JSON.stringify(value).length>100?"…":""}</span>` : escapeHtml(pretty(value));
      return `<td title="${escapeHtml(pretty(value))}">${shown}</td>`;
    }).join("");
    return `<tr>${cells}<td><div class="row-actions"><button data-edit="${index}">Edit</button><button class="delete" data-delete="${index}">Delete</button></div></td></tr>`;
  }).join("");
  $("table-wrap").innerHTML = `<table><thead><tr>${head}<th>Actions</th></tr></thead><tbody>${rows}</tbody></table>`;
  $("table-wrap").querySelectorAll("[data-edit]").forEach(b => b.addEventListener("click", () => openEditor(currentRecords[Number(b.dataset.edit)])));
  $("table-wrap").querySelectorAll("[data-delete]").forEach(b => b.addEventListener("click", () => deleteRecord(currentRecords[Number(b.dataset.delete)])));
}
function openEditor(record=null) {
  editingId = record?._id ?? null;
  $("modal-title").textContent = record ? "Edit record" : "Add record";
  $("record-json").value = JSON.stringify(record || {}, null, 2);
  $("record-modal").hidden = false;
  $("record-json").focus();
}
function closeEditor() { $("record-modal").hidden = true; editingId = null; }
async function saveRecord() {
  let document;
  try { document = JSON.parse($("record-json").value); }
  catch { toast("Please enter valid JSON."); return; }
  if (!document || Array.isArray(document) || typeof document !== "object") { toast("A record must be a JSON object."); return; }
  const isEdit = editingId !== null;
  const url = `/api/records?collection=${encodeURIComponent(activeCollection)}${isEdit ? `&id=${encodeURIComponent(editingId)}` : ""}`;
  try {
    await api(url, { method: isEdit ? "PUT" : "POST", body: JSON.stringify(document) });
    closeEditor();
    toast(isEdit ? "Record updated." : "Record added.");
    await Promise.all([loadCollection(activeCollection, $("search-input").value), loadStats()]);
  } catch(e) { toast(e.message); }
}
async function deleteRecord(record) {
  if (!confirm(`Delete record "${record._id}"? This cannot be undone.`)) return;
  try {
    await api(`/api/records?collection=${encodeURIComponent(activeCollection)}&id=${encodeURIComponent(record._id)}`, {method:"DELETE"});
    toast("Record deleted.");
    await Promise.all([loadCollection(activeCollection, $("search-input").value), loadStats()]);
  } catch(e) { toast(e.message); }
}
async function refreshAll() {
  const ok = await checkConnection();
  if (!ok) { toast("Could not connect. Check Vercel and Atlas settings."); return; }
  try { await loadStats(); if (!$("collection-view").hidden) await loadCollection(activeCollection, $("search-input").value); toast("Data refreshed."); }
  catch(e) { toast(e.message); }
}
function showOverview() {
  $("overview-view").hidden = false; $("collection-view").hidden = true;
  $("page-title").textContent = "Overview";
  document.querySelectorAll(".nav-item").forEach(b => b.classList.toggle("active", b.dataset.view === "overview"));
}

document.querySelectorAll("[data-collection]").forEach(button => button.addEventListener("click", () => {
  $("search-input").value = "";
  loadCollection(button.dataset.collection);
}));
document.querySelector('[data-view="overview"]').addEventListener("click", showOverview);
$("back-btn").addEventListener("click", showOverview);
$("add-btn").addEventListener("click", () => openEditor());
$("save-record").addEventListener("click", saveRecord);
$("close-modal").addEventListener("click", closeEditor);
$("cancel-modal").addEventListener("click", closeEditor);
$("record-modal").addEventListener("click", e => { if (e.target === $("record-modal")) closeEditor(); });
$("refresh-btn").addEventListener("click", refreshAll);
$("reload-btn").addEventListener("click", () => loadCollection(activeCollection, $("search-input").value));
$("search-input").addEventListener("input", () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => loadCollection(activeCollection, $("search-input").value), 300);
});
(async function init() {
  const ok = await checkConnection();
  if (ok) {
    try { await loadStats(); } catch(e) { toast(e.message); }
  } else {
    $("table-wrap").innerHTML = '<div class="empty-state error">Unable to reach MongoDB Atlas. Configure MONGODB_URI in Vercel and allow Vercel network access in Atlas.</div>';
  }
})();
