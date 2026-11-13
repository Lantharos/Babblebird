declare module "@babblebird/web/worker" {
  const site: { fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> }
  export default site
}
