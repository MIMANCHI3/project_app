// script.js - 从 2025-09-01（星期一）开始，并自动填充第 1-22 周
// 优先尝试后端 -> 再尝试相对静态文件 -> 回退到内嵌示例数据

const SEMESTER_START = new Date(2025, 8, 1); // 2025-09-01 (month 8 = September)
const TOTAL_WEEKS = 22;

// 内嵌示例数据（可选，用于在没有外部数据时显示一些预约样例）
const EMBEDDED_SAMPLE = [
  {"table_id":1,"week":3,"day":"一","status":"free"},
  {"table_id":1,"week":3,"day":"二","status":"booked"},
  {"table_id":1,"week":3,"day":"三","status":"free"},
  {"table_id":1,"week":3,"day":"四","status":"free"},
  {"table_id":1,"week":3,"day":"五","status":"booked"},
  {"table_id":1,"week":3,"day":"六","status":"free"},
  {"table_id":1,"week":3,"day":"日","status":"free"},
  {"table_id":1,"week":4,"day":"一","status":"booked"},
  {"table_id":1,"week":4,"day":"二","status":"free"},
  {"table_id":1,"week":4,"day":"三","status":"free"},
  {"table_id":1,"week":4,"day":"四","status":"free"},
  {"table_id":1,"week":4,"day":"五","status":"free"},
  {"table_id":1,"week":4,"day":"六","status":"booked"},
  {"table_id":1,"week":4,"day":"日","status":"free"},
  {"table_id":2,"week":3,"day":"一","status":"free"},
  {"table_id":2,"week":3,"day":"二","status":"free"},
  {"table_id":2,"week":3,"day":"三","status":"booked"},
  {"table_id":2,"week":3,"day":"四","status":"free"},
  {"table_id":2,"week":3,"day":"五","status":"free"},
  {"table_id":2,"week":3,"day":"六","status":"free"},
  {"table_id":2,"week":3,"day":"日","status":"booked"},
  {"table_id":2,"week":4,"day":"一","status":"free"},
  {"table_id":2,"week":4,"day":"二","status":"booked"},
  {"table_id":2,"week":4,"day":"三","status":"free"},
  {"table_id":2,"week":4,"day":"四","status":"free"},
  {"table_id":2,"week":4,"day":"五","status":"free"},
  {"table_id":2,"week":4,"day":"六","status":"free"},
  {"table_id":2,"week":4,"day":"日","status":"free"}
];

async function fetchWithFallback() {
  // 尝试真实后端（适用于部署到服务器或本地启动 http 服务时）
  try {
    const res = await fetch('/api/schedule', { cache: "no-store" });
    if (res.ok) return await res.json();
  } catch (e) { /* ignore */ }

  // 尝试相对静态文件（当你把 api/schedule.json 放到同目录下时有效）
  try {
    const res2 = await fetch('./api/schedule.json', { cache: "no-store" });
    if (res2.ok) return await res2.json();
  } catch (e) { /* ignore */ }

  // 本地 localStorage（优先，保存用户编辑）
  const stored = window.localStorage.getItem('mock_schedule');
  if (stored) {
    try { return JSON.parse(stored); } catch(e) { /* ignore */ }
  }

  // 最后回退到内嵌示例数据（若想默认全 free，可返回 []）
  return EMBEDDED_SAMPLE;
}

function weekStartDate(weekNumber) {
  // weekNumber 从 1 开始。第1周的星期一为 SEMESTER_START
  const daysToAdd = (weekNumber - 1) * 7;
  const d = new Date(SEMESTER_START);
  d.setDate(d.getDate() + daysToAdd);
  d.setHours(0,0,0,0);
  return d;
}

