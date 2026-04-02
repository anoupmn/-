interface ContextLike {
  getWXContext?: () => {
    OPENID?: string;
  };
}

export interface LoginSession {
  openid: string;
  displayName: string;
  role: 'landlord';
  lastLoginAt: string;
}

export interface LoginEvent {
  displayName?: string;
  __mockContext?: ContextLike;
}

function resolveOpenId(event: LoginEvent): string {
  const openid = event.__mockContext?.getWXContext?.().OPENID;

  if (!openid) {
    throw new Error('Missing OPENID from cloud context.');
  }

  return openid;
}

export async function main(event: LoginEvent): Promise<{ session: LoginSession }> {
  const openid = resolveOpenId(event);
  const displayName = event.displayName?.trim() || '房东';
  const now = new Date().toISOString();
  const session: LoginSession = {
    openid,
    displayName,
    role: 'landlord',
    lastLoginAt: now
  };

  return {
    session
  };
}
