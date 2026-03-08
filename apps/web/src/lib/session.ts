import { cookies } from 'next/headers';
import { prisma } from '@automatismos/db';

export async function getSession() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('auth-user-id')?.value;
  const email = cookieStore.get('auth-email')?.value;
  let workspaceId = cookieStore.get('workspace-id')?.value;

  // Need at least userId or email
  if (!userId && !email) return null;

  let role: string = 'USER';

  // If workspace cookie is missing, resolve from DB
  if (!workspaceId) {
    try {
      if (userId) {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true, workspaces: { orderBy: { isDefault: 'desc' }, take: 1, select: { workspaceId: true } } },
        });
        if (user) {
          role = user.role;
          if (user.workspaces[0]) workspaceId = user.workspaces[0].workspaceId;
        }
      } else if (email) {
        const user = await prisma.user.findUnique({
          where: { email },
          include: {
            workspaces: {
              orderBy: { isDefault: 'desc' },
              take: 1,
              select: { workspaceId: true },
            },
          },
        });
        if (user) {
          role = user.role;
          if (user.workspaces[0]) workspaceId = user.workspaces[0].workspaceId;
        }
      }
    } catch {
      // DB not available
    }
  } else {
    // Resolve role even when workspace is available
    try {
      if (userId) {
        const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
        if (user) role = user.role;
      } else if (email) {
        const user = await prisma.user.findUnique({ where: { email }, select: { role: true } });
        if (user) role = user.role;
      }
    } catch {
      // DB not available
    }
  }

  if (!workspaceId) return null;

  return { userId: userId ?? '', email: email ?? '', workspaceId, role };
}
