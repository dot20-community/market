import { useGlobalStateStore } from '@GlobalState';
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Divider,
  Image,
} from '@nextui-org/react';
import { Order, Status } from '@prisma/client';
import { calcUnitPrice, fmtDot, toUsd } from '@utils/calc';
import { FC } from 'react';

const statusText: Record<Status, string | undefined> = {
  PENDING: 'Indexing',
  LISTING: undefined,
  CANCELING: 'Indexing',
  CANCELED: 'Canceled',
  LOCKED: 'Locked',
  FAILED: 'Failed',
  SOLD: 'Sold',
};

export interface MyListCardContext {
  order: Order;
  onOpenCancelModal: () => void;
}

export const MyListCard: FC<MyListCardContext> = ({
  order,
  onOpenCancelModal,
}) => {
  const globalState = useGlobalStateStore();
  const assetInfo = globalState.assetInfos.find(
    (asset) => asset.id === order.assetId,
  );

  return (
    <Card className="w-[166px] xxs:w-44 xs:w-56">
      <CardHeader>
        <div>
          <div className="text-xs">{assetInfo?.symbol.toUpperCase()}</div>
          <div className="text-2xl mt-2 flex w-[142px] xxs:w-[152px]  xs:w-[200px] justify-center">
            {order.amount.toLocaleString()}
          </div>
          <div className="text-xs text-primary mt-2 flex w-[142px] xxs:w-[152px]  xs:w-[200px] justify-center">
            {toUsd(
              calcUnitPrice(order.totalPrice, order.amount),
              globalState.dotPrice,
            )}
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
          <Button
            className="w-[142px] xxs:w-[152px] xs:w-[200px] mt-3"
            color={!statusText[order.status] ? 'primary' : 'default'}
            disabled={!!statusText[order.status]}
            onClick={onOpenCancelModal}
          >
            {statusText[order.status] || 'Cancel'}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};
