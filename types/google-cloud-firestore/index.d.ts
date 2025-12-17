declare module '@google-cloud/firestore' {
  export type DocumentData = Record<string, unknown>;

  export interface DocumentSnapshot<T = DocumentData> {
    id: string;
    exists: boolean;
    data(): T | undefined;
  }

  export interface QueryDocumentSnapshot<T = DocumentData> extends DocumentSnapshot<T> {
    data(): T;
  }

  export interface QuerySnapshot<T = DocumentData> {
    docs: QueryDocumentSnapshot<T>[];
    empty: boolean;
  }

  export interface Query<T = DocumentData> {
    where(fieldPath: string, opStr: string, value: unknown): Query<T>;
    orderBy?(fieldPath: string, directionStr?: 'asc' | 'desc'): Query<T>;
    limit(count: number): Query<T>;
    get(): Promise<QuerySnapshot<T>>;
  }

  export interface DocumentReference<T = DocumentData> {
    id: string;
    path: string;
    collection(path: string): CollectionReference<T>;
    get(): Promise<DocumentSnapshot<T>>;
  }

  export interface CollectionReference<T = DocumentData> extends Query<T> {
    doc(path?: string): DocumentReference<T>;
  }

  export class Firestore {
    constructor();
    collection(path: string): CollectionReference;
    doc(path: string): DocumentReference;
    collectionGroup(collectionId: string): CollectionReference;
  }

  export interface WriteBatch {
    set(ref: DocumentReference, data: DocumentData, options?: object): WriteBatch;
    update(ref: DocumentReference, data: DocumentData): WriteBatch;
    commit(): Promise<void>;
  }
}
