'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function LandingAndAuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setSuccess('')
    setLoading(true)
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
        window.location.href = '/dashboard'
      } else {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setSuccess('Đăng ký thành công! Kiểm tra email hoặc đăng nhập ngay.')
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Đã có lỗi xảy ra')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(91,141,238,0.15) 0%, transparent 70%), #0e0f11',
      position: 'relative',
      overflowX: 'hidden',
    }}>
      {/* Background Ambient Blobs */}
      <div style={{ position: 'fixed', top: '-10%', left: '-5%', width: '50vw', height: '50vw', borderRadius: '50%', opacity: 0.1, filter: 'blur(100px)', background: '#c8f135', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: '-10%', right: '-5%', width: '40vw', height: '40vw', borderRadius: '50%', opacity: 0.1, filter: 'blur(100px)', background: '#5b8dee', pointerEvents: 'none' }} />

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
        width: '100%',
        maxWidth: 1200,
        margin: '0 auto',
        padding: '40px 24px',
        alignItems: 'center',
        gap: '64px',
        zIndex: 1,
      }}>
        
        {/* Left Side: Hero & Features */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
          <div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 56, height: 56, borderRadius: 16, marginBottom: 24,
              background: 'linear-gradient(135deg, #c8f135, #5b8dee)',
              boxShadow: '0 8px 32px rgba(200, 241, 53, 0.2)'
            }}>
              <span style={{ fontSize: 28 }}>💰</span>
            </div>
            
            <h1 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.03em', color: '#ffffff' }}>
              Quản lý tài chính <br />
              <span className="gradient-text">thông minh</span> <br />
              với quy tắc 50/30/20
            </h1>
            
            <p style={{ fontSize: '1.2rem', color: 'var(--muted)', lineHeight: 1.6, marginTop: 20, maxWidth: 500 }}>
              Biết ngay mình đang tiêu tiền vào đâu — và nên thay đổi gì để tối ưu dòng tiền, hướng tới tự do tài chính.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {[
              { icon: '⚡', title: 'Ghi thu/chi siêu tốc', desc: 'Thao tác cực nhanh, không rườm rà' },
              { icon: '📊', title: 'Dashboard trực quan', desc: 'Nhìn thấu dòng tiền qua từng biểu đồ' },
              { icon: '💡', title: 'Gợi ý chuẩn 50/30/20', desc: 'Tự động phân tích và cảnh báo chi tiêu' }
            ].map((feature, i) => (
              <div key={i} style={{ 
                display: 'flex', alignItems: 'center', gap: '20px', 
                background: 'rgba(255,255,255,0.02)', padding: '16px 20px', 
                borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)',
                transition: 'transform 0.2s', cursor: 'default'
              }}>
                <div style={{ fontSize: '1.5rem', background: 'rgba(255,255,255,0.05)', width: 48, height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '12px' }}>
                  {feature.icon}
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', color: '#fff', fontWeight: 600, marginBottom: 4 }}>{feature.title}</h3>
                  <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>{feature.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Auth Card */}
        <div style={{ display: 'flex', justifyContent: 'center', position: 'relative' }}>
          {/* Card glow effect */}
          <div style={{ position: 'absolute', inset: -20, background: 'linear-gradient(135deg, rgba(200,241,53,0.1), rgba(91,141,238,0.1))', filter: 'blur(30px)', borderRadius: '50%', zIndex: -1 }} />
          
          <div className="glass-card" style={{ width: '100%', maxWidth: 420 }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff', marginBottom: 8 }}>Bắt đầu ngay</h2>
              <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>Dùng thử miễn phí trọn đời</p>
            </div>

            {/* Tabs */}
            <div style={{
              display: 'flex', borderRadius: 12, overflow: 'hidden',
              marginBottom: 24, padding: 4,
              background: 'rgba(255,255,255,0.04)',
            }}>
              {(['login', 'register'] as const).map(m => (
                <button key={m} onClick={() => { setMode(m); setError(''); setSuccess('') }}
                  style={{
                    flex: 1, padding: '10px 0', borderRadius: 8, border: 'none',
                    fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: mode === m ? 'linear-gradient(135deg, #c8f135, #5b8dee)' : 'transparent',
                    color: mode === m ? '#0e0f11' : 'var(--muted)',
                    fontFamily: 'var(--font-sans)',
                  }}>
                  {m === 'login' ? 'Đăng nhập' : 'Đăng ký'}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 8, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Email của bạn
                </label>
                <input type="email" className="input-field" placeholder="example@gmail.com"
                  value={email} onChange={e => setEmail(e.target.value)} required />
              </div>

              <div style={{ marginBottom: 24 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--muted)', marginBottom: 8, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Mật khẩu bảo mật
                </label>
                <input type="password" className="input-field" placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)} required />
              </div>

              {error && (
                <div style={{ borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: '0.85rem', background: 'rgba(255,94,94,0.08)', color: 'var(--expense)', border: '1px solid rgba(255,94,94,0.2)' }}>
                  ⚠️ {error}
                </div>
              )}
              {success && (
                <div style={{ borderRadius: 10, padding: '12px 16px', marginBottom: 20, fontSize: '0.85rem', background: 'rgba(200,241,53,0.08)', color: 'var(--income)', border: '1px solid rgba(200,241,53,0.2)' }}>
                  ✅ {success}
                </div>
              )}

              <button type="submit" className="btn-primary" disabled={loading}
                style={{ width: '100%', padding: '14px', fontSize: '1rem' }}>
                {loading ? '⏳ Đang xử lý...' : mode === 'login' ? '🚀 Đăng nhập vào Dashboard' : '✨ Tạo tài khoản miễn phí'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
