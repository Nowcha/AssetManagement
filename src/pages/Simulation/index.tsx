export function Simulation() {
  return (
    <div className="animate-fade-in">
      <h2 className="mb-6 text-xl font-semibold text-white">シミュレーション</h2>
      <div className="glass-card p-8 text-center">
        <p style={{ color: '#868F97' }}>Sprint 5 で実装予定</p>
      </div>
      <div
        className="mt-4 rounded-lg p-4 text-sm"
        style={{
          background: 'rgba(251,191,36,0.08)',
          border: '1px solid rgba(251,191,36,0.2)',
          color: '#fbbf24',
        }}
      >
        本シミュレーション結果は情報提供を目的としたものであり、投資勧誘・助言・推奨を行うものではありません。
        投資判断は自己責任でお願いします。
      </div>
    </div>
  )
}
