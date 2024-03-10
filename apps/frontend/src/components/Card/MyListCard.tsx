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
import { fmtDot, toUsd } from '@utils/wallet';
import Decimal from 'decimal.js';
import { FC } from 'react';

export interface MyListCardContext {
  order: Order;
}

export const MyListCard: FC<MyListCardContext> = ({ order }) => {
  const globalState = useGlobalStateStore();

  const totalPricePlanck = new Decimal(order.totalPrice.toString());
  const unitPricePlanck = totalPricePlanck.div(
    new Decimal(order.amount.toString()),
  );

  function isListing(status: Status) {
    return order.status === 'LISTING';
  }

  return (
    <div className="mt-4">
      <Card className="w-[220px]">
        <CardHeader>
          <div>
            <div className="text-xs">DOTA</div>
            <div className="text-2xl mt-2 flex w-[200px] justify-center">
              {order.amount.toString()}
            </div>
            <div className="text-xs text-primary mt-2 flex w-[200px] justify-center">
              {toUsd(unitPricePlanck, globalState.dotPrice)}
            </div>
          </div>
        </CardHeader>
        <Divider />
        <CardBody>
          <div className="w-full flex justify-between">
            <div className="flex">
              <Image className="w-4 mt-1" src="/dot_logo.png" />
              <div className="ml-1">{fmtDot(totalPricePlanck)}</div>
            </div>
            <div className="text-xs mt-1">
              {toUsd(totalPricePlanck, globalState.dotPrice)}
            </div>
          </div>
        </CardBody>
        <Divider />
        <CardFooter>
          <div>
            <Button
              className="w-[200px] mt-3"
              color={isListing(order.status) ? 'primary' : 'default'}
              disabled={!isListing(order.status)}
            >
              {isListing(order.status) ? 'Cancel' : 'Pending'}
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};
