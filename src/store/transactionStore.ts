import { create } from 'zustand'
import type { Transaction } from '@/types/transaction.types'

interface TransactionState {
  transactions: Transaction[]
  isLoading: boolean
  error: string | null
  setTransactions: (txs: Transaction[]) => void
  addTransaction: (tx: Transaction) => void
  updateTransaction: (id: string, patch: Partial<Transaction>) => void
  removeTransaction: (id: string) => void
  setLoading: (v: boolean) => void
  setError: (e: string | null) => void
}

export const useTransactionStore = create<TransactionState>()((set) => ({
  transactions: [],
  isLoading: false,
  error: null,

  setTransactions: (transactions) => { set({ transactions }); },

  addTransaction: (tx) =>
    { set((state) => ({ transactions: [...state.transactions, tx] })); },

  updateTransaction: (id, patch) =>
    { set((state) => ({
      transactions: state.transactions.map((t) =>
        t.id === id ? { ...t, ...patch } : t,
      ),
    })); },

  removeTransaction: (id) =>
    { set((state) => ({
      transactions: state.transactions.filter((t) => t.id !== id),
    })); },

  setLoading: (isLoading) => { set({ isLoading }); },

  setError: (error) => { set({ error }); },
}))
