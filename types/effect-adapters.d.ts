import type { AllowEffects } from './allow-effects.js';

/** Callable shape supported by the reusable effect adapter. */
export type EffectCallable = (...args: never[]) => unknown;

/** A callable that requires its permission as the first argument. */
export type EffectfulCallable<F extends EffectCallable> = (
  this: ThisParameterType<F>,
  permission: AllowEffects,
  ...args: Parameters<F>
) => ReturnType<F>;

/** Explicit per-method classification for a raw function bag. */
export type AllowEffectsClassification<T> = {
  readonly [K in keyof T]?: T[K] extends EffectCallable
    ? 'effect' | 'query'
    : T[K] extends object
      ? AllowEffectsClassification<T[K]>
      : never;
};

/** Restricted public interface produced from one selected method surface. */
export type AdaptedAllowEffectsBag<T, C> = {
  readonly [K in keyof C]: K extends keyof T
    ? C[K] extends 'effect'
      ? T[K] extends EffectCallable
        ? EffectfulCallable<OmitThisParameter<T[K]>>
        : never
      : C[K] extends 'query'
        ? T[K] extends EffectCallable
          ? OmitThisParameter<T[K]>
          : never
        : C[K] extends object
          ? T[K] extends object
            ? AdaptedAllowEffectsBag<T[K], C[K]>
            : never
          : never
    : never;
};

/** Permission-first counterpart of a single-signature raw callable. */
export type Effectful<F extends EffectCallable> = EffectfulCallable<F>;

/** Existing non-core runtime functions exported by the adapter module. */
export function requireAllowEffects<F extends EffectCallable>(
  callable: F
): Effectful<F>;

/** Expose only explicitly classified methods from a raw object and its nested objects. */
export function adaptAllowEffectsBag<
  T extends object,
  const C extends AllowEffectsClassification<T>,
>(target: T, classification: C): AdaptedAllowEffectsBag<T, C>;
