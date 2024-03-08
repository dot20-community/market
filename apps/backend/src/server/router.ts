import { accountRouter } from '../modules/account';
import { orderRouter } from '../modules/order';
import { tickRouter } from '../modules/tick';
import { router } from './trpc';

export const appRouter = router({
  tick: tickRouter,
  account: accountRouter,
  order: orderRouter,
});

export type AppRouter = typeof appRouter;
