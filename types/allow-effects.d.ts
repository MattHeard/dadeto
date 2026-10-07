declare const allowEffectsBrand: unique symbol;

/** Permission to execute classified commands; minted only at runtime boundaries. */
export interface AllowEffects {
  readonly [allowEffectsBrand]: true;
}

/** Runtime boundary that mints a scoped AllowEffects value for one invocation. */
export type AllowEffectsBoundary = <T>(
  handler: (permission: AllowEffects) => Promise<T>
) => Promise<T>;
