/**
 * =====================================================================
 *  DAILY ACTIVITY DASHBOARD — BACKEND (Google Apps Script)  ·  v5
 * =====================================================================
 *  Cara pasang (sekali saja):
 *   1. Buka Google Sheets Anda → Extensions → Apps Script → tempel seluruh file ini.
 *   2. Ganti EDITOR_PIN & VIEWER_PIN di bawah (JANGAN dibiarkan default).
 *   3. Project Settings → Time zone → (GMT+07:00) Asia/Jakarta.
 *   4. Pilih fungsi  setup  → Run → izinkan akses. (Membuat 4 sheet + header otomatis.)
 *   5. Deploy → Manage deployments → ikon pensil (Edit) → Version: "New version" → Deploy.
 *      (URL /exec tetap sama, jadi tidak perlu mengubah Vercel.)
 *      Pertama kali deploy: Execute as "Me", Who has access "Anyone".
 *
 *  Peran:
 *   - EDITOR_PIN  → Bu Miranty : bisa input / ubah / hapus / impor.
 *   - VIEWER_PIN  → Monitoring : hanya melihat.
 * =====================================================================
 */

var CFG = {
  TZ: 'Asia/Jakarta',
  EDITOR_PIN: 'ISI-PIN-EDITOR',
  VIEWER_PIN: 'ISI-PIN-MONITOR'
};

var SCHEMAS = {
  DISPOSISI: {
    headers: ['id', 'tipe', 'dept', 'pengajuan_user', 'pengajuan_disposisi', 'approval_bm',
      'approval_head_regional', 'approval_vp', 'approval_direksi', 'disposisi_selesai',
      'disposisi_kirim_user', 'status', 'reff', 'disposisi', 'qty', 'idr', 'keterangan',
      'sla_bm_hari', 'sla_nonbm_hari', 'sla_bm', 'sla_nonbm', 'created_at', 'updated_at'],
    dates: ['pengajuan_user', 'pengajuan_disposisi', 'approval_bm', 'approval_head_regional',
      'approval_vp', 'approval_direksi', 'disposisi_selesai', 'disposisi_kirim_user'],
    numbers: ['qty', 'idr', 'sla_bm_hari', 'sla_nonbm_hari'],
    stamps: ['approval_bm', 'approval_head_regional', 'approval_vp', 'approval_direksi',
      'disposisi_selesai', 'disposisi_kirim_user']
  },
  SPPD: {
    headers: ['id', 'pengajuan_user', 'approve_bm', 'sppd_dikirim_user', 'nomor_sppd',
      'mulai_perjalanan', 'berakhir_perjalanan', 'karyawan', 'sla_hari', 'sla',
      'created_at', 'updated_at'],
    dates: ['pengajuan_user', 'approve_bm', 'sppd_dikirim_user', 'mulai_perjalanan', 'berakhir_perjalanan'],
    numbers: ['sla_hari'],
    stamps: ['approve_bm', 'sppd_dikirim_user']
  },
  MOM: {
    headers: ['id', 'tanggal', 'judul_rapat', 'peserta', 'pembahasan', 'keputusan',
      'action_items', 'pic', 'deadline', 'status', 'created_at', 'updated_at'],
    dates: ['tanggal', 'deadline'],
    numbers: [],
    stamps: []
  },
  TODO: {
    headers: ['id', 'judul', 'grup', 'status', 'tanggal', 'project', 'created_at', 'updated_at'],
    dates: ['tanggal'],
    numbers: [],
    stamps: []
  }
};

// Batas SLA (mengikuti rumus pada file Excel rekap lama)
var SLA = { BM: 3, NONBM: 10, SPPD: 3 };

/* ------------------------------------------------------------------ */
/*  ENTRY POINTS                                                       */
/* ------------------------------------------------------------------ */

