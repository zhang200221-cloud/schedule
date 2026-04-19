// ── 備援（data.js 不存在時仍能正常運作） ──
if (typeof uid === 'undefined') { function uid() { return Math.random().toString(36).slice(2, 9); } }
if (typeof DEFAULT_FAQ_CATS === 'undefined') { var DEFAULT_FAQ_CATS = ['業務', '採購', '布組', '研發', '實驗室', '其他']; }
if (typeof getSample === 'undefined') { function getSample() { return []; } }

// ── 全域狀態 ──
const state = { view: 'list', activeProject: null, projects: [], modal: null, editingEvent: null, editingSub: null };
const SK = 'project_tracker_v10_local';

// ── 顏色常數 ──
const SUB_COLORS = ['#1D9E75', '#BA7517', '#993C1D', '#3B6D11', '#3C3489', '#993556'];
const SUB_BG = ['rgba(29,158,117,0.15)', 'rgba(186,117,23,0.15)', 'rgba(153,60,29,0.15)', 'rgba(59,109,17,0.15)', 'rgba(60,52,137,0.15)', 'rgba(153,53,86,0.15)'];

// ════════════════════════════════════════
// 資料 persistence
// ════════════════════════════════════════

function loadData() {
  try {
    const r = localStorage.getItem(SK);
    if (r) { const d = JSON.parse(r); state.projects = d.projects || []; state.faqCats = d.faqCats || [...DEFAULT_FAQ_CATS]; }
  } catch (e) {}
  if (!state.projects.length) state.projects = getSample();
  if (!state.faqCats) state.faqCats = [...DEFAULT_FAQ_CATS];
  render();
}

function save() {
  try { localStorage.setItem(SK, JSON.stringify({ projects: state.projects, faqCats: state.faqCats })); } catch (e) {}
}

function exportData() {
  const data = JSON.stringify({ projects: state.projects, faqCats: state.faqCats }, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'project_tracker_' + new Date().toISOString().slice(0, 10) + '.json';
  a.click();
  URL.revokeObjectURL(a.href);
}

function importData(input) {
  const file = input.files[0]; if (!file) return;
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const d = JSON.parse(e.target.result);
      if (!d.projects) throw new Error('格式錯誤');
      if (!confirm('匯入後將覆蓋現有資料，確定繼續？')) return;
      state.projects = d.projects;
      state.faqCats = d.faqCats || [...DEFAULT_FAQ_CATS];
      save(); render();
    } catch (err) { alert('檔案格式不正確，請選擇正確的備份檔'); }
  };
  reader.readAsText(file);
  input.value = '';
}

// ════════════════════════════════════════
// 工具函式
// ════════════════════════════════════════

function daysLeft(d) { return Math.ceil((new Date(d) - new Date()) / 86400000); }
function statusLabel(s) { return s === 'done' ? '已完成' : s === 'inprogress' ? '進行中' : '未開始'; }
function statusClass(s) { return s === 'done' ? 'done' : s === 'inprogress' ? 'inprogress' : ''; }
function nextStatus(s) { return s === 'notstarted' ? 'inprogress' : s === 'inprogress' ? 'done' : 'notstarted'; }
function pd(s) { return s ? new Date(s) : null; }
function pct(d, start, total) { const ms = pd(typeof d === 'string' ? d : d.toISOString().slice(0, 10)); if (!ms) return 0; return Math.min(100, Math.max(0, (ms - start) / total * 100)); }
function fmt(n) { return Number(n || 0).toLocaleString('zh-TW'); }
function calcOrdered(p) { return (p.orderItems || []).reduce((s, i) => s + (Number(i.unitPrice || 0) * Number(i.orderQty || 0)), 0); }
function budgetPct(p) { const tot = Number(p.totalBudget || 0); if (!tot) return 0; return Math.min(100, Math.round(calcOrdered(p) / tot * 100)); }

// ════════════════════════════════════════
// Render 主流程
// ════════════════════════════════════════

function render() {
  const app = document.getElementById('app');
  if (state.modal) { renderModal(); return; }
  if (state.view === 'list') app.innerHTML = renderList();
  else app.innerHTML = renderProject();
}

// ── 專案列表 ──
function renderList() {
  return `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;padding-top:4px">
    <h2 style="font-size:18px;font-weight:500">專案總覽</h2>
    <div style="display:flex;gap:8px">
      <button class="btn btn-sm" onclick="exportData()" title="將所有資料下載為 JSON 檔">匯出備份</button>
      <label class="btn btn-sm" style="cursor:pointer;margin:0" title="從 JSON 檔還原資料">匯入備份<input type="file" accept=".json" style="display:none" onchange="importData(this)"></label>
      <button class="btn btn-primary" onclick="openAddProject()">+ 新增專案</button>
    </div>
  </div>
  <div style="display:flex;flex-direction:column;gap:12px">
    ${state.projects.map(p => {
      const dl = daysLeft(p.endDate); const dlColor = dl < 0 ? 'var(--color-text-danger)' : dl < 30 ? 'var(--color-text-warning)' : 'var(--color-text-success)';
      const ordered = calcOrdered(p); const bp = budgetPct(p); const barColor = bp >= 100 ? '#E24B4A' : bp >= 80 ? '#EF9F27' : '#1D9E75';
      return `<div class="card" style="cursor:pointer" onclick="openProject('${p.id}')">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
          <div style="display:flex;flex-direction:column;gap:4px">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
              <span style="font-size:11px;font-weight:500;color:var(--color-text-secondary);background:var(--color-background-secondary);padding:2px 8px;border-radius:4px;letter-spacing:0.04em">${p.caseNo || '—'}</span>
              <span style="font-weight:500;font-size:15px;color:var(--color-text-info)">${p.name || '未命名'}</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
              <span style="font-size:12px;color:var(--color-text-secondary)">客戶：<span style="color:var(--color-text-primary)">${p.client || '—'}</span></span>
              <span style="color:var(--color-border-secondary)">｜</span>
              <span style="font-size:12px;color:var(--color-text-secondary)">${p.startDate} ～ ${p.endDate}</span>
              <span style="font-size:12px;color:${dlColor}">${dl < 0 ? '逾期 ' + Math.abs(dl) + ' 天' : '剩 ' + dl + ' 天'}</span>
            </div>
          </div>
          <button class="btn btn-sm btn-danger" onclick="event.stopPropagation();deleteProject('${p.id}')" style="flex-shrink:0;margin-left:8px">刪除</button>
        </div>
        <div style="display:flex;gap:16px;margin-bottom:8px;font-size:12px;flex-wrap:wrap">
          <span style="color:var(--color-text-secondary)">總金額 <span style="color:var(--color-text-primary);font-weight:500">NT$ ${fmt(p.totalBudget || 0)}</span></span>
          <span style="color:var(--color-text-secondary)">已下單 <span style="color:var(--color-text-success);font-weight:500">NT$ ${fmt(ordered)}</span></span>
          <span style="color:var(--color-text-secondary)">品項 <span style="font-weight:500">${(p.orderItems || []).length} 項</span></span>
          <span style="color:var(--color-text-secondary)">完成度 <span style="font-weight:500;color:${barColor}">${bp}%</span></span>
        </div>
        <div class="money-bar-bg"><div class="money-bar-fill" style="width:${bp}%;background:${barColor}"></div></div>
      </div>`;
    }).join('')}
    ${!state.projects.length ? '<div style="text-align:center;color:var(--color-text-secondary);padding:40px">尚無專案</div>' : ''}
  </div>`;
}

