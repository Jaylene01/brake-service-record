const STORAGE_KEY = "weide-brake-service-records";

const els = {
  form: document.querySelector("#serviceForm"),
  tabs: document.querySelectorAll(".tab"),
  views: {
    form: document.querySelector("#formView"),
    history: document.querySelector("#historyView"),
    card: document.querySelector("#cardView"),
  },
  totalRecords: document.querySelector("#totalRecords"),
  dueSoon: document.querySelector("#dueSoon"),
  lastService: document.querySelector("#lastService"),
  nextDatePreview: document.querySelector("#nextDatePreview"),
  nextMileagePreview: document.querySelector("#nextMileagePreview"),
  historyList: document.querySelector("#historyList"),
  historyTemplate: document.querySelector("#historyItemTemplate"),
  searchInput: document.querySelector("#searchInput"),
  cardDetails: document.querySelector("#cardDetails"),
  shareBtn: document.querySelector("#shareBtn"),
  printBtn: document.querySelector("#printBtn"),
  cardPrintBtn: document.querySelector("#cardPrintBtn"),
  backupBtn: document.querySelector("#backupBtn"),
  saveRecordBtn: document.querySelector("#saveRecordBtn"),
};

let records = loadRecords();
let selectedId = records[0]?.id ?? null;

const today = ServiceCore.localDate();
document.querySelector("#serviceDate").value = today;
document.querySelector("#recordNo").value = generateRecordNo();

function notify(message, error = false) {
  const output = document.querySelector('#message');
  output.textContent = message;
  output.classList.toggle('error', error);
}

function loadRecords() {
  try {
    return ServiceCore.readRecords(localStorage.getItem(STORAGE_KEY));
  } catch {
    notify('无法读取本机记录。请导出备份后处理，现有资料未被覆盖。', true);
    return [];
  }
}

function escapeHtml(value = '') {
  const node = document.createElement('span');
  node.textContent = String(value);
  return node.innerHTML;
}

function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function formatMileage(value) {
  const number = Number(value);
  return Number.isFinite(number) ? `${number.toLocaleString()} km` : "-";
}

function calculateNext() {
  const date = document.querySelector("#serviceDate").value;
  const months = document.querySelector("#intervalMonths").value;
  const mileage = Number(document.querySelector("#currentMileage").value || 0);
  const interval = Number(document.querySelector("#mileageInterval").value || 0);
  const nextDate = date ? ServiceCore.addMonths(date, months) : "";
  const nextMileage = mileage + interval;

  els.nextDatePreview.textContent = formatDate(nextDate);
  els.nextMileagePreview.textContent = nextMileage ? formatMileage(nextMileage) : "-";
  return { nextDate, nextMileage };
}

function createId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `record-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function generateRecordNo() {
  return ServiceCore.nextRecordNo(records);
}

function getFormRecord() {
  const next = calculateNext();
  return {
    id: createId(),
    recordNo: generateRecordNo(),
    customerName: document.querySelector("#customerName").value.trim(),
    whatsapp: document.querySelector("#whatsapp").value.trim(),
    carPlate: document.querySelector("#carPlate").value.trim().toUpperCase(),
    vehicleBrand: document.querySelector("#vehicleBrand").value.trim(),
    carModel: document.querySelector("#carModel").value.trim(),
    currentMileage: Number(document.querySelector("#currentMileage").value || 0),
    serviceDate: document.querySelector("#serviceDate").value,
    fluidType: document.querySelector("#fluidType").value,
    intervalMonths: Number(document.querySelector("#intervalMonths").value),
    mileageInterval: Number(document.querySelector("#mileageInterval").value || 0),
    notes: document.querySelector("#notes").value.trim(),
    nextDate: next.nextDate,
    nextMileage: next.nextMileage,
    createdAt: new Date().toISOString(),
  };
}

function setView(name) {
  els.tabs.forEach((tab) => tab.classList.toggle("is-active", tab.dataset.view === name));
  Object.entries(els.views).forEach(([key, view]) => view.classList.toggle("is-active", key === name));
}

function renderDashboard() {
  els.totalRecords.textContent = records.length;
  const next60 = new Date();
  next60.setDate(next60.getDate() + 60);
  els.dueSoon.textContent = records.filter((record) => new Date(record.nextDate) <= next60).length;
  const latest = records.map(r => r.serviceDate).sort().at(-1);
  els.lastService.textContent = latest ? formatDate(latest) : "-";
}

function renderHistory() {
  const query = els.searchInput.value.trim().toLowerCase();
  const visible = records.filter((record) => {
    const haystack = `${record.recordNo} ${record.customerName} ${record.carPlate} ${record.vehicleBrand} ${record.carModel}`.toLowerCase();
    return haystack.includes(query);
  });

  els.historyList.innerHTML = "";
  if (!visible.length) {
    els.historyList.innerHTML = '<p class="empty-state">No service records yet.</p>';
    return;
  }

  visible.forEach((record) => {
    const item = els.historyTemplate.content.firstElementChild.cloneNode(true);
    const main = item.querySelector(".history-main");
    main.innerHTML = `
      <strong>${escapeHtml(record.recordNo || "No record no.")} · ${escapeHtml(record.carPlate)} · ${escapeHtml(record.customerName)}</strong>
      <span>${escapeHtml(record.vehicleBrand || "Brand not set")} ${escapeHtml(record.carModel || "")} · ${formatDate(record.serviceDate)} · Next ${formatDate(record.nextDate)}</span>
    `;
    main.addEventListener("click", () => {
      selectedId = record.id;
      renderCard();
      setView("card");
    });
    els.historyList.append(item);
  });
}

function renderCard() {
  const record = records.find((item) => item.id === selectedId) ?? records[0];
  els.shareBtn.disabled = els.cardPrintBtn.disabled = els.printBtn.disabled = !record;
  document.querySelector("#cardStatus").textContent = record ? "Saved" : "No record";
  if (!record) {
    els.cardDetails.innerHTML = '<div class="empty-state">Save a service record to generate a customer card.</div>';
    return;
  }

  selectedId = record.id;
  const details = [
    ["Record No.", record.recordNo || "-"],
    ["Customer", record.customerName],
    ["WhatsApp", record.whatsapp || "-"],
    ["Car Plate", record.carPlate],
    ["Brand", record.vehicleBrand || "-"],
    ["Vehicle", record.carModel || "-"],
    ["Service Date", formatDate(record.serviceDate)],
    ["Brake Fluid", record.fluidType],
    ["Mileage", formatMileage(record.currentMileage)],
    ["Next Mileage", formatMileage(record.nextMileage)],
    ["Next Change", formatDate(record.nextDate)],
    ["Notes", record.notes || "-"],
  ];

  els.cardDetails.innerHTML = details
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${escapeHtml(value)}</dd></div>`)
    .join("");
}

