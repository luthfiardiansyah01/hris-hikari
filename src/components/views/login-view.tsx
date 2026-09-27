"use client"

import { useState } from "react"
import { useAppStore } from "@/store/app-store"
import { saveSession, type HrisSession } from "@/lib/api-client"
import { GraduationCap, Eye, EyeOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function LoginView() {
  const { setSession } = useAppStore()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? "Login gagal.")
        return
      }
      const session = data as HrisSession
      saveSession(session)
      setSession(session)
    } catch {
      setError("Tidak dapat terhubung ke server.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <img src="/hikari-logo.png" alt="Hikari Bridge" className="h-16 w-auto object-contain" />
          <div className="text-center">
            <h1 className="text-xl font-bold tracking-tight">PT Hikari Bridge Indonesia</h1>
            <p className="text-sm text-muted-foreground">Sistem HRIS</p>
          </div>
        </div>

        <Card className="shadow-md">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg">Masuk</CardTitle>
            <CardDescription>Gunakan akun yang diberikan oleh administrator.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@bimbel.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "Memverifikasi…" : "Masuk"}
              </Button>
            </form>

            <div className="mt-5 rounded-lg border border-dashed bg-muted/50 p-3">
              <p className="mb-1.5 text-xs font-medium text-muted-foreground">Akun demo:</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Admin</span>
                  <span className="font-mono">admin@bimbel.id / admin123</span>
                </div>
                <div className="flex justify-between">
                  <span>Staf (Fixed)</span>
                  <span className="font-mono">rina@bimbel.id / demo123</span>
                </div>
                <div className="flex justify-between">
                  <span>Tutor (Flexible)</span>
                  <span className="font-mono">budi@bimbel.id / demo123</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} PT Hikari Bridge Indonesia · v1.0.0
        </p>
      </div>
    </div>
  )
}
