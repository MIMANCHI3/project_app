// script.js - 集成 LeanCloud

// 初始化 LeanCloud SDK
var APP_ID = 'YkGU3OKGHmv6fK3qYxuzWjLc-gzGzoHsz';
var APP_KEY = 'dvQRjtHtiUwxceLonRilMbWp';
var SERVER_URL = 'https://ykgu3okg.lc-cn-n1-shared.com';

AV.init({
  appId: APP_ID,
  appKey: APP_KEY,
  serverURL: SERVER_URL
});

const SEMESTER_START = new Date(2025, 8, 1);
const TOTAL_WEEKS = 22;
const DAYS = ['一', '二', '三', '四', '五', '六', '日'];

// 主加载函数
async function loadSchedule() {
  // 获取当前周数（例如，第几周）
  const currentWeek = calculateCurrentWeek();
  document.getElementById('saveStatus').innerText = `当前是第 ${currentWeek} 周。点击单元格编辑，状态会自动保存。`;

  try {
    // 并行获取两个表格的数据
    const [data1, data2] = await Promise.all([
      fetchDataFromLeanCloud(1),
      fetchDataFromLeanCloud(2)
    ]);

    renderSchedule('grid1', data1);
    renderSchedule('grid2', data2);

    // 如果是管理员页面，添加编辑功能
    if (isAdminPage()) {
      addEditFunctionality('grid1', 1);
      addEditFunctionality('grid2', 2);
      document.getElementById('initBtn').addEventListener('click', () => initCurrentWeekData(currentWeek));
    }
  } catch (error) {
    console.error("加载数据失败:", error);
    alert('加载数据失败，请查看控制台日志或检查网络连接。');
  }
}

// 从 LeanCloud 获取数据
async function fetchDataFromLeanCloud(tableId) {
  const ClassName = tableId === 1 ? 'Schedule1' : 'Schedule2';
  const query = new AV.Query(ClassName);
  // 可以根据需要添加更多查询条件，例如只获取当前周或未来的数据以优化性能
  // query.greaterThanOrEqualTo('week', currentWeek);
  return await query.find();
}

// 渲染表格
function renderSchedule(gridId, data) {
  const grid = document.getElementById(gridId);
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

// 添加编辑功能
function addEditFunctionality(gridId, tableId) {
  const grid = document.getElementById(gridId);
  grid.addEventListener('click', async (ev) => {
    const cell = ev.target.closest('td'); // 点击的是单元格，而不是内部的div
    if (!cell || !cell.classList.contains('cell')) return;

    const week = parseInt(cell.dataset.week);
    const day = cell.dataset.day;
    const currentStatus = cell.classList.contains('free') ? 'free' : 'booked';
    const newStatus = currentStatus === 'free' ? 'booked' : 'free';
    const objectId = cell.dataset.objectId;
    const tableIdNum = parseInt(cell.dataset.tableId);
    const ClassName = tableIdNum === 1 ? 'Schedule1' : 'Schedule2';

    try {
      let scheduleObject;
      if (objectId) {
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

      document.getElementById('saveStatus').innerText = '保存成功！';
      setTimeout(() => {
        document.getElementById('saveStatus').innerText = '点击单元格即可编辑，状态会自动保存到云端。';
      }, 2000);

    } catch (error) {
      console.error("保存失败:", error);
      alert('保存到云端失败，请查看控制台日志。');
    }
  });
}

// 初始化/重置当前周数据（管理员功能）
async function initCurrentWeekData(week) {
  if (!confirm(`确定要初始化第 ${week} 周的数据吗？这将把本周所有时间段状态重置为“可预约”(free)。`)) {
    return;
  }

  try {
    // 为两个表初始化数据
    for (let tableId of [1, 2]) {
      const ClassName = tableId === 1 ? 'Schedule1' : 'Schedule2';
      // 1. 先检查是否已有本周数据
      const query = new AV.Query(ClassName);
      query.equalTo('week', week);
      const existingRecords = await query.find();

      // 2. 如果已有记录，删除它们（可选，这里选择覆盖）
      if (existingRecords.length > 0) {
        await AV.Object.destroyAll(existingRecords);
      }

      // 3. 创建新的 free 状态记录
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

// --- 以下为辅助函数，基本保持不变 ---
function weekStartDate(weekNumber) {
  const daysToAdd = (weekNumber - 1) * 7;
  const d = new Date(SEMESTER_START);
  d.setDate(d.getDate() + daysToAdd);
  d.setHours(0, 0, 0, 0);
  return d;
}

function calculateCurrentWeek() {
  const now = new Date();
  const start = new Date(SEMESTER_START);
  const diffTime = now - start;
  const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
  return Math.max(1, Math.min(diffWeeks + 1, TOTAL_WEEKS)); // 限制在 1 到 TOTAL_WEEKS 之间
}

function isAdminPage() {
  return window.location.pathname.endsWith('/admin.html') || window.location.pathname.endsWith('admin.html');
}

// 启动加载
loadSchedule();