// ── 專案詳細頁 ──
function renderProject() {
  const p = state.projects.find(x => x.id === state.activeProject);
  if (!p) { state.view = 'list'; return renderList(); }
  return `${renderStickyHeader(p)}
  <div class="card" style="margin-bottom:16px"><div class="section-title">金額進度</div>${renderBudgetSection(p)}</div>
  <div class="card" style="margin-bottom:16px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <div class="section-title" style="margin:0">時間線</div>
      <button class="btn btn-sm" onclick="openAddEvent('${p.id}')">+ 新增事件</button>
    </div>
    ${renderTimeline(p)}
  </div>
  <div class="card" style="margin-bottom:16px;padding:0;overflow:hidden">
    <div style="display:flex;justify-content:space-between;align-items:center;padding:14px 16px;border-bottom:0.5px solid var(--color-border-tertiary)">
      <div class="section-title" style="margin:0">工作進度</div>
      <button class="btn btn-sm" onclick="openAddBlock('${p.id}')">+ 新增區塊</button>
    </div>
    ${renderBlocksGrid(p)}
  </div>
  <div class="card" style="margin-bottom:16px">${renderFaq(p)}</div>
  <div class="card">
    <div class="section-title">會議記錄</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">
      ${['client', 'internal'].map(type => {
        const label = type === 'client' ? '客戶會議' : '內部會議';
        return `<div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
            <span style="font-weight:500">${label}</span>
            <button class="btn btn-sm" onclick="openAddMeeting('${p.id}','${type}')">+ 新增</button>
          </div>
          ${[...p.meetings[type]].sort((a, b) => b.date.localeCompare(a.date)).map(m => `<div style="border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);padding:10px;margin-bottom:8px">
            <div style="font-size:12px;font-weight:500;color:var(--color-text-secondary);margin-bottom:6px">${m.date}</div>
            <div style="font-size:12px;color:var(--color-text-secondary);margin-bottom:3px">會議內容:</div>
            <textarea style="font-size:13px;margin-bottom:8px;resize:vertical;min-height:60px;width:100%;border-radius:6px;padding:6px 8px" oninput="updateMeetingContent('${p.id}','${type}','${m.id}',this.value)">${m.content || ''}</textarea>
            ${m.tasks.length ? `<div style="font-size:12px;color:var(--color-text-secondary);margin-bottom:4px">會議任務:</div>
            ${m.tasks.map(t => `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;gap:8px">
              <span style="font-size:12px;flex:1">${t.text}</span>
              <select style="width:auto;font-size:11px;padding:2px 6px" onchange="assignTask('${p.id}','${m.id}','${t.id}','${type}',this.value)">
                <option value="">加入區塊...</option>
                ${p.blocks.map(b => `<option value="${b.id}" ${t.block === b.id ? 'selected' : ''}>${b.name}</option>`).join('')}
              </select></div>`).join('')}` : ''}
            ${(m.inquiries || []).length ? `<div style="font-size:12px;color:var(--color-text-secondary);margin-bottom:4px;margin-top:6px">詢問:</div>
            ${(m.inquiries || []).map(q => `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;gap:8px">
              <span style="font-size:12px;flex:1">${q.text}</span>
              <select style="width:auto;font-size:11px;padding:2px 6px" onchange="assignInquiry('${p.id}','${m.id}','${q.id}','${type}',this.value)">
                <option value="">加入疑惑解答...</option>
                ${(state.faqCats || DEFAULT_FAQ_CATS).map(c => `<option value="${c}" ${q.faqCat === c ? 'selected' : ''}>${c}</option>`).join('')}
              </select></div>`).join('')}` : ''}
            <button class="btn btn-sm btn-danger" style="margin-top:4px" onclick="deleteMeeting('${p.id}','${type}','${m.id}')">刪除</button>
          </div>`).join('')}
        </div>`;
      }).join('')}
    </div>
  </div>`;
}

// ── Sticky header ──
function renderStickyHeader(p) {
  const dl = daysLeft(p.endDate);
  const dlColor = dl < 0 ? 'var(--color-text-danger)' : dl < 30 ? 'var(--color-text-warning)' : 'var(--color-text-success)';
  return `<div class="project-sticky-header">
    <button class="btn btn-sm" onclick="goBack()">← 返回</button>
    <span class="sticky-badge">${p.caseNo || '—'}</span>
    <span class="sticky-name">${p.name || '未命名'}</span>
    <span class="sticky-sep">｜</span>
    <span style="font-size:12px;color:var(--color-text-secondary);white-space:nowrap">客戶：<strong style="color:var(--color-text-primary);font-weight:500">${p.client || '—'}</strong></span>
    <span class="sticky-sep">｜</span>
    <span style="font-size:12px;color:var(--color-text-secondary);white-space:nowrap">${p.startDate} ～ ${p.endDate}</span>
    <span style="font-size:12px;color:${dlColor};white-space:nowrap">${dl < 0 ? '逾期 ' + Math.abs(dl) + ' 天' : '剩 ' + dl + ' 天'}</span>
    <button class="btn btn-sm" style="margin-left:auto" onclick="openEditInfo('${p.id}')">✎ 編輯資訊</button>
  </div>`;
}

