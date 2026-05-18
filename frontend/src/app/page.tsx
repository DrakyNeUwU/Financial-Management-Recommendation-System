'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthPage() {
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
      justifyContent: 'center',
      padding: '16px',
      background: 'radial-gradient(ellipse at 50% 0%, rgba(91,141,238,0.12) 0%, transparent 60%), #0e0f11',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background blobs */}
      <div style={{ position: 'fixed', top: 80, left: '25%', width: 384, height: 384, borderRadius: '50%', opacity: 0.08, filter: 'blur(60px)', background: '#5b8dee', pointerEvents: 'none' }} />
      <div style={{ position: 'fixed', bottom: 80, right: '25%', width: 320, height: 320, borderRadius: '50%', opacity: 0.08, filter: 'blur(60px)', background: '#c8f135', pointerEvents: 'none' }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 64, height: 64, borderRadius: 16, marginBottom: 16,
            background: 'linear-gradient(135deg, #c8f135, #5b8dee)',
          }}>
            <span style={{ fontSize: 28 }}>💰</span>
          </div>
          <h1 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: 8 }} className="gradient-text">
            Finance App
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--muted)' }}>
            Quản lý tài chính thông minh với quy tắc 50/30/20
          </p>
        </div>

        <div className="glass-card">
          {/* Tabs */}
          <div style={{
            display: 'flex', borderRadius: 12, overflow: 'hidden',
            marginBottom: 24, padding: 4,
            background: 'rgba(255,255,255,0.04)',
          }}>
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => { setMode(m); setError(''); setSuccess('') }}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
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
              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--muted)', marginBottom: 6, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Email
              </label>
              <input type="email" className="input-field" placeholder="you@example.com"
                value={email} onChange={e => setEmail(e.target.value)} required />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: '0.7rem', color: 'var(--muted)', marginBottom: 6, fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                Mật khẩu
              </label>
              <input type="password" className="input-field" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required />
            </div>

            {error && (
              <div style={{ borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: '0.82rem', background: 'rgba(255,94,94,0.08)', color: 'var(--expense)', border: '1px solid rgba(255,94,94,0.2)' }}>
                ⚠️ {error}
              </div>
            )}
            {success && (
              <div style={{ borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: '0.82rem', background: 'rgba(200,241,53,0.08)', color: 'var(--income)', border: '1px solid rgba(200,241,53,0.2)' }}>
                ✅ {success}
              </div>
            )}

            <button type="submit" className="btn-primary" disabled={loading}
              style={{ width: '100%', padding: '11px' }}>
              {loading ? '⏳ Đang xử lý...' : mode === 'login' ? '🚀 Đăng nhập' : '✨ Đăng ký'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
