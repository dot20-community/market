import { useGlobalStateStore } from '@GlobalState';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
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
import { calcUnitPrice, toDecimal, toUsd } from '@utils/calc';
import { trpc } from '@utils/trpc';
import { desensitizeAddress } from '@utils/wallet';
import { ListRes } from 'apps/backend/src/modules/order';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';
import { LuRefreshCw } from 'react-icons/lu';
import { MdOutlineVerified } from 'react-icons/md';
import { PiLightningLight } from 'react-icons/pi';
import InfiniteScroll from 'react-infinite-scroller';
import { toast } from 'react-toastify';
import { ListCard } from '../components/Card/ListCard';
import { MyListCard } from '../components/Card/MyListCard';
import { BuyModal } from '../components/Modal/BuyModal';
import { SellModal } from '../components/Modal/SellModal';

const polkadotScan = import.meta.env.VITE_POLKADOT_SCAN;

const veryfyTicks = ['dota'];

export function Market() {
  const globalState = useGlobalStateStore();
  const { account } = globalState;
  const [selectTick, setSelectTick] = useState<string>('dota');
  const [selectTab, setSelectTab] = useState<string>('Listed');
  const [listRefresh, setListRefresh] = useState(false);
  const { client } = trpc.useUtils();
  const tickTrending = trpc.tick.trending.useQuery();
  const {
    isOpen: isOpenBuyModal,
    onOpen: onOpenBuyModal,
    onOpenChange: onOpenChangeBuyModal,
  } = useDisclosure();
  const [buyModalOrderInfo, setBuyModalOrderInfo] = useState<Order>({} as any);
  const {
    isOpen: isSellOpen,
    onOpen: onSellOpen,
    onOpenChange: onSellOpenChange,
  } = useDisclosure();

  function onBuySuccess() {
    setSelectTab('Orders');
    clearList('Orders');
  }

  function onSellSuccess() {
    setSelectTab('MyList');
    clearList('MyList');
  }

  const [listedOrderList, setListedOrderList] = useState<ListRes>({
    total: -1,
    list: [],
  });
  const [orderList, setOrderList] = useState<ListRes>({
    total: -1,
    list: [],
  });
  const [myOrderList, setMyOrderList] = useState<ListRes>({
    total: -1,
    list: [],
  });

  function clearList(tab?: string) {
    const refreshTab = tab || selectTab;
    if (refreshTab === 'Listed') {
      setListedOrderList({ total: -1, list: [] });
    }
    if (refreshTab === 'Orders') {
      setOrderList({ total: -1, list: [] });
    }
    if (refreshTab === 'MyList') {
      setMyOrderList({ total: -1, list: [] });
    }
  }

  useEffect(() => {
    clearList();
  }, [account]);

  async function changeTick(tick: string) {
    if (tick === selectTick) {
      return;
    }
    setSelectTick(tick);
    clearList();
  }

  async function fetchListedOrderList() {
    const resp = await client.order.list.query({
      tick: selectTick,
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
      tick: selectTick,
      cursor: orderList.next,
      limit: 15,
      statues: account ? ['LOCKED', 'SOLD'] : ['SOLD'],
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
    if (!account) {
      return;
    }

    const resp = await client.order.list.query({
      tick: selectTick,
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
    if (!account) {
      toast.warn('Please connect wallet first');
      return;
    }
    setBuyModalOrderInfo(order);
    onOpenBuyModal();
  }

  return (
    <>
      <div className="flex w-full justify-center mt-10">
        <div className="flex w-4/5 flex-col">
          <div className="flex justify-between">
            <p className="text-large fw-600 mb-6 text-primary">
              Trending Inscriptions
            </p>
            <Button
              className="w-32 ml-4"
              radius="full"
              color="primary"
              startContent={<PiLightningLight />}
              onClick={() => {
                if (!account) {
                  toast.warn('Please connect wallet first');
                  return;
                }
                onSellOpen();
              }}
            >
              Quick List
            </Button>
          </div>
          <div className="mb-2 pb-2 w-full overflow-x-auto">
            <div className="flex gap-4">
              {(tickTrending.data ?? []).map((item) => (
                <Card
                  key={item.tick}
                  isPressable={true}
                  className={`min-min-w-[240px] w-[220px] cursor-pointer border-1 hover:border-primary ${
                    selectTick === item.tick && 'border-primary'
                  }`}
                  onClick={() => changeTick(item.tick)}
                >
                  <CardHeader className="flex gap-3 content-center justify-center items-center">
                    <span className="text-xl font-bold">
                      {item.tick.toUpperCase()}
                    </span>
                    {veryfyTicks.includes(item.tick) && (
                      <MdOutlineVerified color="#4C6FFF" />
                    )}
                  </CardHeader>
                  <Divider />
                  <CardBody>
                    <div className="flex gap-2 justify-center">
                      <div className="flex flex-col items-center justify-center w-full">
                        <span>
                          {toUsd(
                            toDecimal(item.floorPrice).mul(10000),
                            globalState.dotPrice,
                          )}
                        </span>
                        <span className="text-foreground-400">Floor Price</span>
                      </div>
                      <Divider orientation="vertical" />
                      <div className="flex flex-col items-center justify-center w-full">
                        <span>
                          {toUsd(item.totalVol, globalState.dotPrice)}
                        </span>
                        <span className="text-foreground-400">Total Vol</span>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              ))}
            </div>
          </div>
          <Divider className="mb-4" />
          <LuRefreshCw
            size={20}
            className={`relative top-[30px] left-64 cursor-pointer ${
              listRefresh && 'animate-spin'
            }`}
            onClick={() => {
              if (listRefresh) {
                return;
              }
              setListRefresh(true);
              setTimeout(() => {
                setListRefresh(false);
              }, 1000);
              clearList();
            }}
          />

          <Tabs
            aria-label="Options"
            selectedKey={selectTab}
            onSelectionChange={(key) => {
              setSelectTab(key as string);
              clearList(key as string);
            }}
          >
            <Tab key="Listed" title="Listed">
              <InfiniteScroll
                loadMore={fetchListedOrderList}
                hasMore={listedOrderList.total === -1 || !!listedOrderList.next}
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
                hasMore={orderList.total === -1 || !!orderList.next}
              >
                <Table aria-label="collection table">
                  <TableHeader>
                    <TableColumn>Date Time</TableColumn>
                    <TableColumn>Status</TableColumn>
                    <TableColumn>Amount</TableColumn>
                    <TableColumn>Unit Price (10k)</TableColumn>
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
                          <Chip>
                            {order.status === 'LOCKED' ? 'Indexing' : 'Sold'}
                          </Chip>
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
                            href={`${polkadotScan}/account/${order.buyer}`}
                            color="primary"
                          >
                            {desensitizeAddress(order.buyer!!)}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Link
                            target="_blank"
                            href={`${polkadotScan}/account/${order.seller}`}
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
                            href={`${polkadotScan}/extrinsic/${order.tradeHash}`}
                            color="primary"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </InfiniteScroll>
            </Tab>
            <Tab key="MyList" title="My List">
              <InfiniteScroll
                loadMore={fetchMyOrderList}
                hasMore={myOrderList.total === -1 || !!myOrderList.next}
              >
                {myOrderList.list.length ? (
                  <div className="flex items-center gap-4 flex-wrap">
                    {myOrderList.list.map((order) => (
                      <MyListCard
                        key={order.id}
                        order={order}
                        onUpdate={clearList}
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
                            href={`${polkadotScan}/extrinsic/${order.sellHash}`}
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
      {account && (
        <BuyModal
          order={buyModalOrderInfo}
          isOpen={isOpenBuyModal}
          onSuccess={onBuySuccess}
          onOpenChange={onOpenChangeBuyModal}
        />
      )}
      {account && (
        <SellModal
          isOpen={isSellOpen}
          onOpenChange={onSellOpenChange}
          onSuccess={onSellSuccess}
          tick={selectTick}
        />
      )}
    </>
  );
}
