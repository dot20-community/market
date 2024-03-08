import { ApiPromise } from '@polkadot/api';
import { PrismaClient } from '@prisma/client';
import { TRPCError, inferAsyncReturnType } from '@trpc/server';
import { CreateFastifyContextOptions } from '@trpc/server/adapters/fastify';
import { getApi } from 'apps/libs/util';
import { verify } from 'jsonwebtoken';
import { authConfig } from '../configs/auth.config';
import { ServerOptions } from './server';

export const prisma = new PrismaClient();

export interface User {
  email: string;
  role: 'user' | 'admin';
}

async function decodeAndVerifyJwtToken(token: string): Promise<User> {
  const decoded = verify(token, authConfig.secretKey);
  return decoded as User;
}

export async function createContext({ req, res }: CreateFastifyContextOptions) {
  if (req.headers.authorization) {
    try {
      const user = await decodeAndVerifyJwtToken(
        req.headers.authorization.split(' ')[1],
      );
      return { req, res, prisma, user };
    } catch (err) {
      throw new TRPCError({ message: 'Unauthorized', code: 'UNAUTHORIZED' });
    }
  }

  return { req, res, prisma };
}

export type Context = inferAsyncReturnType<typeof createContext> & {
  opts: ServerOptions;
  api: ApiPromise;
};

export async function createContextProxy(
  opts: ServerOptions,
): Promise<({ req, res }: CreateFastifyContextOptions) => Promise<Context>> {
  return async function (args: CreateFastifyContextOptions) {
    return {
      ...(await createContext(args)),
      opts,
      api: await getApi(),
    };
  };
}
