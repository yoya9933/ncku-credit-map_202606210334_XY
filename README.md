# NCKU Credit Map

一個純前端、可離線使用的成大水利學分與修課決策工具。

這個 repo 的公開資料只保存 **114 學年度課程規則與去識別化課程目錄**，不再把任何個人的抵免、成績、已修狀態或私人課表寫進 Git。個人狀態只存在瀏覽器 LocalStorage，並可自行匯出 JSON 備份。

## 核心原則

這一版不再把「修過」直接等同「可計入畢業」。學分會先經過規則引擎認列：

- 畢業總學分：135
- 水利必修：76
  - 專業必修：71
  - 設計必修：4（四選二；超修不重複灌入必修）
  - 必選修：1（水利及海洋工程概論）
- 通識：28
  - 自然與工程科學相關認列上限由規則引擎控制
- 選修：31
  - 本系選修至少 10
- 非學分畢業條件另外追蹤，例如體育學期數與英語門檻

## P0 / P1 hardening

### Graduation rule engine

課程資料新增並使用：

- `requirementGroup`
- `countsTowardGraduation`
- `recognizedCredits`
- `departmentElective`
- `generalSubarea`

主 Dashboard、缺口與畢業判斷不再只靠 `category` 加總。

### Term config

目前學期與下一學期集中在 `curriculum.js`：

```js
APP_CONFIG.currentTerm
APP_CONFIG.nextTerm
```

UI 與候選課邏輯不再散落寫死 `115-1` / `115-2`。

### Prerequisite engine

先修條件使用結構化資料：

```js
prerequisites: [
  { courseCode: "PHYS-1", minimumGrade: 45 }
]
```

資格由完成狀態與最低成績推導，不再依賴人工填寫「先修未滿」。

### Conflict engine

上課時間使用結構化 slots：

```js
slots: [
  { day: 1, start: 7, end: 8 }
]
```

衝堂由時段交集自動計算，不再維護人工 `CONFLICT_MATRIX`。

### A / B / C plans

方案有效性會同時檢查：

- 最低 / 最高學分
- 平均風險
- 高必要高風險課數
- 先修缺口
- 衝堂

因此 0 學分方案不會再因風險低而顯示為成功。

### Storage migration

LocalStorage 使用 V2 schema：

```text
nckuCreditMapStateV2
```

如果偵測到 V1：

1. 先保留原始 V1 備份。
2. 遷移欄位與規則群組。
3. 寫入 V2。

若 JSON 損壞，原始內容會先以 corrupt backup key 保留，不會直接覆蓋掉。

## 隱私

公開 repo 不應提交：

- 姓名 / 學號
- 個人成績
- 抵免與承認紀錄
- 私人完整課表
- 含個人狀態的 JSON / CSV 備份
- 未清理的聊天逐字稿

公開 demo 只使用 `curriculum.js` 的去識別化資料。

## 執行

直接以瀏覽器開啟 `index.html` 即可。由於使用 ES modules，若瀏覽器限制 `file://` module 載入，可在專案目錄使用任一靜態伺服器開啟。

## 驗證

需要 Node.js 22：

```bash
npm run verify
```

會執行：

```bash
node --check app.js
node credit-map.test.mjs
```

測試覆蓋：

- 設計必修 cap
- 通識特殊認列 cap
- `countsTowardGraduation`
- `recognizedCredits`
- 本系選修最低學分
- 已完成高風險課排除
- term config
- prerequisite engine
- conflict engine
- A/B/C 學分與風險 validation
- V1 -> V2 migration
- backup round-trip
- CSV formula injection 防護
- 公開 defaults 去識別化

GitHub Actions 會在 push 與 PR 自動執行同一組驗證。
