import functions from 'firebase-functions/v1';

export { functions };
export { default as express } from 'express';
export { default as cors } from 'cors';
export { getAuth } from 'firebase-admin/auth';
export * from './common-gcf.js';
