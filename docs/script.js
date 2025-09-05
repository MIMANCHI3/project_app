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

// 优先尝试使用后端/静态文件，否则使用 localStorage，再否则使用内嵌示例
async function fetchWithFallback() {
  // 先尝试相对静态文件（更适合 GitHub Pages 若你放了 api/schedule.json）
  try {
    const r = await fetch('./api/schedule.json', {cache:'no-store'});
    if (r.ok) return await r.json();
  } catch(e){ /* ignore */ }

  // 再尝试绝对/同域后端（如果你部署了后端）
  try {
    const r2 = await fetch('/api/schedule', {cache:'no-store'});
    if (r2.ok) return await r2.json();
  } catch(e){ /* ignore */ }

  // 再尝试 localStorage（管理员之前的变更）
  try {
    const s = window.localStorage.getItem(LS_KEY);
    if (s) return JSON.parse(s);
  } catch(e){ /* ignore */ }

  // 最后用内嵌示例，若想全为 free 可以改为 []
  return EMBEDDED_SAMPLE;
}

function weekStartDate(weekNum) {
  const d = new Date(SEMESTER_START);
  d.setDate(d.getDate() + (weekNum - 1) * 7);
  d.setHours(0,0,0,0);
  return d;
}

// 合并后端/静态数据与本地 localStorage 的覆盖（local 覆盖 remote）
function mergeData(remote, local) {
  // remote/local 格式均为数组 of {table_id, week, day, status}
  const map = new Map();
  (remote || []).forEach(item=>{
    const key = `${item.table_id}#${item.week}#${item.day}`;
    map.set(key, item.status);
  });
  (local || []).forEach(item=>{
    const key = `${item.table_id}#${item.week}#${item.day}`;
    map.set(key, item.status); // local 覆盖
  });
  const out = [];
  for (let [key, status] of map.entries()) {
    const [table_id, week, day] = key.split('#');
    out.push({table_id: Number(table_id), week: Number(week), day, status});
  }
  return out;
}

async function loadSchedule() {
  const remote = await fetchWithFallback();
  // remote 可能为对象或数组，确保数组
  const remoteArr = Array.isArray(remote) ? remote : [];
  // 本地编辑数据（如果有）
  let localArr = [];
  try {
    const s = window.localStorage.getItem(LS_KEY);
    localArr = s ? JSON.parse(s) : [];
  } catch(e){ localArr = []; }

  // 合并后用于渲染（local 覆盖 remote）
  const merged = mergeData(remoteArr, localArr);

  // 渲染两个表
  const grid1 = document.getElementById('grid1');
  const grid2 = document.getElementById('grid2');
  if (!grid1 || !grid2) return;
  grid1.innerHTML = '';
  grid2.innerHTML = '';
  populateSchedule(grid1, merged.filter(i=>i.table_id===1));
  populateSchedule(grid2, merged.filter(i=>i.table_id===2));

  // admin 编辑功能（在 admin.html 页面启用）
  if (window.location.pathname.endsWith('/admin.html') || window.location.pathname.endsWith('admin.html')) {
    enableAdminTools();
    addEditFunctionality('grid1', 1);
    addEditFunctionality('grid2', 2);
  }
}

function populateSchedule(grid, data) {
  for (let week=1; week<=TOTAL_WEEKS; week++) {
    const row = document.createElement('tr');
    row.innerHTML = `<td>第${week}周</td>`;
    const start = weekStartDate(week);
    for (let i=0;i<7;i++){
      const cellDate = new Date(start);
      cellDate.setDate(start.getDate() + i);
      const dateStr = `${cellDate.getMonth()+1}/${cellDate.getDate()}`;

      const day = DAYS[i];
      const status = data.find(d=>d.week===week && d.day===day)?.status || 'free';
      const cell = document.createElement('td');
      cell.innerHTML = `<div class="date">${dateStr}</div><div class="status">${status==='booked'?'●':''}</div>`;
      cell.className = `cell ${status}`;
      row.appendChild(cell);
    }
    grid.appendChild(row);
  }
}

