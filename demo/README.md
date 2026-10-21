# 匿名假資料互動展示

這個目錄是可獨立部署至 GitHub Pages 的靜態網站。不需要 Python、資料庫、建置工具或後端服務。

所有人員、單位、公司、帳號與密碼均為虛構。請勿輸入真實個資或密碼。資料只寫入目前瀏覽器的 localStorage，可用左下「重設展示資料」恢復初始案例；不同瀏覽器的操作不會互相影響。切換展示角色是流程模擬，不是真正的登入或安全邊界。沒有真實寄信或建立帳號。

## 展示路徑

1. 工作總覽 → 提出新申請 → 選系統及角色 → 送出，使用複製按鈕保存編號。
2. 進度查詢使用完整編號與 DEMO 開頭的展示員工編號；第三人編號無法查詢。
3. 右上角切換管理人甲／乙 → 案件工作台 → 儲存處理中、退回補件或完成。
4. 在查詢頁「帶入退回補件示例」→ 補件，修改權限使用人部門，觀察未完成任務重新指派、完成快照保留。
5. 已完成任務可開啟通知單，按「列印／存為 PDF」。只顯示當前管理人負責的任務與完成當時的資料。
6. 切換展示最高管理人 → 主檔與規則 → 停用系統、調整預設管理人或財務部門指派規則。

## GitHub Pages

網站檔案位於 demo/；`.github/workflows/pages.yml` 只上傳此目錄，沒有後端程式、原始附件、資料庫、金鑰或連線設定。Actions 使用固定 commit 的官方 Pages actions，推送 main 的 demo 檔案變更後自動發布。

首次啟用需儲存庫管理人在 Settings → Pages → Build and deployment 選擇 GitHub Actions，再於 Actions 重跑發布工作；已啟用時會自動發布。此流程不要求額外管理權杖。私人儲存庫是否可使用 Pages 取決於 GitHub 方案；不要為此直接把含其他內容的儲存庫改為公開。

預定網址：https://j6xul-656-dog.github.io/hpw_/ 。工作流程成功及實際連線確認之前，不能視為已上線。

本機檢視：`python3 -m http.server 4173 --directory demo`。功能測試在原開發 checkout 執行 `.venv/bin/python scripts/test_pages_demo.py`（需先啟動本機網站、Chromium 及 pdftotext）。
