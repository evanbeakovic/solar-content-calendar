'use client'

interface ApiKeyRequiredModalProps {
  onClose: () => void
}

export default function ApiKeyRequiredModal({ onClose }: ApiKeyRequiredModalProps) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 dark:border-gray-700">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">API Key Required</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Set up your Anthropic key to use AI features</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-5">
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            This feature requires an Anthropic API key. Each agency uses their own key — you are only charged
            for what you use, and costs are very low (typically under $1/month for most agencies).
          </p>

          {/* Steps */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">How to set it up</p>
            <ol className="space-y-2.5">
              {[
                <>
                  Go to{' '}
                  <a
                    href="https://console.anthropic.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
                  >
                    console.anthropic.com
                  </a>{' '}
                  and sign up or log in
                </>,
                'Click "API Keys" in the left sidebar',
                'Create a new key and copy it',
                <>
                  Come back here and paste it in{' '}
                  <span className="font-semibold text-gray-800 dark:text-gray-200">Settings → API Keys</span>
                  {' '}in the left sidebar
                </>,
              ].map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 text-xs font-bold flex items-center justify-center mt-0.5">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            Cancel
          </button>
          <a
            href="https://console.anthropic.com"
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 bg-[#10375C] hover:bg-[#0d2d4a] text-white text-sm font-semibold rounded-lg transition-colors inline-flex items-center gap-2"
          >
            Open Anthropic Console
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/>
              <polyline points="15 3 21 3 21 9"/>
              <line x1="10" y1="14" x2="21" y2="3"/>
            </svg>
          </a>
        </div>
      </div>
    </div>
  )
}
