import { prisma } from '@automatismos/db';

export const dynamic = 'force-dynamic';

export default async function TeamPage() {
  // Get first workspace
  const workspace = await prisma.workspace.findFirst();
  const workspaceId = workspace?.id;

  const members = workspaceId
    ? await prisma.workspaceUser.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'asc' },
      })
    : [];

  const invitations = workspaceId
    ? await prisma.invitation.findMany({
        where: { workspaceId },
        orderBy: { createdAt: 'desc' },
      })
    : [];

  const pendingInvitations = invitations.filter((i) => i.status === 'PENDING');
  const pastInvitations = invitations.filter((i) => i.status !== 'PENDING');

  return (
    <div className="space-y-8">
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ color: 'var(--color-text)' }}
        >
          Equipo
        </h1>
        <p
          className="mt-1"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Gestiona los miembros y las invitaciones de tu workspace
        </p>
      </div>

      {/* Members */}
      <div>
        <h2
          className="text-lg font-semibold mb-4"
          style={{ color: 'var(--color-text)' }}
        >
          Miembros ({members.length})
        </h2>
        <div
          className="rounded-xl border overflow-hidden"
          style={{
            backgroundColor: 'var(--color-bg-secondary)',
            borderColor: 'var(--color-border)',
          }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr
                style={{
                  backgroundColor: 'var(--color-bg-tertiary)',
                  color: 'var(--color-text-secondary)',
                }}
              >
                <th className="text-left px-4 py-3 font-medium">
                  User ID
                </th>
                <th className="text-left px-4 py-3 font-medium">Rol</th>
                <th className="text-left px-4 py-3 font-medium">
                  Desde
                </th>
                <th className="text-right px-4 py-3 font-medium">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr
                  key={member.id}
                  className="border-t"
                  style={{ borderColor: 'var(--color-border)' }}
                >
                  <td
                    className="px-4 py-3 font-mono text-xs"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {member.userId.substring(0, 12)}...
                  </td>
                  <td className="px-4 py-3">
                    <RoleBadge role={member.role} />
                  </td>
                  <td
                    className="px-4 py-3"
                    style={{ color: 'var(--color-text-secondary)' }}
                  >
                    {member.createdAt.toLocaleDateString('es-ES')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {member.role !== 'OWNER' && (
                      <button
                        className="text-xs px-2 py-1 rounded"
                        style={{ color: 'var(--color-danger)' }}
                      >
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {members.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-8 text-center"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    No hay miembros aún
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite form */}
      <div>
        <h2
          className="text-lg font-semibold mb-4"
          style={{ color: 'var(--color-text)' }}
        >
          Invitar miembro
        </h2>
        <InviteForm />
      </div>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <div>
          <h2
            className="text-lg font-semibold mb-4"
            style={{ color: 'var(--color-text)' }}
          >
            Invitaciones pendientes ({pendingInvitations.length})
          </h2>
          <div className="space-y-2">
            {pendingInvitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-4 rounded-lg border"
                style={{
                  backgroundColor: 'var(--color-bg-secondary)',
                  borderColor: 'var(--color-border)',
                }}
              >
                <div>
                  <p
                    className="font-medium"
                    style={{ color: 'var(--color-text)' }}
                  >
                    {inv.email}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: 'var(--color-text-muted)' }}
                  >
                    Rol: {inv.role} · Expira:{' '}
                    {inv.expiresAt.toLocaleDateString('es-ES')}
                  </p>
                </div>
                <button
                  className="text-xs px-3 py-1 rounded border"
                  style={{
                    color: 'var(--color-danger)',
                    borderColor: 'var(--color-danger)',
                  }}
                >
                  Revocar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Past Invitations */}
      {pastInvitations.length > 0 && (
        <div>
          <h2
            className="text-lg font-semibold mb-4"
            style={{ color: 'var(--color-text-secondary)' }}
          >
            Historial de invitaciones
          </h2>
          <div className="space-y-2">
            {pastInvitations.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between p-3 rounded-lg"
                style={{ backgroundColor: 'var(--color-bg-tertiary)' }}
              >
                <span
                  className="text-sm"
                  style={{ color: 'var(--color-text-secondary)' }}
                >
                  {inv.email}
                </span>
                <StatusBadge status={inv.status} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const colors: Record<string, string> = {
    OWNER: 'var(--color-primary)',
    EDITOR: 'var(--color-info)',
    VIEWER: 'var(--color-text-muted)',
  };
  return (
    <span
      className="text-xs px-2 py-0.5 rounded-full font-medium"
      style={{
        backgroundColor: `${colors[role] || 'var(--color-text-muted)'}20`,
        color: colors[role] || 'var(--color-text-muted)',
      }}
    >
      {role}
    </span>
  );
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, { text: string; color: string }> = {
    ACCEPTED: { text: 'Aceptada', color: 'var(--color-success)' },
    REVOKED: { text: 'Revocada', color: 'var(--color-danger)' },
    EXPIRED: { text: 'Expirada', color: 'var(--color-text-muted)' },
  };
  const info = labels[status] || { text: status, color: 'var(--color-text-muted)' };
  return (
    <span className="text-xs font-medium" style={{ color: info.color }}>
      {info.text}
    </span>
  );
}

function InviteForm() {
  return (
    <form
      className="flex gap-3 items-end"
    >
      <div className="flex-1">
        <label
          className="block text-xs mb-1"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Email
        </label>
        <input
          type="email"
          name="email"
          placeholder="colega@empresa.com"
          className="w-full px-3 py-2 rounded-lg border text-sm"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text)',
          }}
          required
        />
      </div>
      <div>
        <label
          className="block text-xs mb-1"
          style={{ color: 'var(--color-text-secondary)' }}
        >
          Rol
        </label>
        <select
          name="role"
          className="px-3 py-2 rounded-lg border text-sm"
          style={{
            backgroundColor: 'var(--color-bg-tertiary)',
            borderColor: 'var(--color-border)',
            color: 'var(--color-text)',
          }}
        >
          <option value="EDITOR">Editor</option>
          <option value="VIEWER">Viewer</option>
        </select>
      </div>
      <button
        type="submit"
        className="px-4 py-2 rounded-lg text-sm font-medium text-white"
        style={{ backgroundColor: 'var(--color-primary)' }}
      >
        Invitar
      </button>
    </form>
  );
}