// ── 金額進度 / 下單明細 ──
function renderBudgetSection(p) {
  const ordered = calcOrdered(p); const bp = budgetPct(p);
  const remaining = (p.totalBudget || 0) - ordered;
  const barColor = bp >= 100 ? '#E24B4A' : bp >= 80 ? '#EF9F27' : '#1D9E75';
  return `<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px">
    <div class="metric-card"><div style="font-size:11px;color:var(--color-text-secondary);margin-bottom:4px">專案總金額</div><div style="font-size:17px;font-weight:500">NT$ ${fmt(p.totalBudget || 0)}</div><button class="btn btn-sm" style="margin-top:6px;font-size:11px" onclick="openEditTotal('${p.id}')">✎ 修改</button></div>
    <div class="metric-card"><div style="font-size:11px;color:var(--color-text-secondary);margin-bottom:4px">已下單金額</div><div id="sum-ordered-${p.id}" style="font-size:17px;font-weight:500;color:var(--color-text-success)">NT$ ${fmt(ordered)}</div><div style="font-size:11px;color:var(--color-text-secondary);margin-top:4px">自動計算</div></div>
    <div class="metric-card"><div style="font-size:11px;color:var(--color-text-secondary);margin-bottom:4px">剩餘金額</div><div id="sum-remaining-${p.id}" style="font-size:17px;font-weight:500;color:${remaining < 0 ? 'var(--color-text-danger)' : 'var(--color-text-primary)'}">NT$ ${fmt(remaining)}</div></div>
    <div class="metric-card" style="display:flex;flex-direction:column;align-items:center;justify-content:center"><div style="font-size:11px;color:var(--color-text-secondary);margin-bottom:4px">完成度</div><div id="sum-pct-${p.id}" style="font-size:22px;font-weight:500;color:${barColor}">${bp}%</div></div>
  </div>
  <div style="display:flex;align-items:center;gap:10px;margin-bottom:20px">
    <div class="money-bar-bg"><div id="sum-bar-${p.id}" class="money-bar-fill" style="width:${bp}%;background:${barColor}"></div></div>
    <span style="font-size:12px;color:var(--color-text-secondary);white-space:nowrap">${bp}%</span>
  </div>
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
    <span style="font-size:13px;font-weight:500;color:var(--color-text-secondary)">下單明細</span>
    <button class="btn btn-sm" onclick="addOrderItem('${p.id}')">+ 新增品項</button>
  </div>
  <div style="border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);overflow:hidden">
    <div style="overflow-x:auto">
    <table class="order-table" id="order-table-${p.id}">
      <thead><tr>
        <th style="min-width:120px">品項名稱<span class="col-resizer"></span></th>
        <th style="min-width:100px">單價（NT$）<span class="col-resizer"></span></th>
        <th style="min-width:90px">預估數量<span class="col-resizer"></span></th>
        <th style="min-width:90px">下單數量<span class="col-resizer"></span></th>
        <th style="min-width:60px">單位<span class="col-resizer"></span></th>
        <th style="min-width:100px">小計<span class="col-resizer"></span></th>
        <th style="width:32px"></th>
      </tr></thead>
      <tbody>
        ${(p.orderItems || []).map(item => `<tr>
          <td><input value="${item.name || ''}" placeholder="品項名稱" oninput="updateItemField('${p.id}','${item.id}','name',this.value)"></td>
          <td><input type="number" value="${item.unitPrice || ''}" placeholder="0" style="text-align:right" oninput="updateItemField('${p.id}','${item.id}','unitPrice',this.value)"></td>
          <td><input type="number" value="${item.quantity || ''}" placeholder="0" style="text-align:right" oninput="updateItemField('${p.id}','${item.id}','quantity',this.value)"></td>
          <td><input type="number" value="${item.orderQty || ''}" placeholder="0" style="text-align:right" oninput="updateItemField('${p.id}','${item.id}','orderQty',this.value)"></td>
          <td><input value="${item.unit || ''}" placeholder="件/碼" style="width:60px" oninput="updateItemField('${p.id}','${item.id}','unit',this.value)"></td>
          <td id="subt-${item.id}" style="font-weight:500;white-space:nowrap;color:var(--color-text-success)">NT$ ${fmt((item.unitPrice || 0) * (item.orderQty || 0))}</td>
          <td><button class="btn btn-sm btn-danger" style="padding:1px 6px;font-size:11px" onclick="deleteOrderItem('${p.id}','${item.id}')">×</button></td>
        </tr>`).join('')}
        ${!(p.orderItems || []).length ? `<tr><td colspan="7" style="text-align:center;color:var(--color-text-secondary);padding:16px">尚無明細，請新增品項</td></tr>` : ''}
      </tbody>
      <tfoot><tr style="border-top:0.5px solid var(--color-border-secondary)">
        <td colspan="5" style="padding:8px 10px;font-weight:500;font-size:12px;color:var(--color-text-secondary)">合計</td>
        <td style="padding:8px 10px;font-weight:500;color:var(--color-text-success)">NT$ ${fmt(ordered)}</td>
        <td></td>
      </tr></tfoot>
    </table>
    </div>
  </div>`;
}