function renderAll() {
  renderDashboard();
  renderHistory();
  renderCard();
}

function saveCurrentRecord() {
  if (!els.form.reportValidity()) return;
  for (const id of ['customerName', 'carPlate', 'vehicleBrand']) {
    if (!document.querySelector('#' + id).value.trim()) {
      notify('顾客名称、车牌和品牌不能留空。', true);
      return;
    }
  }
  try {
    ServiceCore.phoneNumber(document.querySelector('#whatsapp').value);
    // Re-read before writing so a stale tab does not overwrite newer records.
    const latest = ServiceCore.readRecords(localStorage.getItem(STORAGE_KEY));
    records = latest;
    const record = getFormRecord();
    const next = [record, ...latest];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    records = next;
    selectedId = record.id;
  } catch (error) {
    notify('保存失败，表单已保留。' + error.message, true);
    return;
  }
  els.form.reset();
  document.querySelector('#serviceDate').value = ServiceCore.localDate();
  document.querySelector('#recordNo').value = generateRecordNo();
  calculateNext();
  renderAll();
  setView('card');
  notify('刹车油记录已保存到本机。');
}

function shareSelected() {
  const record = records.find((item) => item.id === selectedId) ?? records[0];
  if (!record) return;

  const message = [
    "WEIDE LUXURY Brake Fluid Service Record",
    `Record No.: ${record.recordNo || "-"}`,
    `Customer: ${record.customerName}`,
    `Vehicle: ${record.carPlate}${record.vehicleBrand ? ` · ${record.vehicleBrand}` : ""}${record.carModel ? ` ${record.carModel}` : ""}`,
    `Brake Fluid / Oil: ${record.fluidType}`,
    `Service Date: ${formatDate(record.serviceDate)}`,
    `Mileage: ${formatMileage(record.currentMileage)}`,
    `Next Brake Fluid Change: ${formatDate(record.nextDate)}`,
    `Next Mileage: ${formatMileage(record.nextMileage)}`,
    "下次更换以日期或里程先到者为准。",
    "专注刹车，只做刹车",
    "Focus on Brakes. Drive with Confidence.",
    "WhatsApp: 016-230 0968",
  ].join("\n");

  try {
    const phone = ServiceCore.phoneNumber(record.whatsapp || '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
  } catch (error) {
    notify(error.message, true);
  }
}

els.form.addEventListener("input", calculateNext);
els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  saveCurrentRecord();
});
els.tabs.forEach((tab) => tab.addEventListener("click", () => setView(tab.dataset.view)));
els.searchInput.addEventListener("input", renderHistory);
els.shareBtn.addEventListener("click", shareSelected);
els.printBtn.addEventListener("click", () => window.print());
els.cardPrintBtn.addEventListener("click", () => window.print());
els.backupBtn.addEventListener('click', () => {
  try {
    const backup = { app: 'WEIDE Brake Fluid Service Record', exportedAt: new Date().toISOString(), storageKey: STORAGE_KEY, rawRecords: localStorage.getItem(STORAGE_KEY) };
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `WEIDE-brake-fluid-backup-${ServiceCore.localDate()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (error) { notify('备份失败：' + error.message, true); }
});
window.addEventListener('storage', event => {
  if (event.key !== STORAGE_KEY) return;
  records = loadRecords();
  document.querySelector('#recordNo').value = generateRecordNo();
  renderAll();
});

calculateNext();
renderAll();
