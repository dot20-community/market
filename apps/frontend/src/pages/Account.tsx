import {
  Button,
  Table,
  TableBody,
  TableCell,
  TableColumn,
  TableHeader,
  TableRow,
  useDisclosure,
} from '@nextui-org/react';
import { trpc } from '@utils/trpc';
import { getCurrentAccountAddress } from '@utils/wallet';
import { useEffect, useState } from 'react';
import { SellModal } from '../components/Modal/SellModal';

const address = getCurrentAccountAddress();

export function Account() {
  const tickList = trpc.account.tickList.useQuery({ account: address });
  const [tick, setTick] = useState<string>('');
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  useEffect(() => {
    console.log('tickList', tickList);
  }, [tickList]);

  return (
    <div>
      <div className="flex justify-center mt-10">
        <Table className="w-2/3">
          <TableHeader>
            <TableColumn>TOKEN</TableColumn>
            <TableColumn>BALANCE</TableColumn>
            <TableColumn>OPTION</TableColumn>
          </TableHeader>
          <TableBody>
            {(tickList.data || []).map((item) => (
              <TableRow key="1">
                <TableCell>{item.tick}</TableCell>
                <TableCell>{item.balance.toLocaleString()}</TableCell>
                <TableCell>
                  <Button
                    onClick={() => {
                      setTick(item.tick);
                      onOpen();
                    }}
                    color="primary"
                  >
                    Sell
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <SellModal isOpen={isOpen} onOpenChange={onOpenChange} tick={tick} />
    </div>
  );
}
