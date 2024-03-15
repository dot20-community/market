import { useGlobalStateStore } from '@GlobalState';
import {
  Card,
  CardBody,
  CardHeader,
  Divider,
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@nextui-org/react';
import { fmtDecimal, toDecimal, toUsd } from '@utils/calc';
import { planck2Dot } from 'apps/libs/util';
import { FC, useState } from 'react';
import { MdOutlineVerified } from 'react-icons/md';

const veryfyTicks = ['dota'];

export interface TickCardContext {
  item: {
    tick: string;
    floorPrice: bigint;
    totalAmt: bigint;
    totalVol: bigint;
  };
  changeTick: (tick: string) => Promise<void>;
  selected: boolean;
}

export const TickCard: FC<TickCardContext> = ({
  item,
  changeTick,
  selected,
}) => {
  const globalState = useGlobalStateStore();
  const [isOpenPopover, setIsOpenPopover] = useState(false);
  return (
    <Popover placement="right" showArrow={true} isOpen={isOpenPopover}>
      <PopoverTrigger>
        <Card
          key={item.tick}
          isPressable={true}
          className={`w-[260px] cursor-pointer border-1 hover:border-primary ${
            selected && 'border-primary'
          }`}
          onClick={() => {
            changeTick(item.tick);
            console.log('asdfsfsdf');
          }}
          onMouseEnter={() => setIsOpenPopover(true)}
          onMouseLeave={() => setIsOpenPopover(false)}
        >
          <CardHeader className="flex gap-3 content-center justify-center items-center">
            <span className="text-xl font-bold">{item.tick.toUpperCase()}</span>
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
                  {fmtDecimal(planck2Dot(Number(item.totalVol)), 2)} DOT
                </span>
                <span className="text-foreground-400">Total Vol</span>
              </div>
            </div>
          </CardBody>
        </Card>
      </PopoverTrigger>
      <PopoverContent>
        <div className="px-1 py-2">
          <div className="text-small font-bold">
            {item.tick.toUpperCase()} INFO
          </div>
          <div className="text-tiny mt-2">
            <div className="px-1 py-2">Total Vol: 1000000 DOT</div>
            <div className="px-1 py-2">Holders: 9999</div>
            <div className="px-1 py-2">Total Supply: 21,000,000,000</div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};
