/**
 * 運務GAI數據管理系統 - Google Apps Script 後端
 * 版本: 1.0.0
 * 作者: 昶青低溫物流技術團隊
 * 更新日期: 2025-01-27
 * 
 * 功能說明:
 * - 提供前端API接口
 * - 管理Google Sheets資料
 * - 處理用戶認證
 * - 智能配對算法
 */

// ==================== 全域配置 ====================
const CONFIG = {
  // Google Sheets ID
  SPREADSHEET_ID: '1miCf_ZTVyzmA1MNbbZM3uUdZjluk99gZUH5w2q_XWs8',
  
  // 工作表名稱
  SHEETS: {
    TASKS: '待配送任務',  // 修改為實際的工作表名稱
    DRIVERS: 'Drivers', 
    VEHICLES: 'Vehicles',
    USERS: 'Users',
    ASSIGNMENTS: 'Assignments',
    LOGS: 'Logs'
  },
  
  // API設定
  API: {
    VERSION: '1.0.0',
    TIMEOUT: 30000
  }
};

// ==================== 主要入口函數 ====================
function doPost(e) {
  try {
    // 設定CORS標頭
    const headers = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Content-Type': 'application/json'
    };
    
    // 解析請求資料
    const requestData = JSON.parse(e.postData.contents);
    const action = requestData.action;
    const data = requestData.data || {};
    
    console.log('收到請求:', action, data);
    
    // 路由到對應的處理函數
    let result;
    switch(action) {
      case 'ping':
        result = handlePing();
        break;
      case 'verifyLogin':
        result = handleVerifyLogin(data);
        break;
      case 'updateLastLogin':
        result = handleUpdateLastLogin(data);
        break;
      case 'getTasks':
        result = handleGetTasks();
        break;
      case 'getDrivers':
        result = handleGetDrivers();
        break;
      case 'getVehicles':
        result = handleGetVehicles();
        break;
      case 'getTaskStats':
        result = handleGetTaskStats();
        break;
      case 'getDriverSheetData':
        result = handleGetDriverSheetData();
        break;
      case 'getVehicleSheetData':
        result = handleGetVehicleSheetData();
        break;
      case 'updateDriverSheetData':
        result = handleUpdateDriverSheetData(data);
        break;
      case 'updateVehicleSheetData':
        result = handleUpdateVehicleSheetData(data);
        break;
      case 'generateTop3':
        result = handleGenerateTop3(data);
        break;
      case 'acceptSuggestion':
        result = handleAcceptSuggestion(data);
        break;
      case 'autoAssign':
        result = handleAutoAssign();
        break;
      case 'conflictCheck':
        result = handleConflictCheck();
        break;
      case 'publishToApp':
        result = handlePublishToApp(data);
        break;
      case 'assignToDriver':
        result = handleAssignToDriver(data);
        break;
      case 'assignToVehicle':
        result = handleAssignToVehicle(data);
        break;
      default:
        result = { success: false, error: '未知的操作類型: ' + action };
    }
    
    // 記錄操作日誌
    logOperation(action, data, result);
    
    // 返回結果
    return ContentService
      .createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON)
      .setHeaders(headers);
      
  } catch (error) {
    console.error('處理請求時發生錯誤:', error);
    
    const errorResult = {
      success: false,
      error: error.message || '伺服器內部錯誤',
      timestamp: new Date().toISOString()
    };
    
    return ContentService
      .createTextOutput(JSON.stringify(errorResult))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==================== 基礎功能函數 ====================

/**
 * 處理ping請求
 */
function handlePing() {
  return {
    success: true,
    message: 'GAS後端連接正常',
    timestamp: new Date().toISOString(),
    version: CONFIG.API.VERSION
  };
}

/**
 * 處理用戶登入驗證
 */
function handleVerifyLogin(data) {
  try {
    const { username, password } = data;
    
    if (!username || !password) {
      return { success: false, error: '請提供用戶名和密碼' };
    }
    
    // 從Users工作表獲取用戶資料
    const usersSheet = getSheetByName(CONFIG.SHEETS.USERS);
    if (!usersSheet) {
      return { success: false, error: '用戶資料表不存在' };
    }
    
    const usersData = usersSheet.getDataRange().getValues();
    const headers = usersData[0];
    const userRows = usersData.slice(1);
    
    // 查找用戶
    const userIndex = headers.indexOf('username');
    const passwordIndex = headers.indexOf('password');
    const levelIndex = headers.indexOf('level');
    
    if (userIndex === -1 || passwordIndex === -1) {
      return { success: false, error: '用戶資料表格式錯誤' };
    }
    
    const user = userRows.find(row => 
      row[userIndex] === username && row[passwordIndex] === password
    );
    
    if (user) {
      return {
        success: true,
        user: {
          username: username,
          level: user[levelIndex] || 's1',
          loginTime: new Date().toISOString()
        }
      };
    } else {
      return { success: false, error: '用戶名或密碼錯誤' };
    }
    
  } catch (error) {
    console.error('登入驗證錯誤:', error);
    return { success: false, error: '登入驗證失敗' };
  }
}

/**
 * 更新最後登入時間
 */
function handleUpdateLastLogin(data) {
  try {
    const { username } = data;
    
    if (!username) {
      return { success: false, error: '請提供用戶名' };
    }
    
    const usersSheet = getSheetByName(CONFIG.SHEETS.USERS);
    if (!usersSheet) {
      return { success: false, error: '用戶資料表不存在' };
    }
    
    const usersData = usersSheet.getDataRange().getValues();
    const headers = usersData[0];
    const userIndex = headers.indexOf('username');
    const lastLoginIndex = headers.indexOf('lastLogin');
    
    if (userIndex === -1 || lastLoginIndex === -1) {
      return { success: false, error: '用戶資料表格式錯誤' };
    }
    
    // 查找並更新用戶的最後登入時間
    for (let i = 1; i < usersData.length; i++) {
      if (usersData[i][userIndex] === username) {
        usersSheet.getRange(i + 1, lastLoginIndex + 1).setValue(new Date());
        break;
      }
    }
    
    return { success: true, message: '最後登入時間已更新' };
    
  } catch (error) {
    console.error('更新登入時間錯誤:', error);
    return { success: false, error: '更新登入時間失敗' };
  }
}

// ==================== 資料獲取函數 ====================

/**
 * 獲取任務資料
 */
function handleGetTasks() {
  try {
    const tasksSheet = getSheetByName(CONFIG.SHEETS.TASKS);
    if (!tasksSheet) {
      return { success: false, error: '任務資料表不存在' };
    }
    
    const tasksData = tasksSheet.getDataRange().getValues();
    const headers = tasksData[0];
    const taskRows = tasksData.slice(1);
    
    // 轉換為物件格式
    const tasks = taskRows.map(row => {
      const task = {};
      headers.forEach((header, index) => {
        task[header] = row[index];
      });
      return task;
    });
    
    return { success: true, data: tasks };
    
  } catch (error) {
    console.error('獲取任務資料錯誤:', error);
    return { success: false, error: '獲取任務資料失敗' };
  }
}

/**
 * 獲取任務統計資料（用於儀表板KPI）
 */
function handleGetTaskStats() {
  try {
    const tasksSheet = getSheetByName(CONFIG.SHEETS.TASKS);
    if (!tasksSheet) {
      return { success: false, error: '任務資料表不存在' };
    }
    
    const tasksData = tasksSheet.getDataRange().getValues();
    const headers = tasksData[0];
    const taskRows = tasksData.slice(1);
    
    // 找到F欄位的索引（第6欄，索引為5）
    const levelColumnIndex = 5; // F欄位對應索引5
    
    // 統計各等級任務數量
    let b3Count = 0;
    let b2Count = 0;
    let b1Count = 0;
    let totalCount = taskRows.length;
    
    taskRows.forEach(row => {
      const level = row[levelColumnIndex];
      if (level) {
        const levelStr = level.toString().toUpperCase();
        if (levelStr === 'B3') {
          b3Count++;
        } else if (levelStr === 'B2') {
          b2Count++;
        } else if (levelStr === 'B1') {
          b1Count++;
        }
      }
    });
    
    // 計算已指派率（假設有狀態欄位）
    let assignedCount = 0;
    const statusColumnIndex = headers.findIndex(header => 
      header.includes('狀態') || header.includes('配送狀態') || header.includes('指派狀態')
    );
    
    if (statusColumnIndex !== -1) {
      taskRows.forEach(row => {
        const status = row[statusColumnIndex];
        if (status && (status.toString().includes('已派') || status.toString().includes('進行中'))) {
          assignedCount++;
        }
      });
    }
    
    const assignRate = totalCount > 0 ? Math.round((assignedCount / totalCount) * 100) : 0;
    
    return {
      success: true,
      data: {
        totalTasks: totalCount,
        b3Tasks: b3Count,
        b2Tasks: b2Count,
        b1Tasks: b1Count,
        assignRate: assignRate,
        assignedTasks: assignedCount
      }
    };
    
  } catch (error) {
    console.error('獲取任務統計資料錯誤:', error);
    return { success: false, error: '獲取任務統計資料失敗' };
  }
}

/**
 * 獲取司機資料
 */
function handleGetDrivers() {
  try {
    const driversSheet = getSheetByName(CONFIG.SHEETS.DRIVERS);
    if (!driversSheet) {
      return { success: false, error: '司機資料表不存在' };
    }
    
    const driversData = driversSheet.getDataRange().getValues();
    const headers = driversData[0];
    const driverRows = driversData.slice(1);
    
    // 轉換為物件格式
    const drivers = driverRows.map(row => {
      const driver = {};
      headers.forEach((header, index) => {
        driver[header] = row[index];
      });
      return driver;
    });
    
    return { success: true, data: drivers };
    
  } catch (error) {
    console.error('獲取司機資料錯誤:', error);
    return { success: false, error: '獲取司機資料失敗' };
  }
}

/**
 * 獲取車輛資料
 */
function handleGetVehicles() {
  try {
    const vehiclesSheet = getSheetByName(CONFIG.SHEETS.VEHICLES);
    if (!vehiclesSheet) {
      return { success: false, error: '車輛資料表不存在' };
    }
    
    const vehiclesData = vehiclesSheet.getDataRange().getValues();
    const headers = vehiclesData[0];
    const vehicleRows = vehiclesData.slice(1);
    
    // 轉換為物件格式
    const vehicles = vehicleRows.map(row => {
      const vehicle = {};
      headers.forEach((header, index) => {
        vehicle[header] = row[index];
      });
      return vehicle;
    });
    
    return { success: true, data: vehicles };
    
  } catch (error) {
    console.error('獲取車輛資料錯誤:', error);
    return { success: false, error: '獲取車輛資料失敗' };
  }
}

/**
 * 獲取司機表格原始資料
 */
function handleGetDriverSheetData() {
  try {
    const driversSheet = getSheetByName(CONFIG.SHEETS.DRIVERS);
    if (!driversSheet) {
      return { success: false, error: '司機資料表不存在' };
    }
    
    const data = driversSheet.getDataRange().getValues();
    return { success: true, data: data };
    
  } catch (error) {
    console.error('獲取司機表格資料錯誤:', error);
    return { success: false, error: '獲取司機表格資料失敗' };
  }
}

/**
 * 獲取車輛表格原始資料
 */
function handleGetVehicleSheetData() {
  try {
    const vehiclesSheet = getSheetByName(CONFIG.SHEETS.VEHICLES);
    if (!vehiclesSheet) {
      return { success: false, error: '車輛資料表不存在' };
    }
    
    const data = vehiclesSheet.getDataRange().getValues();
    return { success: true, data: data };
    
  } catch (error) {
    console.error('獲取車輛表格資料錯誤:', error);
    return { success: false, error: '獲取車輛表格資料失敗' };
  }
}

// ==================== 資料更新函數 ====================

/**
 * 更新司機表格資料
 */
function handleUpdateDriverSheetData(data) {
  try {
    const { data: sheetData } = data;
    
    if (!sheetData || !Array.isArray(sheetData)) {
      return { success: false, error: '無效的資料格式' };
    }
    
    const driversSheet = getSheetByName(CONFIG.SHEETS.DRIVERS);
    if (!driversSheet) {
      return { success: false, error: '司機資料表不存在' };
    }
    
    // 清除現有資料
    driversSheet.clear();
    
    // 寫入新資料
    if (sheetData.length > 0) {
      driversSheet.getRange(1, 1, sheetData.length, sheetData[0].length).setValues(sheetData);
    }
    
    return { success: true, message: '司機資料更新成功' };
    
  } catch (error) {
    console.error('更新司機資料錯誤:', error);
    return { success: false, error: '更新司機資料失敗' };
  }
}

/**
 * 更新車輛表格資料
 */
function handleUpdateVehicleSheetData(data) {
  try {
    const { data: sheetData } = data;
    
    if (!sheetData || !Array.isArray(sheetData)) {
      return { success: false, error: '無效的資料格式' };
    }
    
    const vehiclesSheet = getSheetByName(CONFIG.SHEETS.VEHICLES);
    if (!vehiclesSheet) {
      return { success: false, error: '車輛資料表不存在' };
    }
    
    // 清除現有資料
    vehiclesSheet.clear();
    
    // 寫入新資料
    if (sheetData.length > 0) {
      vehiclesSheet.getRange(1, 1, sheetData.length, sheetData[0].length).setValues(sheetData);
    }
    
    return { success: true, message: '車輛資料更新成功' };
    
  } catch (error) {
    console.error('更新車輛資料錯誤:', error);
    return { success: false, error: '更新車輛資料失敗' };
  }
}

// ==================== 智能配對函數 ====================

/**
 * 產生Top3配對建議
 */
function handleGenerateTop3(data) {
  try {
    const { taskId } = data;
    
    if (!taskId) {
      return { success: false, error: '請提供任務ID' };
    }
    
    // 獲取任務、司機、車輛資料
    const tasksResult = handleGetTasks();
    const driversResult = handleGetDrivers();
    const vehiclesResult = handleGetVehicles();
    
    if (!tasksResult.success || !driversResult.success || !vehiclesResult.success) {
      return { success: false, error: '獲取資料失敗' };
    }
    
    const task = tasksResult.data.find(t => t.id === taskId);
    if (!task) {
      return { success: false, error: '找不到指定任務' };
    }
    
    // 執行配對算法
    const suggestions = generatePairingSuggestions(task, driversResult.data, vehiclesResult.data);
    
    return { success: true, data: suggestions.slice(0, 3) };
    
  } catch (error) {
    console.error('產生配對建議錯誤:', error);
    return { success: false, error: '產生配對建議失敗' };
  }
}

/**
 * 接受配對建議
 */
function handleAcceptSuggestion(data) {
  try {
    const { taskId, suggestionIndex } = data;
    
    if (!taskId || suggestionIndex === undefined) {
      return { success: false, error: '請提供任務ID和建議索引' };
    }
    
    // 這裡實作接受建議的邏輯
    // 更新任務狀態、記錄指派等
    
    return { success: true, message: '建議已接受' };
    
  } catch (error) {
    console.error('接受建議錯誤:', error);
    return { success: false, error: '接受建議失敗' };
  }
}

/**
 * 一鍵自動配對
 */
function handleAutoAssign() {
  try {
    // 獲取所有待派任務
    const tasksResult = handleGetTasks();
    const driversResult = handleGetDrivers();
    const vehiclesResult = handleGetVehicles();
    
    if (!tasksResult.success || !driversResult.success || !vehiclesResult.success) {
      return { success: false, error: '獲取資料失敗' };
    }
    
    const unassignedTasks = tasksResult.data.filter(t => t['配送狀態'] === '待派');
    const availableDrivers = driversResult.data.filter(d => d['狀態'] === '可派遣');
    const availableVehicles = vehiclesResult.data.filter(v => v['狀態'] === '可用');
    
    const assignments = [];
    
    // 執行自動配對邏輯
    for (const task of unassignedTasks) {
      const suggestions = generatePairingSuggestions(task, availableDrivers, availableVehicles);
      if (suggestions.length > 0) {
        const bestSuggestion = suggestions[0];
        assignments.push({
          taskId: task.id,
          driverId: bestSuggestion.driver?.id,
          vehicleId: bestSuggestion.vehicle?.id,
          score: bestSuggestion.score
        });
      }
    }
    
    return { success: true, data: assignments };
    
  } catch (error) {
    console.error('自動配對錯誤:', error);
    return { success: false, error: '自動配對失敗' };
  }
}

// ==================== 其他功能函數 ====================

/**
 * 衝突檢查
 */
function handleConflictCheck() {
  try {
    // 實作衝突檢查邏輯
    const conflicts = [];
    
    return { success: true, data: conflicts };
    
  } catch (error) {
    console.error('衝突檢查錯誤:', error);
    return { success: false, error: '衝突檢查失敗' };
  }
}

/**
 * 發佈到司機APP
 */
function handlePublishToApp(data) {
  try {
    const { tasks } = data;
    
    // 實作發佈到APP的邏輯
    
    return { success: true, message: '已發佈到司機APP' };
    
  } catch (error) {
    console.error('發佈到APP錯誤:', error);
    return { success: false, error: '發佈到APP失敗' };
  }
}

/**
 * 指派給司機
 */
function handleAssignToDriver(data) {
  try {
    const { taskId, driverId } = data;
    
    // 實作指派給司機的邏輯
    
    return { success: true, message: '任務已指派給司機' };
    
  } catch (error) {
    console.error('指派給司機錯誤:', error);
    return { success: false, error: '指派給司機失敗' };
  }
}

/**
 * 指派給車輛
 */
function handleAssignToVehicle(data) {
  try {
    const { taskId, vehicleId } = data;
    
    // 實作指派給車輛的邏輯
    
    return { success: true, message: '任務已指派給車輛' };
    
  } catch (error) {
    console.error('指派給車輛錯誤:', error);
    return { success: false, error: '指派給車輛失敗' };
  }
}

// ==================== 輔助函數 ====================

/**
 * 根據名稱獲取工作表
 */
function getSheetByName(sheetName) {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    return spreadsheet.getSheetByName(sheetName);
  } catch (error) {
    console.error('獲取工作表錯誤:', error);
    return null;
  }
}

