import type { AllowEffects } from './allow-effects.js';
import {
  adaptAllowEffectsBag,
  requireAllowEffects,
} from '../src/adapters/allow-effects.js';

declare const permission: AllowEffects;

const effectful = requireAllowEffects(
  (url: string, init?: { method: string }, ...headers: string[]) =>
    Promise.resolve({ url, init, headers })
);

const accepted: Promise<{
  url: string;
  init: { method: string } | undefined;
  headers: string[];
}> = effectful(permission, '/endpoint', undefined, 'x-one', 'x-two');
void accepted;

// @ts-expect-error A permission is required before raw callable arguments.
effectful('/endpoint');

// @ts-expect-error An ordinary object is not an AllowEffects capability.
effectful({}, '/endpoint');

function receiverCall(this: { readonly prefix: string }, suffix: string) {
  return `${this.prefix}${suffix}`;
}

const receiverEffect = requireAllowEffects(receiverCall);
const receiverResult: string = receiverEffect.call(
  { prefix: 'x' },
  permission,
  '!'
);
void receiverResult;

const storage = adaptAllowEffectsBag(
  {
    getItem: (key: string) => key,
    setItem: (key: string, value: string) => `${key}:${value}`,
    clear: () => undefined,
  },
  { getItem: 'query', setItem: 'effect' } as const
);
const stored: string = storage.getItem('id');
void stored;
const written: string = storage.setItem(permission, 'id', 'token');
void written;

// @ts-expect-error Query methods keep their original signature.
storage.getItem(permission, 'id');

// @ts-expect-error Effect methods require permission first.
storage.setItem('id', 'token');

// @ts-expect-error Unclassified raw methods are absent from the adapted surface.
storage.clear();

const nested = adaptAllowEffectsBag(
  {
    customers: {
      create(this: { readonly prefix: string }, id: string) {
        return `${this.prefix}${id}`;
      },
    },
  },
  { customers: { create: 'effect' } } as const
);
const nestedResult: string = nested.customers.create(permission, 'id');
void nestedResult;

// @ts-expect-error Nested effect methods also require permission.
nested.customers.create('id');

// @ts-expect-error Unknown raw methods cannot be selected.
adaptAllowEffectsBag({ save() {} }, { remove: 'effect' } as const);

// @ts-expect-error Classifications are explicitly limited to query/effect.
adaptAllowEffectsBag({ save() {} }, { save: 'command' } as const);
