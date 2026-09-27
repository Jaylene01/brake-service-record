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
  clearSampleBtn: document.querySelector("#clearSampleBtn"),
  saveRecordBtn: document.querySelector("#saveRecordBtn"),
};

let records = loadRecords();
let selectedId = records[0]?.id ?? null;

const today = new Date().toISOString().slice(0, 10);
document.querySelector("#serviceDate").value = today;

function loadRecords() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) ?? [];
  } catch {
    return [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
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

function addMonths(dateValue, months) {
  const date = new Date(`${dateValue}T00:00:00`);
  date.setMonth(date.getMonth() + Number(months || 0));
  return date.toISOString().slice(0, 10);
}

function calculateNext() {
  const date = document.querySelector("#serviceDate").value;
  const months = document.querySelector("#intervalMonths").value;
  const mileage = Number(document.querySelector("#currentMileage").value || 0);
  const interval = Number(document.querySelector("#mileageInterval").value || 0);
  const nextDate = date ? addMonths(date, months) : "";
  const nextMileage = mileage + interval;

  els.nextDatePreview.textContent = formatDate(nextDate);
  els.nextMileagePreview.textContent = nextMileage ? formatMileage(nextMileage) : "-";
  return { nextDate, nextMileage };
}

function createId() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return `record-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function getFormRecord() {
  const next = calculateNext();
  return {
    id: createId(),
    customerName: document.querySelector("#customerName").value.trim(),
    whatsapp: document.querySelector("#whatsapp").value.trim(),
    carPlate: document.querySelector("#carPlate").value.trim().toUpperCase(),
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
  els.lastService.textContent = records[0] ? formatDate(records[0].serviceDate) : "-";
}

function renderHistory() {
  const query = els.searchInput.value.trim().toLowerCase();
  const visible = records.filter((record) => {
    const haystack = `${record.customerName} ${record.carPlate} ${record.carModel}`.toLowerCase();
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
      <strong>${record.carPlate} · ${record.customerName}</strong>
      <span>${record.carModel || "Vehicle model not set"} · ${formatDate(record.serviceDate)} · Next ${formatDate(record.nextDate)}</span>
    `;
    main.addEventListener("click", () => {
      selectedId = record.id;
      renderCard();
      setView("card");
    });
    item.querySelector(".delete-button").addEventListener("click", () => deleteRecord(record.id));
    els.historyList.append(item);
  });
}

function renderCard() {
  const record = records.find((item) => item.id === selectedId) ?? records[0];
  if (!record) {
    els.cardDetails.innerHTML = '<div class="empty-state">Save a service record to generate a customer card.</div>';
    return;
  }

  selectedId = record.id;
  const details = [
    ["Customer", record.customerName],
    ["WhatsApp", record.whatsapp || "-"],
    ["Car Plate", record.carPlate],
    ["Vehicle", record.carModel || "-"],
    ["Service Date", formatDate(record.serviceDate)],
    ["Brake Fluid", record.fluidType],
    ["Mileage", formatMileage(record.currentMileage)],
    ["Next Mileage", formatMileage(record.nextMileage)],
    ["Next Change", formatDate(record.nextDate)],
    ["Notes", record.notes || "-"],
  ];

  els.cardDetails.innerHTML = details
    .map(([label, value]) => `<div><dt>${label}</dt><dd>${value}</dd></div>`)
    .join("");
}

function renderAll() {
  renderDashboard();
  renderHistory();
  renderCard();
}

function deleteRecord(id) {
  records = records.filter((record) => record.id !== id);
  if (selectedId === id) selectedId = records[0]?.id ?? null;
  saveRecords();
  renderAll();
}

function saveCurrentRecord() {
  if (!els.form.reportValidity()) return;
  const record = getFormRecord();
  records = [record, ...records];
  selectedId = record.id;
  saveRecords();
  els.form.reset();
  document.querySelector("#serviceDate").value = today;
  document.querySelector("#fluidType").value = "DOT 4";
  document.querySelector("#intervalMonths").value = "24";
  document.querySelector("#mileageInterval").value = "40000";
  calculateNext();
  renderAll();
  setView("card");
}

function shareSelected() {
  const record = records.find((item) => item.id === selectedId) ?? records[0];
  if (!record) return;

  const message = [
    "WEIDE LUXURY Brake Service Record",
    `Customer: ${record.customerName}`,
    `Vehicle: ${record.carPlate}${record.carModel ? ` (${record.carModel})` : ""}`,
    `Brake Fluid / Oil: ${record.fluidType}`,
    `Service Date: ${formatDate(record.serviceDate)}`,
    `Mileage: ${formatMileage(record.currentMileage)}`,
    `Next Brake Fluid Change: ${formatDate(record.nextDate)}`,
    `Next Mileage: ${formatMileage(record.nextMileage)}`,
    "专注刹车，只做刹车",
    "Focus on Brakes. Drive with Confidence.",
    "WhatsApp: 016-230 0968",
  ].join("\n");

  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
}

els.form.addEventListener("input", calculateNext);
els.form.addEventListener("submit", (event) => {
  event.preventDefault();
  saveCurrentRecord();
});
els.saveRecordBtn.addEventListener("click", (event) => {
  event.preventDefault();
  saveCurrentRecord();
});

els.tabs.forEach((tab) => tab.addEventListener("click", () => setView(tab.dataset.view)));
els.searchInput.addEventListener("input", renderHistory);
els.shareBtn.addEventListener("click", shareSelected);
els.printBtn.addEventListener("click", () => window.print());
els.cardPrintBtn.addEventListener("click", () => window.print());
els.clearSampleBtn.addEventListener("click", () => {
  if (!records.length || !confirm("Clear all saved service records on this device?")) return;
  records = [];
  selectedId = null;
  saveRecords();
  renderAll();
});

calculateNext();
renderAll();
