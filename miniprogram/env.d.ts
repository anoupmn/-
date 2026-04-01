/// <reference types="miniprogram-api-typings" />

type Nullable<T> = T | null;

interface SessionUser {
  openid: string;
  displayName: string;
  role: 'landlord';
  lastLoginAt: string;
}

interface IAppOption {
  globalData: {
    session: Nullable<SessionUser>;
  };
  onLaunch?: () => void;
}

declare const getApp: <T = IAppOption>() => T;
