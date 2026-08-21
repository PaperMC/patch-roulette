declare module "*.svelte-kit/cloudflare/_worker.js" {
  const frontend: {
    fetch(request: Request<unknown, unknown>, env: unknown, ctx: ExecutionContext): Response | Promise<Response>;
  };
  export default frontend;
}
