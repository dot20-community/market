import { Button } from '@nextui-org/react';
import { assertError, trpc } from '@utils/trpc';

export function Market() {
  const { client } = trpc.useUtils();

  async function onClick() {
    // 查询所有铭文列表
    const list = await client.tick.list.query();
    console.log('list', list);
    // 查询账号铭文列表
    const accountTickList = await client.account.tickList.query({
      account: '157iXyCn5QhjWmLHyChcBvmGmPoKxKbiTXGhP2E3q1H9ZuMd',
    });
    console.log('accountTickList', accountTickList);
    // 查询账号指定铭文余额
    const accountTick = await client.account.tick.query({
      tick: 'DOTA',
      account: '157iXyCn5QhjWmLHyChcBvmGmPoKxKbiTXGhP2E3q1H9ZuMd',
    });
    console.log('accountTick', accountTick);

    // 错误处理
    try {
      // 查询账号指定铭文余额
      const accountTick = await client.account.tick.query({
        tick: 'DOTA',
        account: '157iXyCn5QhjWmLHyChcBvmGmPoKxKbiTXGhP2E3q1H9ZuMd',
      });
      console.log('accountTick', accountTick);
    } catch (e) {
      const err = assertError(e);
      if (err.code === 'INVALID_TRANSACTION') {
        console.log('非法交易');
      } else {
        console.log('其他错误');
      }
    }
  }

  return (
    <div>
      <h2>Market</h2>

      <Button onClick={onClick}>测试</Button>
    </div>
  );
}
