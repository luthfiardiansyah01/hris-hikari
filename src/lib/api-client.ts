// Client-side helpers for acting-user session and API calls.
import { USER_ROLE } from "@/lib/constants"

const STORAGE_KEY = "acting-karyawan-id"

export function getActingKaryawanId(): string {
  if (typeof window === "undefined") return "admin"
  return localStorage.getItem(STORAGE_KEY) || "admin"
}

export function setActingKaryawanId(id: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, id)
    window.dispatchEvent(new Event("acting-user-change"))
  }
}

// Wraps fetch to attach the acting-user header.
export async function apiFetch<T = unknown>(
  input: string,
  init: RequestInit = {},
): Promise<T> {
  const id = getActingKaryawanId()
  const headers = new Headers(init.headers)
  headers.set("x-acting-karyawan-id", id)
  if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json")
  }
  const res = await fetch(input, { ...init, headers })
  if (!res.ok) {
    let msg = `Request gagal (${res.status})`
    try {
      const data = await res.json()
      msg = data.error || msg
    } catch {
      // ignore
    }
    throw new Error(msg)
  }
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export function getRoleLabel(role: string): string {
  if (role === USER_ROLE.ADMIN) return "Administrator"
  return "Karyawan"
}
