/**
 * Transactions page - nested routes for listing and recording transactions
 */
import { Routes, Route, useNavigate, useLocation, useParams, Link } from 'react-router-dom'
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

function TransactionEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { transactions } = useTransactionStore()
  const { updateTransactionAndRecalculateAsset } = useTransactions()

  const tx = transactions.find((t) => t.id === id)

  if (!tx) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p style={{ color: '#868F97' }}>取引が見つかりません</p>
        <Link
          to="/transactions"
          className="mt-4 text-sm hover:underline"
          style={{ color: '#FFA16C' }}
        >
          取引一覧に戻る
        </Link>
      </div>
    )
  }

  const handleSubmit = async (data: Parameters<typeof updateTransactionAndRecalculateAsset>[1]) => {
    await updateTransactionAndRecalculateAsset(tx.id, data)
    navigate('/transactions')
  }

  return (
    <div className="animate-fade-in">
      <div className="mb-6 flex items-center gap-3">
        <Link
          to="/transactions"
          className="text-sm transition-colors hover:text-white"
          style={{ color: '#868F97' }}
          aria-label="取引一覧に戻る"
        >
          ← 一覧に戻る
        </Link>
        <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
        <h2 className="text-xl font-semibold text-white">取引を編集</h2>
      </div>
      <div className="glass-card p-6">
        <TransactionForm
          defaultValues={{
            assetId: tx.assetId,
            type: tx.type,
            date: tx.date,
            quantity: tx.quantity,
            price: tx.price,
            amount: tx.amount,
            fee: tx.fee,
            exchangeRate: tx.exchangeRate,
            note: tx.note ?? '',
          }}
          isEditing
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
      <Route path=":id/edit" element={<TransactionEditPage />} />
    </Routes>
  )
}
