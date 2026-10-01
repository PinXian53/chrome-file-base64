# File ⇄ Base64（Chrome 擴充功能）

離線將檔案轉成 Base64，或把 Base64 還原成檔案。所有處理都在瀏覽器本機完成，不會連網或上傳。

## 安裝（開發者模式）

1. 開啟 `chrome://extensions`
2. 右上角開啟「開發人員模式」
3. 點「載入未封裝項目」，選擇本專案的 `extension/` 資料夾
4. 點工具列圖示（或快捷鍵 `Alt+Shift+B`）開啟工具頁；已開啟時會直接切換到該分頁

## 功能

**檔案 → Base64**
- 拖放、點擊選擇，或直接 `⌘/Ctrl+V` 貼上檔案／截圖
- 三種輸出格式：
  - **標準格式**：`filename:…;type:…;part:i/n;id:…;base64,…`（與 `docs/file-base64.html` 完全相容）
  - **純 Base64**
  - **Data URI**：`data:<mime>;base64,…`
- 標準格式可分割成多份（依每份大小上限或依份數），即時顯示分割預估
- 每份可複製、下載，或一次下載全部

**Base64 → 檔案**
- 一次拖入多個 `.txt` 分割檔，依 `id` 自動分組、依編號合併
- 貼上文字支援：標準格式（多份可混在一起貼）、Data URI、純 Base64（含 76 字元換行、URL-safe 字元）
- 純 Base64 會依檔頭自動判斷類型（PNG、JPG、GIF、WebP、PDF、ZIP…）並給予副檔名
- 顯示每份收集狀態（缺第幾份一目了然）、圖片縮圖與預覽、可直接修改還原檔名

## 專案結構

```
extension/
  manifest.json   MV3 設定（權限只有 downloads）
  background.js   點擊圖示時開啟／切換到工具頁
  app.html/css/js 主要介面與邏輯
  icons/          icon.svg 與 16/32/48/128 PNG
docs/
  file-base64.html  原 HTML 版
```