// ── 時間線 ──
function renderTimeline(p) {
  const pStart = pd(p.startDate), pEnd = pd(p.endDate); if (!pStart || !pEnd) return '';
  const today = new Date(); const totalMs = pEnd - pStart; const todayPct = pct(today, pStart, totalMs);
  const months = []; let cur = new Date(pStart.getFullYear(), pStart.getMonth(), 1);
  const endM = new Date(pEnd.getFullYear(), pEnd.getMonth(), 1);
  while (cur <= endM) { months.push(new Date(cur)); cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1); }
  const MN = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'];

  // 每月固定 120px；至少顯示 6 個月
  const PX_PER_MONTH = 120;
  const gridW = Math.max(months.length, 6) * PX_PER_MONTH;

  const monthGridLines = months.map(m => { const x = pct(new Date(m.getFullYear(), m.getMonth(), 1), pStart, totalMs); return x > 0 && x < 100 ? `<div style="position:absolute;top:0;bottom:0;left:${x}%;width:0.5px;background:var(--color-border-tertiary);z-index:1"></div>` : ''; }).join('');
  const todayLine = todayPct >= 0 && todayPct <= 100 ? `<div class="tl-today-line" style="left:${todayPct}%"></div>` : '';

  let html = `<div class="tl-wrap"><div class="tl-grid" style="width:${gridW}px">`;

  // 月份標題列
  html += `<div class="tl-row" style="min-height:24px;border-bottom:0.5px solid var(--color-border-secondary)">
    <div class="tl-label-col" style="justify-content:center"><span style="font-size:11px;color:var(--color-text-secondary)">月份</span></div>
    <div style="flex:1;position:relative;height:24px">
      ${months.map(m => { const x = pct(new Date(m.getFullYear(), m.getMonth(), 1), pStart, totalMs); const cx = (x + pct(new Date(m.getFullYear(), m.getMonth() + 1, 0), pStart, totalMs)) / 2;
        return `${x > 0 ? `<div style="position:absolute;top:0;bottom:0;left:${x}%;width:0.5px;background:var(--color-border-tertiary)"></div>` : ''}
        <span style="position:absolute;left:${cx}%;transform:translateX(-50%);font-size:11px;color:var(--color-text-secondary);top:5px;white-space:nowrap">${MN[m.getMonth()]}</span>`; }).join('')}
      ${todayPct >= 0 && todayPct <= 100 ? `<div class="tl-today-line" style="left:${todayPct}%"><span style="position:absolute;top:3px;left:3px;font-size:10px;color:#E24B4A;white-space:nowrap">今天</span></div>` : ''}
    </div>
  </div>`;

  p.timeline.forEach((ev, evIdx) => {
    const isEditing = state.editingEvent === ev.id;
    const mode = ev.mode || 'span';
    const sc = SUB_COLORS[evIdx % SUB_COLORS.length];

    if (mode === 'span') {
      // ── SPAN 模式：所有子區間在同一水平線，標籤交錯上下，點擊橫條編輯 ──
      const BAR_TOP = 28; const BAR_H = 8;
      const rowH = Math.max(72, BAR_TOP + BAR_H + 36);
      html += `<div class="tl-row">
        <div class="tl-label-col">
          <span style="font-size:12px;font-weight:500">${ev.name}</span>
          <div style="display:flex;gap:3px;flex-wrap:wrap;margin-top:2px">
            <button class="btn btn-sm" style="padding:1px 5px;font-size:10px" onclick="openAddSpan('${p.id}','${ev.id}')">+區間</button>
            <button class="btn btn-sm btn-danger" style="padding:1px 5px;font-size:10px" onclick="deleteEvent('${p.id}','${ev.id}')">×</button>
          </div>
        </div>
        <div class="tl-bar-area" style="min-height:${rowH}px">
          <div class="tl-bg" style="top:${BAR_TOP + BAR_H / 2 - 2}px"></div>
          ${monthGridLines}${todayLine}
          ${ev.spans.map((sp, si) => {
            const sc2 = SUB_COLORS[si % SUB_COLORS.length]; const sbg = SUB_BG[si % SUB_BG.length];
            const x1 = pct(sp.startDate, pStart, totalMs); const x2 = pct(sp.endDate, pStart, totalMs);
            const donePct = sp.done && sp.doneDate ? pct(sp.doneDate, pStart, totalMs) : null;
            const labelAbove = si % 2 === 0;
            const labelTop = labelAbove ? (BAR_TOP - 16) : (BAR_TOP + BAR_H + 6);
            const isEditingSp = state.editingSub === sp.id;
            return `
            <div class="tl-span" style="left:${x1}%;width:${Math.max(x2 - x1, 0.4)}%;top:${BAR_TOP}px;height:${BAR_H}px;background:${isEditingSp ? sc2 : sbg};border:1.5px solid ${sc2};cursor:pointer"
              onclick="toggleEditSub('${sp.id}')"
              onmouseenter="showTT(this,'點擊編輯：${sp.name}<br>${sp.startDate} → ${sp.endDate}${sp.done ? '<br>完成: ' + sp.doneDate : ''}')" onmouseleave="hideTT(this)"><div class="tl-tooltip" style="display:none"></div></div>
            <div style="position:absolute;left:${x1}%;top:${BAR_TOP - 4}px;width:1.5px;height:${BAR_H + 8}px;background:${sc2};z-index:3;transform:translateX(-50%);pointer-events:none"></div>
            <div style="position:absolute;left:${x2}%;top:${BAR_TOP - 4}px;width:1.5px;height:${BAR_H + 8}px;background:${sc2};z-index:3;transform:translateX(-50%);pointer-events:none"></div>
            <div style="position:absolute;left:${(x1 + x2) / 2}%;top:${labelTop}px;transform:translateX(-50%);font-size:10px;white-space:nowrap;color:${sc2};pointer-events:none;z-index:4;font-weight:500">${sp.name}</div>
            ${donePct !== null ? `<div class="tl-done-dot" style="left:${donePct}%;top:${BAR_TOP - 1}px;transform:translateX(-50%)" onmouseenter="showTT(this,'完成: ${sp.doneDate}')" onmouseleave="hideTT(this)"><div class="tl-tooltip" style="display:none"></div></div>` : ''}`;
          }).join('')}
        </div>
      </div>`;
      ev.spans.forEach(sp => {
        if (state.editingSub === sp.id) {
          html += `<div class="edit-row"><div style="display:flex;padding:8px 8px 8px 108px;gap:8px;align-items:center;flex-wrap:wrap">
            <label style="font-size:12px;color:var(--color-text-secondary)">名稱</label><input id="sn-${sp.id}" value="${sp.name}" style="width:90px;padding:3px 7px;font-size:12px">
            <label style="font-size:12px;color:var(--color-text-secondary)">開始</label><input type="date" id="ss-${sp.id}" value="${sp.startDate}" style="padding:3px 7px;font-size:12px;width:auto">
            <label style="font-size:12px;color:var(--color-text-secondary)">截止</label><input type="date" id="se-${sp.id}" value="${sp.endDate}" style="padding:3px 7px;font-size:12px;width:auto">
            <label style="font-size:12px;color:var(--color-text-secondary)">完成日</label><input type="date" id="sd-${sp.id}" value="${sp.doneDate || ''}" style="padding:3px 7px;font-size:12px;width:auto">
            <button class="btn btn-sm btn-primary" onclick="saveSpan('${p.id}','${ev.id}','${sp.id}')">儲存</button>
            <button class="btn btn-sm btn-danger" onclick="deleteSpan('${p.id}','${ev.id}','${sp.id}')">刪除</button>
            <button class="btn btn-sm" onclick="cancelEdit()">取消</button>
          </div></div>`;
        }
      });

    } else {
      // ── DOT 模式：所有時間點在同一水平線，標籤交錯上下，點擊圓點編輯 ──
      const dots = ev.dots || [];
      const rowH = 72; const dotY = rowH / 2;
      html += `<div class="tl-row">
        <div class="tl-label-col">
          <span style="font-size:12px;font-weight:500">${ev.name}</span>
          <div style="display:flex;gap:3px;flex-wrap:wrap;margin-top:2px">
            <button class="btn btn-sm" style="padding:1px 5px;font-size:10px" onclick="openAddDot('${p.id}','${ev.id}')">+時間點</button>
            <button class="btn btn-sm btn-danger" style="padding:1px 5px;font-size:10px" onclick="deleteEvent('${p.id}','${ev.id}')">×</button>
          </div>
        </div>
        <div class="tl-bar-area" style="min-height:${rowH}px">
          <div class="tl-bg"></div>
          ${monthGridLines}${todayLine}
          ${dots.map((dot, di) => {
            const dx = pct(dot.date, pStart, totalMs);
            const dotColor = SUB_COLORS[di % SUB_COLORS.length];
            const isEditingDot = state.editingSub === dot.id;
            const labelAbove = di % 2 === 0;  // 偶數在上，奇數在下
            const labelTop = labelAbove ? (dotY - 28) : (dotY + 10);
            return `
            <div style="position:absolute;left:${dx}%;top:${dotY}px;transform:translate(-50%,-50%);width:14px;height:14px;border-radius:50%;background:${dotColor};border:2.5px solid var(--color-background-primary);box-shadow:0 0 0 1.5px ${dotColor}${isEditingDot ? ',0 0 0 3px ' + dotColor + ',0 0 0 4.5px var(--color-background-primary)' : ''};z-index:6;cursor:pointer"
              onclick="toggleEditDot('${dot.id}')"
              onmouseenter="showTT(this,'點擊編輯：${dot.name}<br>${dot.date}')" onmouseleave="hideTT(this)"><div class="tl-tooltip" style="display:none"></div></div>
            <div style="position:absolute;left:${dx}%;top:${labelTop}px;transform:translateX(-50%);font-size:10px;white-space:nowrap;color:${dotColor};font-weight:500;pointer-events:none;z-index:4">${dot.name}</div>`;
          }).join('')}
        </div>
      </div>`;
      dots.forEach(dot => {
        if (state.editingSub === dot.id) {
          html += `<div class="edit-row"><div style="display:flex;padding:8px 8px 8px 108px;gap:8px;align-items:center;flex-wrap:wrap">
            <label style="font-size:12px;color:var(--color-text-secondary)">名稱</label><input id="dn-${dot.id}" value="${dot.name}" style="width:100px;padding:3px 7px;font-size:12px">
            <label style="font-size:12px;color:var(--color-text-secondary)">日期</label><input type="date" id="dd-${dot.id}" value="${dot.date}" style="padding:3px 7px;font-size:12px;width:auto">
            <button class="btn btn-sm btn-primary" onclick="saveDot('${p.id}','${ev.id}','${dot.id}')">儲存</button>
            <button class="btn btn-sm btn-danger" onclick="deleteDot('${p.id}','${ev.id}','${dot.id}')">刪除</button>
            <button class="btn btn-sm" onclick="cancelEdit()">取消</button>
          </div></div>`;
        }
      });
    }
  });

  html += `</div></div><div style="display:flex;gap:14px;margin-top:10px;font-size:12px;color:var(--color-text-secondary);flex-wrap:wrap">
    <span><span style="display:inline-block;width:20px;height:6px;background:rgba(29,158,117,0.2);border:1px solid #1D9E75;border-radius:3px;vertical-align:middle;margin-right:4px"></span>區間</span>
    <span><span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:#1D9E75;border:2px solid #fff;box-shadow:0 0 0 1.5px #1D9E75;vertical-align:middle;margin-right:4px"></span>時間點</span>
    <span><span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:#1D9E75;border:1.5px solid #fff;vertical-align:middle;margin-right:4px"></span>完成日</span>
    <span><span style="display:inline-block;width:9px;height:3px;background:#E24B4A;vertical-align:middle;margin-right:4px;border-radius:1px"></span>今天</span>
  </div>`;
  return html;
}

// ── tooltip 工具 ──
function showTT(el, html) { const t = el.querySelector('.tl-tooltip'); if (t) { t.innerHTML = html; t.style.display = 'block'; } }
function hideTT(el) { const t = el.querySelector('.tl-tooltip'); if (t) t.style.display = 'none'; }

