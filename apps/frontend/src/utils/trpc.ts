/* eslint-disable @nx/enforce-module-boundaries */
import { TRPCClientError, createTRPCReact } from '@trpc/react-query';
import { inferRouterInputs, inferRouterOutputs } from '@trpc/server';
import type { AppRouter } from 'apps/backend/src/server/trpc';
import { BizError } from 'apps/libs/error';

export const trpc = createTRPCReact<AppRouter>();

export type RouterInput = inferRouterInputs<AppRouter>;
export type RouterOutput = inferRouterOutputs<AppRouter>;

export function assertError(err: any): BizError {
  if (err instanceof BizError) {
    return err;
  }
  if (err instanceof TRPCClientError) {
    return err.data as BizError;
  }
  return BizError.of('ERROR', err?.message);
}
