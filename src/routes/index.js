import { Router } from 'express';

require('babel-plugin-require-context-hook/register')();

const routes = Router();

/**
 * in a one-shot manner. There should not be any reason to edit this file.
 */
const files = require.context('.', true, /\/[^.]+\.js$/);

files.keys().forEach((key) => {
  if (key === './index.js') return;

  routes.use(key.replace(/(\.)|(js)/g, ''), files(key).default);
});

export default routes;
