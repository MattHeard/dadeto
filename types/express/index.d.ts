declare module 'express' {
  export interface Request {
    headers?: Record<string, string | string[] | undefined>;
    body?: unknown;
    params?: Record<string, string>;
    query?: Record<string, string | string[]>;
    get?(name: string): string | undefined;
  }

  export interface Response {
    status(status: number): Response;
    json(body?: unknown): Response;
    send(body?: unknown): Response;
    sendStatus(status: number): Response;
  }

  export interface Express {
    use(...args: unknown[]): unknown;
    get(path: string, handler: (req: Request, res: Response) => unknown): void;
    post(path: string, handler: (req: Request, res: Response) => unknown): void;
  }

  export interface ExpressModule {
    json(options?: Record<string, unknown>): unknown;
    urlencoded(options?: { extended: boolean; limit?: string }): unknown;
    Express: Express;
  }

  function express(): Express;
  namespace express {
    export { Express, ExpressModule };
  }

  export default express;
}
