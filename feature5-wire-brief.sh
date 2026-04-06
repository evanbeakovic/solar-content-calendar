#!/bin/bash
# Solar App — Feature 5: Wire BriefTab into client modals
# Run from project root: /Users/evanbeakovic/Solar App/
# Checkpoint first:
# git add . && git commit -m "checkpoint before: wire brief tab"

# We use Node to do the patching safely
node << 'EOF'
const fs = require('fs')
const path = 'app/manager/users/UsersPageClient.tsx'
let src = fs.readFileSync(path, 'utf8')

// 1. Add BriefTab import after existing imports
if (!src.includes("import BriefTab")) {
  src = src.replace(
    `import CreateUserModal from '../components/CreateUserModal'`,
    `import CreateUserModal from '../components/CreateUserModal'\nimport BriefTab from '../components/BriefTab'`
  )
  console.log('✅ Added BriefTab import')
} else {
  console.log('ℹ BriefTab import already exists')
}

// 2. Add BriefModal component before EditClientModal
const briefModal = `
// ── Brief Modal ──────────────────────────────────────────────────
function BriefModal({
  client,
  onClose,
}: {
  client: Client
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-6">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Client Brief</span>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            ✕
          </button>
        </div>
        <BriefTab clientId={client.id} clientName={client.name} />
      </div>
    </div>
  )
}

`

if (!src.includes('function BriefModal')) {
  src = src.replace(
    'function EditClientModal(',
    briefModal + 'function EditClientModal('
  )
  console.log('✅ Added BriefModal component')
} else {
  console.log('ℹ BriefModal already exists')
}

// 3. Add briefOpen state to EditClientModal
if (!src.includes('briefOpen') ) {
  src = src.replace(
    `  const [error, setError] = useState('')

  async function handleLogoSelect`,
    `  const [error, setError] = useState('')
  const [briefOpen, setBriefOpen] = useState(false)

  async function handleLogoSelect`
  )
  console.log('✅ Added briefOpen state to EditClientModal')
} else {
  console.log('ℹ briefOpen state already exists')
}

// 4. Add Brief button and BriefModal inside EditClientModal return, just before the footer buttons
if (!src.includes('Set Up Brief')) {
  src = src.replace(
    `        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="flex-1 px-4 py-2.5 rounded-xl bg-[#10375C] text-white text-sm font-semibold hover:bg-[#0d2d4a] transition-colors disabled:opacity-50">
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>`,
    `        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}

        {/* Brief button */}
        <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => setBriefOpen(true)}
            className="w-full px-4 py-2.5 rounded-xl border border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-sm font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
          >
            📋 Set Up Client Brief
          </button>
        </div>

        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-600 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={loading} className="flex-1 px-4 py-2.5 rounded-xl bg-[#10375C] text-white text-sm font-semibold hover:bg-[#0d2d4a] transition-colors disabled:opacity-50">
            {loading ? 'Saving…' : 'Save'}
          </button>
        </div>
        {briefOpen && <BriefModal client={client} onClose={() => setBriefOpen(false)} />}`
  )
  console.log('✅ Added Brief button and BriefModal to EditClientModal')
} else {
  console.log('ℹ Brief button already exists in EditClientModal')
}

// 5. Add briefPrompt state and post-create brief prompt to CreateClientModal
if (!src.includes('briefPromptClient')) {
  // Add state after loading/error states in CreateClientModal
  src = src.replace(
    `  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  function handleLogoSelect`,
    `  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [briefPromptClient, setBriefPromptClient] = useState<Client | null>(null)

  function handleLogoSelect`
  )

  // After onCreated() call in handleCreate, capture the new client for brief prompt
  src = src.replace(
    `    const newClient = await res.json()

    // Upload logo if selected
    if (logoFile && newClient.id) {
      const formData = new FormData()
      formData.append('file', logoFile)
      await fetch(\`/api/clients/\${newClient.id}/logo\`, {
        method: 'POST',
        body: formData,
      })
    }

    setLoading(false)
    onCreated()`,
    `    const newClient = await res.json()

    // Upload logo if selected
    if (logoFile && newClient.id) {
      const formData = new FormData()
      formData.append('file', logoFile)
      await fetch(\`/api/clients/\${newClient.id}/logo\`, {
        method: 'POST',
        body: formData,
      })
    }

    setLoading(false)
    setBriefPromptClient(newClient)
    onCreated()`
  )

  console.log('✅ Added briefPromptClient state to CreateClientModal')
} else {
  console.log('ℹ briefPromptClient already exists')
}

// 6. Add brief prompt UI at end of CreateClientModal return, before closing </div></div>
if (!src.includes('briefPromptClient &&')) {
  src = src.replace(
    `        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">New Client</h2>`,
    `        <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4">New Client</h2>
        {briefPromptClient && (
          <BriefModal client={briefPromptClient} onClose={() => { setBriefPromptClient(null); onClose() }} />
        )}`
  )
  console.log('✅ Added brief prompt to CreateClientModal')
} else {
  console.log('ℹ Brief prompt already exists in CreateClientModal')
}

fs.writeFileSync(path, src)
console.log('\n✅ UsersPageClient.tsx updated successfully')
EOF

echo ""
echo "Next steps:"
echo "  1. npx tsc --noEmit --skipLibCheck 2>&1"
echo "  2. If clean: git add . && git commit -m 'feat: wire BriefTab into client modals'"