// ── 工作進度（2欄，inline 編輯，欄寬可拖曳） ──
function renderBlocksGrid(p) {
  if (!p.blocks.length) return '<div style="padding:16px;color:var(--color-text-secondary);font-size:13px">尚無區塊</div>';
  return `<div class="blocks-grid">${p.blocks.map((b, bi) => `<div class="block-col">
    <div class="block-col-header">
      <span class="dot ${b.color}"></span>
      <span style="font-weight:500;font-size:13px;flex:1">${b.name}</span>
      <button class="btn btn-sm" onclick="openAddTodo('${p.id}','${b.id}')" style="padding:2px 7px;font-size:11px">+</button>
      <button class="btn btn-sm btn-danger" onclick="deleteBlock('${p.id}','${b.id}')" style="padding:2px 6px;font-size:11px;margin-left:2px">刪</button>
    </div>
    <div class="block-col-inner">
      <table class="todo-table" id="tt-${b.id}">
        <thead><tr>
          <th style="width:14px"><span class="col-resizer"></span></th>
          <th style="min-width:90px">任務名稱<span class="col-resizer"></span></th>
          <th style="min-width:72px">狀態<span class="col-resizer"></span></th>
          <th style="min-width:90px">截止<span class="col-resizer"></span></th>
          <th style="min-width:90px">完成<span class="col-resizer"></span></th>
          <th style="min-width:80px">備註<span class="col-resizer"></span></th>
          <th style="width:22px"></th>
        </tr></thead>
        <tbody>${b.todos.map(t => `<tr>
          <td><span class="dot ${b.color}"></span></td>
          <td><input class="td-input" value="${(t.task || '').replace(/"/g, '&quot;')}" placeholder="任務名稱" oninput="updateTodoField('${p.id}','${b.id}','${t.id}','task',this.value)"></td>
          <td><span class="status-badge ${statusClass(t.status)}" onclick="cycleStatus('${p.id}','${b.id}','${t.id}')">${statusLabel(t.status)}</span></td>
          <td><input type="date" class="td-input" value="${t.deadline || ''}" oninput="updateTodoField('${p.id}','${b.id}','${t.id}','deadline',this.value)" style="font-size:11px"></td>
          <td><input type="date" class="td-input" value="${t.doneDate || ''}" oninput="updateTodoField('${p.id}','${b.id}','${t.id}','doneDate',this.value)" style="font-size:11px"></td>
          <td><input class="td-input" value="${(t.note || '').replace(/"/g, '&quot;')}" placeholder="備註" oninput="updateTodoField('${p.id}','${b.id}','${t.id}','note',this.value)"></td>
          <td><button class="btn btn-sm btn-danger" style="padding:0 5px;font-size:11px" onclick="deleteTodo('${p.id}','${b.id}','${t.id}')">×</button></td>
        </tr>`).join('')}</tbody>
      </table>
      ${!b.todos.length ? '<div style="padding:10px 12px;font-size:12px;color:var(--color-text-secondary)">尚無任務</div>' : ''}
    </div>
  </div>`).join('')}</div>`;
}

