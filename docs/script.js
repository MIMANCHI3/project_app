async function loadSchedule() {
  const res = await fetch('/api/schedule');
  const data = await res.json();

  // 填充第一个表格
  const grid1 = document.getElementById('grid1');
  grid1.innerHTML = '';
  //populateSchedule(grid1, data);
  populateSchedule(grid1, data.filter(item => item.table_id === 1)); // 只填充 table_id=1 的数据

  // 填充第二个表格
  const grid2 = document.getElementById('grid2');
  grid2.innerHTML = '';
  //populateSchedule(grid2, data);
  populateSchedule(grid2, data.filter(item => item.table_id === 2)); // 只填充 table_id=2 的数据

  // 如果是管理员页面，启用编辑
  if (window.location.pathname === '/admin.html') {
    // 为第一个表格添加编辑功能
    //addEditFunctionality('grid1', data);
    addEditFunctionality('grid1', 1, data);

    // 为第二个表格添加编辑功能
    //addEditFunctionality('grid2', data);
    addEditFunctionality('grid2', 2, data);
  }
}

// 填充表格的函数
function populateSchedule(grid, data) {
  // 按周分组
  const weeks = [...new Set(data.map(item => item.week))].sort((a, b) => a - b);
  weeks.forEach((week) => {
    const row = document.createElement('tr');
    row.innerHTML = `<td>第${week}周</td>`;
    
    // 根据周数计算起始日期（假设学期起始日期为2025-03-03，第3周）
    const startDate = new Date(2025, 2, 3 + (week - 3) * 7); // 月份从0开始（2表示3月）

    const days = ['一', '二', '三', '四', '五', '六', '日'];

    days.forEach((day, index) => {
      const cellDate = new Date(startDate);
      cellDate.setDate(startDate.getDate() + index);
      const dateStr = `${cellDate.getMonth() + 1}/${cellDate.getDate()}`;

      const cell = document.createElement('td');
      const status = data.find(d => d.week === week && d.day === day)?.status || 'free';
      
      // 单元格内容：日期 + 状态标记（如*）
      cell.innerHTML = `
        <div class="date">${dateStr}</div>
        <div class="status">${status === 'booked' ? '●' : ''}</div>
      `;
      cell.className = `cell ${status}`;
      row.appendChild(cell);
    });
    grid.appendChild(row);
  });
}

// 启用编辑功能的函数
function addEditFunctionality(gridId, tableId, data) {
  const grid = document.getElementById(gridId);
  grid.querySelectorAll('.cell').forEach(cell => {
    cell.style.cursor = 'pointer';
    cell.addEventListener('click', async () => {
      const week = parseInt(cell.parentNode.firstChild.textContent.match(/\d+/)[0]);
      const day = ['一', '二', '三', '四', '五', '六', '日'][cell.cellIndex - 1];
      const newStatus = cell.classList.contains('free') ? 'booked' : 'free';
      cell.className = `cell ${newStatus}`;
      await fetch('/api/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ table_id: tableId, week, day, status: newStatus })
      });
    });
  });
}

loadSchedule();
