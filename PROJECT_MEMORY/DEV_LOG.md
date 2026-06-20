# Development Log

## 2026-06-20 - Local Static MVP

建立 `ncku-credit-map` 的本機靜態 MVP。

完成項目：

- 建立 `index.html`、`style.css`、`app.js`、`README.md`、`credit-map.test.mjs`。
- 使用 HTML / CSS / Vanilla JavaScript，不導入框架或後端。
- 用 LocalStorage 保存本機資料。
- 建立可編輯的畢業學分需求設定。
- 建立 Dashboard，顯示畢業總需求、已完成、尚缺、分類完成度、高風險數量與卡關數量。
- 建立課程新增、編輯、刪除與詳細資料展開。
- 建立課程篩選與快速篩選。
- 建立缺口分析。
- 建立 115-1 候選課表。
- 建立衝堂矩陣。
- 建立暑假預習表。
- 建立 JSON 匯出、JSON 匯入、CSV 匯出。
- 建立 114 檢核表預設資料重置功能。
- 將核心邏輯掛到 `globalThis.CreditMapLogic`，方便 Node 測試。

驗證方式：

```powershell
node .\credit-map.test.mjs
node --check .\app.js
```

## 2026-06-21 - Project Memory

建立整理版專案記憶，不保存完整聊天逐字稿。

新增項目：

- `PROJECT_MEMORY/PROJECT_BRIEF.md`
- `PROJECT_MEMORY/TECH_STACK.md`
- `PROJECT_MEMORY/DEV_LOG.md`
- `PROJECT_MEMORY/SOP.md`
- `PROJECT_MEMORY/RETROSPECTIVE.md`
- `docs/2026-06-21-codex-session-summary.md`

目的：

- 讓之後的 Codex session 可以快速理解專案。
- 保留功能、架構、測試、SOP 與後續 TODO。
- 避免把姓名、學號、課表、成績、抵免紀錄、私人路徑或完整聊天內容推到 Git。

## 後續 TODO

- 檢查 README 中文是否在不同終端環境都能正確顯示。
- 若 UI 文案或預設資料再調整，同步更新測試。
- 視需要新增一份範例 JSON 備份，但內容必須去識別化。
- 視需要新增 GitHub Pages 發布說明。
- 視需要新增資料清理 SOP，處理聊天逐字稿與私人課表資料。
