/* Shared by the app and regression tests; no storage or network side effects. */
(function (root) {
  const localDate = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  function addMonths(value, months) {
    const [year, month, day] = value.split('-').map(Number);
    const date = new Date(year, month - 1, 1, 12);
    date.setMonth(date.getMonth() + Number(months));
    date.setDate(Math.min(day, new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()));
    return localDate(date);
  }
  function nextRecordNo(records, date = localDate()) {
    const prefix = `WDBF-${date.replaceAll('-', '')}-`;
    const max = records.reduce((n, r) => {
      const suffix = String(r.recordNo || '').slice(prefix.length);
      return String(r.recordNo || '').startsWith(prefix) && /^\d+$/.test(suffix) ? Math.max(n, Number(suffix)) : n;
    }, 0);
    return `${prefix}${String(max + 1).padStart(3, '0')}`;
  }
  function phoneNumber(value) {
    let phone = value.replace(/[\s()+-]/g, '');
    if (!phone) return '';
    if (phone.startsWith('00')) phone = phone.slice(2);
    if (phone.startsWith('0')) phone = '60' + phone.slice(1);
    if (!/^[1-9]\d{7,14}$/.test(phone)) throw new Error('请填写完整 WhatsApp 号码，例如 012-345 6789 或 +60 12-345 6789。');
    return phone;
  }
  function readRecords(raw) {
    if (raw === null) return [];
    const records = JSON.parse(raw);
    if (!Array.isArray(records) || !records.every(r => r && typeof r === 'object' && typeof r.id === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.serviceDate) && /^\d{4}-\d{2}-\d{2}$/.test(r.nextDate))) {
      throw new Error('记录格式无法读取。请先导出备份再处理；现有资料未被覆盖。');
    }
    return records;
  }
  const core = { localDate, addMonths, nextRecordNo, phoneNumber, readRecords };
  if (typeof module !== 'undefined' && module.exports) module.exports = core;
  else root.ServiceCore = core;
})(typeof window !== 'undefined' ? window : globalThis);
