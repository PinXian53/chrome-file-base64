// 介面語系：依 Chrome 介面語言決定，中文（zh-*）顯示正體中文，其餘一律顯示英文。
(function () {
  'use strict';

  var MESSAGES = {
    zh: {
      'brand.sub': '檔案與 Base64 互轉工具',
      'badge.text': '100% 離線・資料不離開本機',
      'badge.title': '所有轉換都在瀏覽器本機完成，不會連線或上傳',
      'tab.encode': '檔案 → Base64',
      'tab.decode': 'Base64 → 檔案',

      'encode.pageTitle': '檔案轉 Base64',
      'encode.dzTitle': '拖曳檔案到這裡，或<span class="link">點擊選擇檔案</span>',
      'encode.dzSub': '也可以直接按 <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>V</kbd> 貼上檔案或截圖',
      'encode.removeFile': '移除檔案',
      'format.label': '輸出格式',
      'format.standard': '標準格式',
      'format.standardDesc': '含檔名資訊・可分割',
      'format.raw': '純 Base64',
      'format.rawDesc': '只有編碼內容',
      'format.datauri': 'Data URI',
      'split.title': '分割成多份文字檔',
      'split.desc': '適合有單檔大小或字數限制的傳輸管道',
      'split.bySize': '依每份大小上限',
      'split.byCount': '依份數',
      'split.perPart': '／每份',
      'split.parts': '份',
      'encode.btn': '開始轉換',
      'encode.converting': '轉換中…',

      'decode.pageTitle': 'Base64 還原檔案',
      'decode.dzTitle': '拖曳 Base64 文字檔到這裡，或<span class="link">點擊選擇</span>',
      'decode.dzSub': '可一次選取多份分割檔，系統會自動依編號合併',
      'decode.or': '或直接貼上文字',
      'decode.placeholder': '支援以下格式：\n• 標準格式：filename:xxx;type:xxx;part:1/2;id:xxx;base64,....（多份可直接一起貼上）\n• Data URI：data:image/png;base64,....\n• 純 Base64 內容',
      'decode.parseBtn': '解析內容',
      'decode.clear': '清空',
      'groups.title': '待還原檔案',
      'groups.clearAll': '全部清除',

      'err.badChar': '含有非 Base64 字元「{0}」（位置 {1}）',
      'err.badLength': 'Base64 長度不正確，內容可能不完整',
      'err.sizePositive': '請輸入大於 0 的大小',
      'err.sizeMin': '每份大小至少需要 0.5 KB',
      'err.countMin': '份數至少為 2',
      'err.convertFailed': '轉換失敗：{0}',
      'err.emptyFile': '檔案是空的',
      'err.filesFailed': '以下檔案無法解析：',
      'err.fileSep': '：',
      'err.readFailed': '讀取檔案失敗：{0}',
      'err.dataUriNotBase64': 'Data URI 不是 base64 編碼',
      'err.badPart': '分割編號不正確（{0}）',
      'err.nothing': '沒有可解析的內容',
      'err.pasteFirst': '請先貼上 Base64 內容',
      'err.parseFailed': '解析失敗：{0}',
      'err.restoreFailed': '還原「{0}」失敗：{1}',

      'toast.oneFile': '一次只能轉換一個檔案，已選取第一個',
      'toast.downloadStarted': '已開始下載 {0} 個檔案',
      'toast.copyFailed': '複製失敗：{0}',
      'toast.added': '已加入 {0} 份資料',
      'toast.alreadyAdded': '這些資料先前已加入',
      'toast.restored': '已還原：{0}',
      'toast.restoreFailed': '還原失敗',
      'toast.pastedFile': '已從剪貼簿加入檔案',

      'file.unnamed': '未命名檔案',
      'file.unknownType': '未知類型',
      'sep': '・',
      'estimate': '預估輸出約 {0}（約原檔 133%）',
      'split.preview': '將分割為 {0} 份，每份約 {1}',
      'result.done': '轉換完成',
      'result.doneParts': '轉換完成，共 {0} 份',
      'result.downloadAll': '下載全部 {0} 份',
      'result.clear': '清除',
      'result.copy': '複製',
      'result.copied': '已複製',
      'result.download': '下載 .txt',
      'result.truncated': '內容過長，僅顯示前 {0} 字元；請使用「複製」或「下載」取得完整內容。',

      'group.preview': '點擊預覽',
      'group.renameHint': '可直接修改還原後的檔名',
      'group.sizeComplete': '約 {0}',
      'group.sizePartial': '目前約 {0}',
      'group.readyParts': '已收集全部 {0} 份，可以還原',
      'group.ready': '可以還原',
      'group.missing': '已收集 {0} / {1} 份，缺第 {2} 份',
      'group.partHave': '第 {0} 份：已取得',
      'group.partMissing': '第 {0} 份：缺少',
      'group.warnTotal': '第 {0} 份標示的總份數（{1}）與其他份不一致',
      'group.warnDup': '第 {0} 份重複且內容不同，已使用最新的一份',
      'group.restore': '還原並下載',
      'group.remove': '移除',
      'paste.stat': '{0} 字元・⌘/Ctrl + Enter 解析'
    },
    en: {
      'brand.sub': 'File & Base64 converter',
      'badge.text': '100% offline · data stays on your device',
      'badge.title': 'Everything runs locally in your browser — nothing is uploaded',
      'tab.encode': 'File → Base64',
      'tab.decode': 'Base64 → File',

      'encode.pageTitle': 'File to Base64',
      'encode.dzTitle': 'Drag a file here, or <span class="link">click to browse</span>',
      'encode.dzSub': 'You can also paste a file or screenshot with <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>V</kbd>',
      'encode.removeFile': 'Remove file',
      'format.label': 'Output format',
      'format.standard': 'Standard',
      'format.standardDesc': 'Includes filename · splittable',
      'format.raw': 'Raw Base64',
      'format.rawDesc': 'Encoded data only',
      'format.datauri': 'Data URI',
      'split.title': 'Split into multiple text files',
      'split.desc': 'For channels with file size or character limits',
      'split.bySize': 'By max size per part',
      'split.byCount': 'By number of parts',
      'split.perPart': 'per part',
      'split.parts': 'parts',
      'encode.btn': 'Convert',
      'encode.converting': 'Converting…',

      'decode.pageTitle': 'Base64 to File',
      'decode.dzTitle': 'Drag Base64 text files here, or <span class="link">click to browse</span>',
      'decode.dzSub': 'Select multiple split files at once — they are merged by part number automatically',
      'decode.or': 'or paste text',
      'decode.placeholder': 'Supported formats:\n• Standard: filename:xxx;type:xxx;part:1/2;id:xxx;base64,.... (multiple parts can be pasted together)\n• Data URI: data:image/png;base64,....\n• Raw Base64',
      'decode.parseBtn': 'Parse',
      'decode.clear': 'Clear',
      'groups.title': 'Files to restore',
      'groups.clearAll': 'Clear all',

      'err.badChar': 'Invalid Base64 character "{0}" (position {1})',
      'err.badLength': 'Invalid Base64 length — the content may be incomplete',
      'err.sizePositive': 'Enter a size greater than 0',
      'err.sizeMin': 'Each part must be at least 0.5 KB',
      'err.countMin': 'Number of parts must be at least 2',
      'err.convertFailed': 'Conversion failed: {0}',
      'err.emptyFile': 'File is empty',
      'err.filesFailed': 'Could not parse the following files:',
      'err.fileSep': ': ',
      'err.readFailed': 'Failed to read files: {0}',
      'err.dataUriNotBase64': 'Data URI is not base64-encoded',
      'err.badPart': 'Invalid part number ({0})',
      'err.nothing': 'Nothing to parse',
      'err.pasteFirst': 'Paste some Base64 content first',
      'err.parseFailed': 'Parse failed: {0}',
      'err.restoreFailed': 'Failed to restore "{0}": {1}',

      'toast.oneFile': 'Only one file can be converted at a time — using the first one',
      'toast.downloadStarted': 'Started downloading {0} files',
      'toast.copyFailed': 'Copy failed: {0}',
      'toast.added': 'Added {0} part(s)',
      'toast.alreadyAdded': 'These parts were already added',
      'toast.restored': 'Restored: {0}',
      'toast.restoreFailed': 'Restore failed',
      'toast.pastedFile': 'File added from clipboard',

      'file.unnamed': 'Untitled file',
      'file.unknownType': 'Unknown type',
      'sep': ' · ',
      'estimate': 'Estimated output ~{0} (~133% of original)',
      'split.preview': 'Will be split into {0} parts, ~{1} each',
      'result.done': 'Conversion complete',
      'result.doneParts': 'Conversion complete — {0} parts',
      'result.downloadAll': 'Download all {0}',
      'result.clear': 'Clear',
      'result.copy': 'Copy',
      'result.copied': 'Copied',
      'result.download': 'Download .txt',
      'result.truncated': 'Content too long — showing the first {0} characters only. Use Copy or Download to get the full content.',

      'group.preview': 'Click to preview',
      'group.renameHint': 'You can edit the restored filename',
      'group.sizeComplete': '~{0}',
      'group.sizePartial': '~{0} so far',
      'group.readyParts': 'All {0} parts collected — ready to restore',
      'group.ready': 'Ready to restore',
      'group.missing': 'Collected {0} / {1} parts, missing part {2}',
      'group.partHave': 'Part {0}: received',
      'group.partMissing': 'Part {0}: missing',
      'group.warnTotal': 'Part {0} declares a total of {1}, which differs from the other parts',
      'group.warnDup': 'Part {0} is duplicated with different content — using the latest',
      'group.restore': 'Restore & download',
      'group.remove': 'Remove',
      'paste.stat': '{0} chars · ⌘/Ctrl + Enter to parse'
    }
  };

  function uiLanguage() {
    try {
      if (window.chrome && chrome.i18n && chrome.i18n.getUILanguage) return chrome.i18n.getUILanguage();
    } catch (e) {}
    return navigator.language || 'en';
  }

  var lang = /^zh\b/i.test(uiLanguage()) ? 'zh' : 'en';
  var dict = MESSAGES[lang];

  // t('key', a, b) → 以參數取代 {0}、{1}
  function t(key) {
    var s = dict[key] != null ? dict[key] : (MESSAGES.en[key] != null ? MESSAGES.en[key] : key);
    var args = arguments;
    return s.replace(/\{(\d+)\}/g, function (m, i) {
      var v = args[+i + 1];
      return v == null ? m : String(v);
    });
  }

  function apply(root) {
    var q = function (sel) { return (root || document).querySelectorAll(sel); };
    q('[data-i18n]').forEach(function (n) { n.textContent = t(n.dataset.i18n); });
    q('[data-i18n-html]').forEach(function (n) { n.innerHTML = t(n.dataset.i18nHtml); });
    q('[data-i18n-title]').forEach(function (n) { n.title = t(n.dataset.i18nTitle); });
    q('[data-i18n-aria]').forEach(function (n) { n.setAttribute('aria-label', t(n.dataset.i18nAria)); });
    q('[data-i18n-placeholder]').forEach(function (n) { n.placeholder = t(n.dataset.i18nPlaceholder); });
  }

  document.documentElement.lang = lang === 'zh' ? 'zh-Hant-TW' : 'en';
  apply();

  window.I18N = { lang: lang, t: t };
})();
