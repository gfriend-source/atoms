'use client'

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const result = await signIn('credentials', {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError('邮箱或密码错误')
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      setError('登录失败，请重试')
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
          <CardTitle className="text-2xl font-bold text-white">欢迎回来</CardTitle>
          <CardDescription className="text-slate-400">登录到 Atoms 开始创作</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center">
                {error}
              </div>
            )}
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
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:border-indigo-500 focus-visible:ring-indigo-500/20"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-10 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white font-medium border-0 shadow-lg shadow-indigo-500/25"
            >
              {loading ? '登录中...' : '登录'}
            </Button>
          </form>
          <div className="mt-6 text-center">
            <span className="text-slate-400 text-sm">没有账号？</span>
            <Link
              href="/auth/register"
              className="text-sm text-indigo-400 hover:text-indigo-300 ml-1 font-medium"
            >
              注册
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
