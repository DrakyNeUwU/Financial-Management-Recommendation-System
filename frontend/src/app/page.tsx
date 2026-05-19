'use client'

import { useEffect, useRef, useState } from 'react'
import {
  Chart as ChartJS, ArcElement, Tooltip, CategoryScale,
  LinearScale, PointElement, LineElement, Filler
} from 'chart.js'
import { Doughnut, Line } from 'react-chartjs-2'
import { supabase } from '@/lib/supabase'
import {
  getTransactions, getCategories, createTransaction, deleteTransaction, updateCategoryGroup,
  type Transaction, type Category, type TxType, type Group503020
} from '@/lib/api'
import { fmt, fmtShort, evalAmount, evalAmountHint, PALETTE } from '@/lib/utils'

ChartJS.register(ArcElement, Tooltip, CategoryScale, LinearScale, PointElement, LineElement, Filler)

// ─── Toast ───────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState({ msg: '', type: '', show: false })
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const show = (msg: string, type: 'success' | 'error' = 'success') => {
    if (timerRef.current) clearTimeout(timerRef.current)
    setToast({ msg, type, show: true })
    timerRef.current = setTimeout(() => setToast(t => ({ ...t, show: false })), 2800)
  }
  return { toast, show }
}

// ─── Main Dashboard ──────────────────────────────────────────
export default function DashboardPage() {
  const now = new Date()
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [year, setYear] = useState(now.getFullYear())
  const [txs, setTxs] = useState<Transaction[]>([])
  const [session, setSession] = useState<any>(null)
  const [showAuthToast, setShowAuthToast] = useState(false)
  const [categories, setCats] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [openDays, setOpenDays] = useState<Set<string>>(new Set())

  // form state
  const [type, setType] = useState<TxType>('expense')
  const [amountRaw, setAmountRaw] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [txDate, setTxDate] = useState(now.toISOString().split('T')[0])
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // category panel
  const [catPanelOpen, setCatPanelOpen] = useState(false)
  const [newCatName, setNewCatName] = useState('')

  // FMRS: previous month data + budget targets
  const [prevTxs, setPrevTxs] = useState<Transaction[]>([])
  const [budgets, setBudgets] = useState<Record<string, number>>(() => {
    if (typeof window === 'undefined') return {}
    try { return JSON.parse(localStorage.getItem('fmrs-budgets') || '{}') } catch { return {} }
  })
  const [budgetInput, setBudgetInput] = useState<Record<string, string>>({})

  const { toast, show: showToast } = useToast()

  // ── helpers ───────────────────────────────────────────────
  const monthParam = `${String(month).padStart(2, '0')}-${year}`
  const monthLabel = `${String(month).padStart(2, '0')}/${year}`
  const todayStr = now.toISOString().split('T')[0]

  const getCatName = (id: string | null) => {
    if (!id) return 'Không có danh mục'
    return categories.find(c => c.id === id)?.name ?? 'Danh mục đã xoá'
  }

  // ── load data ────────────────────────────────────────────
  const loadAll = async () => {
    setLoading(true)
    try {
      const [t, c] = await Promise.all([getTransactions(monthParam), getCategories()])
      setTxs(t); setCats(c)
    } catch { showToast('Lỗi tải dữ liệu', 'error') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year])

  const checkAuth = () => {
    if (!session) {
      setShowAuthToast(true)
      return false
    }
    return true
  }

  // Fetch previous month for comparison
  useEffect(() => {
    const prevM = month === 1 ? 12 : month - 1
    const prevY = month === 1 ? year - 1 : year
    const prevParam = `${String(prevM).padStart(2,'0')}-${prevY}`
    getTransactions(prevParam).then(setPrevTxs).catch(() => setPrevTxs([]))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, year])

  // Save budgets to localStorage
  const saveBudget = (catId: string, value: string) => {
    const num = parseFloat(value)
    const next = { ...budgets }
    if (!isNaN(num) && num > 0) next[catId] = num
    else delete next[catId]
    setBudgets(next)
    if (typeof window !== 'undefined') localStorage.setItem('fmrs-budgets', JSON.stringify(next))
  }

  // ── type toggle ──────────────────────────────────────────
  const handleSetType = (t: TxType) => { if (!checkAuth()) return; setType(t); setCategoryId('') }

  // ── submit transaction ──────────────────────────────────
  const handleSubmit = async () => {
    if (!checkAuth()) return
    const amount = evalAmount(amountRaw) ?? parseFloat(amountRaw)
    if (!amount || amount <= 0) return showToast('Nhập số tiền hợp lệ', 'error')
    if (!categoryId) return showToast('Chọn danh mục', 'error')
    if (!txDate) return showToast('Chọn ngày', 'error')
    setSubmitting(true)
    try {
      await createTransaction({ type, amount, category_id: categoryId, transaction_date: txDate, note: note || undefined })
      setAmountRaw(''); setNote('')
      showToast('Đã lưu ✓', 'success')
      await loadAll()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Lỗi lưu giao dịch', 'error')
    } finally { setSubmitting(false) }
  }

  // ── add category ─────────────────────────────────────────
  const handleAddCategory = async () => {
    if (!checkAuth()) return
    if (!newCatName.trim()) return
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token
    if (!token) return
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newCatName.trim(), type, group_50_30_20: null })
      })
      if (!res.ok) throw new Error()
      setNewCatName('')
      const cats = await getCategories()
      setCats(cats)
      showToast('Đã thêm danh mục', 'success')
    } catch { showToast('Lỗi thêm danh mục', 'error') }
  }

  // ── delete category ──────────────────────────────────────
  const handleDeleteCategory = async (id: string, name: string) => {
    if (!checkAuth()) return
    if (!confirm(`Xoá danh mục "${name}"?`)) return
    const { data: session } = await supabase.auth.getSession()
    const token = session.session?.access_token
    if (!token) return
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/categories/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.detail) }
      const cats = await getCategories()
      setCats(cats)
      showToast('Đã xoá danh mục', 'success')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Lỗi xoá danh mục', 'error')
    }
  }

  // ── assign group 50/30/20 ────────────────────────────────
  const handleSetGroup = async (id: string, group: Group503020 | null) => {
    if (!checkAuth()) return
    try {
      await updateCategoryGroup(id, group)
      const cats = await getCategories()
      setCats(cats)
      showToast(group ? `Gán nhóm "${group}" thành công` : 'Đã xóa nhóm', 'success')
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Lỗi cập nhật nhóm', 'error')
    }
  }

  // ── delete transaction ───────────────────────────────────
  const handleDeleteTx = async (id: string) => {
    if (!checkAuth()) return
    if (!confirm('Xoá giao dịch này?')) return
    try {
      await deleteTransaction(id)
      showToast('Đã xoá giao dịch', 'success')
      await loadAll()
    } catch (e: unknown) {
      showToast(e instanceof Error ? e.message : 'Lỗi xoá', 'error')
    }
  }

  // ── nav month ────────────────────────────────────────────
  const prevMonth = () => { if (month === 1) { setMonth(12); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 12) { setMonth(1); setYear(y => y + 1) } else setMonth(m => m + 1) }

  // ── toggle day ───────────────────────────────────────────
  const toggleDay = (d: string) => setOpenDays(prev => {
    const s = new Set(prev); s.has(d) ? s.delete(d) : s.add(d); return s
  })

  // ── computed ─────────────────────────────────────────────
  const totalIncome = txs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const totalExpense = txs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const balance = totalIncome - totalExpense
  const filteredCats = categories.filter(c => c.type === type)

  // expense breakdown by category
  const expenseMap = new Map<string, number>()
  txs.forEach(tx => {
    if (tx.type !== 'expense') return
    const name = getCatName(tx.category_id)
    if (name === 'Danh mục đã xoá') return
    expenseMap.set(name, (expenseMap.get(name) || 0) + tx.amount)
  })
  const breakdownItems = [...expenseMap.entries()]
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
  const daysInMonth = new Date(year, month, 0).getDate()
  const totalExpenseAbs = Math.abs(totalExpense)
  const avgPerDay = daysInMonth > 0 ? totalExpenseAbs / daysInMonth : 0

  // ── 50/30/20 analysis ────────────────────────────────────
  const GROUP_CONFIG = {
    needs:   { label: 'Thiết yếu', ideal: 0.5, color: '#5b8dee' },
    wants:   { label: 'Muốn có',   ideal: 0.3, color: '#c8f135' },
    savings: { label: 'Tiết kiệm', ideal: 0.2, color: '#a29bfe' },
  } as const
  type Group = keyof typeof GROUP_CONFIG
  const groupAmounts: Record<Group, number> = { needs: 0, wants: 0, savings: 0 }
  txs.forEach(tx => {
    if (tx.type !== 'expense') return
    const cat = categories.find(c => c.id === tx.category_id)
    const g = cat?.group_50_30_20 as Group | null
    if (g && g in groupAmounts) groupAmounts[g] += tx.amount
  })
  const hasGroupData = Object.values(groupAmounts).some(v => v > 0)

  // ── Forecast ─────────────────────────────────────────────
  const todayDate = new Date()
  const isCurrentMonth = month === todayDate.getMonth() + 1 && year === todayDate.getFullYear()
  const dayOfMonth = isCurrentMonth ? todayDate.getDate() : daysInMonth
  const projectedExpense = dayOfMonth > 0 ? (totalExpenseAbs / dayOfMonth) * daysInMonth : 0
  const projectedBalance = totalIncome - projectedExpense
  const forecastRate = dayOfMonth / daysInMonth // % tháng đã qua

  // ── Month comparison ─────────────────────────────────────
  const prevIncome  = prevTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const prevExpense = Math.abs(prevTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0))
  const incomeDiff  = prevIncome  > 0 ? ((totalIncome - prevIncome)   / prevIncome)  * 100 : null
  const expenseDiff = prevExpense > 0 ? ((totalExpenseAbs - prevExpense) / prevExpense) * 100 : null

  // donut chart
  const donutData = breakdownItems.length > 0 ? {
    labels: breakdownItems.map(i => i.name),
    datasets: [{ data: breakdownItems.map(i => i.amount), backgroundColor: breakdownItems.map((_, idx) => PALETTE[idx % PALETTE.length]), borderColor: '#16181c', borderWidth: 3, hoverOffset: 6 }]
  } : {
    labels: ['No data'],
    datasets: [{ data: [1], backgroundColor: ['#2a2d35'], borderWidth: 0, borderColor: '#16181c', hoverOffset: 0 }]
  }
  const donutOptions = {
    responsive: true, maintainAspectRatio: false, cutout: breakdownItems.length > 0 ? '68%' : '72%',
    plugins: {
      legend: { display: false },
      tooltip: breakdownItems.length > 0 ? { callbacks: { label: (ctx: { label: string; raw: unknown }) => `${ctx.label}: ${fmt(ctx.raw as number)} (${totalExpense > 0 ? ((ctx.raw as number / totalExpense) * 100).toFixed(1) : 0}%)` }, backgroundColor: '#1e2128', titleColor: '#6b7280', bodyColor: '#eef0f4', borderColor: '#2a2d35', borderWidth: 1, padding: 10 } : { enabled: false }
    }
  }

  // line chart
  const lineLabels: string[] = [], lineValues: number[] = []
  const dataMap: Record<string, number> = {}
  txs.forEach(tx => {
    if (tx.type !== 'expense') return
    dataMap[tx.date] = (dataMap[tx.date] || 0) + tx.amount
  })
  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
    lineLabels.push(String(d).padStart(2,'0'))
    lineValues.push(dataMap[ds] || 0)
  }
  const lineData = {
    labels: lineLabels,
    datasets: [{ data: lineValues, borderColor: '#ff5e5e', backgroundColor: 'rgba(255,94,94,0.08)', borderWidth: 2, pointRadius: 3, pointHoverRadius: 5, pointBackgroundColor: '#ff5e5e', pointBorderColor: '#ff5e5e', fill: true, tension: 0.35 }]
  }
  const lineOptions = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx: { raw: unknown }) => fmt(ctx.raw as number) }, backgroundColor: '#1e2128', titleColor: '#6b7280', bodyColor: '#ff5e5e', borderColor: '#2a2d35', borderWidth: 1, padding: 10 } },
    scales: {
      x: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6b7280', font: { family: 'Courier New', size: 10 } }, border: { color: '#2a2d35' } },
      y: { grid: { color: 'rgba(255,255,255,0.04)' }, ticks: { color: '#6b7280', font: { family: 'Courier New', size: 10 }, callback: (v: unknown) => fmtShort(v as number) }, border: { color: '#2a2d35' } }
    }
  }

  // day table
  const txByDay: Record<string, Transaction[]> = {}
  txs.forEach(tx => { const d = tx.date; if (!txByDay[d]) txByDay[d] = []; txByDay[d].push(tx) })
  const dayRows: number[] = []
  for (let d = daysInMonth; d >= 1; d--) dayRows.push(d)

  return (
    <>
      <header>
        <div className="logo">FMRS<span>/</span>ai</div>
        <div className="auth-header-nav" style={{ display: 'flex', gap: '8px' }}>
          {session ? (
            <button className="btn-small" onClick={async () => { await supabase.auth.signOut(); setSession(null); window.location.reload() }}>Đăng xuất</button>
          ) : (
            <>
              <button className="btn-small" style={{ background: 'var(--accent)', color: '#000', border: 'none', fontWeight: 600 }} onClick={() => window.location.href = '/login'}>Đăng nhập</button>
              <button className="btn-small" onClick={() => window.location.href = '/login?tab=register'}>Đăng ký</button>
            </>
          )}
        </div>
      </header>

      <div className="container">
        {/* ── SIDEBAR ── */}
        <div className="sidebar">

          {/* Month Nav */}
          <div className="month-nav" style={{ padding: '14px 18px', borderRadius: '12px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <button onClick={prevMonth}>←</button>
            <span id="month-label" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.9rem', width: 90, textAlign: 'center', fontWeight: 600, color: 'var(--text)' }}>{monthLabel}</span>
            <button onClick={nextMonth}>→</button>
            <div style={{ flex: 1 }} />
            <button
              onClick={() => { const n = new Date(); setMonth(n.getMonth() + 1); setYear(n.getFullYear()) }}
              style={{ fontSize: '0.7rem', padding: '0 12px', fontFamily: 'var(--font-mono)', color: 'var(--accent)', borderColor: 'rgba(200,241,53,0.3)', width: 'auto' }}
            >Tháng này</button>
          </div>

          {/* Summary */}
          <div className="card">
            <div className="card-title">Tổng quan tháng</div>
            <div className="summary-grid">
              <div className="summary-item income">
                <div className="label">Thu nhập</div>
                <div className="amount">{loading ? '—' : fmt(totalIncome)}</div>
              </div>
              <div className="summary-item expense">
                <div className="label">Chi tiêu</div>
                <div className="amount">{loading ? '—' : fmt(totalExpense)}</div>
              </div>
            </div>
            <div className="balance-row">
              <span className="label">Còn lại</span>
              <span className="amount" style={{ color: balance >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                {loading ? '—' : fmt(balance)}
              </span>
            </div>
            {!loading && txs.length === 0 && (
              <div style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: 'rgba(200,241,53,0.06)', border: '1px solid rgba(200,241,53,0.15)', fontSize: '0.75rem', color: 'var(--accent)', fontFamily: 'var(--font-mono)', textAlign: 'center' }}>
                Bắt đầu bằng cách thêm giao dịch đầu tiên ↓
              </div>
            )}
          </div>

          {/* Add Transaction Form */}
          <div className="card">
            <div className="card-title">Thêm giao dịch</div>
            <div className="type-toggle">
              <div className={`type-btn${type === 'expense' ? ' active-expense' : ''}`} onClick={() => handleSetType('expense')}>− Chi tiêu</div>
              <div className={`type-btn${type === 'income' ? ' active-income' : ''}`} onClick={() => handleSetType('income')}>+ Thu nhập</div>
            </div>

            <div className="form-group">
              <label>Số tiền (VNĐ)</label>
              <input type="text" placeholder="Nhập số tiền" value={amountRaw}
                onChange={e => setAmountRaw(e.target.value)} />
              <div className="expr-hint">{evalAmountHint(amountRaw)}</div>
            </div>

            <div className="form-group">
              <label>Danh mục</label>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select style={{ flex: 1 }} value={categoryId} onChange={e => { if (!checkAuth()) return; setCategoryId(e.target.value) }}>
                  <option value="">-- Chọn danh mục --</option>
                  {filteredCats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <button type="button" className="btn-small" onClick={() => { if (!checkAuth()) return; setCatPanelOpen(v => !v) }} title="Quản lý danh mục" style={{ width: '42px', padding: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                  {catPanelOpen ? '−' : '+'}
                </button>
              </div>
              {filteredCats.length === 0 && <div className="category-type-hint">Chưa có danh mục — hãy thêm ngay</div>}
              
              {/* Inline Category Management */}
              {catPanelOpen && (
                <div style={{ marginTop: 12, padding: 12, background: 'var(--surface2)', borderRadius: 8, border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ fontSize: '0.75rem', marginBottom: 10, fontFamily: 'var(--font-mono)', color: 'var(--muted)', letterSpacing: '0.05em' }}>QUẢN LÝ DANH MỤC</div>
                  <div className="add-category-row" style={{ marginBottom: 12 }}>
                    <input type="text" placeholder="Tên danh mục mới..." value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddCategory()} />
                    <button className="btn-small" onClick={handleAddCategory}>+ Thêm</button>
                  </div>
                  <div className="category-panel" style={{ display: 'block', marginTop: 0, border: 'none', padding: 0, background: 'transparent' }}>
                    <div className="category-panel-head" style={{ fontSize: '0.75rem', paddingBottom: 8 }}>Danh mục hiện có ({filteredCats.length})</div>
                    <div className="category-list" style={{ maxHeight: 200, overflowY: 'auto', paddingRight: 4 }}>
                      {filteredCats.length === 0
                        ? <div className="category-empty">Chưa có danh mục cho loại này</div>
                        : filteredCats.map(c => {
                            const GROUP_OPTIONS: { value: Group503020 | '', label: string, color: string }[] = [
                              { value: '',        label: '— Chưa phân loại', color: 'var(--muted)' },
                              { value: 'needs',   label: '🏠 Thiết yếu',     color: '#5b8dee' },
                              { value: 'wants',   label: '🎯 Muốn có',        color: '#c8f135' },
                              { value: 'savings', label: '💰 Tiết kiệm',      color: '#a29bfe' },
                            ]
                            const current = c.group_50_30_20 ?? ''
                            const opt = GROUP_OPTIONS.find(o => o.value === current)
                            return (
                              <div key={c.id} style={{ background: 'var(--surface)', borderRadius: 8, padding: '8px 10px', marginBottom: 8, border: '1px solid rgba(255,255,255,0.03)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: c.type === 'expense' ? 8 : 0 }}>
                                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: opt?.color ?? 'var(--border)', flexShrink: 0, display: 'inline-block' }} />
                                  <div style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                                  <button className="btn-delete-category" title="Xoá danh mục"
                                    onClick={() => handleDeleteCategory(c.id, c.name)}>×</button>
                                </div>
                                {c.type === 'expense' && (
                                  <select
                                    value={current}
                                    onChange={e => handleSetGroup(c.id, (e.target.value as Group503020) || null)}
                                    style={{
                                      width: '100%', fontSize: '0.72rem', padding: '4px 6px',
                                      borderRadius: 6, background: 'var(--surface2)',
                                      border: `1px solid ${opt?.color ?? 'var(--border)'}`,
                                      color: opt?.color ?? 'var(--muted)',
                                      fontFamily: 'var(--font-mono)', cursor: 'pointer',
                                    }}
                                  >
                                    {GROUP_OPTIONS.map(o => (
                                      <option key={o.value} value={o.value} style={{ color: 'var(--text)' }}>{o.label}</option>
                                    ))}
                                  </select>
                                )}
                              </div>
                            )
                          })
                      }
                    </div>
                  </div>
                </div>
              )}
            </div>



            <div className="form-group">
              <label>Ngày</label>
              <input type="date" value={txDate} onChange={e => setTxDate(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Ghi chú</label>
              <input type="text" placeholder="Tùy chọn..." value={note} onChange={e => setNote(e.target.value)} />
            </div>

            <button className="btn-submit" disabled={submitting} onClick={handleSubmit}>
              {submitting ? 'Đang lưu...' : 'Lưu giao dịch'}
            </button>
          </div>

          {/* Day Table */}
          <div className="card">
            <div className="card-title">Giao dịch theo ngày — click để xem chi tiết</div>
            <div className="day-table-header">
              <span>Ngày</span><span>Thu nhập</span><span>Chi tiêu</span>
            </div>
            <div className="day-list">
              {loading ? <div className="loading">đang tải...</div> : dayRows.map(d => {
                const ds = `${year}-${String(month).padStart(2,'0')}-${String(d).padStart(2,'0')}`
                const dayTxs = txByDay[ds] || []
                const inc = dayTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0)
                const exp = dayTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
                const isEmpty = dayTxs.length === 0
                const isToday = ds === todayStr
                const dayLabel = `${String(d).padStart(2,'0')}/${String(month).padStart(2,'0')}`
                const open = openDays.has(ds)
                return (
                  <div key={ds}>
                    <div className="day-row-header" onClick={() => toggleDay(ds)}>
                      <div className={`day-date${isToday ? ' today' : isEmpty ? ' empty' : ''}`}>
                        {dayLabel}{isToday ? ' ●' : ''}
                      </div>
                      <div className={inc > 0 ? 'day-income' : 'day-zero'}>{inc > 0 ? '+' + fmtShort(inc) : '—'}</div>
                      <div className={exp > 0 ? 'day-expense' : 'day-zero'}>{exp > 0 ? '−' + fmtShort(exp) : '—'}</div>
                    </div>
                    <div className={`tx-details${open ? ' open' : ''}`}>
                      {dayTxs.length === 0
                        ? <div style={{ fontSize: '0.72rem', color: 'var(--muted)', padding: '4px 0', fontFamily: 'var(--font-mono)' }}>Không có giao dịch</div>
                        : dayTxs.map(tx => (
                            <div key={tx.id} className="tx-detail-item">
                              <div className={`tx-detail-dot ${tx.type}`} />
                              <div className="tx-detail-cat">
                                {getCatName(tx.category_id)}
                                {tx.note && <span className="tx-detail-note">— {tx.note}</span>}
                              </div>
                              <div className="tx-detail-actions">
                                <div className={`tx-detail-amount ${tx.type}`}>
                                  {tx.type === 'income' ? '+' : '−'}{fmt(tx.amount)}
                                </div>
                                <button className="btn-delete-tx" title="Xoá giao dịch"
                                  onClick={() => handleDeleteTx(tx.id)}>×</button>
                              </div>
                            </div>
                          ))
                      }
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

        </div>

        {/* ── RIGHT COLUMN ── */}
        <div className="right-column">

          {/* Monthly Breakdown */}
          <div className="card monthly-card">
            <div className="card-title">Biến động theo tháng</div>
            <div className="monthly-header">
              <div className="monthly-donut">
                <Doughnut data={donutData} options={donutOptions as Parameters<typeof Doughnut>[0]['options']} />
              </div>
              <div className="monthly-total">
                <div className="eyebrow">Chi tiêu tháng này</div>
                <div className="amount">{loading ? '—' : fmt(totalExpense)}</div>
                <div className="subtext">{loading ? '—' : totalExpenseAbs > 0 ? `~${fmt(avgPerDay)} / ngày` : '—'}</div>
                {!loading && expenseDiff !== null && (
                  <div style={{ fontSize: '0.75rem', marginTop: 4, fontFamily: 'var(--font-mono)', color: expenseDiff > 0 ? 'var(--expense)' : expenseDiff < 0 ? 'var(--income)' : 'var(--muted)' }}>
                    {expenseDiff > 0 ? '↑' : expenseDiff < 0 ? '↓' : '='} {Math.abs(expenseDiff).toFixed(1)}% so tháng trước
                  </div>
                )}
              </div>
            </div>
            <div className="monthly-list">
              {loading
                ? <div className="loading">đang tải...</div>
                : breakdownItems.length === 0
                  ? <div className="monthly-empty">Chưa có dữ liệu chi tiêu trong tháng này</div>
                  : breakdownItems.map((item, idx) => {
                      const pct = totalExpense > 0 ? (item.amount / totalExpense) * 100 : 0
                      return (
                        <div key={item.name} className="monthly-item">
                          <span className="dot" style={{ background: PALETTE[idx % PALETTE.length] }} />
                          <div className="name">{item.name}</div>
                          <div className="meta">
                            <span className="percent">{pct.toFixed(1)}%</span>
                            <span className="value">{fmt(item.amount)}</span>
                          </div>
                        </div>
                      )
                    })
              }
            </div>
          </div>

          {/* 50/30/20 Analysis */}
          <div className="card">
            <div className="card-title">Phân tích 50 / 30 / 20</div>
            {totalIncome === 0 || !hasGroupData
              ? <div className="monthly-empty">Cần có thu nhập + danh mục được gắn nhóm (needs/wants/savings) để phân tích</div>
              : (Object.entries(GROUP_CONFIG) as [Group, typeof GROUP_CONFIG[Group]][]).map(([g, cfg]) => {
                  const spent    = groupAmounts[g]
                  const ideal    = cfg.ideal * totalIncome
                  const pct      = totalIncome > 0 ? (spent / totalIncome) * 100 : 0
                  const idealPct = cfg.ideal * 100
                  const isOver   = spent > ideal
                  const fillPct  = Math.min((pct / idealPct) * 100, 110)
                  return (
                    <div key={g} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                        <span style={{ fontSize: '0.78rem', fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>
                          {cfg.label} <span style={{ color: 'var(--muted)' }}>({idealPct}%)</span>
                        </span>
                        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: isOver ? 'var(--expense)' : 'var(--muted)' }}>
                          {fmt(spent)} / {fmt(ideal)} {isOver ? '⚠ vượt!' : '✓'}
                        </span>
                      </div>
                      <div style={{ height: 7, borderRadius: 4, background: 'var(--surface2)', overflow: 'visible', position: 'relative' }}>
                        <div style={{ height: '100%', width: `${fillPct}%`, maxWidth: '100%', background: isOver ? 'var(--expense)' : cfg.color, borderRadius: 4, transition: 'width 0.5s ease' }} />
                      </div>
                      <div style={{ fontSize: '0.62rem', color: isOver ? 'var(--expense)' : 'var(--muted)', fontFamily: 'var(--font-mono)', marginTop: 3 }}>
                        {pct.toFixed(1)}% thu nhập {isOver ? `— vượt ${(pct - idealPct).toFixed(1)}%` : `— còn ${(idealPct - pct).toFixed(1)}%`}
                      </div>
                    </div>
                  )
                })
            }
          </div>

          {/* Month Comparison */}
          <div className="card">
            <div className="card-title">So sánh tháng trước</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {([
                { label: 'Thu nhập', cur: totalIncome, diff: incomeDiff, pos: true },
                { label: 'Chi tiêu', cur: totalExpenseAbs, diff: expenseDiff, pos: false },
              ] as const).map(item => {
                const arrow = item.diff === null ? '' : item.diff > 0 ? '↑' : item.diff < 0 ? '↓' : '='
                const good  = item.pos ? (item.diff ?? 0) >= 0 : (item.diff ?? 0) <= 0
                const color = item.diff === null ? 'var(--muted)' : good ? 'var(--income)' : 'var(--expense)'
                return (
                  <div key={item.label} style={{ background: 'var(--surface2)', borderRadius: 10, padding: '12px 14px' }}>
                    <div style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{item.label}</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>{fmt(item.cur)}</div>
                    <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color, marginTop: 4 }}>
                      {arrow} {item.diff !== null ? `${Math.abs(item.diff).toFixed(1)}% so tháng trước` : 'Chưa có dữ liệu tháng trước'}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Forecast */}
          {isCurrentMonth && (
            <div className="card">
              <div className="card-title">Dự báo cuối tháng</div>
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--muted)' }}>Tiến độ tháng</span>
                  <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: 'var(--text)' }}>Ngày {dayOfMonth}/{daysInMonth}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--surface2)' }}>
                  <div style={{ height: '100%', width: `${forecastRate * 100}%`, background: 'var(--accent2)', borderRadius: 3 }} />
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Dự báo chi tiêu</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: projectedExpense > totalIncome && totalIncome > 0 ? 'var(--expense)' : 'var(--text)' }}>
                    {totalExpenseAbs > 0 ? fmt(projectedExpense) : '—'}
                  </div>
                  {projectedExpense > totalIncome && totalIncome > 0 && (
                    <div style={{ fontSize: '0.65rem', color: 'var(--expense)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>⚠ Dự báo vượt thu nhập</div>
                  )}
                </div>
                <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '12px 14px' }}>
                  <div style={{ fontSize: '0.6rem', fontFamily: 'var(--font-mono)', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>Số dư dự kiến</div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: projectedBalance >= 0 ? 'var(--income)' : 'var(--expense)' }}>
                    {totalIncome > 0 ? fmt(projectedBalance) : '—'}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
                    ~{fmt(avgPerDay)} / ngày
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Daily Line Chart */}
          <div className="card chart-card">
            <div className="card-title">Biến động chi tiêu theo ngày</div>
            {lineValues.every(v => v === 0)
              ? (
                <div className="empty-state" style={{ height: 280, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <div style={{ fontSize: '2rem' }}>📊</div>
                  <div>Chưa có dữ liệu chi tiêu trong tháng này</div>
                </div>
              )
              : (
                <div className="chart-wrap">
                  <Line data={lineData} options={lineOptions as Parameters<typeof Line>[0]['options']} />
                </div>
              )
            }
          </div>

        </div>
      </div>

      {/* Toast */}
      <div className={`toast${toast.show ? ' show' : ''} ${toast.type}`}>{toast.msg}</div>

      {/* Auth Toast */}
      <div className={`auth-toast-card${showAuthToast ? ' show' : ''}`}>
        <div className="auth-toast-header">
          <span>🔒</span> Vui lòng đăng nhập để tiếp tục
        </div>
        <div className="auth-toast-actions">
          <button className="auth-btn login" onClick={() => window.location.href = '/login'}>Đăng nhập</button>
          <button className="auth-btn register" onClick={() => window.location.href = '/login?tab=register'}>Đăng ký</button>
        </div>
        <button className="auth-close" onClick={() => setShowAuthToast(false)}>&times;</button>
      </div>
    </>
  )
}
