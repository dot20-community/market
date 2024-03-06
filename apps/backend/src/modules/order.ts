import { z } from 'zod';
import { noAuthProcedure, router } from '../server/trpc';

export const orderRouter = router({
  create: noAuthProcedure
    .input(z.object({ from: z.string(), signedTransfer: z.string() }))
    .mutation(async ({ input, ctx }) => {
      /* const extrinsic = api.createType("Extrinsic", input.signedTransfer);
      if (input.from === extrinsic.signer.toString()) {
        return {
          code: 200,
        };
      } */

      try {
        const hash = await ctx.api.rpc.author.submitExtrinsic(
          input.signedTransfer,
        );
        console.log('Extrinsic hash:', hash.toHex());
        return {
          code: 200,
          hash: hash.toHex(),
        };
      } catch (e) {
        return {
          code: 500,
          message: e?.toString(),
        };
      }

      return {
        code: 400,
        message: 'Invalid signature',
      };
    }),
});
