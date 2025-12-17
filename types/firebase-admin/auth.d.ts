declare module 'firebase-admin/auth' {
  export interface UserRecord {
    uid: string;
    email?: string;
    [key: string]: unknown;
  }

  export interface DecodedIdToken {
    uid: string;
    email?: string;
    [key: string]: unknown;
  }

  export interface Auth {
    verifyIdToken(token: string): Promise<DecodedIdToken>;
    getUser(uid: string): Promise<UserRecord>;
  }

  export interface AuthBuilder {
    auth(): Auth;
  }
}
