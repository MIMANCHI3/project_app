async function loadSchedule() {
  const res = await fetch('/api/schedule');
  const data = await res.json();

  // 填充第一个表格
  const grid1 = document.getElementById('grid1');
  grid1.innerHTML = '';
  populateSchedule(grid1, data.filter(item => item.table_id === 1));

  // 填充第二个表格
  const grid2 = document.getElementById('grid2');
  grid2.innerHTML = '';
  populateSchedule(grid2, data.filter(item => item.table_id === 2));

  // 如果是管理员页面，启用编辑
  if (window.location.pathname === '/admin.html') {
    addEditFunctionality('grid1', 1, data);
    addEditFunctionality('grid2', 2, data);
  }
}

function populateSchedule(grid, data) {
  const weeks = [...new Set(data.map(item => item.week))].sort((a, b) => a - b);
  weeks.forEach((week) => {
    const row = document.createElement('tr');
    row.innerHTML = `<td>第${week}周</td>`;
    
    const startDate = new Date(2025, 2, 3 + (week - 3) * 7);
    const days = ['一', '二', '三', '四', '五', '六', '日'];

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
  });
}

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
