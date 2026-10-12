declare const allowEffectsBrand: unique symbol;

/** Permission to execute classified commands; minted only at runtime boundaries. */
export interface AllowEffects {
  readonly [allowEffectsBrand]: true;
}

/** Runtime boundary that mints a scoped AllowEffects value for one invocation. */
export type AllowEffectsBoundary = <T>(
  handler: (permission: AllowEffects) => Promise<T>
) => Promise<T>;

/** Runtime boundary that mints a scoped command capability for an invocation. */
export type EffectInvocationBoundary = <TArgs extends unknown[], TResult>(
  handler: (permission: AllowEffects, ...args: TArgs) => Promise<TResult>
) => (...args: TArgs) => Promise<TResult>;

/** Synchronous startup boundary for effects that must finish during composition. */
export type StartupAllowEffectsBoundary = <T>(
  handler: (permission: AllowEffects) => T
) => T;
