const fs = require('fs');
let code = fs.readFileSync('frontend/src/app/page.tsx', 'utf8');

// 1. Add isFormOpen state
code = code.replace(
  "const [submitting, setSubmitting] = useState(false)",
  "const [submitting, setSubmitting] = useState(false)\n  const [isFormOpen, setIsFormOpen] = useState(false)"
);

// 2. Collapse form after submit
code = code.replace(
  "showToast('Đã lưu ✓', 'success')",
  "showToast('Đã lưu ✓', 'success')\n      setIsFormOpen(false)"
);

// 3. Update Form UI to be collapsible
const formRegex = /\{\/\* Add Transaction Form \*\/\}[\s\S]*?<div className="card">[\s]*?<div className="card-title">Thêm giao dịch<\/div>([\s\S]*?)<\/button>\s*<\/div>/;
const formMatch = code.match(formRegex);
if (formMatch) {
  const formContent = formMatch[1] + '</button>';
  const newForm = `{/* Add Transaction Form */}
          <div className="card">
            <div className="card-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isFormOpen ? 14 : 0 }}>
              <span>Thêm giao dịch</span>
              <button className="btn-small" onClick={() => setIsFormOpen(!isFormOpen)} style={{ background: isFormOpen ? 'var(--surface2)' : 'var(--accent)', color: isFormOpen ? 'var(--text)' : '#000', border: 'none' }}>
                {isFormOpen ? '− Thu gọn' : '+ Thêm mới'}
              </button>
            </div>
            {isFormOpen && (
              <div style={{ marginTop: 14 }}>
                ${formContent.replace(/\n/g, '\n                ')}
              </div>
            )}
          </div>`;
  code = code.replace(formRegex, newForm);
}

// 4. Update 50/30/20 card amounts to nowrap and empty state
code = code.replace(
  "<span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: isOver ? 'var(--expense)' : 'var(--muted)' }}>",
  "<span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: isOver ? 'var(--expense)' : 'var(--muted)', whiteSpace: 'nowrap' }}>"
);

const empty503020Regex = /<div className="monthly-empty">Cần có thu nhập \+ danh mục được gắn nhóm \(needs\/wants\/savings\) để phân tích<\/div>/;
code = code.replace(empty503020Regex, `<div className="monthly-empty" style={{ display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
                <div>Cần có thu nhập & gắn nhóm (50/30/20) cho danh mục.</div>
                <button className="btn-small" onClick={() => { setIsFormOpen(true); setTimeout(() => setCatPanelOpen(true), 100); }}>Thiết lập danh mục</button>
              </div>`);

// 5. Update Comparison color logic to be explicitly clear
const compColorRegex = /const good[\s\S]*?const color = [^\n]*/;
const compColorReplacement = `let color = 'var(--muted)'
                if (item.diff !== null) {
                  if (item.label === 'Thu nhập') color = item.diff >= 0 ? 'var(--income)' : 'var(--expense)'
                  else color = item.diff <= 0 ? 'var(--income)' : 'var(--expense)'
                }`;
code = code.replace(compColorRegex, compColorReplacement);

// 6. Add interaction mode to Line Chart
code = code.replace(
  "responsive: true, maintainAspectRatio: false,",
  "responsive: true, maintainAspectRatio: false,\n    interaction: { mode: 'index' as const, intersect: false },"
);

fs.writeFileSync('frontend/src/app/page.tsx', code);
console.log('Update script finished.');