function doGet() {
  // Sengaja TIDAK mengembalikan data. Data hanya bisa diambil lewat POST + PIN.
  return out({ ok: true, service: 'daily-activity', time: nowStamp() });
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  var locked = false;
  try {
    var req = JSON.parse(e.postData.contents);
    var role = roleOf(req.pin);
    if (role === 'CONFIG') return out({ ok: false, error: 'PIN belum diatur di kode.gs (masih default).' });
    if (!role) return out({ ok: false, error: 'PIN salah.' });

    var action = req.action;
    var writes = ['insert', 'update', 'stamp', 'remove', 'bulk'];
    if (writes.indexOf(action) > -1) {
      if (role !== 'editor') return out({ ok: false, error: 'Akun monitoring hanya dapat melihat data.' });
      lock.waitLock(30000);
      locked = true;
    }

    if (action === 'list') return out(doList(role));
    if (action === 'insert') return out(doInsert(req));
    if (action === 'update') return out(doUpdate(req));
    if (action === 'stamp') return out(doStamp(req));
    if (action === 'remove') return out(doRemove(req));
    if (action === 'bulk') return out(doBulk(req));
    return out({ ok: false, error: 'Aksi tidak dikenal: ' + action });
  } catch (err) {
    return out({ ok: false, error: String(err && err.message ? err.message : err) });
  } finally {
    if (locked) lock.releaseLock();
  }
}

/** Jalankan SEKALI dari editor Apps Script untuk membuat semua sheet. */
function setup() {
  Object.keys(SCHEMAS).forEach(function (name) { ensureSheet(name); });
  Logger.log('Setup selesai: ' + Object.keys(SCHEMAS).join(', '));
}

/* ------------------------------------------------------------------ */
/*  ACTIONS                                                            */
/* ------------------------------------------------------------------ */

function doList(role) {
  var data = {};
  Object.keys(SCHEMAS).forEach(function (name) {
    var sh = ensureSheet(name);
    data[name] = readRows(sh).rows.map(stripInternal);
  });
  return { ok: true, role: role, data: data, server_time: nowStamp() };
}

function doInsert(req) {
  var name = req.sheet, schema = need(name);
  var sh = ensureSheet(name);
  var rec = sanitize(schema, req.record || {});
  applyInsertDefaults(name, rec, true);
  validateRequired(name, rec);

  var key = keyOf(name, rec);
  if (key && key !== '|') {
    var existing = readRows(sh).rows;
    for (var i = 0; i < existing.length; i++) {
      if (keyOf(name, existing[i]) === key) throw new Error('Data dengan nomor/REFF yang sama sudah ada.');
    }
  }
  rec.id = newId();
  rec.created_at = nowStamp();
  rec.updated_at = rec.created_at;
  computeFields(name, rec);
  sh.appendRow(toRow(sh, rec));
  return { ok: true, record: rec };
}

function doUpdate(req) {
  var name = req.sheet, schema = need(name);
  var sh = ensureSheet(name);
  var found = findById(sh, req.id);
  var patch = sanitize(schema, req.record || {}, true);
  var rec = found.rec;
  Object.keys(patch).forEach(function (k) { rec[k] = patch[k]; });
  rec.updated_at = nowStamp();
  computeFields(name, rec);
  writeRow(sh, found.row, rec);
  return { ok: true, record: stripInternal(rec) };
}

function doStamp(req) {
  var name = req.sheet, schema = need(name);
  if (schema.stamps.indexOf(req.field) === -1) throw new Error('Kolom tidak bisa di-stamp: ' + req.field);
  var sh = ensureSheet(name);
  var found = findById(sh, req.id);
  var rec = found.rec;
  rec[req.field] = req.clear ? '' : today();           // tanggal WIB dari server
  if (name === 'DISPOSISI' && req.field === 'disposisi_kirim_user' && !req.clear) rec.status = 'Done';
  rec.updated_at = nowStamp();
  computeFields(name, rec);
  writeRow(sh, found.row, rec);
  return { ok: true, record: stripInternal(rec) };
}

function doRemove(req) {
  var name = req.sheet; need(name);
  var sh = ensureSheet(name);
  var found = findById(sh, req.id);
  sh.deleteRow(found.row);
  return { ok: true, id: req.id };
}

