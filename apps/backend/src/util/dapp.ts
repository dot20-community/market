import { ApiPromise, Keyring } from '@polkadot/api';
import { SubmittableExtrinsic } from '@polkadot/api/types';
import { fmtAddress } from 'apps/libs/util';
import { serverConfig } from '../configs/server.config';

/**
 * 通过subscan API查询交易状态
 * @param extrinsic
 */
async function checkExtrinsicBySubscan(api: ApiPromise, extrinsic: SubmittableExtrinsic<'promise'>) {

  async function doCheck() {
    // 根据subscan API查询用户对应的区块号和交易索引
    var headers = new Headers();
    headers.append("Content-Type", "application/json");
    var raw = JSON.stringify({
      "address": fmtAddress(extrinsic.signer.toString()),
      "finalized": true,
      "module": "transactionpayment",
      "event_id": "TransactionFeePaid",
      "order": "desc",
      "page": 0,
      "row": 30
    });
    const resp = await fetch(`${serverConfig.subscanApiEndpoint}/api/v2/scan/events`, {
      method: 'POST',
      headers,
      body: raw,
    })
    const data = await resp.json();
    if (data.code !== 0) {
      throw new Error(JSON.stringify({ code: data.code, message: data.message }));
    }
    const match = data.data.events.find((event: any) => event.extrinsic_hash === extrinsic.hash.toString());
    if (!match) {
      throw new Error(`Extrinsic hash ${extrinsic.hash.toString()} not found`);
    }

    const [blockNumber, extrinsicIndex] = match.extrinsic_index.split('-')

    // 获取交易事务的events并检查是否成功
    const blockHash = await api.rpc.chain.getBlockHash(blockNumber);
    const signedBlock = await api.rpc.chain.getBlock(blockHash);
    const apiAt = await api.at(signedBlock.block.header.hash);
    const allRecords = (await apiAt.query.system.events()) as any;
    return checkExtrinsicStatus(api, allRecords.filter(({ phase }: any) =>
      phase.isApplyExtrinsic &&
      phase.asApplyExtrinsic.eq(extrinsicIndex)
    ))
  }

  let err: any = null;
  // 重试10次
  for (let i = 0; i < 10; i++) {
    try {
      return await doCheck();
    } catch (e) {
      err = e;
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  throw new Error(`CheckExtrinsicBySubscan failed: ${err}`);
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
          const decoded = api.registry.findMetaError(
            dispatchError.asModule,
          );
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
      // 如果30秒内没有收到最终确认，则通过subscan API检查状态
      setTimeout(async () => {
        if (isFinalized) {
          return;
        }

        try {
          resolve(await checkExtrinsicBySubscan(api, extrinsic));
        } catch (e) {
          reject(e);
        }
      }, 30000);

      try {
        const unsub = await extrinsic.send(async (result) => {
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
    return e?.message ?? "Submit extrinsic failed"
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
