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
  try {
    const res2 = await fetch('./api/schedule.json', { cache: "no-store" });
    if (res2.ok) return await res2.json();
  } catch (e) {}

  const stored = window.localStorage.getItem('mock_schedule');
  if (stored) {
    try { return JSON.parse(stored); } catch(e){}
  }
  return EMBEDDED_SAMPLE;
}

function weekStartDate(weekNumber) {
  const d = new Date(SEMESTER_START);
  d.setDate(d.getDate() + (weekNumber - 1) * 7);
  d.setHours(0,0,0,0);
  return d;
}

async function loadSchedule() {
  const data = await fetchWithFallback();
  const scheduleData = Array.isArray(data) ? data : [];

  const grid1 = document.getElementById('grid1');
  grid1.innerHTML = '';
  populateSchedule(grid1, scheduleData.filter(item => item.table_id === 1));

  const grid2 = document.getElementById('grid2');
  grid2.innerHTML = '';
  populateSchedule(grid2, scheduleData.filter(item => item.table_id === 2));

  if (window.location.pathname.endsWith('admin.html')) {
    addEditFunctionality('grid1', 1, scheduleData);
    addEditFunctionality('grid2', 2, scheduleData);
  }
}

function populateSchedule(grid, data) {
  for (let week = 1; week <= TOTAL_WEEKS; week++) {
    const row = document.createElement('tr');
    row.innerHTML = `<td>第${week}周</td>`;

    const startDate = weekStartDate(week);
    const days = ['一','二','三','四','五','六','日'];

    days.forEach((day, index) => {
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + index);
      const dateStr = `${cellDate.getMonth() + 1}/${cellDate.getDate()}`;

      const cell = document.createElement('td');
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

function addEditFunctionality(gridId, tableId, data) {
  const grid = document.getElementById(gridId);
  grid.addEventListener('click', (ev) => {
    const cell = ev.target.closest('.cell');
    if (!cell) return;
    const row = cell.parentNode;
    const week = parseInt(row.firstChild.textContent.match(/\d+/)[0], 10);
    const children = Array.from(row.children);
    const idx = children.indexOf(cell);
    const days = ['一','二','三','四','五','六','日'];
    const day = days[idx - 1];

    const newStatus = cell.classList.contains('free') ? 'booked' : 'free';
    cell.className = `cell ${newStatus}`;
    const statusDiv = cell.querySelector('.status');
    if (statusDiv) statusDiv.textContent = newStatus === 'booked' ? '●' : '';

    // 👉 GitHub Pages 没有后端，直接写入 localStorage
    let localData = [];
    try {
      const s = window.localStorage.getItem('mock_schedule');
      localData = s ? JSON.parse(s) : (data || []);
    } catch (err) { localData = (data || []); }

    const idx2 = localData.findIndex(d => d.table_id===tableId && d.week===week && d.day===day);
    if (idx2 >= 0) localData[idx2].status = newStatus;
    else localData.push({ table_id: tableId, week, day, status: newStatus });
    saveMockData(localData);
  });
}

loadSchedule();
