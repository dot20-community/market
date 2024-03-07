import { ApiPromise } from '@polkadot/api';

export async function submitAndWaitExtrinsic(
  api: ApiPromise,
  signedExtrinsic: string,
): Promise<string | null> {
  const extrinsic = api.createType('Extrinsic', signedExtrinsic);
  // 提交事务并等待区块确认
  const blockHash: string = await new Promise(async (resolve, reject) => {
    const unsub = await api.rpc.author.submitAndWatchExtrinsic(
      extrinsic,
      async (result) => {
        if (result.isFinalized) {
          const blockHash = result.asFinalized.toString();
          unsub();
          resolve(blockHash);
        }
      },
    );
  });

  const signedBlock = await api.rpc.chain.getBlock(blockHash);
  const apiAt = await api.at(blockHash);
  const allRecords = (await apiAt.query.system.events()) as any;
  const extrinsicIndex = signedBlock.block.extrinsics.findIndex(
    (e) => e.hash.toString() === extrinsic.hash.toString(),
  );

  // 参考：https://polkadot.js.org/docs/api/cookbook/blocks/#how-do-i-determine-if-an-extrinsic-succeededfailed
  let errorMsg: string | null = null;
  allRecords
    // filter the specific events based on the phase and then the
    // index of our extrinsic in the block
    .filter(
      ({ phase }: any) =>
        phase.isApplyExtrinsic && phase.asApplyExtrinsic.eq(extrinsicIndex),
    )
    // test the events against the specific types we are looking for
    .forEach(({ event }: any) => {
      if (api.events.system.ExtrinsicFailed.is(event)) {
        // extract the data for this event
        const [dispatchError]: any[] = event.data;

        // decode the error
        if (dispatchError.isModule) {
          // for module errors, we have the section indexed, lookup
          // (For specific known errors, we can also do a check against the
          // api.errors.<module>.<ErrorName>.is(dispatchError.asModule) guard)
          const decoded = api.registry.findMetaError(dispatchError.asModule);

          errorMsg = `${decoded.section}.${decoded.name}`;
        } else {
          // Other, CannotLookup, BadOrigin, no extra info
          errorMsg = dispatchError.toString();
        }
        return;
      }
    });

  return errorMsg;
}
