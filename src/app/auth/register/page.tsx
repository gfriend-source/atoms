'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('两次输入的密码不一致')
      return
    }

    if (password.length < 6) {
      setError('密码长度至少为 6 位')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '注册失败')
        return
      }

      // Auto login after registration
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('注册成功，但自动登录失败，请手动登录')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      setError('注册失败，请重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-purple-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent" />
      <Card className="relative w-full max-w-md mx-4 border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl">
        <CardHeader className="text-center space-y-2">
          <div className="mx-auto mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <span className="text-white font-bold text-xl">A</span>
            </div>
          </div>
          <CardTitle className="text-2xl font-bold text-white">创建账号</CardTitle>
          <CardDescription className="text-slate-400">注册 Atoms 开启 AI 创作之旅</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                {error}
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">用户名</label>
              <Input
                type="text"
                placeholder="你的名字"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">邮箱</label>
              <Input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">密码</label>
              <Input
                type="password"
                placeholder="至少 6 位"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">确认密码</label>
              <Input
                type="password"
                placeholder="再次输入密码"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-medium border-0 shadow-lg shadow-indigo-500/25"
            >
              {loading ? '注册中...' : '注册'}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <span className="text-slate-400 text-sm">已有账号？</span>
            <Link
              href="/auth/login"
              className="text-sm text-indigo-400 hover:text-indigo-300 ml-1 font-medium"
            >
              登录
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
