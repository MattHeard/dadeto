declare module '@google-cloud/storage' {
  export interface SaveOptions {
    contentType?: string;
    metadata?: Record<string, unknown>;
  }

export interface File {
  save(
    data: string | ArrayBuffer | ArrayBufferView,
    options?: SaveOptions
  ): Promise<void>;
}

  export interface Bucket {
    file(path: string): File;
  }

  export class Storage {
    constructor();
    bucket(name: string): Bucket;
  }
}
