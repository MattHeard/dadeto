import { createEffectStartupBoundary } from '../allow-effects.js';
import { createUpdateVariantVisibilityStartup } from './startup-effect-adapter.js';
import { createUpdateVariantVisibilityStartupDependencies } from './startup-dependencies.js';

export const handle = createEffectStartupBoundary(allowEffects =>
  createUpdateVariantVisibilityStartup(
    allowEffects,
    createUpdateVariantVisibilityStartupDependencies()
  )
);
