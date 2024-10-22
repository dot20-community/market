import { assetRouter } from '../modules/asset';
import { orderRouter } from '../modules/order';
import { router } from './trpc';

export const appRouter = router({
  asset: assetRouter,
  order: orderRouter,
});

export type AppRouter = typeof appRouter;
