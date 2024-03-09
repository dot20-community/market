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
import { useEffect, useState } from 'react';
import { SellModal } from '../components/Modal/SellModal';

interface BalanceInfo {
  available: string;
  hold: string;
  tick: string;
  user_address: string;
}

async function getBalance(
  address: string,
): Promise<{ balance: BalanceInfo[] }> {
  // const resp = await fetch("http://localhost:3000/dota-api/v1/get_account_balance?account=" + address)
  // const data = await resp.json()
  // if (resp.status >= 300) {
  //   throw new Error(data.message || "server error")
  // }
  return {
    balance: [
      {
        available: '1790427939.0000000000000000',
        hold: '0E-16',
        tick: 'DOTA',
        user_address: '15DdbwbaY9W9gDn9ctuuUsMvTqR8P4FB9Nb3xRaQCgcGdr5x',
      },
    ],
  };
}

export function Account() {
  //const address = getCurrentAccountAddress()
  const address = '15DdbwbaY9W9gDn9ctuuUsMvTqR8P4FB9Nb3xRaQCgcGdr5x';
  const [dotaBalance, setDotaBalance] = useState(0);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();

  useEffect(() => {
    loadAccountInfo();
  }, []);

  async function loadAccountInfo() {
    const { balance } = await getBalance(address);
    console.log(balance);
    const available = balance.find((i) => i.tick === 'DOTA')?.available;
    if (available) {
      setDotaBalance(parseFloat(available));
    }
  }

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
            <TableRow key="1">
              <TableCell>DOTA</TableCell>
              <TableCell>
                {dotaBalance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              </TableCell>
              <TableCell>
                <Button onPress={onOpen} color="primary">
                  Sell
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
      <SellModal isOpen={isOpen} onOpenChange={onOpenChange} tick="DOTA" />
    </div>
  );
}