async function loadSchedule() {
  const data = await fetchWithFallback();

  // 为渲染方便，确保 data 是数组
  const scheduleData = Array.isArray(data) ? data : [];

  const grid1 = document.getElementById('grid1');
  grid1.innerHTML = '';
  populateSchedule(grid1, scheduleData.filter(item => item.table_id === 1));

  const grid2 = document.getElementById('grid2');
  grid2.innerHTML = '';
  populateSchedule(grid2, scheduleData.filter(item => item.table_id === 2));

  // 若为管理员页面，启用编辑功能
  if (window.location.pathname.endsWith('/admin.html') || window.location.pathname.endsWith('admin.html')) {
    addEditFunctionality('grid1', 1, scheduleData);
    addEditFunctionality('grid2', 2, scheduleData);
  }
}

function populateSchedule(grid, data) {
  // 填充第 1 到 第 TOTAL_WEEKS 周（保证即使没有后端数据也能显示 1-22 周）
  for (let week = 1; week <= TOTAL_WEEKS; week++) {
    const row = document.createElement('tr');
    row.innerHTML = `<td>第${week}周</td>`;

    const startDate = weekStartDate(week); // 该周星期一
    const days = ['一','二','三','四','五','六','日'];

    days.forEach((day, index) => {
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + index);
      const dateStr = `${cellDate.getMonth() + 1}/${cellDate.getDate()}`;

      const cell = document.createElement('td');
      // 查找 data 中对应条目（若不存在则默认 free）
      const status = data.find(d => d.week === week && d.day === day)?.status || 'free';

      cell.innerHTML = `
        <div class="date">${dateStr}</div>
        <div class="status">${status === 'booked' ? '●' : ''}</div>
      `;
      cell.className = `cell ${status}`;
      row.appendChild(cell);
    });

    grid.appendChild(row);
  }
}

function saveMockData(data) {
  try { window.localStorage.setItem('mock_schedule', JSON.stringify(data)); } catch(e) {}
}

// 编辑功能（事件委托）：点击单元格切换状态，尝试提交到后端，失败则回写 localStorage
// 将原来的 addEditFunctionality 替换为下面内容
function addEditFunctionality(gridId, tableId, data) {
  const grid = document.getElementById(gridId);
  grid.addEventListener('click', async (ev) => {
    const cell = ev.target.closest('.cell');
    if (!cell) return;
    const row = cell.parentNode;
    const weekText = row.firstChild.textContent;
    const week = parseInt(weekText.match(/\d+/)[0], 10);
    const children = Array.from(row.children);
    const idx = children.indexOf(cell);
    const days = ['一','二','三','四','五','六','日'];
    const day = days[idx - 1];
    const newStatus = cell.classList.contains('free') ? 'booked' : 'free';

    // 先在界面上切换显示
    cell.className = `cell ${newStatus}`;
    const statusDiv = cell.querySelector('.status');
    if (statusDiv) statusDiv.textContent = newStatus === 'booked' ? '●' : '';

    // 如果你确实有后端可用则可以启用后端推送，否则直接回写 localStorage
    // 判断是否在支持后端环境（默认为 false，在 GitHub Pages 推荐为 false）
    const USE_BACKEND = false; // 若你有后端并部署好，请改为 true

    if (USE_BACKEND) {
      try {
        const res = await fetch('./api/update', { // 使用相对路径更稳
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({table_id: tableId, week, day, status: newStatus})
        });
        if (!res.ok) throw new Error('server update failed');
        // 可选：根据返回刷新数据或提示成功
        return;
      } catch (e) {
        // 若后端失败，则落回到 localStorage
        console.warn('Backend update failed, saving locally.', e);
      }
    }

    // 回退：写入 localStorage（按 table_id+week+day 覆盖或新增）
    let localData = [];
    try {
      const s = window.localStorage.getItem('mock_schedule');
      localData = s ? JSON.parse(s) : (data || []);
    } catch (err) {
      localData = (data || []);
    }
    const idx2 = localData.findIndex(d => d.table_id === tableId && d.week === week && d.day === day);
    if (idx2 >= 0) localData[idx2].status = newStatus;
    else localData.push({ table_id: tableId, week, day, status: newStatus });
    try { window.localStorage.setItem('mock_schedule', JSON.stringify(localData)); } catch(e){}
  });
}


loadSchedule();
