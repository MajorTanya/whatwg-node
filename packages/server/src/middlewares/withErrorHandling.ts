import { DefaultServerAdapterContext, ServerAdapterBaseObject } from '../types';
import { Response as DefaultResponseCtor } from '@whatwg-node/fetch';

export function createDefaultErrorHandler<TServerContext = DefaultServerAdapterContext>(
  ResponseCtor: typeof Response = DefaultResponseCtor
): ErrorHandler<TServerContext> {
  return function defaultErrorHandler(e: any): Response | Promise<Response> {
    return new ResponseCtor(e.stack || e.message || e.toString(), {
      status: e.statusCode || e.status || 500,
      statusText: e.statusText || 'Internal Server Error',
    });
  };
}

export type ErrorHandler<TServerContext> = (
  e: any,
  request: Request,
  ctx: TServerContext
) => Response | Promise<Response>;

export function withErrorHandling<
  TServerContext = DefaultServerAdapterContext,
  TBaseObject extends ServerAdapterBaseObject<TServerContext> = ServerAdapterBaseObject<TServerContext>
>(obj: TBaseObject, onError: ErrorHandler<TServerContext> = createDefaultErrorHandler()): TBaseObject {
  async function handleWithErrorHandling(request: Request, ctx: TServerContext): Promise<Response> {
    try {
      const res = await obj.handle(request, ctx);
      return res;
    } catch (e) {
      return onError(e, request, ctx);
    }
  }
  return new Proxy(obj, {
    get(obj, prop, receiver) {
      if (prop === 'handle') {
        return handleWithErrorHandling;
      }
      return Reflect.get(obj, prop, receiver);
    },
  });
}