# 🚀 Google Apps Script 部署指南

## 📋 **部署步驟**

### **1. 創建 Google Apps Script 專案**

1. 前往 [Google Apps Script](https://script.google.com/)
2. 點擊「新建專案」
3. 將專案命名為「運務GAI數據管理系統」

### **2. 複製後端代碼**

1. 打開 `GoogleAppsScript_Backend.gs` 檔案
2. 複製全部內容
3. 貼到 Google Apps Script 編輯器中
4. 儲存檔案

### **3. 設定 Google Sheets**

1. 創建新的 Google Sheets
2. 複製 Spreadsheet ID（從URL中獲取）
3. 更新 `GoogleAppsScript_Backend.gs` 中的 `SPREADSHEET_ID`

```javascript
const CONFIG = {
  SPREADSHEET_ID: '你的_Spreadsheet_ID_在這裡',
  // ...
};
```

### **4. 創建必要的工作表**

在 Google Sheets 中創建以下工作表：
- **待配送任務** - 任務資料（F欄位存放任務等級：B1、B2、B3）
- **Drivers** - 司機資料  
- **Vehicles** - 車輛資料
- **Users** - 用戶資料
- **Assignments** - 指派記錄
- **Logs** - 操作日誌

### **5. 部署為 Web App**

1. 點擊「部署」→「新增部署」
2. 選擇「網頁應用程式」
3. 設定：
   - **執行身分**：自己
   - **存取權限**：任何人
4. 點擊「部署」
5. 複製 Web App URL

### **6. 更新前端 URL**

將獲得的 Web App URL 更新到 `index.html` 中：

```javascript
const GAS_URL = '你的_Web_App_URL_在這裡';
```

## 🔧 **測試連接**

### **使用測試頁面**
1. 打開 `test-connection.html`
2. 點擊「測試基本連接」
3. 確認連接成功

### **手動測試**
在瀏覽器控制台執行：
```javascript
fetch('你的_GAS_URL', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: 'action=ping&data={}'
})
.then(response => response.json())
.then(data => console.log(data));
```

## 📊 **資料表結構**

### **Users 表**
| username | password | level | lastLogin |
|----------|----------|-------|-----------|
| admin    | admin123 | s4    | 2025-01-27 |

### **待配送任務 表**
| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| 任務ID | 配送日期 | 路線名稱 | 客戶 | 狀態 | **等級** | 板數總和 | 取貨 | 配送 |
| T001 | 2025-01-27 | 台北路線 | 客戶A | 待派 | **B1** | 10 | 台北 | 新北 |
| T002 | 2025-01-27 | 台中路線 | 客戶B | 待派 | **B2** | 15 | 台中 | 彰化 |
| T003 | 2025-01-27 | 高雄路線 | 客戶C | 待派 | **B3** | 20 | 高雄 | 屏東 |

**重要：F欄位必須包含任務等級（B1、B2、B3），系統會自動統計各等級數量**

### **Drivers 表**
| 員工編號 | 姓名 | 級別 | 類型 | 技能 | 聯絡電話 | 狀態 |
|----------|------|------|------|------|----------|------|

### **Vehicles 表**
| id | brand | tonnage | type | status | purchaseDate | mileage | age |
|----|-------|---------|------|--------|--------------|---------|-----|

## ⚠️ **注意事項**

### **權限設定**
- 確保 Google Sheets 的存取權限正確
- 檢查 Google Apps Script 的執行權限

### **CORS 問題**
如果遇到 CORS 錯誤，確認：
1. GAS 已正確設定 CORS 標頭
2. 前端請求格式正確

### **配額限制**
- Google Apps Script 有每日執行配額
- 監控使用量避免超出限制

## 🛠️ **故障排除**

### **常見錯誤**

1. **"工作表不存在"**
   - 檢查工作表名稱是否正確
   - 確認 Spreadsheet ID 是否正確

2. **"權限不足"**
   - 檢查 Google Sheets 權限
   - 確認 GAS 執行身分設定

3. **"CORS 錯誤"**
   - 確認 GAS 已部署為 Web App
   - 檢查請求格式

### **調試方法**

1. **查看 GAS 執行日誌**
   - 在 GAS 編輯器中查看執行記錄

2. **測試個別函數**
   - 在 GAS 編輯器中直接執行測試函數

3. **檢查網路請求**
   - 使用瀏覽器開發者工具檢查網路請求

## 📞 **支援**

如果遇到問題，請檢查：
1. 所有設定是否正確
2. 網路連線是否正常
3. Google 服務是否可用

---

**部署完成後，您的系統就可以正常運作了！** 🎉

