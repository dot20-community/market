import { useGlobalStateStore } from '@GlobalState';
import {
  Button,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  useDisclosure,
} from '@nextui-org/react';
import { fmtDecimal } from '@utils/calc';
import { AssetInfo } from 'apps/backend/src/modules/asset';
import { getAssetHubApi, getAssetsBalance, planck2Dot } from 'apps/libs/util';
import Decimal from 'decimal.js';
import { useEffect, useState } from 'react';
import { SellModal } from '../components/Modal/SellModal';

export function Account() {
  const globalState = useGlobalStateStore();
  const account = globalState.account;
  const [loading, setLoading] = useState<boolean>(false);
  const [assetList, setAssetList] = useState<
    {
      asset: AssetInfo;
      balance: Decimal;
    }[]
  >([]);
  const [assetId, setAssetId] = useState<string>('');
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  useEffect(() => {
    if (!account || !globalState.assetInfos.length) {
      return;
    }

    (async function () {
      setLoading(true);
      try {
        const api = await getAssetHubApi();
        const assetList = await getAssetsBalance(
          api,
          globalState.assetInfos.map((item) => item.id),
          account,
        );
        setAssetList(
          assetList.map((item, index) => ({
            asset: globalState.assetInfos[index],
            balance: item.balance,
          })),
        );
      } finally {
        setLoading(false);
      }
    })();
  }, [account, globalState.assetInfos]);

  return (
    <div>
      <div className="flex justify-center mt-10">
        <Table className="w-2/3">
          <TableHeader>
            <TableColumn>TOKEN</TableColumn>
            <TableColumn>SUPPLY</TableColumn>
            <TableColumn>HOLDER</TableColumn>
            <TableColumn>BALANCE</TableColumn>
            <TableColumn>ACTION</TableColumn>
          </TableHeader>
          <TableBody
            emptyContent={
              loading ? 'Loading...' : account ? 'No Result' : 'Please Login'
            }
          >
            {assetList.map((item) => (
              <TableRow key={item.asset.id}>
                <TableCell>
                  <Chip>{item.asset.symbol}</Chip>
                </TableCell>
                <TableCell>{item.asset.supply.toLocaleString()}</TableCell>
                <TableCell>{item.asset.holder.toLocaleString()}</TableCell>
                <TableCell>
                  {fmtDecimal(planck2Dot(item.balance, item.asset.decimals))}
                </TableCell>
                <TableCell>
                  <Button
                    onClick={() => {
                      setAssetId(item.asset.id);
                      onOpen();
                    }}
                    color="primary"
                  >
                    Trade
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {account && (
        <SellModal
          assetId={assetId}
          isOpen={isOpen}
          onOpenChange={onOpenChange}
          onSuccess={() => {
            location.href = '/market';
          }}
        />
      )}
    </div>
  );
}
