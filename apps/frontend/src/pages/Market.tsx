import {
  Link,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Tabs,
} from '@nextui-org/react';
import { assertError, trpc } from '@utils/trpc';
import { ListCard } from '../components/Card/ListCard';

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

  async function orderList() {
    const list = await client.order.list.query({
      limit: 15,
    });
    console.log('orderList', list);
    if (list.next) {
      const nextList = await client.order.list.query({
        limit: 15,
        cursor: list.next,
      });
      console.log('nextList', nextList);
    }
  }

  return (
    <div className="flex w-full justify-center mt-10">
      <div className="flex w-4/5 flex-col">
        <Tabs aria-label="Options">
          <Tab key="Listed" title="Listed">
            <div className="flex items-center gap-4 flex-wrap">
              <ListCard />
              <ListCard />
              <ListCard />
              <ListCard />
              <ListCard />
              <ListCard />
              <ListCard />
              <ListCard />
            </div>
          </Tab>
          <Tab key="Orders" title="Orders">
            <Table aria-label="Example static collection table">
              <TableHeader>
                <TableColumn>Date Time</TableColumn>
                <TableColumn>Method</TableColumn>
                <TableColumn>Amount</TableColumn>
                <TableColumn>Unit Price</TableColumn>
                <TableColumn>Total Value</TableColumn>
                <TableColumn>Buyer</TableColumn>
                <TableColumn>Seller</TableColumn>
                <TableColumn>Hash</TableColumn>
              </TableHeader>
              <TableBody>
                <TableRow key="1">
                  <TableCell>2024-03-08 07:47:35</TableCell>
                  <TableCell>Sale</TableCell>
                  <TableCell>10,000</TableCell>
                  <TableCell>$0.002</TableCell>
                  <TableCell>$20.00</TableCell>
                  <TableCell>
                    <Link
                      isExternal
                      showAnchorIcon
                      href="https://dota.fyi/inscribe/"
                    >
                      12v7gK...CLxtmU
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      isExternal
                      showAnchorIcon
                      href="https://dota.fyi/inscribe/"
                    >
                      12v7gK...CLxtmU
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      isExternal
                      showAnchorIcon
                      href="https://dota.fyi/inscribe/"
                    />
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </Tab>
          <Tab key="My List" title="My List">
            <ListCard />
          </Tab>
        </Tabs>
      </div>
    </div>
  );
}
