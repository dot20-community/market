import { authRouter } from '../modules/auth/auth.router';
import { orderRouter } from '../modules/order';
import { router } from './trpc';

export const appRouter = router({
  auth: authRouter,
  order: orderRouter,
});

export type AppRouter = typeof appRouter;
