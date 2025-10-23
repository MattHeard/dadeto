import { getAllowedOrigins } from '../cors-config.js';

const config = { allowedOrigins: getAllowedOrigins(process.env) };

export default config;
