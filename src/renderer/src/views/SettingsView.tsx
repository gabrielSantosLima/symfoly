import { SettingsForm } from '../components/SettingsForm'
import { ViewHeader } from '../components/ViewHeader'
import { cardClass } from '../lib/ui'

export function SettingsView() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <ViewHeader title="Settings" subtitle="Preferences for this installation." />
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className={`${cardClass} max-w-lg p-5`}>
          <SettingsForm />
        </div>
      </div>
    </div>
  )
}
