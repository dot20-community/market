import { ApiPromise, Keyring } from '@polkadot/api';
import { SubmittableExtrinsic } from '@polkadot/api/types';

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
      try {
        const unsub = await extrinsic.send(async (result) => {
          if (result.isFinalized) {
            unsub();

            let errorMsg: string | null = null;
            result.events
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
            resolve(errorMsg);
          }
        });
      } catch (e) {
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
