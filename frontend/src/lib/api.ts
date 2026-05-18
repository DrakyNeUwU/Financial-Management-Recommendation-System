// Tất cả call đến FastAPI backend đều đi qua đây
// JWT được lấy từ Supabase session và gắn vào header Authorization

import { supabase } from './supabase'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

async function getAuthHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('Chưa đăng nhập')
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }
}

// --- Types ---
export type TxType = 'income' | 'expense'
export type Group503020 = 'needs' | 'wants' | 'savings'

export interface Transaction {
  id: string
  type: TxType
  amount: number
  category_id: string | null
  note: string | null
  date: string
  user_id: string
}

export interface Category {
  id: string
  name: string
  type: TxType
  group_50_30_20: Group503020 | null
}

export interface DailySummary {
  date: string
  total_expense: number
}

// --- Transactions ---
export async function getTransactions(month: string): Promise<Transaction[]> {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/transactions?month=${month}`, { headers })
  if (!res.ok) throw new Error(await res.text())
  const json = await res.json()
  return json.data
}

export async function createTransaction(payload: {
  type: TxType
  amount: number
  category_id: string
  note?: string
  transaction_date: string
}): Promise<Transaction> {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/transactions`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error(await res.text())
  const json = await res.json()
  return json.data[0]
}

export async function deleteTransaction(id: string): Promise<void> {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/transactions/${id}`, {
    method: 'DELETE',
    headers,
  })
  if (!res.ok) throw new Error(await res.text())
}

export async function getDailySummary(month: string): Promise<DailySummary[]> {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/transactions/daily-summary?month=${month}`, { headers })
  if (!res.ok) throw new Error(await res.text())
  const json = await res.json()
  return json.data
}

// --- Categories ---
export async function getCategories(): Promise<Category[]> {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/categories`, { headers })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

export async function updateCategoryGroup(
  id: string,
  group: Group503020 | null
): Promise<Category> {
  const headers = await getAuthHeader()
  const res = await fetch(`${API_URL}/categories/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ group_50_30_20: group }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}
