declare module 'firebase-admin/app' {
  export interface App {
    name: string;
  }

  export function initializeApp(options?: unknown): App;
}