// 将变化写入 localStorage（覆盖或新增）
function writeLocalChange(table_id, week, day, status) {
  let local = [];
  try {
    const s = window.localStorage.getItem(LS_KEY);
    local = s ? JSON.parse(s) : [];
  } catch(e){ local = []; }
  const idx = local.findIndex(d=>d.table_id===table_id && d.week===week && d.day===day);
  if (idx>=0) local[idx].status = status;
  else local.push({table_id, week, day, status});
  try { window.localStorage.setItem(LS_KEY, JSON.stringify(local)); } catch(e){}
}

// 管理员编辑功能（本函数把修改直接保存到 localStorage，兼容 GitHub Pages）
function addEditFunctionality(gridId, tableId) {
  const grid = document.getElementById(gridId);
  if (!grid) return;
  grid.addEventListener('click', (ev)=>{
    const cell = ev.target.closest('.cell');
    if (!cell) return;
    const row = cell.parentNode;
    const weekMatch = row.firstChild.textContent.match(/\d+/);
    if (!weekMatch) return;
    const week = parseInt(weekMatch[0], 10);
    const children = Array.from(row.children);
    const idx = children.indexOf(cell);
    const day = DAYS[idx - 1]; // 第一列是第X周标签
    const newStatus = cell.classList.contains('free') ? 'booked' : 'free';

    // 更新 DOM
    cell.className = `cell ${newStatus}`;
    const sd = cell.querySelector('.status');
    if (sd) sd.textContent = newStatus==='booked' ? '●' : '';

    // 写到 localStorage
    writeLocalChange(tableId, week, day, newStatus);
  });
}

// admin 工具：导出/导入/重置 按钮（脚本自动插入到页面底部）
function enableAdminTools() {
  if (document.getElementById('admin-tools')) return; // 已插入
  const container = document.createElement('div');
  container.id = 'admin-tools';
  container.style = 'position:fixed; right:12px; bottom:12px; z-index:9999; background:rgba(255,255,255,0.95); border:1px solid #ccc; padding:8px; border-radius:6px; box-shadow:0 2px 6px rgba(0,0,0,0.15);';
  container.innerHTML = `
    <div style="font-size:13px; margin-bottom:6px;">Admin 工具</div>
    <button id="exportSchedule" style="margin:4px;">导出 JSON</button>
    <button id="importSchedule" style="margin:4px;">导入 JSON</button>
    <button id="clearLocal" style="margin:4px;">清空本地修改</button>
    <div id="admin-msg" style="font-size:12px; color:#666; margin-top:6px;"></div>
  `;
  document.body.appendChild(container);

  document.getElementById('exportSchedule').addEventListener('click', ()=>{
    let local = [];
    try { local = JSON.parse(window.localStorage.getItem(LS_KEY) || '[]'); } catch(e){ local = []; }
    const blob = new Blob([JSON.stringify(local, null, 2)], {type: 'application/json;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'schedule.json';
    a.click();
    URL.revokeObjectURL(url);
    showMsg('已导出 schedule.json（保存并手动上传到仓库以同步到其他人）');
  });

  document.getElementById('importSchedule').addEventListener('click', ()=>{
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = (e) => {
      const f = e.target.files[0];
      if (!f) return;
      const reader = new FileReader();
      reader.onload = function(evt) {
        try {
          const parsed = JSON.parse(evt.target.result);
          if (!Array.isArray(parsed)) throw new Error('JSON 必须为数组');
          window.localStorage.setItem(LS_KEY, JSON.stringify(parsed));
          // 重新渲染页面以应用导入的数据
          loadSchedule();
          showMsg('已导入本地数据并刷新页面显示（导入不会自动提交到仓库）');
        } catch(err) {
          showMsg('导入失败：文件格式不正确');
        }
      };
      reader.readAsText(f, 'utf-8');
    };
    input.click();
  });

  document.getElementById('clearLocal').addEventListener('click', ()=>{
    if (!confirm('确认清空本地所有管理员修改？此操作不可恢复（但不会影响 GitHub 仓库）。')) return;
    window.localStorage.removeItem(LS_KEY);
    loadSchedule();
    showMsg('已清空本地修改并刷新显示');
  });

  function showMsg(txt) {
    const el = document.getElementById('admin-msg');
    if (el) {
      el.textContent = txt;
      setTimeout(()=>{ el.textContent = ''; }, 4000);
    }
  }
}

// 初始化
document.addEventListener('DOMContentLoaded', () => {
  loadSchedule();
});
