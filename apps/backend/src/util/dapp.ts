import { ApiPromise, Keyring } from '@polkadot/api';
import { SubmittableExtrinsic } from '@polkadot/api/types';

/**
 * 通过回溯历史区块中的事务hash查询事务状态，如果事务成功则返回null，否则返回错误信息字符串
 * @param extrinsic
 */
async function checkExtrinsicByHistory(
  api: ApiPromise,
  extrinsic: SubmittableExtrinsic<'promise'>,
) {
  async function doCheck(blockNumber: number) {
    let err: any;
    // 重试10次
    for (let i = 0; i < 10; i++) {
      try {
        const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
        const signedBlock = await api.rpc.chain.getBlock(blockHash);
        const match = signedBlock.block.extrinsics
          .map((extrinsic, index) => ({
            ex: extrinsic,
            ei: index,
          }))
          .find(({ ex }) => ex.hash.toString() === extrinsic.hash.toString());

        if (!match) {
          return null;
        }

        // 获取交易事务的events并检查是否成功
        const apiAt = await api.at(signedBlock.block.header.hash);
        const allRecords = (await apiAt.query.system.events()) as any;
        const errorMsg = checkExtrinsicStatus(
          api,
          allRecords.filter(
            ({ phase }: any) =>
              phase.isApplyExtrinsic && phase.asApplyExtrinsic.eq(match.ei),
          ),
        );
        return {
          errorMsg,
        };
      } catch (e) {
        err = e;
      }
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
    throw new Error(`checkExtrinsicByHistory failed: ${err}`);
  }

  // 获取当前区块高度
  const finalizedHead = await api.rpc.chain.getFinalizedHead();
  const header = await api.rpc.chain.getHeader(finalizedHead);
  const blockNumber = header.number.toNumber();
  // 从当前区块开始检查，到当前区块-30
  for (let i = 0; i < 30; i++) {
    const result = await doCheck(blockNumber - i);
    // 如果没有找到事务则继续
    if (!result) {
      continue;
    }
    return result.errorMsg;
  }

  throw new Error(`checkExtrinsicByHistory not found`);
}

function checkExtrinsicStatus(api: ApiPromise, events: any[]): string | null {
  let errorMsg: string | null = null;
  events
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

/**
 * 提交已经签名好的交易数据上链并等待结果
 * @param api
 * @param extrinsic
 * @returns
 */
export async function submitSignedExtrinsicAndWait(
  api: ApiPromise,
  extrinsic: SubmittableExtrinsic<'promise'>,
): Promise<string | null> {
  // 提交事务并等待区块确认
  try {
    return await new Promise(async (resolve, reject) => {
      let isFinalized = false;
      // 如果120秒内没有收到最终确认，则通过历史区块检查状态
      setTimeout(async () => {
        if (isFinalized) {
          return;
        }

        try {
          resolve(await checkExtrinsicByHistory(api, extrinsic));
        } catch (e) {
          reject(e);
        }
      }, 120 * 1000);

      try {
        const unsub = await extrinsic.send(async (result) => {
          console.log(`Current status is ${result.status}`);
          if (result.isFinalized) {
            unsub();
            const errMsg = checkExtrinsicStatus(api, result.events);
            isFinalized = true;
            resolve(errMsg);
          }
        });
      } catch (e) {
        isFinalized = true;
        reject(e);
      }
    });
  } catch (e: any) {
    return e?.message ?? 'Submit extrinsic failed';
  }
}

/**
 * 根据助记词上链并等待结果
 */
export async function signExtrinsic(
  extrinsic: SubmittableExtrinsic<'promise'>,
  mnemonic: string,
): Promise<SubmittableExtrinsic<'promise'>> {
  // 导入账户
  const keyring = new Keyring({ type: 'sr25519' });
  const account = keyring.addFromUri(mnemonic);
  // 签名交易
  return await extrinsic.signAsync(account);
}
