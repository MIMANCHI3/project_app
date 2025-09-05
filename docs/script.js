// script.js - 支持 GitHub Pages 管理员编辑（本地保存到 localStorage），并提供导出/导入功能
// 自动渲染第 1-22 周，起始日期：2025-09-01（星期一）

const SEMESTER_START = new Date(2025, 8, 1); // 2025-09-01
const TOTAL_WEEKS = 22;
const DAYS = ['一','二','三','四','五','六','日'];
const LS_KEY = 'schedule_local_v1';

// 内嵌示例（仅在无任何数据时使用）
const EMBEDDED_SAMPLE = [
  {"table_id":1,"week":3,"day":"一","status":"free"},
  {"table_id":1,"week":3,"day":"二","status":"booked"},
  {"table_id":1,"week":3,"day":"三","status":"free"},
  {"table_id":1,"week":3,"day":"四","status":"free"},
  {"table_id":1,"week":3,"day":"五","status":"booked"},
  {"table_id":1,"week":3,"day":"六","status":"free"},
  {"table_id":1,"week":3,"day":"日","status":"free"}
];

// ==========================
// script.js  最终版
// ==========================

// 预置示例数据（初始填充，防止没有数据时空白）
const EMBEDDED_SAMPLE = [
  { "table_id": 1, "week": 1, "day": "一", "status": "free" },
  { "table_id": 1, "week": 1, "day": "二", "status": "booked" },
  { "table_id": 2, "week": 1, "day": "三", "status": "free" }
];

// 尝试从 JSON / localStorage 获取数据，否则回退到内置
async function fetchWithFallback() {
  try {
    const res = await fetch('./api/schedule.json', { cache: "no-store" });
    if (res.ok) return await res.json();
  } catch (e) {}

  const stored = window.localStorage.getItem('mock_schedule');
  if (stored) {
    try { return JSON.parse(stored); } catch(e){}
  }
  return EMBEDDED_SAMPLE;
}

// 主入口：加载表格
async function loadSchedule() {
  const data = await fetchWithFallback();

  const grid1 = document.getElementById('grid1');
  grid1.innerHTML = '';
  populateSchedule(grid1, data.filter(item => item.table_id === 1));

  const grid2 = document.getElementById('grid2');
  grid2.innerHTML = '';
  populateSchedule(grid2, data.filter(item => item.table_id === 2));

  // 用全局变量控制是否启用管理员模式
  if (window.IS_ADMIN_PAGE) {
    addEditFunctionality('grid1', 1, data);
    addEditFunctionality('grid2', 2, data);
  }
}

// 填充课表（固定 1-22 周，从 9 月 1 日开始）
function populateSchedule(grid, data) {
  const weeks = Array.from({ length: 22 }, (_, i) => i + 1);
  weeks.forEach((week) => {
    const row = document.createElement('tr');
    row.innerHTML = `<td>第${week}周</td>`;

    const startDate = new Date(2025, 8, 1 + (week - 1) * 7); // 2025年9月1日开始
    const days = ['一','二','三','四','五','六','日'];

    days.forEach((day, index) => {
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + index);
      const dateStr = `${cellDate.getMonth()+1}/${cellDate.getDate()}`;
      const status = data.find(d => d.week === week && d.day === day)?.status || 'free';

      const cell = document.createElement('td');
      cell.className = `cell ${status}`;
      cell.innerHTML = `<div class="date">${dateStr}</div><div class="status">${status==='booked'?'●':''}</div>`;
      row.appendChild(cell);
    });

    grid.appendChild(row);
  });
}

// 保存数据到 localStorage
function saveMockData(data) {
  try { window.localStorage.setItem('mock_schedule', JSON.stringify(data)); } catch(e){}
}

// 管理员模式：点击单元格切换状态并保存
function addEditFunctionality(gridId, tableId, data) {
  const grid = document.getElementById(gridId);
  grid.addEventListener('click', (ev) => {
    const cell = ev.target.closest('.cell');
    if (!cell) return;

    const row = cell.parentNode;
    const week = parseInt(row.firstChild.textContent.match(/\d+/)[0]);
    const children = Array.from(row.children);
    const idx = children.indexOf(cell);
    const days = ['一','二','三','四','五','六','日'];
    const day = days[idx - 1];

    // 切换状态
    const newStatus = cell.classList.contains('free') ? 'booked' : 'free';
    cell.className = `cell ${newStatus}`;
    const statusDiv = cell.querySelector('.status');
    if (statusDiv) statusDiv.textContent = newStatus === 'booked' ? '●' : '';

    // 更新 localStorage
    let localData = [];
    try {
      const s = window.localStorage.getItem('mock_schedule');
      localData = s ? JSON.parse(s) : (data || []);
    } catch {}
    const idx2 = localData.findIndex(d => d.table_id===tableId && d.week===week && d.day===day);
    if (idx2 >= 0) localData[idx2].status = newStatus;
    else localData.push({table_id:tableId, week, day, status: newStatus});
    saveMockData(localData);
  });
}

// 启动
loadSchedule();

