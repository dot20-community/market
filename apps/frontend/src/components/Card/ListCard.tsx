import { useGlobalStateStore } from '@GlobalState';
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Divider,
  Image,
  Link,
} from '@nextui-org/react';
import { Order, Status } from '@prisma/client';
import { calcUnitPrice, fmtDecimal, fmtDot, toUsd } from '@utils/calc';
import { desensitizeAddress } from '@utils/wallet';
import { planck2Dot } from 'apps/libs/util';
import { FC } from 'react';

const polkadotScan = import.meta.env.VITE_POLKADOT_SCAN;

export interface ListCardContext {
  onOpenBuyModal: () => void;
  order: Order;
}

export const ListCard: FC<ListCardContext> = ({ onOpenBuyModal, order }) => {
  const globalState = useGlobalStateStore();
  const assetInfo = globalState.assetInfos.find(
    (asset) => asset.id === order.assetId,
  );
  function isLocked(status: Status) {
    return status === 'LOCKED';
  }

  return (
    <Card className="w-[166px] xxs:w-44 xs:w-56">
      <CardHeader>
        <div>
          <div className="text-xs">{assetInfo?.symbol}</div>
          <div className="text-2xl mt-2 flex w-[142px] xxs:w-[152px] xs:w-[200px] justify-center">
            {fmtDecimal(planck2Dot(order.amount, assetInfo?.decimals))}
          </div>
          <div className="flex justify-center w-[142px] xxs:w-[152px] xs:w-[200px]">
            <div className="text-xs mt-2 flex ml-1">
              10k {assetInfo?.symbol}&nbsp;=&nbsp;
            </div>
            <div className="text-xs text-primary mt-2 flex ">
              {toUsd(
                calcUnitPrice(
                  order.totalPrice,
                  order.amount,
                  assetInfo?.decimals,
                ),
                globalState.dotPrice,
              )}
            </div>
          </div>
        </div>
      </CardHeader>
      <Divider />
      <CardBody>
        <div className="w-full flex justify-between">
          <div className="flex">
            <Image className="w-4 mt-1" src="/dot_logo.png" />
            <div className="ml-1">{fmtDot(order.totalPrice)}</div>
          </div>
          <div className="text-xs mt-1">
            {toUsd(order.totalPrice, globalState.dotPrice)}
          </div>
        </div>
      </CardBody>
      <Divider />
      <CardFooter>
        <div>
          <div className="w-[142px] xxs:w-[152px]  xs:w-[200px] text-sm flex justify-between">
            <div>Seller</div>
            <Link
              className="text-xs"
              href={`${polkadotScan}/account/${order.seller}`}
              target="_blank"
            >
              {desensitizeAddress(order.seller)}
            </Link>
          </div>
          <Button
            className="w-[142px] xxs:w-[152px] xs:w-[200px] mt-3"
            color={
              order.seller == globalState.account || isLocked(order.status)
                ? 'default'
                : 'primary'
            }
            disabled={
              order.seller == globalState.account || isLocked(order.status)
            }
            onClick={onOpenBuyModal}
          >
            {isLocked(order.status) ? 'Trading' : 'Buy'}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};
