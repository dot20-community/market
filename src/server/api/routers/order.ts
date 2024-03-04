import { z } from "zod";
import { ApiPromise, WsProvider } from "@polkadot/api";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

export const orderRouter = createTRPCRouter({
  create: publicProcedure
    .input(z.object({ from: z.string(), signedTransfer: z.string() }))
    .mutation(async ({ input }) => {
      const wsProvider = new WsProvider("wss://westend-rpc.polkadot.io");
      const api = await ApiPromise.create({ provider: wsProvider });

      const extrinsic = api.createType("Extrinsic", input.signedTransfer);
      if (input.from === extrinsic.signer.toString()) {
        return {
          code: 200,
        };
      }

      return {
        code: 400,
        message: "Invalid signature",
      };
    }),
});
