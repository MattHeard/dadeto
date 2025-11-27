const firebaseFunctionsModule = await import('firebase-functions/v1');
const functions = firebaseFunctionsModule.default ?? firebaseFunctionsModule;

export { functions as default, functions };
