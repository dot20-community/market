import { initTRPC, TRPCError } from '@trpc/server';
import superjson from 'superjson';
import { ErrorCode } from '../../../libs/error';
import { Context } from './context';
export { AppRouter } from './router';

const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error, ctx }) {
    if (error.code === 'INTERNAL_SERVER_ERROR') {
      ctx?.req.log.error(error);
      return { ...shape, message: 'Internal server error' };
    }
    return shape;
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

export type Result<T> = {
  code: ErrorCode;
  data?: T;
};

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

export function ok<T>(data: T): Result<T> {
  return {
    code: 'OK',
    data,
  };
}

export function error<T>(code?: ErrorCode): Result<T> {
  return {
    code: code ?? 'ERROR',
    data: undefined,
  };
}
