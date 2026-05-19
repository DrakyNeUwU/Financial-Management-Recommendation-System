const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/page.tsx', 'utf8');

// 1. Move month-nav and summary stats to header
const headerRegex = /<header>[\s\S]*?<\/header>/;
const newHeader = `<header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 24px', background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
  <div className="logo" style={{ flex: '0 0 auto' }}>FMRS<span>/</span>ai</div>
  
  <div style={{ display: 'flex', alignItems: 'center', gap: '32px', flex: '1 1 auto', justifyContent: 'center' }}>
    <div className="month-nav" style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '6px 12px', borderRadius: '12px', background: 'var(--surface2)', border: '1px solid var(--border)' }}>
      <button onClick={prevMonth} style={{ background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: '0 6px' }}>←</button>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span id="month-label" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', width: 110, textAlign: 'center', fontWeight: 600, color: 'var(--text)' }}>
          Tháng {monthLabel}
        </span>
        <input 
          type="month"
          value={\`\${year}-\${String(month).padStart(2, '0')}\`}
          onChange={e => {
            if (!e.target.value) return
            const [y, m] = e.target.value.split('-')
            if (y && m) { setYear(parseInt(y)); setMonth(parseInt(m)) }
          }}
          onClick={e => (e.target).showPicker?.()}
          style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer', width: '100%', height: '100%' }}
        />
      </div>
      <button onClick={nextMonth} style={{ background: 'transparent', border: 'none', color: 'var(--text)', cursor: 'pointer', padding: '0 6px' }}>→</button>
    </div>

    <div style={{ display: 'flex', gap: '24px', fontSize: '0.9rem', fontFamily: 'var(--font-mono)', fontWeight: 500 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: 'var(--muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Thu:</span> <span style={{ color: 'var(--income)' }}>{fmtShort(totalIncome)}</span></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: 'var(--muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Chi:</span> <span style={{ color: 'var(--expense)' }}>{fmtShort(totalExpense)}</span></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><span style={{ color: 'var(--muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Còn:</span> <span style={{ color: 'var(--text)' }}>{fmtShort(balance)}</span></div>
    </div>
  </div>

  <div className="auth-header-nav" style={{ display: 'flex', gap: '8px', flex: '0 0 auto' }}>
    {session ? (
      <button className="btn-small" onClick={async () => { await supabase.auth.signOut(); setSession(null); window.location.reload() }}>Đăng xuất</button>
    ) : (
      <>
        <button className="btn-small" style={{ background: 'var(--accent)', color: '#000', border: 'none', fontWeight: 600 }} onClick={() => window.location.href = '/login'}>Đăng nhập</button>
        <button className="btn-small" onClick={() => window.location.href = '/login?tab=register'}>Đăng ký</button>
      </>
    )}
  </div>
</header>`;
code = code.replace(headerRegex, newHeader);

// 2. Remove month-nav and summary from sidebar
const monthNavRegex = /\{\/\* Month Nav \*\/\}[\s\S]*?\{\/\* Summary \*\/\}/;
code = code.replace(monthNavRegex, '');
const summaryRegex = /<div className="card">[\s]*?<div className="card-title">Tổng quan tháng<\/div>[\s\S]*?<\/div>\s*\{\/\* Add Transaction Form \*\/\}/;
code = code.replace(summaryRegex, '{/* Add Transaction Form */}');

// 3. Move Biến động theo tháng to sidebar
const donutCardRegex = /\{\/\* Monthly Breakdown \*\/\}[\s\S]*?<div className="card monthly-card">[\s\S]*?<\/div>\s*<\/div>\s*\{\/\* 50\/30\/20 Analysis \*\/\}/;
const donutMatch = code.match(donutCardRegex);
if (donutMatch) {
  let donutCode = donutMatch[0].replace(/\s*\{\/\* 50\/30\/20 Analysis \*\/\}/, '');
  code = code.replace(donutCardRegex, '{/* 50/30/20 Analysis */}');
  
  // Insert donutCode into sidebar before Add Transaction Form
  code = code.replace('{/* Add Transaction Form */}', donutCode + '\n\n          {/* Add Transaction Form */}');
} else { console.log("Donut chart not found"); }

// 4. Remove Giao dịch theo ngày
const dayTableRegex = /\{\/\* Day Table \*\/\}[\s\S]*?<div className="card">[\s]*?<div className="card-title">Giao dịch theo ngày — click để xem chi tiết<\/div>[\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*\{\/\* ── RIGHT COLUMN ── \*\/\}/;
code = code.replace(dayTableRegex, '</div>\n        {/* ── RIGHT COLUMN ── */}');

// 5. Wrap 50/30/20 and So sánh tháng in a grid
const gridStart = '<div style={{ display: \'grid\', gridTemplateColumns: \'1fr 1fr\', gap: 24 }}>\n          {/* 50/30/20 Analysis */}';
code = code.replace('{/* 50/30/20 Analysis */}', gridStart);

const afterSoSanhRegex = /(<div className="card">[\s\S]*?SO SÁNH CHI TIÊU THÁNG[\s\S]*?<\/div>[\s]*?)(\{\/\* Forecast \*\/\})/;
code = code.replace(afterSoSanhRegex, '$1</div>\n\n          $2');

fs.writeFileSync('frontend/src/app/page.tsx', code);
console.log('Transform complete.');
