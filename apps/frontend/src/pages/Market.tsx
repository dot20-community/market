import { useGlobalStateStore } from '@GlobalState';
import {
  Card,
  CardBody,
  Chip,
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
import { Order } from '@prisma/client';
import { calcUnitPrice, toUsd } from '@utils/calc';
import { trpc } from '@utils/trpc';
import { desensitizeAddress, getCurrentAccountAddress } from '@utils/wallet';
import { ListRes } from 'apps/backend/src/modules/order';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import InfiniteScroll from 'react-infinite-scroller';
import { ListCard } from '../components/Card/ListCard';
import { MyListCard } from '../components/Card/MyListCard';
import { BuyModal } from '../components/Modal/BuyModal';

const account = getCurrentAccountAddress();

export function Market() {
  const globalState = useGlobalStateStore();
  const { client } = trpc.useUtils();
  const {
    isOpen: isOpenBuyModal,
    onOpen: onOpenBuyModal,
    onOpenChange: onOpenChangeBuyModal,
  } = useDisclosure();
  const [buyModalOrderInfo, setBuyModalOrderInfo] = useState<Order>({} as any);

  const [listedOrderList, setListedOrderList] = useState<ListRes>({
    list: [],
  });
  const [orderList, setOrderList] = useState<ListRes>({
    list: [],
  });
  const [myOrderList, setMyOrderList] = useState<ListRes>({
    list: [],
  });

  useEffect(() => {
    fetchListedOrderList();
    fetchOrderList();
    fetchMyOrderList();
  }, []);

  async function fetchListedOrderList() {
    const resp = await client.order.list.query({
      cursor: listedOrderList.next,
      limit: 15,
      excludeSeller: account,
      statues: ['LISTING', 'LOCKED'],
      orderBy: 'price_asc',
    });
    setListedOrderList((list) => {
      return {
        ...resp,
        list: list.list.concat(
          resp.list.filter((e) => !list.list.some((ee) => ee.id === e.id)),
        ),
      };
    });
  }

  async function fetchOrderList() {
    const resp = await client.order.list.query({
      cursor: orderList.next,
      limit: 15,
      statues: ['SOLD'],
      orderBy: 'update_desc',
    });
    setOrderList((list) => {
      return {
        ...resp,
        list: list.list.concat(
          resp.list.filter((e) => !list.list.some((ee) => ee.id === e.id)),
        ),
      };
    });
  }

  async function fetchMyOrderList() {
    const resp = await client.order.list.query({
      cursor: myOrderList.next,
      limit: 15,
      seller: account,
      orderBy: 'create_desc',
    });
    setMyOrderList((list) => {
      return {
        ...resp,
        list: list.list.concat(
          resp.list.filter((e) => !list.list.some((ee) => ee.id === e.id)),
        ),
      };
    });
  }

  function onOpenBuyModalWithData(order: Order) {
    setBuyModalOrderInfo(order);
    onOpenBuyModal();
  }

  return (
    <>
      <div className="flex w-full justify-center mt-10">
        <div className="flex w-4/5 flex-col">
          {/*   <Button
            className="absolute right-32"
            radius="full"
            color="primary"
            startContent={<PiLightningLight />}
            onClick={onOpenBuyModal}
          >
            Quick List
          </Button> */}
          <Tabs aria-label="Options">
            <Tab key="Listed" title="Listed">
              <InfiniteScroll
                loadMore={fetchListedOrderList}
                hasMore={!!listedOrderList.next}
              >
                {listedOrderList.list.length ? (
                  <div className="flex items-center gap-4 flex-wrap">
                    {listedOrderList.list.map((order) => (
                      <ListCard
                        key={order.id}
                        order={order}
                        onOpenBuyModal={() => onOpenBuyModalWithData(order)}
                      />
                    ))}
                  </div>
                ) : (
                  <Card className="w-full text-foreground-400 align-middle text-center">
                    <CardBody className="flex items-center justify-center h-64">
                      <p>No Result</p>
                    </CardBody>
                  </Card>
                )}
              </InfiniteScroll>
            </Tab>
            <Tab key="Orders" title="Orders">
              <InfiniteScroll
                loadMore={fetchOrderList}
                hasMore={!!orderList.next}
              >
                <Table aria-label="collection table">
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
                  <TableBody emptyContent={'No Result'}>
                    {orderList.list.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          {dayjs(order.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
                        </TableCell>
                        <TableCell>
                          <Chip>Sale</Chip>
                        </TableCell>
                        <TableCell>{order.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          {toUsd(
                            calcUnitPrice(order.totalPrice, order.amount),
                            globalState.dotPrice,
                          )}
                        </TableCell>
                        <TableCell>
                          {toUsd(order.totalPrice, globalState.dotPrice)}
                        </TableCell>
                        <TableCell>
                          <Link
                            target="_blank"
                            href={`https://polkadot.subscan.io/account/${order.buyer}`}
                            color="primary"
                          >
                            {desensitizeAddress(order.buyer!!)}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link
                            target="_blank"
                            href={`https://polkadot.subscan.io/account/${order.seller}`}
                            color="primary"
                          >
                            {desensitizeAddress(order.seller)}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link
                            isBlock
                            showAnchorIcon
                            target="_blank"
                            href={`https://polkadot.subscan.io/extrinsic/${order.tradeHash}`}
                            color="primary"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </InfiniteScroll>
            </Tab>
            <Tab key="My List" title="My List">
              <InfiniteScroll
                loadMore={fetchMyOrderList}
                hasMore={!!myOrderList.next}
              >
                {myOrderList.list.length ? (
                  <div className="flex items-center gap-4 flex-wrap">
                    {myOrderList.list.map((order) => (
                      <MyListCard key={order.id} order={order} />
                    ))}
                  </div>
                ) : (
                  <Card className="w-full text-foreground-400 align-middle text-center">
                    <CardBody className="flex items-center justify-center h-64">
                      <p>No Result</p>
                    </CardBody>
                  </Card>
                )}
                {/* <Table aria-label="collection table">
                  <TableHeader>
                    <TableColumn>Date Time</TableColumn>
                    <TableColumn>Amount</TableColumn>
                    <TableColumn>Unit Price</TableColumn>
                    <TableColumn>Total Value</TableColumn>
                    <TableColumn>Status</TableColumn>
                    <TableColumn>Hash</TableColumn>
                  </TableHeader>
                  <TableBody emptyContent={'No Result'}>
                    {myOrderList.list.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell>
                          {dayjs(order.updatedAt).format('YYYY-MM-DD HH:mm:ss')}
                        </TableCell>
                        <TableCell>{order.amount.toLocaleString()}</TableCell>
                        <TableCell>
                          {toUsd(
                            calcUnitPrice(order.totalPrice, order.amount),
                            globalState.dotPrice,
                          )}
                        </TableCell>
                        <TableCell>
                          {toUsd(order.totalPrice, globalState.dotPrice)}
                        </TableCell>
                        <TableCell>{order.status}</TableCell>
                        <TableCell>
                          <Link
                            isBlock
                            showAnchorIcon
                            target="_blank"
                            href={`https://polkadot.subscan.io/extrinsic/${order.sellHash}`}
                            color="primary"
                          ></Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table> */}
              </InfiniteScroll>
            </Tab>
          </Tabs>
        </div>
      </div>
      <BuyModal
        order={buyModalOrderInfo}
        isOpen={isOpenBuyModal}
        onOpenChange={onOpenChangeBuyModal}
      />
    </>
  );
}
