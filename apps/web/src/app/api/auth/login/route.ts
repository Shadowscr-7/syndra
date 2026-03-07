import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@automatismos/db';
import { createHash } from 'crypto';

// Simple password hashing using SHA-256 + salt
function hashPassword(password: string): string {
  return createHash('sha256').update(`automatismos_salt_${password}`).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.length < 4) {
      return NextResponse.json({ error: 'Contraseña requerida (mínimo 4 caracteres)' }, { status: 400 });
    }

    const passwordHash = hashPassword(password);

    // ── Find or create User ──────────────────────────────
    let user = await prisma.user.findUnique({
      where: { email },
      include: {
        workspaces: {
          include: { workspace: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (user) {
      // Migrated user with no password — set it on first login
      if (!user.passwordHash || user.passwordHash === '') {
        await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash, lastLoginAt: new Date() },
        });
      } else {
        // User exists — verify password
        if (user.passwordHash !== passwordHash) {
          return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 });
        }

        // Update last login
        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
      }
    } else {
      // New user — create User + default Workspace
      user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          name: email.split('@')[0],
          lastLoginAt: new Date(),
          workspaces: {
            create: {
              role: 'OWNER',
              isDefault: true,
              workspace: {
                create: {
                  name: `Workspace de ${email.split('@')[0]}`,
                  slug: `ws-${Date.now()}`,
                },
              },
            },
          },
        },
        include: {
          workspaces: {
            include: { workspace: true },
            orderBy: { createdAt: 'asc' },
          },
        },
      });
    }

    // ── Resolve active workspace ─────────────────────────
    const defaultWs = user.workspaces.find((wu) => wu.isDefault) ?? user.workspaces[0];

    if (!defaultWs) {
      return NextResponse.json({ error: 'No tienes ningún workspace' }, { status: 400 });
    }

    // ── Set cookies via response headers (most reliable) ─
    const response = NextResponse.json({
      ok: true,
      user: { id: user.id, email: user.email, name: user.name },
      workspaceId: defaultWs.workspaceId,
      workspaceName: defaultWs.workspace.name,
    });

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 60 * 60 * 24 * 30, // 30 days
      path: '/',
    };

    response.cookies.set('auth-user-id', user.id, cookieOptions);
    response.cookies.set('auth-email', user.email, cookieOptions);
    response.cookies.set('workspace-id', defaultWs.workspaceId, cookieOptions);

    return response;
  } catch (error: any) {
    console.error('[Login]', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 },
    );
  }
}