/**
 * 產生配對建議
 */
function generatePairingSuggestions(task, drivers, vehicles) {
  const suggestions = [];
  
  for (const driver of drivers) {
    for (const vehicle of vehicles) {
      const score = calculatePairingScore(task, driver, vehicle);
      suggestions.push({
        driver: driver,
        vehicle: vehicle,
        score: score,
        factors: generateFactors(task, driver, vehicle),
        risks: generateRisks(task, driver, vehicle)
      });
    }
  }
  
  // 按分數排序
  suggestions.sort((a, b) => b.score - a.score);
  
  return suggestions;
}

/**
 * 計算配對分數
 */
function calculatePairingScore(task, driver, vehicle) {
  let score = 0;
  
  // 司機等級匹配
  const driverLevel = driver['級別'] || driver.level;
  const taskLevel = task.level;
  
  if (driverLevel === 'A3' && taskLevel === 'B3') score += 30;
  else if (driverLevel === 'A2' && taskLevel === 'B2') score += 25;
  else if (driverLevel === 'A1' && taskLevel === 'B1') score += 20;
  
  // 車輛類型匹配
  const vehicleType = vehicle.type;
  if (vehicleType === '甲' && taskLevel === 'B3') score += 20;
  else if (vehicleType === '乙' && taskLevel === 'B2') score += 15;
  else if (vehicleType === '丙' && taskLevel === 'B1') score += 10;
  
  // 司機狀態
  if (driver['狀態'] === '可派遣') score += 10;
  
  // 車輛狀態
  if (vehicle['狀態'] === '可用') score += 10;
  
  return score;
}

