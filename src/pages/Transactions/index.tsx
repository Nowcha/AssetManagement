/**
 * Transactions page - nested routes for listing and recording transactions
 */
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import { TransactionList } from '@/components/transactions/TransactionList'
import { TransactionForm } from '@/components/transactions/TransactionForm'
import { useTransactions } from '@/hooks/useTransactions'
import { exportTransactionsToCSV } from '@/utils/csv'
import { useTransactionStore } from '@/store/transactionStore'

function TransactionListPage() {
  const navigate = useNavigate()
  const { transactions } = useTransactionStore()

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-white">取引履歴</h2>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => { exportTransactionsToCSV(transactions); }}
            className="btn-ghost"
            aria-label="取引履歴をCSVエクスポート"
          >
            CSVエクスポート
          </button>
          <button
            type="button"
            onClick={() => { navigate('new'); }}
            className="btn-accent"
            aria-label="新しい取引を記録"
          >
            取引を記録
          </button>
        </div>
      </div>
      <TransactionList />
    </div>
  )
}

function TransactionNewPage() {
  const navigate = useNavigate()
  const { addTransactionAndUpdateAsset } = useTransactions()

  const handleSubmit = async (data: Parameters<typeof addTransactionAndUpdateAsset>[0]) => {
    await addTransactionAndUpdateAsset(data)
    navigate('/transactions')
  }

  return (
    <div className="animate-fade-in">
      <h2 className="mb-6 text-xl font-semibold text-white">取引を記録</h2>
      <div className="glass-card p-6">
        <TransactionForm
          onSubmit={handleSubmit}
          onCancel={() => { navigate('/transactions'); }}
        />
      </div>
    </div>
  )
}

export function Transactions() {
  const location = useLocation()

  // Avoid unused import warning for location — used to detect current path
  void location

  return (
    <Routes>
      <Route index element={<TransactionListPage />} />
      <Route path="new" element={<TransactionNewPage />} />
    </Routes>
  )
}
