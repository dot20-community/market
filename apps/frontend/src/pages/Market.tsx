import {
  Button,
  Link,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  Tabs,
  useDisclosure,
} from '@nextui-org/react';
import { assertError, trpc } from '@utils/trpc';
import { useEffect, useState } from 'react';
import { PiLightningLight } from 'react-icons/pi';
import { ListCard } from '../components/Card/ListCard';
import { MyListCard } from '../components/Card/MyListCard';
import { BuyModal, BuyModalOrderInfo } from '../components/Modal/BuyModal';

interface Order {
  id: bigint;
  seller: string;
  amount: number;
  status: string;
  totalPrice: number;
}

export function Market() {
  const { client } = trpc.useUtils();
  const {
    isOpen: isOpenBuyModal,
    onOpen: onOpenBuyModal,
    onOpenChange: onOpenChangeBuyModal,
  } = useDisclosure();
  const [buyModalOrderInfo, setBuyModalOrderInfo] = useState<BuyModalOrderInfo>(
    {} as any,
  );
  const [orderList, setOrderList] = useState<Order[]>([]);
  const [myOrderList, setMyOrderList] = useState<Order[]>([]);

  useEffect(() => {
    orderListFake().then((list) => setOrderList(list));
    orderListFake().then((list) => setMyOrderList(list));
  }, []);

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
    } catch (e) {
      const err = assertError(e);
      if (err.code === 'INVALID_TRANSACTION') {
        console.log('非法交易');
      } else {
        console.log('其他错误');
      }
    }
  }

  async function getOrderList() {
    console.log(await client.order.dotPrice.query());

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
  async function orderListFake() {
    const orders: Order[] = [
      {
        id: 1n,
        seller: '115DdbwbaY9W9gDn9ctuuUsMvTqR8P4FB9Nb3xRaQCgcGdr5x',
        amount: 20000,
        status: 'LISTING',
        totalPrice: 10,
      },
      {
        id: 2n,
        seller: '115DdbwbaY9W9gDn9ctuuUsMvTqR8P4FB9Nb3xRaQCgcGdr5x',
        amount: 30000,
        status: 'LISTING',
        totalPrice: 50,
      },
      {
        id: 3n,
        seller: '115DdbwbaY9W9gDn9ctuuUsMvTqR8P4FB9Nb3xRaQCgcGdr5x',
        amount: 40000,
        status: 'LISTING',
        totalPrice: 60,
      },
    ];
    return orders;
  }

  function onOpenBuyModalWithData(order: Order) {
    setBuyModalOrderInfo({
      id: order.id,
      amount: order.amount,
      price: order.totalPrice,
    });
    onOpenBuyModal();
  }

  return (
    <>
      <div className="flex w-full justify-center mt-10">
        <div className="flex w-4/5 flex-col">
          <Button
            className="absolute right-44"
            radius="full"
            color="primary"
            startContent={<PiLightningLight />}
          >
            Quick List
          </Button>
          <Tabs aria-label="Options">
            <Tab key="Listed" title="Listed">
              <div className="flex items-center gap-4 flex-wrap">
                {orderList.map((order) => (
                  <ListCard
                    order={order}
                    onOpenBuyModal={() => onOpenBuyModalWithData(order)}
                  />
                ))}
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
              <div className="flex items-center gap-4 flex-wrap">
                {myOrderList.map((order) => (
                  <MyListCard order={order} />
                ))}
              </div>
            </Tab>
          </Tabs>
        </div>
      </div>
      <BuyModal
        orderInfo={buyModalOrderInfo}
        isOpen={isOpenBuyModal}
        onOpenChange={onOpenChangeBuyModal}
      />
    </>
  );
}
