import { orderRouter } from '../modules/order';
import { router } from './trpc';

export const appRouter = router({
  order: orderRouter,
});

export type AppRouter = typeof appRouter;
