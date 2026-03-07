import { cookies } from 'next/headers';
import { prisma } from '@automatismos/db';

export async function getSession() {
  const cookieStore = await cookies();
  const userId = cookieStore.get('auth-user-id')?.value;
  const email = cookieStore.get('auth-email')?.value;
  let workspaceId = cookieStore.get('workspace-id')?.value;

  // Need at least userId or email
  if (!userId && !email) return null;

  // If workspace cookie is missing, resolve from DB
  if (!workspaceId) {
    try {
      if (userId) {
        const wu = await prisma.workspaceUser.findFirst({
          where: { userId },
          orderBy: { isDefault: 'desc' },
          select: { workspaceId: true },
        });
        if (wu) workspaceId = wu.workspaceId;
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
        if (user?.workspaces[0]) workspaceId = user.workspaces[0].workspaceId;
      }
    } catch {
      // DB not available
    }
  }

  if (!workspaceId) return null;

  return { userId: userId ?? '', email: email ?? '', workspaceId };
}
