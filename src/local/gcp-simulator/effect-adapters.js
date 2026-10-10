/** Register simulator middleware at its local runtime boundary. */
export function useMiddleware(permission, app, middleware) {
  void permission;
  app.use(middleware);
}
