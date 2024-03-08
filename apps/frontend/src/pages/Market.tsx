import { Card, CardBody, CardFooter, CardHeader, Divider, Tab, Tabs } from "@nextui-org/react";
import { assertError, trpc } from '@utils/trpc';

export function Market() {

  const { client } = trpc.useUtils();

  async function test() {
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
    <div className="flex w-full justify-center mt-10">
      <div className="flex w-4/5 flex-col">
        <Tabs aria-label="Options">
          <Tab key="Listed" title="Listed">
            <div className="mt-5">
              <Card className="max-w-[200px]">
                <CardHeader className="flex">
                  <div className="w-full text-small">DOTA</div>
                </CardHeader>
                <Divider/>
                <CardBody>
                  <p>Make beautiful websites regardless of your design experience.</p>
                </CardBody>
                <Divider/>
                <CardFooter>
                  asdf
                </CardFooter>
              </Card>
            </div>
          </Tab>
          <Tab key="Orders" title="Orders">
            <Card>
              <CardBody>
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
              </CardBody>
            </Card>
          </Tab>
          <Tab key="My List" title="My List">
            <Card>
              <CardBody>
                Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
              </CardBody>
            </Card>
          </Tab>
        </Tabs>
      </div>
    </div>
  );
}