// ── 疑惑解答 ──
function renderFaq(p) {
  const cats = state.faqCats || [...DEFAULT_FAQ_CATS];
  const faqs = p.faq || [];
  return `<div style="margin-top:0">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
      <span style="font-size:13px;font-weight:500;color:var(--color-text-secondary)">疑惑解答</span>
      <div style="display:flex;gap:6px">
        <button class="btn btn-sm" onclick="openAddFaqCat()">+ 新增分類</button>
        <button class="btn btn-sm" onclick="addFaqItem('${p.id}')">+ 新增疑問</button>
      </div>
    </div>
    <div style="border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);overflow:hidden">
      <table class="order-table" style="table-layout:fixed;width:100%">
        <thead><tr>
          <th style="width:90px">分類</th>
          <th>疑問</th>
          <th>回復</th>
          <th style="width:130px">完成日</th>
          <th style="width:32px"></th>
        </tr></thead>
        <tbody>
          ${faqs.map(f => `<tr>
            <td><select style="font-size:12px;padding:2px 4px;width:100%" onchange="updateFaqField('${p.id}','${f.id}','category',this.value)">
              ${cats.map(c => `<option value="${c}" ${f.category === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select></td>
            <td><input value="${(f.question || '').replace(/"/g, '&quot;')}" placeholder="輸入疑問" oninput="updateFaqField('${p.id}','${f.id}','question',this.value)"></td>
            <td><input value="${(f.reply || '').replace(/"/g, '&quot;')}" placeholder="輸入回復" oninput="updateFaqField('${p.id}','${f.id}','reply',this.value)"></td>
            <td><input type="date" value="${f.doneDate || ''}" oninput="updateFaqField('${p.id}','${f.id}','doneDate',this.value)"></td>
            <td><button class="btn btn-sm btn-danger" style="padding:1px 6px;font-size:11px" onclick="deleteFaqItem('${p.id}','${f.id}')">×</button></td>
          </tr>`).join('')}
          ${!faqs.length ? `<tr><td colspan="5" style="text-align:center;color:var(--color-text-secondary);padding:14px">尚無疑問，請新增</td></tr>` : ''}
        </tbody>
      </table>
    </div>
  </div>`;
}

// ── Modal ──
function renderModal() {
  const m = state.modal; let content = '';
  if (m.type === 'addProject' || m.type === 'editInfo') {
    const isEdit = m.type === 'editInfo'; const p = isEdit ? state.projects.find(x => x.id === m.pid) : {};
    content = `<h3 style="font-size:16px;font-weight:500;margin-bottom:16px">${isEdit ? '編輯專案資訊' : '新增專案'}</h3>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div style="display:grid;grid-template-columns:1fr 2fr;gap:8px">
        <div><label style="font-size:13px;color:var(--color-text-secondary)">專案案號</label><input id="m-caseno" value="${p.caseNo || ''}" placeholder="MN-2025-001" style="margin-top:4px"></div>
        <div><label style="font-size:13px;color:var(--color-text-secondary)">專案名稱</label><input id="m-name" value="${p.name || ''}" placeholder="請輸入專案名稱" style="margin-top:4px"></div>
      </div>
      <div><label style="font-size:13px;color:var(--color-text-secondary)">客戶名稱</label><input id="m-client" value="${p.client || ''}" placeholder="請輸入客戶名稱" style="margin-top:4px"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div><label style="font-size:13px;color:var(--color-text-secondary)">開始日期</label><input id="m-start" type="date" value="${p.startDate || ''}" style="margin-top:4px"></div>
        <div><label style="font-size:13px;color:var(--color-text-secondary)">結束日期</label><input id="m-end" type="date" value="${p.endDate || ''}" style="margin-top:4px"></div>
      </div>
      <div><label style="font-size:13px;color:var(--color-text-secondary)">專案總金額（NT$）</label><input id="m-total" type="number" value="${p.totalBudget || ''}" placeholder="0" style="margin-top:4px"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end">
        <button class="btn" onclick="closeModal()">取消</button>
        <button class="btn btn-primary" onclick="${isEdit ? `submitEditInfo('${m.pid}')` : 'submitAddProject()'}">儲存</button>
      </div>
    </div>`;
  } else if (m.type === 'editTotal') {
    const p = state.projects.find(x => x.id === m.pid);
    content = `<h3 style="font-size:16px;font-weight:500;margin-bottom:16px">修改專案總金額</h3>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div><label style="font-size:13px;color:var(--color-text-secondary)">專案總金額（NT$）</label><input id="m-total" type="number" value="${p.totalBudget || ''}" style="margin-top:4px"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="submitEditTotal('${m.pid}')">儲存</button></div>
    </div>`;
  } else if (m.type === 'addEvent') {
    content = `<h3 style="font-size:16px;font-weight:500;margin-bottom:16px">新增事件</h3>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div><label style="font-size:13px;color:var(--color-text-secondary)">事件名稱</label><input id="m-ename" style="margin-top:4px" placeholder="例：設計階段"></div>
      <div>
        <label style="font-size:13px;color:var(--color-text-secondary);display:block;margin-bottom:6px">顯示方式</label>
        <div style="display:flex;gap:8px">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;padding:8px 14px;border:1px solid var(--color-border-secondary);border-radius:var(--border-radius-md);flex:1;justify-content:center">
            <input type="radio" name="ev-mode" value="span" checked onchange="toggleAddEventMode()" style="width:auto;margin:0">
            <span>📏 區間顯示</span>
          </label>
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px;padding:8px 14px;border:1px solid var(--color-border-secondary);border-radius:var(--border-radius-md);flex:1;justify-content:center">
            <input type="radio" name="ev-mode" value="dot" onchange="toggleAddEventMode()" style="width:auto;margin:0">
            <span>● 時間點顯示</span>
          </label>
        </div>
      </div>
      <div id="ev-span-fields" style="border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);padding:12px">
        <div style="font-size:13px;font-weight:500;margin-bottom:10px">第一個時間區間（選填）</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <div><label style="font-size:12px;color:var(--color-text-secondary)">區間名稱</label><input id="m-sname" style="margin-top:3px"></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div><label style="font-size:12px;color:var(--color-text-secondary)">開始日期</label><input id="m-sstart" type="date" style="margin-top:3px"></div>
            <div><label style="font-size:12px;color:var(--color-text-secondary)">截止日期</label><input id="m-send" type="date" style="margin-top:3px"></div>
          </div>
        </div>
      </div>
      <div id="ev-dot-fields" style="border:0.5px solid var(--color-border-tertiary);border-radius:var(--border-radius-md);padding:12px;display:none">
        <div style="font-size:13px;font-weight:500;margin-bottom:10px">第一個時間點（選填）</div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <div><label style="font-size:12px;color:var(--color-text-secondary)">時間點名稱</label><input id="m-dname" style="margin-top:3px" placeholder="例：開標"></div>
          <div><label style="font-size:12px;color:var(--color-text-secondary)">日期</label><input id="m-ddate" type="date" style="margin-top:3px"></div>
        </div>
      </div>
      <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="submitAddEvent('${m.pid}')">新增</button></div>
    </div>`;
  } else if (m.type === 'addDot') {
    content = `<h3 style="font-size:16px;font-weight:500;margin-bottom:16px">新增時間點</h3>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div><label style="font-size:13px;color:var(--color-text-secondary)">時間點名稱</label><input id="m-dname" style="margin-top:4px" placeholder="例：開標"></div>
      <div><label style="font-size:13px;color:var(--color-text-secondary)">日期</label><input id="m-ddate" type="date" style="margin-top:4px"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="submitAddDot('${m.pid}','${m.eid}')">新增</button></div>
    </div>`;
  } else if (m.type === 'addSpan') {
    content = `<h3 style="font-size:16px;font-weight:500;margin-bottom:16px">新增時間區間</h3>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div><label style="font-size:13px;color:var(--color-text-secondary)">區間名稱</label><input id="m-sname" style="margin-top:4px"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div><label style="font-size:13px;color:var(--color-text-secondary)">開始日期</label><input id="m-sstart" type="date" style="margin-top:4px"></div>
        <div><label style="font-size:13px;color:var(--color-text-secondary)">截止日期</label><input id="m-send" type="date" style="margin-top:4px"></div>
      </div>
      <div><label style="font-size:13px;color:var(--color-text-secondary)">完成日期（選填）</label><input id="m-sdone" type="date" style="margin-top:4px"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="submitAddSpan('${m.pid}','${m.eid}')">新增</button></div>
    </div>`;
  } else if (m.type === 'addBlock') {
    content = `<h3 style="font-size:16px;font-weight:500;margin-bottom:16px">新增工作區塊</h3>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div><label style="font-size:13px;color:var(--color-text-secondary)">區塊名稱</label><input id="m-bname" style="margin-top:4px"></div>
      <div><label style="font-size:13px;color:var(--color-text-secondary)">顏色</label>
        <select id="m-bcolor" style="margin-top:4px"><option value="dot-blue">藍色</option><option value="dot-amber">橘色</option><option value="dot-coral">珊瑚色</option><option value="dot-green">綠色</option><option value="dot-purple">紫色</option><option value="dot-pink">粉色</option></select></div>
      <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="submitAddBlock('${m.pid}')">新增</button></div>
    </div>`;
  } else if (m.type === 'addTodo') {
    content = `<h3 style="font-size:16px;font-weight:500;margin-bottom:16px">新增任務</h3>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div><label style="font-size:13px;color:var(--color-text-secondary)">任務名稱</label><input id="m-tname" style="margin-top:4px"></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
        <div><label style="font-size:13px;color:var(--color-text-secondary)">截止日期</label><input id="m-tdate" type="date" style="margin-top:4px"></div>
        <div><label style="font-size:13px;color:var(--color-text-secondary)">狀態</label>
          <select id="m-tstatus" style="margin-top:4px"><option value="notstarted">未開始</option><option value="inprogress">進行中</option><option value="done">已完成</option></select></div>
      </div>
      <div><label style="font-size:13px;color:var(--color-text-secondary)">備註</label><input id="m-tnote" style="margin-top:4px"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="submitAddTodo('${m.pid}','${m.bid}')">新增</button></div>
    </div>`;
  } else if (m.type === 'addMeeting') {
    content = `<h3 style="font-size:16px;font-weight:500;margin-bottom:16px">新增${m.mtype === 'client' ? '客戶' : '內部'}會議</h3>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div><label style="font-size:13px;color:var(--color-text-secondary)">日期</label><input id="m-mdate" type="date" style="margin-top:4px"></div>
      <div><label style="font-size:13px;color:var(--color-text-secondary)">會議內容</label><textarea id="m-mcontent" rows="3" style="margin-top:4px;resize:vertical"></textarea></div>
      <div><label style="font-size:13px;color:var(--color-text-secondary)">會議任務（每行一個）</label><textarea id="m-mtasks" rows="3" placeholder="任務1&#10;任務2" style="margin-top:4px;resize:vertical"></textarea></div>
      <div><label style="font-size:13px;color:var(--color-text-secondary)">詢問（每行一個）</label><textarea id="m-minquiries" rows="2" placeholder="詢問事項1&#10;詢問事項2" style="margin-top:4px;resize:vertical"></textarea></div>
      <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="submitAddMeeting('${m.pid}','${m.mtype}')">新增</button></div>
    </div>`;
  } else if (m.type === 'addFaqCat') {
    content = `<h3 style="font-size:16px;font-weight:500;margin-bottom:16px">新增分類</h3>
    <div style="display:flex;flex-direction:column;gap:12px">
      <div><label style="font-size:13px;color:var(--color-text-secondary)">分類名稱</label><input id="m-faqcat" style="margin-top:4px" placeholder="例：品管"></div>
      <div style="display:flex;gap:8px;justify-content:flex-end"><button class="btn" onclick="closeModal()">取消</button><button class="btn btn-primary" onclick="submitAddFaqCat()">新增</button></div>
    </div>`;
  }
  const app = document.getElementById('app'); const ex = document.getElementById('modal-overlay'); if (ex) ex.remove();
  const ov = document.createElement('div'); ov.id = 'modal-overlay'; ov.className = 'modal-overlay';
  ov.innerHTML = `<div class="modal">${content}</div>`;
  ov.addEventListener('click', e => { if (e.target === ov) closeModal(); }); app.appendChild(ov);
}

// ════════════════════════════════════════
// Action handlers
// ════════════════════════════════════════

function submitEditInfo(pid) { const p = state.projects.find(x => x.id === pid); p.caseNo = document.getElementById('m-caseno').value.trim(); p.name = document.getElementById('m-name').value.trim(); p.client = document.getElementById('m-client').value.trim(); const s = document.getElementById('m-start').value; const e = document.getElementById('m-end').value; if (s) p.startDate = s; if (e) p.endDate = e; p.totalBudget = parseFloat(document.getElementById('m-total').value) || 0; closeModal(); save(); }
function submitEditTotal(pid) { const p = state.projects.find(x => x.id === pid); p.totalBudget = parseFloat(document.getElementById('m-total').value) || 0; closeModal(); save(); }
function goBack() { state.view = 'list'; state.activeProject = null; state.editingEvent = null; state.editingSub = null; save(); render(); }
function openProject(id) { state.activeProject = id; state.view = 'project'; state.editingEvent = null; state.editingSub = null; render(); }
function openAddProject() { state.modal = { type: 'addProject' }; render(); }
function openAddEvent(pid) { state.modal = { type: 'addEvent', pid }; render(); }
function openAddSpan(pid, eid) { state.modal = { type: 'addSpan', pid, eid }; render(); }
function openAddDot(pid, eid) { state.modal = { type: 'addDot', pid, eid }; render(); }
function openAddBlock(pid) { state.modal = { type: 'addBlock', pid }; render(); }
function openAddTodo(pid, bid) { state.modal = { type: 'addTodo', pid, bid }; render(); }
function openAddMeeting(pid, mtype) { state.modal = { type: 'addMeeting', pid, mtype }; render(); }
function closeModal() { state.modal = null; render(); }
function openEditTotal(pid) { state.modal = { type: 'editTotal', pid }; render(); }
function openEditInfo(pid) { state.modal = { type: 'editInfo', pid }; render(); }

function toggleAddEventMode() {
  const mode = document.querySelector('input[name="ev-mode"]:checked')?.value || 'span';
  document.getElementById('ev-span-fields').style.display = mode === 'span' ? 'block' : 'none';
  document.getElementById('ev-dot-fields').style.display = mode === 'dot' ? 'block' : 'none';
}

function submitAddProject() { const cn = document.getElementById('m-caseno').value.trim(); const name = document.getElementById('m-name').value.trim(); const client = document.getElementById('m-client').value.trim(); const start = document.getElementById('m-start').value; const end = document.getElementById('m-end').value; if (!start || !end) return; const total = parseFloat(document.getElementById('m-total').value) || 0; state.projects.push({ id: uid(), caseNo: cn, name, client, startDate: start, endDate: end, totalBudget: total, orderItems: [], timeline: [], blocks: [{ id: uid(), name: '內部進度', color: 'dot-amber', todos: [] }, { id: uid(), name: '主副料進度', color: 'dot-coral', todos: [] }], meetings: { client: [], internal: [] } }); closeModal(); save(); }

function submitAddEvent(pid) {
  const name = document.getElementById('m-ename').value.trim(); if (!name) return;
  const mode = document.querySelector('input[name="ev-mode"]:checked')?.value || 'span';
  if (mode === 'span') {
    const sname = document.getElementById('m-sname').value.trim();
    const start = document.getElementById('m-sstart').value;
    const end = document.getElementById('m-send').value;
    const spans = sname && start && end ? [{ id: uid(), name: sname, startDate: start, endDate: end, done: false, doneDate: '' }] : [];
    state.projects.find(x => x.id === pid).timeline.push({ id: uid(), name, mode: 'span', done: false, doneDate: '', spans, dots: [] });
  } else {
    const dname = document.getElementById('m-dname').value.trim();
    const ddate = document.getElementById('m-ddate').value;
    const dots = dname && ddate ? [{ id: uid(), name: dname, date: ddate }] : [];
    state.projects.find(x => x.id === pid).timeline.push({ id: uid(), name, mode: 'dot', done: false, doneDate: '', spans: [], dots });
  }
  closeModal(); save();
}

function submitAddSpan(pid, eid) { const name = document.getElementById('m-sname').value.trim(); const start = document.getElementById('m-sstart').value; const end = document.getElementById('m-send').value; const done = document.getElementById('m-sdone').value; if (!name || !start || !end) return; state.projects.find(x => x.id === pid).timeline.find(x => x.id === eid).spans.push({ id: uid(), name, startDate: start, endDate: end, done: !!done, doneDate: done }); closeModal(); save(); }

function submitAddDot(pid, eid) {
  const name = document.getElementById('m-dname').value.trim();
  const date = document.getElementById('m-ddate').value;
  if (!name || !date) return;
  const ev = state.projects.find(x => x.id === pid).timeline.find(x => x.id === eid);
  if (!ev.dots) ev.dots = [];
  ev.dots.push({ id: uid(), name, date });
  closeModal(); save();
}

function submitAddBlock(pid) { const name = document.getElementById('m-bname').value.trim(); const color = document.getElementById('m-bcolor').value; if (!name) return; state.projects.find(x => x.id === pid).blocks.push({ id: uid(), name, color, todos: [] }); closeModal(); save(); }
function submitAddTodo(pid, bid) { const task = document.getElementById('m-tname').value.trim(); const deadline = document.getElementById('m-tdate').value; const note = document.getElementById('m-tnote').value.trim(); const status = document.getElementById('m-tstatus').value; const doneDate = status === 'done' ? new Date().toISOString().slice(0, 10) : ''; if (!task) return; state.projects.find(x => x.id === pid).blocks.find(x => x.id === bid).todos.push({ id: uid(), task, status, deadline, doneDate, note }); closeModal(); save(); }
function submitAddMeeting(pid, mtype) { const date = document.getElementById('m-mdate').value; const content = document.getElementById('m-mcontent').value.trim(); const raw = document.getElementById('m-mtasks').value.trim(); const rawInq = document.getElementById('m-minquiries').value.trim(); if (!date || !content) return; const tasks = raw ? raw.split('\n').filter(Boolean).map(t => ({ id: uid(), text: t.trim(), block: null })) : []; const inquiries = rawInq ? rawInq.split('\n').filter(Boolean).map(t => ({ id: uid(), text: t.trim(), faqCat: null })) : []; state.projects.find(x => x.id === pid).meetings[mtype].push({ id: uid(), date, content, tasks, inquiries }); closeModal(); save(); }

function updateItemField(pid, iid, field, val) {
  const p = state.projects.find(x => x.id === pid); const item = p.orderItems.find(x => x.id === iid);
  if (field === 'unitPrice' || field === 'quantity' || field === 'orderQty') item[field] = Number(val) || 0; else item[field] = val;
  const ordered = calcOrdered(p); const bp = budgetPct(p);
  const barColor = bp >= 100 ? '#E24B4A' : bp >= 80 ? '#EF9F27' : '#1D9E75';
  const remaining = (p.totalBudget || 0) - ordered;
  const el = id => document.getElementById(id);
  if (el('sum-ordered-' + pid)) el('sum-ordered-' + pid).textContent = 'NT$ ' + fmt(ordered);
  if (el('sum-remaining-' + pid)) { el('sum-remaining-' + pid).textContent = 'NT$ ' + fmt(remaining); el('sum-remaining-' + pid).style.color = remaining < 0 ? 'var(--color-text-danger)' : 'var(--color-text-primary)'; }
  if (el('sum-pct-' + pid)) { el('sum-pct-' + pid).textContent = bp + '%'; el('sum-pct-' + pid).style.color = barColor; }
  if (el('sum-bar-' + pid)) { el('sum-bar-' + pid).style.width = bp + '%'; el('sum-bar-' + pid).style.background = barColor; }
  if (el('subt-' + iid)) el('subt-' + iid).textContent = 'NT$ ' + fmt((item.unitPrice || 0) * (item.orderQty || 0));
  save();
}

function updateTodoField(pid, bid, tid, field, val) { const b = state.projects.find(x => x.id === pid).blocks.find(x => x.id === bid); const t = b.todos.find(x => x.id === tid); if (t) t[field] = val; save(); }
function updateMeetingContent(pid, mtype, mid, val) { const m = state.projects.find(x => x.id === pid).meetings[mtype].find(x => x.id === mid); if (m) m.content = val; save(); }
function assignInquiry(pid, mid, qid, mtype, cat) { const p = state.projects.find(x => x.id === pid); const m = p.meetings[mtype].find(x => x.id === mid); const q = (m.inquiries || []).find(x => x.id === qid); if (!q) return; q.faqCat = cat || null; if (cat) { if (!p.faq) p.faq = []; if (!p.faq.find(f => f.question === q.text && f.category === cat)) p.faq.push({ id: uid(), category: cat, question: q.text, reply: '', doneDate: '' }); } save(); render(); }
function cycleStatus(pid, bid, tid) { const t = state.projects.find(x => x.id === pid).blocks.find(x => x.id === bid).todos.find(x => x.id === tid); t.status = nextStatus(t.status); t.doneDate = t.status === 'done' ? new Date().toISOString().slice(0, 10) : ''; save(); render(); }
function deleteTodo(pid, bid, tid) { const b = state.projects.find(x => x.id === pid).blocks.find(x => x.id === bid); b.todos = b.todos.filter(x => x.id !== tid); save(); render(); }
function deleteBlock(pid, bid) { state.projects.find(x => x.id === pid).blocks = state.projects.find(x => x.id === pid).blocks.filter(x => x.id !== bid); save(); render(); }
function deleteMeeting(pid, mtype, mid) { state.projects.find(x => x.id === pid).meetings[mtype] = state.projects.find(x => x.id === pid).meetings[mtype].filter(x => x.id !== mid); save(); render(); }
function deleteProject(pid) { state.projects = state.projects.filter(x => x.id !== pid); save(); render(); }
function assignTask(pid, mid, tid, mtype, bid) { const p = state.projects.find(x => x.id === pid); const m = p.meetings[mtype].find(x => x.id === mid); const t = m.tasks.find(x => x.id === tid); t.block = bid || null; if (bid) { const block = p.blocks.find(x => x.id === bid); if (block && !block.todos.find(x => x.task === t.text)) block.todos.push({ id: uid(), task: t.text, status: 'notstarted', deadline: '', doneDate: '', note: '來自會議任務' }); } save(); render(); }

function toggleEditEv(eid) { state.editingEvent = state.editingEvent === eid ? null : eid; state.editingSub = null; render(); }
function toggleEditSub(sid) { state.editingSub = state.editingSub === sid ? null : sid; state.editingEvent = null; render(); }
function toggleEditDot(did) { state.editingSub = state.editingSub === did ? null : did; state.editingEvent = null; render(); }
function cancelEdit() { state.editingEvent = null; state.editingSub = null; render(); }
function saveEvName(pid, eid) { const ev = state.projects.find(x => x.id === pid).timeline.find(x => x.id === eid); const n = document.getElementById('en-' + eid).value.trim(); if (n) ev.name = n; state.editingEvent = null; save(); render(); }
function saveSpan(pid, eid, sid) { const ev = state.projects.find(x => x.id === pid).timeline.find(x => x.id === eid); const sp = ev.spans.find(x => x.id === sid); const n = document.getElementById('sn-' + sid).value.trim(); const s = document.getElementById('ss-' + sid).value; const e2 = document.getElementById('se-' + sid).value; const d = document.getElementById('sd-' + sid).value; if (n) sp.name = n; if (s) sp.startDate = s; if (e2) sp.endDate = e2; sp.doneDate = d; sp.done = !!d; state.editingSub = null; save(); render(); }
function saveDot(pid, eid, did) { const ev = state.projects.find(x => x.id === pid).timeline.find(x => x.id === eid); const dot = (ev.dots || []).find(x => x.id === did); if (!dot) return; const n = document.getElementById('dn-' + did).value.trim(); const d = document.getElementById('dd-' + did).value; if (n) dot.name = n; if (d) dot.date = d; state.editingSub = null; save(); render(); }
function deleteEvent(pid, eid) { state.projects.find(x => x.id === pid).timeline = state.projects.find(x => x.id === pid).timeline.filter(x => x.id !== eid); state.editingEvent = null; state.editingSub = null; save(); render(); }
function deleteSpan(pid, eid, sid) { state.projects.find(x => x.id === pid).timeline.find(x => x.id === eid).spans = state.projects.find(x => x.id === pid).timeline.find(x => x.id === eid).spans.filter(x => x.id !== sid); state.editingSub = null; save(); render(); }
function deleteDot(pid, eid, did) { const ev = state.projects.find(x => x.id === pid).timeline.find(x => x.id === eid); ev.dots = (ev.dots || []).filter(x => x.id !== did); save(); render(); }
function addOrderItem(pid) { state.projects.find(x => x.id === pid).orderItems.push({ id: uid(), name: '', unitPrice: 0, quantity: 0, orderQty: 0, unit: '' }); save(); render(); }
function deleteOrderItem(pid, iid) { const p = state.projects.find(x => x.id === pid); p.orderItems = p.orderItems.filter(x => x.id !== iid); save(); render(); }
function addFaqItem(pid) { const p = state.projects.find(x => x.id === pid); if (!p.faq) p.faq = []; const cats = state.faqCats || DEFAULT_FAQ_CATS; p.faq.push({ id: uid(), category: cats[0] || '其他', question: '', reply: '', doneDate: '' }); save(); render(); }
function deleteFaqItem(pid, fid) { const p = state.projects.find(x => x.id === pid); p.faq = (p.faq || []).filter(x => x.id !== fid); save(); render(); }
function updateFaqField(pid, fid, field, val) { const p = state.projects.find(x => x.id === pid); const f = (p.faq || []).find(x => x.id === fid); if (f) f[field] = val; save(); }
function openAddFaqCat() { state.modal = { type: 'addFaqCat' }; render(); }
function submitAddFaqCat() { const v = document.getElementById('m-faqcat').value.trim(); if (v && !state.faqCats.includes(v)) state.faqCats.push(v); closeModal(); save(); render(); }

// ════════════════════════════════════════
// 欄寬拖曳（order-table & todo-table）
// ════════════════════════════════════════

function initColResizers() {
  document.querySelectorAll('.order-table .col-resizer, .todo-table .col-resizer').forEach(resizer => {
    if (resizer._bound) return; resizer._bound = true;
    resizer.addEventListener('mousedown', e => {
      e.preventDefault();
      const th = resizer.parentElement;
      const startX = e.pageX; const startW = th.offsetWidth;
      resizer.classList.add('dragging');
      function onMove(e) { th.style.width = (Math.max(40, startW + e.pageX - startX)) + 'px'; th.style.minWidth = th.style.width; }
      function onUp() { resizer.classList.remove('dragging'); document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); }
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  });
}

// 每次 render 後重新綁定 resizer
const _origRender = render;
window.render = function () { _origRender(); setTimeout(initColResizers, 0); };

// ── 啟動 ──
loadData();
