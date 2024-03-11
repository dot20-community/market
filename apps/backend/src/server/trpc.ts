import { initTRPC, TRPCError } from '@trpc/server';
import { BizError } from 'apps/libs/error';
import superjson from 'superjson';
import { Context } from './context';
export { AppRouter } from './router';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error: err, ctx }) {
    ctx?.req.log.error(err);
    const errMsg = err.message;
    let bizErr: BizError | null = null;
    try {
      const errJson = JSON.parse(errMsg);
      if (errJson.type === 'TRPC_WARP') {
        bizErr = BizError.of(errJson.code, errJson.message);
      }
    } catch {}
    if (!bizErr) {
      bizErr = BizError.of('ERROR', err.message);
    }
    return {
      ...shape,
      data: {
        code: bizErr.code,
        message: bizErr.message,
      },
    };
  },
});

const isAuthenticated = t.middleware(({ next, ctx }) => {
  if (!ctx.user) {
    throw new TRPCError({ message: 'Unauthorized', code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      user: ctx.user,
    },
  });
});

const isAdmin = t.middleware(({ next, ctx }) => {
  if (!ctx.user || ctx.user.role !== 'admin') {
    throw new TRPCError({ message: 'Unauthorized', code: 'UNAUTHORIZED' });
  }
  return next({
    ctx: {
      user: ctx.user,
    },
  });
});

export const router = t.router;

export const procedure = t.procedure.use(isAuthenticated);
export const noAuthProcedure = t.procedure;
export const adminProcedure = t.procedure.use(isAdmin);

export type PageReq = {
  limit: number;
  cursor?: string;
};

export type PageRes<T> = {
  total: number;
  list: T[];
  prev?: string;
  next?: string;
};
