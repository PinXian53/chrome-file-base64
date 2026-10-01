(function () {
  'use strict';

  var $ = function (id) { return document.getElementById(id); };
  var t = window.I18N.t;
  var PREVIEW_LIMIT = 200000;         // 結果框最多顯示的字元數，避免超大字串卡住頁面
  var THUMB_LIMIT = 30 * 1024 * 1024; // 超過此大小的圖片不自動產生縮圖

  // =====================================================================
  // 共用工具
  // =====================================================================
  function formatBytes(n) {
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    if (n < 1024 * 1024 * 1024) return (n / (1024 * 1024)).toFixed(2) + ' MB';
    return (n / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  function makeId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  function extOf(name) {
    var m = /\.([A-Za-z0-9]{1,6})$/.exec(name || '');
    return m ? m[1].toUpperCase() : 'FILE';
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }

  function svgIcon(paths) {
    var ns = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 24 24');
    s.setAttribute('aria-hidden', 'true');
    paths.forEach(function (d) {
      var p = document.createElementNS(ns, 'path');
      p.setAttribute('d', d);
      s.appendChild(p);
    });
    return s;
  }
  var ICON = {
    copy: ['M9 9h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-8a2 2 0 0 1-2-2Z', 'M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1'],
    download: ['M12 4v12', 'm7 11 5 5 5-5', 'M5 20h14'],
    check: ['m5 12 5 5 9-10'],
    x: ['M6 6l12 12M18 6 6 18'],
    trash: ['M4 7h16', 'M10 11v6M14 11v6', 'M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12', 'M9 7V4h6v3'],
    alert: ['M12 9v4', 'M12 17h.01', 'M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z'],
    spinner: ['M12 3a9 9 0 1 0 9 9'],
    arrow: ['M5 12h14', 'm13 6 6 6-6 6']
  };

  function btn(cls, iconName, label) {
    var b = el('button', 'btn ' + cls);
    if (iconName) b.appendChild(svgIcon(ICON[iconName]));
    b.appendChild(document.createTextNode(label));
    return b;
  }

  function setBtnLabel(b, iconName, label) {
    b.textContent = '';
    if (iconName) b.appendChild(svgIcon(ICON[iconName]));
    b.appendChild(document.createTextNode(label));
  }

  function flashDone(b, iconName, label, doneLabel) {
    setBtnLabel(b, 'check', doneLabel);
    b.classList.add('done');
    setTimeout(function () {
      setBtnLabel(b, iconName, label);
      b.classList.remove('done');
    }, 1400);
  }

  function toast(msg, type) {
    var t = el('div', 'toast ' + (type || 'ok'));
    t.appendChild(svgIcon(type === 'error' ? ICON.alert : ICON.check));
    t.appendChild(document.createTextNode(msg));
    $('toast-host').appendChild(t);
    setTimeout(function () {
      t.classList.add('out');
      setTimeout(function () { t.remove(); }, 220);
    }, type === 'error' ? 3800 : 2000);
  }

  function nextFrame() {
    return new Promise(function (r) { requestAnimationFrame(function () { setTimeout(r, 0); }); });
  }

  // ---------- Base64 編解碼（分段處理，避免超大字串爆記憶體） ----------
  function bytesToBase64(bytes) {
    var CHUNK = 3 * 0x4000; // 必須是 3 的倍數，分段 btoa 後才能直接相接
    var out = [];
    for (var i = 0; i < bytes.length; i += CHUNK) {
      var sub = bytes.subarray(i, i + CHUNK);
      var bin = '';
      for (var j = 0; j < sub.length; j += 0x2000) {
        bin += String.fromCharCode.apply(null, sub.subarray(j, j + 0x2000));
      }
      out.push(btoa(bin));
    }
    return out.join('');
  }

  // 清除空白、支援 URL-safe 字元並驗證字元（不檢查長度，可用於分割後的單一片段）
  function cleanBase64(str) {
    var s = str.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/');
    if (!/^[A-Za-z0-9+/]*=*$/.test(s)) {
      var bad = /[^A-Za-z0-9+/]|=(?!=*$)/.exec(s);
      throw new Error(t('err.badChar', bad[0], bad.index));
    }
    return s;
  }

  // 完整內容：驗證字元與長度並補齊 padding
  function normalizeBase64(str) {
    var body = cleanBase64(str).replace(/=+$/, '');
    if (body.length % 4 === 1) throw new Error(t('err.badLength'));
    while (body.length % 4) body += '=';
    return body;
  }

  function base64ToBlob(str, type) {
    var s = normalizeBase64(str);
    var CHUNK = 4 * 0x4000; // 4 的倍數
    var pieces = [];
    for (var i = 0; i < s.length; i += CHUNK) {
      var bin = atob(s.slice(i, i + CHUNK));
      var arr = new Uint8Array(bin.length);
      for (var j = 0; j < bin.length; j++) arr[j] = bin.charCodeAt(j);
      pieces.push(arr);
    }
    return new Blob(pieces, { type: type || 'application/octet-stream' });
  }

  function estimateDecodedSize(len) {
    return Math.max(0, Math.floor(len * 3 / 4));
  }

  // 由檔頭判斷檔案類型（用於沒有檔名資訊的純 Base64）
  var MAGIC = [
    { sig: [0x89, 0x50, 0x4E, 0x47], ext: 'png', type: 'image/png' },
    { sig: [0xFF, 0xD8, 0xFF], ext: 'jpg', type: 'image/jpeg' },
    { sig: [0x47, 0x49, 0x46, 0x38], ext: 'gif', type: 'image/gif' },
    { sig: [0x25, 0x50, 0x44, 0x46], ext: 'pdf', type: 'application/pdf' },
    { sig: [0x50, 0x4B, 0x03, 0x04], ext: 'zip', type: 'application/zip' },
    { sig: [0x1F, 0x8B], ext: 'gz', type: 'application/gzip' },
    { sig: [0x42, 0x4D], ext: 'bmp', type: 'image/bmp' },
    { sig: [0x49, 0x44, 0x33], ext: 'mp3', type: 'audio/mpeg' },
    { sig: [0x37, 0x7A, 0xBC, 0xAF], ext: '7z', type: 'application/x-7z-compressed' },
    { sig: [0x52, 0x61, 0x72, 0x21], ext: 'rar', type: 'application/vnd.rar' }
  ];
  function sniffType(b64) {
    var head;
    try {
      var bin = atob(normalizeBase64(b64.slice(0, 32)));
      head = [];
      for (var i = 0; i < bin.length; i++) head.push(bin.charCodeAt(i));
    } catch (e) { return null; }
    if (head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46 &&
        head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50) {
      return { ext: 'webp', type: 'image/webp' };
    }
    for (var k = 0; k < MAGIC.length; k++) {
      var m = MAGIC[k];
      if (m.sig.every(function (b, idx) { return head[idx] === b; })) return m;
    }
    var text = String.fromCharCode.apply(null, head).trim();
    if (/^<svg|^<\?xml/i.test(text)) return { ext: 'svg', type: 'image/svg+xml' };
    return null;
  }

  var MIME_EXT = {
    'image/png': 'png', 'image/jpeg': 'jpg', 'image/gif': 'gif', 'image/webp': 'webp', 'image/svg+xml': 'svg',
    'image/bmp': 'bmp', 'image/x-icon': 'ico', 'application/pdf': 'pdf', 'application/zip': 'zip',
    'application/json': 'json', 'text/plain': 'txt', 'text/html': 'html', 'text/css': 'css',
    'text/csv': 'csv', 'audio/mpeg': 'mp3', 'video/mp4': 'mp4', 'application/gzip': 'gz'
  };

  // ---------- 下載 ----------
  function safeFilename(name) {
    var n = String(name || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '_').replace(/^[\s.]+|[\s.]+$/g, '');
    return n || 'download';
  }

  function downloadBlob(blob, filename) {
    var url = URL.createObjectURL(blob);
    var name = safeFilename(filename);
    var fallback = function () {
      var a = document.createElement('a');
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
    };
    var cleanup = function () { setTimeout(function () { URL.revokeObjectURL(url); }, 60000); };
    if (window.chrome && chrome.downloads && chrome.downloads.download) {
      chrome.downloads.download({ url: url, filename: name, conflictAction: 'uniquify', saveAs: false }, function () {
        if (chrome.runtime.lastError) fallback();
        cleanup();
      });
    } else {
      fallback();
      cleanup();
    }
  }

  function downloadText(content, filename) {
    downloadBlob(new Blob([content], { type: 'text/plain' }), filename);
  }

  function copyText(text) {
    return navigator.clipboard.writeText(text);
  }

  // =====================================================================
  // 分頁切換
  // =====================================================================
  var tabsEl = document.querySelector('.tabs');
  var activeTab = 'encode';
  function switchTab(name) {
    activeTab = name;
    tabsEl.dataset.active = name;
    document.querySelectorAll('.tab').forEach(function (b) {
      var on = b.dataset.tab === name;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', on ? 'true' : 'false');
    });
    document.querySelectorAll('.panel').forEach(function (p) {
      p.classList.toggle('active', p.id === 'panel-' + name);
    });
    try { localStorage.setItem('fb64.tab', name); } catch (e) {}
  }
  document.querySelectorAll('.tab').forEach(function (b) {
    b.addEventListener('click', function () { switchTab(b.dataset.tab); });
  });
  try {
    var savedTab = localStorage.getItem('fb64.tab');
    if (savedTab === 'decode') switchTab('decode');
  } catch (e) {}

  // 拖放區共用設定
  function setupDropzone(zone, input, onFiles) {
    zone.addEventListener('dragover', function (e) { e.preventDefault(); zone.classList.add('drag'); });
    zone.addEventListener('dragleave', function (e) {
      if (!zone.contains(e.relatedTarget)) zone.classList.remove('drag');
    });
    zone.addEventListener('drop', function (e) {
      e.preventDefault();
      zone.classList.remove('drag');
      if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files);
    });
    zone.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
    });
    input.addEventListener('change', function () {
      if (input.files.length) onFiles(input.files);
      input.value = '';
    });
  }
  // 避免把檔案拖到拖放區外時，瀏覽器直接開啟該檔案
  window.addEventListener('dragover', function (e) { e.preventDefault(); });
  window.addEventListener('drop', function (e) { e.preventDefault(); });

  // =====================================================================
  // 編碼：檔案 → Base64
  // =====================================================================
  var encodeBtn = $('encode-btn');
  var encodeError = $('encode-error');
  var encodeResults = $('encode-results');
  var splitToggle = $('split-toggle');
  var selectedFile = null;
  var chipThumbUrl = null;
  var format = 'standard';
  var splitMode = 'size';

  setupDropzone($('encode-dropzone'), $('encode-file-input'), function (files) {
    setSelectedFile(files[0]);
    if (files.length > 1) toast(t('toast.oneFile'), 'error');
  });

  function setSelectedFile(file) {
    selectedFile = file;
    encodeError.textContent = '';
    encodeResults.textContent = '';
    if (chipThumbUrl) { URL.revokeObjectURL(chipThumbUrl); chipThumbUrl = null; }

    var chip = $('encode-file-chip');
    var icon = $('encode-file-ext');
    chip.hidden = !file;
    encodeBtn.disabled = !file;
    if (!file) { updateEstimate(); return; }

    $('encode-file-name').textContent = file.name || t('file.unnamed');
    $('encode-file-name').title = file.name;
    $('encode-file-meta').textContent = formatBytes(file.size) + t('sep') + (file.type || t('file.unknownType'));
    if (/^image\//.test(file.type) && file.size < THUMB_LIMIT) {
      chipThumbUrl = URL.createObjectURL(file);
      icon.textContent = '';
      icon.style.backgroundImage = 'url("' + chipThumbUrl + '")';
    } else {
      icon.style.backgroundImage = '';
      icon.textContent = extOf(file.name);
    }
    updateEstimate();
  }

  $('encode-file-clear').addEventListener('click', function (e) {
    e.preventDefault();
    setSelectedFile(null);
  });

  // 輸出格式
  document.querySelectorAll('#format-seg .seg').forEach(function (b) {
    b.addEventListener('click', function () {
      format = b.dataset.format;
      document.querySelectorAll('#format-seg .seg').forEach(function (x) { x.classList.toggle('active', x === b); });
      $('split-field').hidden = format !== 'standard';
      updateEstimate();
    });
  });

  // 分割設定
  splitToggle.addEventListener('change', function () {
    $('split-options').hidden = !splitToggle.checked;
    updateEstimate();
  });
  document.querySelectorAll('#split-mode-seg .mini').forEach(function (b) {
    b.addEventListener('click', function () {
      splitMode = b.dataset.mode;
      document.querySelectorAll('#split-mode-seg .mini').forEach(function (x) { x.classList.toggle('active', x === b); });
      $('size-row').hidden = splitMode !== 'size';
      $('count-row').hidden = splitMode !== 'count';
      updateEstimate();
    });
  });
  ['split-size-value', 'split-size-unit', 'split-count-value'].forEach(function (id) {
    $(id).addEventListener('input', updateEstimate);
  });

  function readSplitValue() {
    if (splitMode === 'size') {
      var unit = $('split-size-unit').value;
      var num = parseFloat($('split-size-value').value);
      if (!(num > 0)) throw new Error(t('err.sizePositive'));
      var bytes = Math.floor(num * (unit === 'MB' ? 1024 * 1024 : 1024));
      if (bytes < 512) throw new Error(t('err.sizeMin'));
      return bytes;
    }
    var count = parseInt($('split-count-value').value, 10);
    if (!(count >= 2)) throw new Error(t('err.countMin'));
    return count;
  }

  function buildHeader(filename, type, partIndex, partTotal, id) {
    return 'filename:' + encodeURIComponent(filename) +
      ';type:' + encodeURIComponent(type || 'application/octet-stream') +
      ';part:' + partIndex + '/' + partTotal +
      ';id:' + id + ';base64,';
  }

  function computeParts(b64Len, filename, type, mode, value, id) {
    if (mode === 'count') return Math.max(1, Math.min(Math.floor(value), Math.max(1, b64Len)));
    // 預留 part 編號變長的空間（例如 1/9 → 10/10）
    var sample = buildHeader(filename, type, 99999, 99999, id);
    var headerBytes = new TextEncoder().encode(sample).length;
    var available = Math.max(1, Math.floor(value) - headerBytes);
    return Math.max(1, Math.ceil(b64Len / available));
  }

  function splitBase64(b64, filename, type, mode, value) {
    var id = makeId();
    var numParts = computeParts(b64.length, filename, type, mode, value, id);
    var chunkLen = Math.ceil(b64.length / numParts) || 1;
    var chunks = [];
    for (var i = 0; i * chunkLen < b64.length || i === 0; i++) {
      chunks.push(b64.slice(i * chunkLen, (i + 1) * chunkLen));
    }
    var total = chunks.length;
    return chunks.map(function (c, idx) { return buildHeader(filename, type, idx + 1, total, id) + c; });
  }

  function updateEstimate() {
    var est = $('encode-estimate');
    var preview = $('split-preview');
    preview.textContent = '';
    if (!selectedFile) { est.textContent = ''; return; }
    var b64Len = Math.ceil(selectedFile.size / 3) * 4;
    est.textContent = t('estimate', formatBytes(b64Len));
    if (format === 'standard' && splitToggle.checked) {
      try {
        var v = readSplitValue();
        var n = computeParts(b64Len, selectedFile.name, selectedFile.type, splitMode, v, makeId());
        preview.textContent = t('split.preview', n, formatBytes(Math.ceil(b64Len / n)));
      } catch (e) {
        preview.textContent = e.message;
      }
    }
  }

  encodeBtn.addEventListener('click', function () {
    if (!selectedFile) return;
    var file = selectedFile;
    var splitValue = null;
    encodeError.textContent = '';
    if (format === 'standard' && splitToggle.checked) {
      try { splitValue = readSplitValue(); } catch (e) { encodeError.textContent = e.message; return; }
    }

    encodeBtn.disabled = true;
    encodeBtn.classList.add('loading');
    setBtnLabel(encodeBtn, 'spinner', t('encode.converting'));

    nextFrame().then(function () {
      return file.arrayBuffer();
    }).then(function (buf) {
      var b64 = bytesToBase64(new Uint8Array(buf));
      var name = file.name || 'file';
      var type = file.type || 'application/octet-stream';
      var records, fileNames;
      if (format === 'raw') {
        records = [b64];
        fileNames = [name + '.b64.txt'];
      } else if (format === 'datauri') {
        records = ['data:' + type + ';base64,' + b64];
        fileNames = [name + '.datauri.txt'];
      } else if (splitValue != null) {
        records = splitBase64(b64, name, type, splitMode, splitValue);
        fileNames = records.map(function (_, i) {
          return records.length > 1 ? name + '.part' + (i + 1) + 'of' + records.length + '.b64.txt' : name + '.b64.txt';
        });
      } else {
        records = [buildHeader(name, type, 1, 1, makeId()) + b64];
        fileNames = [name + '.b64.txt'];
      }
      renderEncodeResults(records, fileNames, file);
    }).catch(function (err) {
      encodeError.textContent = t('err.convertFailed', err && err.message ? err.message : err);
    }).finally(function () {
      encodeBtn.disabled = !selectedFile;
      encodeBtn.classList.remove('loading');
      encodeBtn.textContent = '';
      encodeBtn.appendChild(document.createTextNode(t('encode.btn')));
      encodeBtn.appendChild(svgIcon(ICON.arrow));
    });
  });

  function renderEncodeResults(records, fileNames, file) {
    encodeResults.textContent = '';
    var total = records.length;
    var totalChars = records.reduce(function (s, r) { return s + r.length; }, 0);
    var fmtLabel = { standard: t('format.standard'), raw: t('format.raw'), datauri: t('format.datauri') }[format];

    // 摘要列
    var summary = el('div', 'summary');
    var sIcon = el('div', 'summary-icon');
    sIcon.appendChild(svgIcon(ICON.check));
    summary.appendChild(sIcon);
    var sText = el('div', 'summary-text');
    sText.appendChild(el('div', 'summary-title', total > 1 ? t('result.doneParts', total) : t('result.done')));
    sText.appendChild(el('div', 'summary-meta',
      file.name + t('sep') + formatBytes(file.size) + ' → ' + formatBytes(totalChars) + t('sep') + fmtLabel));
    summary.appendChild(sText);

    if (total > 1) {
      var allBtn = btn('primary small', 'download', t('result.downloadAll', total));
      allBtn.addEventListener('click', function () {
        records.forEach(function (r, i) {
          setTimeout(function () { downloadText(r, fileNames[i]); }, i * 120);
        });
        toast(t('toast.downloadStarted', total));
      });
      summary.appendChild(allBtn);
    }
    var clearBtn = btn('ghost small', null, t('result.clear'));
    clearBtn.addEventListener('click', function () { encodeResults.textContent = ''; });
    summary.appendChild(clearBtn);
    encodeResults.appendChild(summary);

    records.forEach(function (record, idx) {
      var card = el('div', 'part');
      var head = el('div', 'part-head');
      var title = el('div', 'part-title');
      if (total > 1) title.appendChild(el('span', 'pill', (idx + 1) + ' / ' + total));
      title.appendChild(el('span', null, fileNames[idx]));
      title.appendChild(el('span', 'part-meta', formatBytes(record.length)));
      head.appendChild(title);

      var actions = el('div', 'part-actions');
      var copyBtn = btn('secondary small', 'copy', t('result.copy'));
      copyBtn.addEventListener('click', function () {
        copyText(record).then(function () {
          flashDone(copyBtn, 'copy', t('result.copy'), t('result.copied'));
        }, function (err) {
          toast(t('toast.copyFailed', err.message), 'error');
        });
      });
      var dlBtn = btn('secondary small', 'download', t('result.download'));
      dlBtn.addEventListener('click', function () { downloadText(record, fileNames[idx]); });
      actions.appendChild(copyBtn);
      actions.appendChild(dlBtn);
      head.appendChild(actions);
      card.appendChild(head);

      var ta = el('textarea', 'code');
      ta.readOnly = true;
      ta.spellcheck = false;
      ta.value = record.length > PREVIEW_LIMIT ? record.slice(0, PREVIEW_LIMIT) + '…' : record;
      ta.addEventListener('focus', function () { ta.select(); });
      card.appendChild(ta);
      if (record.length > PREVIEW_LIMIT) {
        card.appendChild(el('div', 'truncated',
          t('result.truncated', PREVIEW_LIMIT.toLocaleString())));
      }
      encodeResults.appendChild(card);
    });

    encodeResults.firstChild.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  // =====================================================================
  // 解碼：Base64 → 檔案
  // =====================================================================
  var decodeError = $('decode-error');
  var decodePaste = $('decode-paste');
  var groupsEl = $('decode-groups');
  // id -> { id, filename, type, kind, partTotal, parts: {index: data}, warnings: [], blob, blobUrl }
  var groups = {};
  var groupOrder = [];

  setupDropzone($('decode-dropzone'), $('decode-file-input'), handleDecodeFiles);

  function stripTxtName(name) {
    return (name || '').replace(/\.(datauri|b64|base64)?\.?txt$/i, '').replace(/\.part\d+of\d+$/i, '');
  }

  function handleDecodeFiles(fileList) {
    decodeError.textContent = '';
    var files = Array.prototype.slice.call(fileList);
    Promise.all(files.map(function (f) {
      return f.text().then(function (t) { return { file: f, text: t }; });
    })).then(function (items) {
      var errors = [];
      var all = [];
      items.forEach(function (it) {
        try {
          var recs = parseText(it.text, stripTxtName(it.file.name));
          if (!recs.length) throw new Error(t('err.emptyFile'));
          all = all.concat(recs);
        } catch (err) {
          errors.push(it.file.name + t('err.fileSep') + err.message);
        }
      });
      if (all.length) addRecords(all);
      if (errors.length) decodeError.textContent = t('err.filesFailed') + '\n' + errors.join('\n');
    }).catch(function (err) {
      decodeError.textContent = t('err.readFailed', err.message);
    });
  }

  // 將一段文字拆成多筆紀錄；支援標準格式（可多行）、Data URI、純 Base64（可換行）
  function parseText(text, fallbackName) {
    var lines = text.split(/\r?\n/);
    var chunks = [];
    var cur = null;
    lines.forEach(function (raw) {
      var line = raw.trim();
      if (!line) return;
      var startsRecord = /^filename:/i.test(line) || /^data:[^,]*,/i.test(line) ||
        (!/^data:/i.test(line) && /^[a-z]+:[^\s,]*;base64,/i.test(line));
      if (startsRecord || !cur) {
        cur = [line];
        chunks.push(cur);
      } else {
        cur.push(line);
      }
    });
    return chunks.map(function (parts) { return parseRecord(parts.join(''), fallbackName); });
  }

  function parseRecord(text, fallbackName) {
    // Data URI
    var dm = /^data:([^;,]*)((?:;[^;,]*)*),/i.exec(text);
    if (dm) {
      if (!/;base64/i.test(dm[2])) throw new Error(t('err.dataUriNotBase64'));
      var dtype = dm[1] || 'application/octet-stream';
      var ddata = normalizeBase64(text.slice(dm[0].length));
      var nameParam = /;name=([^;]+)/i.exec(dm[2]);
      var dname = nameParam ? decodeURIComponent(nameParam[1]) : guessName(fallbackName, ddata, dtype);
      return { id: makeId(), kind: 'Data URI', filename: dname, type: dtype, partIndex: 1, partTotal: 1, data: ddata };
    }

    // 標準格式
    var marker = ';base64,';
    var idx = text.indexOf(marker);
    if (idx !== -1 && /^[a-z]+:/i.test(text)) {
      var header = text.slice(0, idx);
      var fields = {};
      header.split(';').forEach(function (kv) {
        var c = kv.indexOf(':');
        if (c === -1) return;
        fields[kv.slice(0, c).trim().toLowerCase()] = kv.slice(c + 1).trim();
      });
      var filename = fields.filename ? safeDecode(fields.filename) : (fallbackName || 'restored_file');
      var type = fields.type ? safeDecode(fields.type) : 'application/octet-stream';
      var partIndex = 1, partTotal = 1;
      if (fields.part) {
        var p = fields.part.split('/');
        partIndex = parseInt(p[0], 10) || 1;
        partTotal = parseInt(p[1], 10) || 1;
      }
      if (partIndex > partTotal) throw new Error(t('err.badPart', fields.part));
      return {
        id: fields.id || (filename + '::single'),
        kind: t('format.standard'),
        filename: filename,
        type: type,
        partIndex: partIndex,
        partTotal: partTotal,
        data: cleanBase64(text.slice(idx + marker.length))
      };
    }

    // 純 Base64
    var data = normalizeBase64(text);
    if (!data) throw new Error(t('err.nothing'));
    var sniff = sniffType(data);
    var rtype = sniff ? sniff.type : 'application/octet-stream';
    return { id: makeId(), kind: t('format.raw'), filename: guessName(fallbackName, data, rtype), type: rtype, partIndex: 1, partTotal: 1, data: data };
  }

  function safeDecode(s) {
    try { return decodeURIComponent(s); } catch (e) { return s; }
  }

  function guessName(fallbackName, data, type) {
    var sniff = sniffType(data);
    var ext = sniff ? sniff.ext : (MIME_EXT[type] || 'bin');
    if (fallbackName) return /\.[A-Za-z0-9]{1,6}$/.test(fallbackName) ? fallbackName : fallbackName + '.' + ext;
    return 'decoded.' + ext;
  }

  function addRecords(records) {
    var added = 0;
    records.forEach(function (rec) {
      var g = groups[rec.id];
      if (!g) {
        g = groups[rec.id] = {
          id: rec.id, filename: rec.filename, type: rec.type, kind: rec.kind,
          partTotal: rec.partTotal, parts: {}, warnings: []
        };
        groupOrder.push(rec.id);
      }
      if (rec.partTotal !== g.partTotal) {
        g.warnings.push(t('group.warnTotal', rec.partIndex, rec.partTotal));
      }
      if (g.parts[rec.partIndex] != null) {
        if (g.parts[rec.partIndex] !== rec.data) g.warnings.push(t('group.warnDup', rec.partIndex));
      } else {
        added++;
      }
      g.parts[rec.partIndex] = rec.data;
      resetBlob(g);
    });
    renderGroups();
    if (added) toast(t('toast.added', added));
    else toast(t('toast.alreadyAdded'));
  }

  function resetBlob(g) {
    if (g.blobUrl) URL.revokeObjectURL(g.blobUrl);
    g.blob = null;
    g.blobUrl = null;
  }

  function isComplete(g) {
    for (var i = 1; i <= g.partTotal; i++) if (g.parts[i] == null) return false;
    return true;
  }

  function groupBlob(g) {
    if (!g.blob) {
      var full = '';
      for (var i = 1; i <= g.partTotal; i++) full += g.parts[i];
      g.blob = base64ToBlob(full, g.type);
    }
    return g.blob;
  }

  function removeGroup(id) {
    resetBlob(groups[id]);
    delete groups[id];
    groupOrder = groupOrder.filter(function (x) { return x !== id; });
    renderGroups();
  }

  function renderGroups() {
    groupsEl.textContent = '';
    $('groups-head').hidden = groupOrder.length === 0;

    groupOrder.forEach(function (id) {
      var g = groups[id];
      var have = Object.keys(g.parts).length;
      var complete = isComplete(g);
      var totalLen = 0;
      Object.keys(g.parts).forEach(function (k) { totalLen += g.parts[k].length; });

      var box = el('div', 'group');

      // 縮圖
      var thumb = el('div', 'group-thumb', extOf(g.filename));
      if (complete && /^image\//.test(g.type) && estimateDecodedSize(totalLen) < THUMB_LIMIT) {
        try {
          if (!g.blobUrl) g.blobUrl = URL.createObjectURL(groupBlob(g));
          var img = document.createElement('img');
          img.src = g.blobUrl;
          img.alt = '';
          img.onerror = function () { img.remove(); };
          thumb.textContent = '';
          thumb.appendChild(img);
          thumb.style.cursor = 'zoom-in';
          thumb.title = t('group.preview');
          thumb.addEventListener('click', function () { openPreview(g.blobUrl); });
        } catch (e) { /* 內容有誤時維持文字縮圖，錯誤會在還原時顯示 */ }
      }
      box.appendChild(thumb);

      // 內容
      var body = el('div', 'group-body');
      var nameInput = el('input', 'name-input');
      nameInput.type = 'text';
      nameInput.value = g.filename;
      nameInput.title = t('group.renameHint');
      nameInput.spellcheck = false;
      nameInput.addEventListener('input', function () { g.filename = nameInput.value; });
      body.appendChild(nameInput);

      body.appendChild(el('div', 'group-meta',
        g.type + t('sep') + g.kind + t('sep') + t(complete ? 'group.sizeComplete' : 'group.sizePartial', formatBytes(estimateDecodedSize(totalLen)))));

      var status = el('div', 'group-status ' + (complete ? 'ok' : 'bad'));
      status.appendChild(svgIcon(complete ? ICON.check : ICON.alert));
      if (complete) {
        status.appendChild(document.createTextNode(g.partTotal > 1 ? t('group.readyParts', g.partTotal) : t('group.ready')));
      } else {
        var missing = [];
        for (var i = 1; i <= g.partTotal; i++) if (g.parts[i] == null) missing.push(i);
        var missText = missing.length > 12 ? missing.slice(0, 12).join(', ') + '…' : missing.join(', ');
        status.appendChild(document.createTextNode(t('group.missing', have, g.partTotal, missText)));
      }
      body.appendChild(status);

      if (g.partTotal > 1) {
        if (g.partTotal <= 60) {
          var dots = el('div', 'part-dots');
          for (var k = 1; k <= g.partTotal; k++) {
            var d = el('span', 'part-dot' + (g.parts[k] != null ? ' have' : ''), String(k));
            d.title = t(g.parts[k] != null ? 'group.partHave' : 'group.partMissing', k);
            dots.appendChild(d);
          }
          body.appendChild(dots);
        } else {
          var bar = el('div', 'progress');
          var fill = el('span');
          fill.style.width = (have / g.partTotal * 100) + '%';
          bar.appendChild(fill);
          body.appendChild(bar);
        }
      }
      g.warnings.slice(-3).forEach(function (w) { body.appendChild(el('div', 'group-warn', '⚠ ' + w)); });
      box.appendChild(body);

      // 動作
      var actions = el('div', 'group-actions');
      var restoreBtn = btn('primary small', 'download', t('group.restore'));
      restoreBtn.disabled = !complete;
      restoreBtn.addEventListener('click', function () {
        decodeError.textContent = '';
        try {
          downloadBlob(groupBlob(g), g.filename || 'restored_file');
          toast(t('toast.restored', g.filename));
        } catch (err) {
          decodeError.textContent = t('err.restoreFailed', g.filename, err.message);
          toast(t('toast.restoreFailed'), 'error');
        }
      });
      var rmBtn = el('button', 'icon-btn');
      rmBtn.title = t('group.remove');
      rmBtn.setAttribute('aria-label', t('group.remove'));
      rmBtn.appendChild(svgIcon(ICON.trash));
      rmBtn.addEventListener('click', function () { removeGroup(id); });
      actions.appendChild(restoreBtn);
      actions.appendChild(rmBtn);
      box.appendChild(actions);

      groupsEl.appendChild(box);
    });
  }

  $('groups-clear').addEventListener('click', function () {
    groupOrder.slice().forEach(function (id) { resetBlob(groups[id]); delete groups[id]; });
    groupOrder = [];
    renderGroups();
  });

  function parsePasted() {
    decodeError.textContent = '';
    var text = decodePaste.value;
    if (!text.trim()) { decodeError.textContent = t('err.pasteFirst'); return; }
    try {
      addRecords(parseText(text, ''));
    } catch (err) {
      decodeError.textContent = t('err.parseFailed', err.message);
    }
  }
  $('decode-paste-btn').addEventListener('click', parsePasted);
  decodePaste.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); parsePasted(); }
  });
  $('decode-paste-clear').addEventListener('click', function () {
    decodePaste.value = '';
    updatePasteStat();
    decodeError.textContent = '';
    decodePaste.focus();
  });
  function updatePasteStat() {
    var n = decodePaste.value.length;
    $('paste-stat').textContent = n ? t('paste.stat', n.toLocaleString()) : '';
  }
  decodePaste.addEventListener('input', updatePasteStat);

  // 圖片預覽
  function openPreview(url) {
    var m = el('div', 'modal');
    var img = document.createElement('img');
    img.src = url;
    m.appendChild(img);
    var close = function () { m.remove(); document.removeEventListener('keydown', onKey); };
    var onKey = function (e) { if (e.key === 'Escape') close(); };
    m.addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(m);
  }

  // =====================================================================
  // 全域貼上：編碼頁可直接貼上檔案／截圖；解碼頁可直接貼上檔案或文字
  // =====================================================================
  document.addEventListener('paste', function (e) {
    var t = e.target;
    var inField = t && (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT');
    var cd = e.clipboardData;
    if (!cd) return;
    var files = cd.files && cd.files.length ? cd.files : null;

    if (activeTab === 'encode') {
      if (files && !inField) {
        e.preventDefault();
        var f = files[0];
        // 截圖貼上時檔名通常是 image.png，加上時間避免混淆
        if (/^image\.(png|jpe?g|gif|webp)$/i.test(f.name)) {
          var stamp = new Date().toISOString().replace(/[:T]/g, '-').slice(0, 19);
          f = new File([f], 'paste-' + stamp + '.' + f.name.split('.').pop(), { type: f.type });
        }
        setSelectedFile(f);
        toast(t('toast.pastedFile'));
      }
    } else if (!inField) {
      if (files) {
        e.preventDefault();
        handleDecodeFiles(files);
      } else {
        var text = cd.getData('text');
        if (text) {
          e.preventDefault();
          decodePaste.value = text;
          updatePasteStat();
          parsePasted();
        }
      }
    }
  });
})();
