export type HttpRequestHeaders = Record<string, string | string[] | undefined>;

export interface NativeHttpRequest {
  method?: string;
  body?: unknown;
  headers?: HttpRequestHeaders;
  get?(name: string): string | undefined;
}

export interface NativeHttpResponse {
  status(status: number): NativeHttpResponse;
  json(body?: unknown): NativeHttpResponse;
  send(body?: unknown): NativeHttpResponse;
  sendStatus(status: number): NativeHttpResponse;
}

export interface NativeExpressApp {
  use(...args: unknown[]): unknown;
  get(
    path: string,
    handler: (req: NativeHttpRequest, res: NativeHttpResponse) => unknown,
  ): void;
  post(
    path: string,
    handler: (req: NativeHttpRequest, res: NativeHttpResponse) => unknown,
  ): void;
}