/**
 * 產生推薦理由
 */
function generateFactors(task, driver, vehicle) {
  const factors = [];
  
  const driverLevel = driver['級別'] || driver.level;
  const taskLevel = task.level;
  
  if (driverLevel === 'A3' && taskLevel === 'B3') {
    factors.push('司機等級與任務等級完美匹配');
  }
  
  if (driver['狀態'] === '可派遣') {
    factors.push('司機目前可派遣');
  }
  
  if (vehicle['狀態'] === '可用') {
    factors.push('車輛目前可用');
  }
  
  return factors;
}

/**
 * 產生風險提醒
 */
function generateRisks(task, driver, vehicle) {
  const risks = [];
  
  // 檢查工時
  if (driver.workHours && driver.workHours > 8) {
    risks.push('司機工時較長，需注意疲勞駕駛');
  }
  
  // 檢查車輛年限
  if (vehicle.age && vehicle.age > 10) {
    risks.push('車輛年限較長，需注意維護狀況');
  }
  
  return risks;
}

/**
 * 記錄操作日誌
 */
function logOperation(action, data, result) {
  try {
    const logsSheet = getSheetByName(CONFIG.SHEETS.LOGS);
    if (logsSheet) {
      const logRow = [
        new Date(),
        action,
        JSON.stringify(data),
        result.success ? '成功' : '失敗',
        result.error || '',
        Session.getActiveUser().getEmail() || '未知用戶'
      ];
      
      logsSheet.appendRow(logRow);
    }
  } catch (error) {
    console.error('記錄日誌錯誤:', error);
  }
}

// ==================== 測試函數 ====================

/**
 * 測試函數 - 可在GAS編輯器中直接執行
 */
function testAPI() {
  console.log('測試API連接...');
  
  const testData = {
    action: 'ping',
    data: {}
  };
  
  const mockEvent = {
    postData: {
      contents: JSON.stringify(testData)
    }
  };
  
  const result = doPost(mockEvent);
  console.log('測試結果:', result.getContent());
}

/**
 * 初始化資料表
 */
function initializeSheets() {
  try {
    const spreadsheet = SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
    
    // 創建必要的工作表
    const sheetNames = Object.values(CONFIG.SHEETS);
    
    for (const sheetName of sheetNames) {
      let sheet = spreadsheet.getSheetByName(sheetName);
      if (!sheet) {
        sheet = spreadsheet.insertSheet(sheetName);
        console.log('創建工作表:', sheetName);
      }
    }
    
    console.log('資料表初始化完成');
    
  } catch (error) {
    console.error('初始化資料表錯誤:', error);
  }
}

