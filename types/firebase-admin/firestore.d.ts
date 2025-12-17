declare module 'firebase-admin/firestore' {
  export interface DocumentData {
    [field: string]: unknown;
  }

  export interface DocumentReference<T = DocumentData> {
    id: string;
    path: string;
    collection(collectionPath: string): CollectionReference;
    get(): Promise<DocumentSnapshot<T>>;
    update(data: DocumentData): Promise<void>;
  }

  export interface CollectionReference<T = DocumentData> extends Query<T> {
    doc(path?: string): DocumentReference<T>;
  }

  export interface QuerySnapshot<T = DocumentData> {
    docs: QueryDocumentSnapshot<T>[];
    empty: boolean;
  }

  export interface QueryDocumentSnapshot<T = DocumentData> extends DocumentSnapshot<T> {
    data(): T;
  }

  export interface DocumentSnapshot<T = DocumentData> {
    id: string;
    exists: boolean;
    data(): T | undefined;
    get(fieldPath: string): unknown;
  }

  export interface AggregateQuerySnapshot {
    data(): { count: number };
  }

  export interface AggregateQuery<T = DocumentData> {
    get(): Promise<AggregateQuerySnapshot>;
  }

  export interface Query<T = DocumentData> {
    where(fieldPath: string, opStr: string, value: unknown): Query<T>;
    orderBy(fieldPath: string, directionStr?: 'asc' | 'desc'): Query<T>;
    limit(count: number): Query<T>;
    get(): Promise<QuerySnapshot<T>>;
    count(): AggregateQuery<T>;
  }

  export interface WriteBatch {
    set(ref: DocumentReference, data: DocumentData): WriteBatch;
    update(ref: DocumentReference, data: DocumentData): WriteBatch;
    commit(): Promise<void>;
  }

  export interface FieldValue {
    increment(delta: number): FieldValue;
  }

  export interface Firestore {
    collection(path: string): CollectionReference;
    doc(path: string): DocumentReference;
    batch(): WriteBatch;
    runTransaction<T>(transactionFn: (txn: Transaction) => Promise<T>): Promise<T>;
    collectionGroup(collectionId: string): CollectionGroup;
  }

  export interface Transaction {
    get<T = DocumentData>(ref: DocumentReference<T>): Promise<DocumentSnapshot<T>>;
    set(ref: DocumentReference, data: DocumentData): Transaction;
    update(ref: DocumentReference, data: DocumentData): Transaction;
  }

  export interface FieldPath {
    documentId(): FieldPath;
  }

  export interface CollectionGroup<T = DocumentData> extends Query<T> {}
}
