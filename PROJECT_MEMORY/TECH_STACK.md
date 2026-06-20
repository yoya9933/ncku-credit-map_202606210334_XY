# Tech Stack

## 技術選型

這個專案刻意維持簡單：

- HTML
- CSS
- Vanilla JavaScript
- LocalStorage
- Node.js 測試核心邏輯

目前不使用 React、Vue、Next.js、後端、資料庫、登入系統或複雜狀態管理。

## 主要檔案

- `index.html`：頁面結構與主要區塊。
- `style.css`：版面、表單、Dashboard、表格、缺口分析等樣式。
- `app.js`：預設資料、狀態管理、計算邏輯、畫面渲染、匯入匯出。
- `credit-map.test.mjs`：用 Node.js 驗證核心邏輯。
- `README.md`：使用說明。

## 資料保存

資料存在瀏覽器 LocalStorage。

LocalStorage key:

```text
nckuCreditMapStateV1
```

資料只保存在目前使用的瀏覽器與裝置。清除瀏覽器資料、更換瀏覽器或更換裝置時，資料不會自動同步。

## 開啟方式

直接用瀏覽器開啟：

```text
index.html
```

不需要啟動開發伺服器。

## 測試方式

從專案根目錄執行：

```powershell
node .\credit-map.test.mjs
node --check .\app.js
```

`credit-map.test.mjs` 會讀取 `app.js`，在 Node VM 中載入 `CreditMapLogic`，驗證預設需求、課程統計、缺口分析、篩選、候選課表、暑假預習表與 CSV 匯出等邏輯。

## 維護原則

- 優先保留純靜態架構。
- 新功能應先確認是否能用現有資料模型與 LocalStorage 完成。
- 與 UI 無關的計算邏輯應盡量放在可測試函式中。
- 新增重要計算規則時，同步更新 `credit-map.test.mjs`。
- 不把個資或完整聊天紀錄寫進 repo。
