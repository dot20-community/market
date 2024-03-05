import { ApiPromise, WsProvider } from "@polkadot/api";
import { z } from "zod";

import { createTRPCRouter, publicProcedure } from "~/server/api/trpc";

const wsProvider = new WsProvider("wss://westend-rpc.polkadot.io");
const api = await ApiPromise.create({ provider: wsProvider });

export const orderRouter = createTRPCRouter({
  create: publicProcedure
    .input(z.object({ from: z.string(), signedTransfer: z.string() }))
    .mutation(async ({ input }) => {
      /* const extrinsic = api.createType("Extrinsic", input.signedTransfer);
      if (input.from === extrinsic.signer.toString()) {
        return {
          code: 200,
        };
      } */

      try {
        const hash = await api.rpc.author.submitExtrinsic(input.signedTransfer);
        console.log("Extrinsic hash:", hash.toHex());
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
        message: "Invalid signature",
      };
    }),
});
