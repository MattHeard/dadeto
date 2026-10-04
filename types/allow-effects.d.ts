declare const allowEffectsBrand: unique symbol;

/** Permission to execute classified commands; minted only at runtime boundaries. */
export interface AllowEffects {
  readonly [allowEffectsBrand]: true;
}
