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
import { trpc } from '@utils/trpc';
import { TickListRes } from 'apps/backend/src/modules/account';
import { useEffect, useState } from 'react';
import { SellModal } from '../components/Modal/SellModal';

export function Account() {
  const globalState = useGlobalStateStore();
  const account = globalState.account ?? '';
  const { client } = trpc.useUtils();
  const [tickList, setTickList] = useState<TickListRes>([]);
  const [tick, setTick] = useState<string>('dota');
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  const tickTrending = trpc.tick.trending.useQuery();
  const selectTickFloorPrice = tickTrending.data?.find(i => i.tick == tick)?.floorPrice || 0n
  
  useEffect(() => {
    if (account) {
      client.account.tickList.query({ account }).then(setTickList);
    }
  }, [account]);

  return (
    <div>
      <div className="flex justify-center mt-10">
        <Table className="w-2/3">
          <TableHeader>
            <TableColumn>TOKEN</TableColumn>
            <TableColumn>BALANCE</TableColumn>
            <TableColumn>ACTION</TableColumn>
          </TableHeader>
          <TableBody emptyContent={account ? 'No Result' : 'Please Login'}>
            {tickList.map((item) => (
              <TableRow key={item.tick}>
                <TableCell>
                  <Chip>{item.tick}</Chip>
                </TableCell>
                <TableCell>{item.balance.toLocaleString()}</TableCell>
                <TableCell>
                  <Button
                    onClick={() => {
                      setTick(item.tick);
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
          isOpen={isOpen}
          onOpenChange={onOpenChange}
          onSuccess={() => {
            location.href = '/market';
          }}
          tick={tick}
          floorPrice={selectTickFloorPrice}
        />
      )}
    </div>
  );
}