/** Impor massal (riwayat dari Excel). Baris yang sudah ada (REFF / Nomor SPPD sama) dilewati. */
function doBulk(req) {
  var name = req.sheet, schema = need(name);
  var sh = ensureSheet(name);
  var list = req.records || [];
  var seen = {};
  readRows(sh).rows.forEach(function (r) { var k = keyOf(name, r); if (k) seen[k] = true; });

  var toAdd = [], skipped = 0;
  list.forEach(function (raw) {
    var rec = sanitize(schema, raw);
    applyInsertDefaults(name, rec, false);          // false = jangan isi tanggal otomatis (riwayat)
    var k = keyOf(name, rec);
    if (!k || k === '|') { skipped++; return; }
    if (seen[k]) { skipped++; return; }
    seen[k] = true;
    rec.id = newId();
    rec.created_at = nowStamp();
    rec.updated_at = rec.created_at;
    computeFields(name, rec);
    toAdd.push(toRow(sh, rec));
  });

  if (toAdd.length) {
    var start = sh.getLastRow() + 1;
    var lack = start + toAdd.length - 1 - sh.getMaxRows();
    if (lack > 0) sh.insertRowsAfter(sh.getMaxRows(), lack);
    sh.getRange(start, 1, toAdd.length, toAdd[0].length).setValues(toAdd);
  }
  return { ok: true, inserted: toAdd.length, skipped: skipped };
}

/* ------------------------------------------------------------------ */
/*  BUSINESS RULES                                                     */
/* ------------------------------------------------------------------ */

function applyInsertDefaults(name, rec, autoDates) {
  var t = today();
  if (name === 'DISPOSISI') {
    if (!rec.status) rec.status = 'On Progres';
    if (autoDates) {
      if (!rec.pengajuan_disposisi) rec.pengajuan_disposisi = t;   // otomatis tanggal
      if (!rec.pengajuan_user) rec.pengajuan_user = t;
    }
  } else if (name === 'SPPD') {
    if (autoDates && !rec.pengajuan_user) rec.pengajuan_user = t;   // otomatis tanggal
  } else if (name === 'MOM') {
    if (!rec.status) rec.status = 'Open';
    if (autoDates && !rec.tanggal) rec.tanggal = t;
  } else if (name === 'TODO') {
    if (!rec.grup) rec.grup = 'Unplanned';
    if (!rec.status) rec.status = 'To Do';
  }
}

function validateRequired(name, rec) {
  var req = {
    DISPOSISI: ['tipe', 'dept', 'disposisi'],
    SPPD: ['nomor_sppd', 'karyawan'],
    MOM: ['judul_rapat'],
    TODO: ['judul']
  }[name] || [];
  req.forEach(function (f) { if (!rec[f]) throw new Error('Kolom "' + f + '" wajib diisi.'); });
}

/** Hitung SLA — sama persis dengan rumus Excel lama. */
function computeFields(name, r) {
  if (name === 'DISPOSISI') {
    var bm = diff(r.approval_bm, r.pengajuan_disposisi);
    var last = r.approval_direksi || r.approval_vp || r.approval_head_regional || r.approval_bm;
    var nonbm = diff(last, r.pengajuan_disposisi);
    r.sla_bm_hari = bm === null ? '' : bm;
    r.sla_nonbm_hari = nonbm === null ? '' : nonbm;
    r.sla_bm = bm === null ? '' : (bm <= SLA.BM ? 'achive' : 'tidak achive');
    r.sla_nonbm = nonbm === null ? '' : (nonbm <= SLA.NONBM ? 'achive' : 'tidak achive');
  } else if (name === 'SPPD') {
    var d = diff(r.sppd_dikirim_user, r.approve_bm);
    if (d === null) { r.sla_hari = ''; r.sla = ''; }
    else { d = Math.abs(d); r.sla_hari = d; r.sla = d <= SLA.SPPD ? 'achive' : 'tidak achive'; }
  }
}

function keyOf(name, r) {
  var s = function (v) { return String(v === undefined || v === null ? '' : v).trim().toLowerCase(); };
  if (name === 'DISPOSISI') return s(r.reff) || (s(r.disposisi) + '|' + s(r.pengajuan_disposisi));
  if (name === 'SPPD') return s(r.nomor_sppd);
  if (name === 'MOM') return s(r.judul_rapat) + '|' + s(r.tanggal);
  return '';
}

/* ------------------------------------------------------------------ */
/*  SHEET HELPERS                                                      */
/* ------------------------------------------------------------------ */

