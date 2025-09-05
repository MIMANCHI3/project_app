// script.js - 集成 LeanCloud (修复版)

// 初始化 LeanCloud SDK
var APP_ID = 'YkGU3OKGHmv6fK3qYxuzWjLc-gzGzoHsz';
var APP_KEY = 'dvQRjtHtiUwxceLonRilMbWp';
var SERVER_URL = 'https://ykgu3okg.lc-cn-n1-shared.com';

// 等待页面完全加载后再执行
document.addEventListener('DOMContentLoaded', function() {
  // 初始化 LeanCloud
  if (typeof AV !== 'undefined') {
    AV.init({
      appId: APP_ID,
      appKey: APP_KEY,
      serverURL: SERVER_URL
    });
    
    // 启动应用
    setTimeout(initApplication, 100); // 稍等片刻确保SDK完全加载
  } else {
    console.error('LeanCloud SDK 未正确加载');
    // 可以在这里添加回退到本地存储的逻辑
  }
});

function initApplication() {
  const SEMESTER_START = new Date(2025, 8, 1);
  const TOTAL_WEEKS = 22;
  const DAYS = ['一', '二', '三', '四', '五', '六', '日'];

  // 只在 admin 页面显示的状态消息
  const saveStatusEl = document.getElementById('saveStatus');
  if (saveStatusEl) {
    const currentWeek = calculateCurrentWeek();
    saveStatusEl.innerText = `当前是第 ${currentWeek} 周。点击单元格编辑，状态会自动保存。`;
  }

  // 加载日程数据
  loadSchedule();

  // 如果是管理员页面，添加编辑功能
  if (isAdminPage()) {
    // 确保按钮存在再添加事件监听
    const initBtn = document.getElementById('initBtn');
    const resetBtn = document.getElementById('resetAllBtn');
    
    if (initBtn) {
      initBtn.addEventListener('click', function() {
        const currentWeek = calculateCurrentWeek();
        initCurrentWeekData(currentWeek);
      });
    }
    
    if (resetBtn) {
      resetBtn.addEventListener('click', function() {
        if (confirm('确定要重置所有数据吗？此操作不可撤销！')) {
          resetAllData();
        }
      });
    }
  }
}

// 计算当前周数
function calculateCurrentWeek() {
  const now = new Date();
  const start = new Date(SEMESTER_START);
  const diffTime = now - start;
  const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
  return Math.max(1, Math.min(diffWeeks + 1, TOTAL_WEEKS));
}

// 检查是否为管理员页面
function isAdminPage() {
  return window.location.pathname.includes('admin');
}

// 从 LeanCloud 获取数据
async function fetchDataFromLeanCloud(tableId) {
  try {
    const ClassName = tableId === 1 ? 'Schedule1' : 'Schedule2';
    const query = new AV.Query(ClassName);
    return await query.find();
  } catch (error) {
    console.error('从LeanCloud获取数据失败:', error);
    return [];
  }
}

// 渲染表格
async function renderSchedule(gridId, data) {
  const grid = document.getElementById(gridId);
  if (!grid) {
    console.error(`找不到元素 #${gridId}`);
    return;
  }
  
  grid.innerHTML = '';

  for (let week = 1; week <= TOTAL_WEEKS; week++) {
    const row = document.createElement('tr');
    row.innerHTML = `<td>第${week}周</td>`;

    const startDate = weekStartDate(week);

    DAYS.forEach((day, index) => {
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + index);
      const dateStr = `${cellDate.getMonth() + 1}/${cellDate.getDate()}`;

      const cell = document.createElement('td');
      // 查找匹配的数据对象
      const record = data.find(d => d.get('week') === week && d.get('day') === day);
      const status = record ? record.get('status') : 'free';
      const objectId = record ? record.id : null;

      cell.innerHTML = `
        <div class="date">${dateStr}</div>
        <div class="status">${status === 'booked' ? '●' : ''}</div>
      `;
      cell.className = `cell ${status}`;
      // 存储标识信息，便于后续编辑
      cell.dataset.week = week;
      cell.dataset.day = day;
      cell.dataset.objectId = objectId;
      cell.dataset.tableId = gridId === 'grid1' ? 1 : 2;

      row.appendChild(cell);
    });
    grid.appendChild(row);
  }
}

