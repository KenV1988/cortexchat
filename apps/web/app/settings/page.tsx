import { buildIsAvailable } from '@cortexchat/providers';
import { getModels, getProviders } from '../../lib/server/providers';
import { MemoryPanel } from '../../components/MemoryPanel';

export default async function SettingsPage() {
  const providers = getProviders();
  const isAvailable = buildIsAvailable(providers);
  const models = getModels();

  return (
    <div className="mx-auto w-full max-w-3xl overflow-y-auto p-6">
      <h1 className="text-xl font-semibold">Settings</h1>

      <section className="mt-6">
        <h2 className="text-sm font-medium text-[var(--text-muted)]">Providers</h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          API keys are configured via environment variables (.env) on the server, never through this UI or the
          database — restart the app after changing them.
        </p>
        <table className="mt-2 w-full text-sm">
          <tbody>
            {[...providers.values()].map((p) => (
              <tr key={p.id} className="border-t border-[var(--border)]">
                <td className="py-1.5">{p.id}</td>
                <td className="py-1.5 text-right">
                  <span className={p.isConfigured() ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}>
                    {p.isConfigured() ? 'configured' : 'not configured'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-6">
        <h2 className="text-sm font-medium text-[var(--text-muted)]">Model registry</h2>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Edit <code>config/models.yaml</code> to add, remove, or re-tier models — no code changes required.
        </p>
        <table className="mt-2 w-full text-xs">
          <thead>
            <tr className="text-left text-[var(--text-muted)]">
              <th className="py-1 font-normal">Model</th>
              <th className="py-1 font-normal">Tier</th>
              <th className="py-1 font-normal">Capabilities</th>
              <th className="py-1 text-right font-normal">Status</th>
            </tr>
          </thead>
          <tbody>
            {models.map((m) => (
              <tr key={m.id} className="border-t border-[var(--border)]">
                <td className="py-1.5">{m.id}</td>
                <td className="py-1.5">{m.tier}</td>
                <td className="py-1.5">{m.capabilities.join(', ')}</td>
                <td className="py-1.5 text-right">
                  <span className={isAvailable(m) ? 'text-[var(--accent)]' : 'text-[var(--text-muted)]'}>
                    {isAvailable(m) ? 'available' : 'unavailable'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="mt-6 mb-10">
        <h2 className="text-sm font-medium text-[var(--text-muted)]">Memory</h2>
        <p className="mt-1 mb-2 text-xs text-[var(--text-muted)]">
          Inspect, edit, forget, or export everything cortexchat has remembered.
        </p>
        <MemoryPanel />
      </section>
    </div>
  );
}
