import cors from '@fastify/cors';
import { fastifyTRPCPlugin } from '@trpc/server/adapters/fastify';
import {
  getAssetHubApi,
  setAssetHubEndpoint,
  setPolkadotDecimals,
} from 'apps/libs/util';
import Decimal from 'decimal.js';
import fastify from 'fastify';
import pino from 'pino';
import pretty from 'pino-pretty';
import { createContextProxy } from './context';
import { appRouter } from './router';

export interface ServerOptions {
  dev?: boolean;
  port?: number;
  prefix?: string;
  environment: 'development' | 'production' | 'test' | 'local';
  marketAccountMnemonic: string;
  marketAccount: string;
  assetHubEndpoint: string;
  polkadotDecimals: number;
  serverFeeRate: number;
  minSellTotalPrice: number;
}

export async function createServer(opts: ServerOptions) {
  const port = opts.port ?? 3000;
  const prefix = opts.prefix ?? '/trpc';

  const stream = pretty({
    colorize: true,
    translateTime: 'HH:MM:ss Z',
    ignore: 'pid,hostname',
  });
  const prettyLogger = pino({ level: 'debug' }, stream);

  setPolkadotDecimals(opts.polkadotDecimals);
  setAssetHubEndpoint(opts.assetHubEndpoint);
  Decimal.set({ precision: 64 });

  const server = fastify({
    logger:
      opts.environment === 'local' || opts.environment === 'test'
        ? prettyLogger
        : true,
  });

  server.register(cors, {
    origin: '*',
    methods: '*',
  });

  // 初始化波卡rpc api
  await getAssetHubApi();

  const createContext = await createContextProxy(opts);
  server.register(fastifyTRPCPlugin, {
    prefix,
    trpcOptions: {
      router: appRouter,
      createContext,
    },
  });

  const stop = () => server.close();
  const start = async () => {
    try {
      await server.listen({ host: '0.0.0.0', port });
    } catch (err) {
      server.log.error(err);
      process.exit(1);
    }
  };

  return { server, start, stop };
}
