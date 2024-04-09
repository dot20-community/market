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
import { AssetInfo } from 'apps/backend/src/modules/asset';
import { planck2Dot } from 'apps/libs/util';
import { FC, useState } from 'react';
import { MdInfoOutline, MdOutlineVerified } from 'react-icons/md';

const veryfyAssets = ['18', '2633'];

export interface AssetCardContext {
  asset: AssetInfo;
  selected: boolean;
  changeAsset: (assetId: string) => Promise<void>;
}

export const AssetCard: FC<AssetCardContext> = ({
  asset,
  selected,
  changeAsset,
}) => {
  const globalState = useGlobalStateStore();
  const [isOpenPopover, setIsOpenPopover] = useState(false);
  return (
    <Card
      key={asset.id}
      isPressable={true}
      className={`w-[260px] cursor-pointer border-1 hover:border-primary ${
        selected && 'border-primary'
      }`}
      onClick={() => {
        changeAsset(asset.id);
      }}
    >
      <CardHeader className="flex gap-3 content-center justify-center items-center">
        <span className="text-xl font-bold">{asset.symbol}</span>
        {veryfyAssets.includes(asset.id) && (
          <MdOutlineVerified color="#4C6FFF" />
        )}
        <Popover
          placement="right"
          showArrow={true}
          isOpen={isOpenPopover}
          onOpenChange={(open) => setIsOpenPopover(open)}
          onClick={(e) => e.stopPropagation()}
        >
          <PopoverTrigger>
            <div
              className="absolute top-0 right-0 p-2"
              onMouseEnter={() => setIsOpenPopover(true)}
            >
              <MdInfoOutline fillOpacity="0.3" />
            </div>
          </PopoverTrigger>
          <PopoverContent>
            <div className="px-1 py-2">
              <div className="text-small font-bold">INFO</div>
              <div className="text-small mt-2">
                <div className="px-1 py-2">ID: {asset.id}</div>
                <div className="px-1 py-2">Name: {asset.name}</div>
                <div className="px-1 py-2">
                  Holders: {asset.holder.toLocaleString()}
                </div>
                <div className="px-1 py-2">
                  Total Supply:{' '}
                  {fmtDecimal(planck2Dot(asset.supply, asset.decimals))}
                </div>
                <div className="px-1 py-2">Decimals: {asset.decimals}</div>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </CardHeader>
      <Divider />
      <CardBody>
        <div className="flex gap-2 justify-center">
          <div className="flex flex-col items-center justify-center w-full">
            <span>
              {toUsd(
                toDecimal(asset.floorPrice).mul(10000),
                globalState.dotPrice,
              )}
            </span>
            <span className="text-foreground-400">Floor Price</span>
          </div>
          <Divider orientation="vertical" />
          <div className="flex flex-col items-center justify-center w-full">
            <span>{fmtDecimal(planck2Dot(asset.totalVol), 2)} DOT</span>
            <span className="text-foreground-400">Total Vol</span>
          </div>
        </div>
      </CardBody>
    </Card>
  );
};
