# 2026-06-21 Codex Session Summary

## 本次決策

本次不把完整聊天原文直接放進 Git。

原因是聊天內容可能包含姓名、學號、課表、抵免紀錄、成績細節、私人路徑或其他不適合公開同步到 GitHub 的資料。

採用方式改為保存「整理版專案記憶」：

- `PROJECT_MEMORY/PROJECT_BRIEF.md`
- `PROJECT_MEMORY/TECH_STACK.md`
- `PROJECT_MEMORY/DEV_LOG.md`
- `PROJECT_MEMORY/SOP.md`
- `PROJECT_MEMORY/RETROSPECTIVE.md`
- `docs/2026-06-21-codex-session-summary.md`

## 專案現況

`ncku-credit-map` 是本機靜態學分地圖工具。

目前技術棧：

- HTML
- CSS
- Vanilla JavaScript
- LocalStorage
- Node.js logic test

目前核心功能：

- 學分需求設定
- Dashboard
- 課程新增、編輯、刪除、詳細資料展開
- 課程篩選與快速篩選
- 115-1 候選課表
- 衝堂矩陣
- 暑假預習表
- 缺口分析
- JSON 匯出與匯入
- CSV 匯出
- 114 檢核表預設資料重置

## 隱私規則

可以提交整理後的專案文件。

不建議提交：

- 完整聊天逐字稿
- 姓名
- 學號
- 成績細節
- 完整私人課表
- 抵免紀錄
- 私人下載路徑
- 未清理的 JSON 備份

若之後需要保存聊天紀錄，可建立：

```text
docs/chat-transcripts/2026-06-21-codex-chat.md
```

但應先手動清理上述敏感內容。

## 後續 TODO

- 持續把重要專案決策寫進 `PROJECT_MEMORY/`。
- 若新增功能，同步更新 `DEV_LOG.md`、`SOP.md` 與測試。
- 若準備推 GitHub，先檢查 JSON、CSV、聊天紀錄與文件是否含有個資。
- 若要公開 demo，準備去識別化資料。