// 加载日程
async function loadSchedule() {
  try {
    // 并行获取两个表格的数据
    const [data1, data2] = await Promise.all([
      fetchDataFromLeanCloud(1),
      fetchDataFromLeanCloud(2)
    ]);

    // 渲染表格
    await renderSchedule('grid1', data1);
    await renderSchedule('grid2', data2);

    // 如果是管理员页面，添加编辑功能
    if (isAdminPage()) {
      addEditFunctionality('grid1', 1);
      addEditFunctionality('grid2', 2);
    }
  } catch (error) {
    console.error("加载数据失败:", error);
  }
}

// 添加编辑功能
function addEditFunctionality(gridId, tableId) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  
  grid.addEventListener('click', async (ev) => {
    const cell = ev.target.closest('.cell');
    if (!cell) return;

    const week = parseInt(cell.dataset.week);
    const day = cell.dataset.day;
    const currentStatus = cell.classList.contains('free') ? 'free' : 'booked';
    const newStatus = currentStatus === 'free' ? 'booked' : 'free';
    const objectId = cell.dataset.objectId;
    const tableIdNum = parseInt(cell.dataset.tableId);
    const ClassName = tableIdNum === 1 ? 'Schedule1' : 'Schedule2';

    try {
      let scheduleObject;
      if (objectId && objectId !== 'null') {
        // 更新现有记录
        scheduleObject = AV.Object.createWithoutData(ClassName, objectId);
      } else {
        // 创建新记录
        scheduleObject = new AV.Object(ClassName);
        scheduleObject.set('week', week);
        scheduleObject.set('day', day);
        scheduleObject.set('table_id', tableIdNum);
      }
      scheduleObject.set('status', newStatus);
      await scheduleObject.save();

      // 更新 UI
      cell.className = `cell ${newStatus}`;
      const statusDiv = cell.querySelector('.status');
      if (statusDiv) statusDiv.textContent = newStatus === 'booked' ? '●' : '';
      cell.dataset.objectId = scheduleObject.id; // 更新 objectId

      // 更新状态消息
      const saveStatusEl = document.getElementById('saveStatus');
      if (saveStatusEl) {
        saveStatusEl.innerText = '保存成功！';
        setTimeout(() => {
          saveStatusEl.innerText = '点击单元格即可编辑，状态会自动保存到云端。';
        }, 2000);
      }
    } catch (error) {
      console.error("保存失败:", error);
      alert('保存到云端失败，请查看控制台日志。');
    }
  });
}

// 初始化/重置当前周数据
async function initCurrentWeekData(week) {
  if (!confirm(`确定要初始化第 ${week} 周的数据吗？这将把本周所有时间段状态重置为"可预约"(free)。`)) {
    return;
  }

  try {
    // 为两个表初始化数据
    for (let tableId of [1, 2]) {
      const ClassName = tableId === 1 ? 'Schedule1' : 'Schedule2';
      
      // 删除现有数据
      const query = new AV.Query(ClassName);
      query.equalTo('week', week);
      const existingRecords = await query.find();
      if (existingRecords.length > 0) {
        await AV.Object.destroyAll(existingRecords);
      }

      // 创建新的 free 状态记录
      const newObjects = DAYS.map(day => {
        const obj = new AV.Object(ClassName);
        obj.set('week', week);
        obj.set('day', day);
        obj.set('status', 'free');
        obj.set('table_id', tableId);
        return obj;
      });
      await AV.Object.saveAll(newObjects);
    }

    alert(`第 ${week} 周数据初始化成功！`);
    location.reload(); // 重新加载页面
  } catch (error) {
    console.error("初始化数据失败:", error);
    alert('初始化数据失败，请查看控制台日志。');
  }
}

// 重置所有数据
async function resetAllData() {
  try {
    // 为两个表重置数据
    for (let tableId of [1, 2]) {
      const ClassName = tableId === 1 ? 'Schedule1' : 'Schedule2';
      
      // 获取所有记录
      const query = new AV.Query(ClassName);
      const allRecords = await query.find();
      
      // 删除所有记录
      if (allRecords.length > 0) {
        await AV.Object.destroyAll(allRecords);
      }
    }

    alert('所有数据已重置成功！');
    location.reload(); // 重新加载页面
  } catch (error) {
    console.error("重置数据失败:", error);
    alert('重置数据失败，请查看控制台日志。');
  }
}

// 辅助函数
function weekStartDate(weekNumber) {
  const daysToAdd = (weekNumber - 1) * 7;
  const d = new Date(SEMESTER_START);
  d.setDate(d.getDate() + daysToAdd);
  d.setHours(0, 0, 0, 0);
  return d;
}