function ensureSheet(name) {
  var schema = need(name);
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(name) || ss.insertSheet(name);

  if (sh.getLastRow() === 0) {
    var h = schema.headers;
    sh.getRange(1, 1, 1, h.length).setValues([h])
      .setFontWeight('bold').setBackground('#14213d').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    h.forEach(function (col, i) {
      if (schema.numbers.indexOf(col) === -1) {
        sh.getRange(2, i + 1, Math.max(sh.getMaxRows() - 1, 1), 1).setNumberFormat('@');
      }
    });
  } else {
    // tambahkan kolom yang belum ada (jika skema bertambah)
    var cur = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
    schema.headers.forEach(function (col) {
      if (cur.indexOf(col) === -1) {
        sh.getRange(1, cur.length + 1).setValue(col)
          .setFontWeight('bold').setBackground('#14213d').setFontColor('#ffffff');
        cur.push(col);
      }
    });
  }
  return sh;
}

function getHeaders(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
}

function readRows(sh) {
  var last = sh.getLastRow(), cols = sh.getLastColumn();
  var headers = getHeaders(sh);
  if (last < 2) return { headers: headers, rows: [] };
  var vals = sh.getRange(2, 1, last - 1, cols).getValues();
  var rows = [];
  for (var r = 0; r < vals.length; r++) {
    var o = {}, empty = true;
    for (var c = 0; c < headers.length; c++) {
      if (!headers[c]) continue;
      var v = norm(vals[r][c]);
      o[headers[c]] = v;
      if (v !== '') empty = false;
    }
    if (!empty && o.id) { o.__row = r + 2; rows.push(o); }
  }
  return { headers: headers, rows: rows };
}

function findById(sh, id) {
  var rows = readRows(sh).rows;
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].id) === String(id)) return { row: rows[i].__row, rec: rows[i] };
  }
  throw new Error('Data tidak ditemukan (mungkin sudah dihapus).');
}

function toRow(sh, rec) {
  return getHeaders(sh).map(function (h) { return rec[h] === undefined || rec[h] === null ? '' : rec[h]; });
}

function writeRow(sh, rowIndex, rec) {
  var row = toRow(sh, rec);
  sh.getRange(rowIndex, 1, 1, row.length).setValues([row]);
}

function sanitize(schema, input, partial) {
  var o = {};
  schema.headers.forEach(function (h) {
    if (h === 'id' || h === 'created_at' || h === 'updated_at' || h.indexOf('sla') === 0) return;
    if (!(h in input)) { return; }
    var v = input[h];
    if (v === null || v === undefined) v = '';
    if (schema.dates.indexOf(h) > -1) {
      v = String(v).trim();
      o[h] = /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : '';
    } else if (schema.numbers.indexOf(h) > -1) {
      var n = Number(v);
      o[h] = (v === '' || isNaN(n)) ? '' : n;
    } else {
      o[h] = String(v).trim();
    }
  });
  return o;
}

function stripInternal(r) { var c = {}; Object.keys(r).forEach(function (k) { if (k !== '__row') c[k] = r[k]; }); return c; }
function need(name) { if (!SCHEMAS[name]) throw new Error('Sheet tidak dikenal: ' + name); return SCHEMAS[name]; }

/* ------------------------------------------------------------------ */
/*  UTIL                                                               */
/* ------------------------------------------------------------------ */

function roleOf(pin) {
  var e = CFG.EDITOR_PIN, v = CFG.VIEWER_PIN;
  if (e === 'ISI-PIN-EDITOR' || v === 'ISI-PIN-MONITOR') return 'CONFIG';
  pin = String(pin || '');
  if (pin === e) return 'editor';
  if (pin === v) return 'viewer';
  return null;
}

function norm(v) {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return Utilities.formatDate(v, CFG.TZ, 'yyyy-MM-dd');
  return v;
}

function diff(a, b) {
  var re = /^\d{4}-\d{2}-\d{2}$/;
  if (!re.test(String(a || '')) || !re.test(String(b || ''))) return null;
  var ms = function (s) { return Date.UTC(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)); };
  return Math.round((ms(a) - ms(b)) / 86400000);
}

function today() { return Utilities.formatDate(new Date(), CFG.TZ, 'yyyy-MM-dd'); }
function nowStamp() { return Utilities.formatDate(new Date(), CFG.TZ, 'yyyy-MM-dd HH:mm:ss'); }
function newId() { return Utilities.getUuid().replace(/-/g, '').slice(0, 10); }
function out(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
