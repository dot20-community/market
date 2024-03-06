import {
    Button,
    Image,
    Link,
    Navbar,
    NavbarBrand,
    NavbarContent,
    NavbarItem,
} from '@nextui-org/react';
import { trpc } from '@utils/trpc';
import { useState } from 'react';
import { Wallet, fmtBalance } from '../utils/wallet';

export function Home() {
  const [connectLoading, setConnectLoading] = useState(false);
  const sell = trpc.order.sell.useMutation();

  async function handleConnect() {
    setConnectLoading(true);
    const wallet = new Wallet();
    try {
      console.log('Account balance 0:', 111);
      await wallet.open();
      console.log('Account balance 1:', 111);
      const balace = await wallet.getBalance(wallet.accounts[0].address);
      console.log('Account balance 2:', balace);
      console.log('Account balance 3:', fmtBalance(balace));

      const serializedTransfer = await wallet.signTransferInscribe(
        wallet.accounts[0].address,
        '5GBRPdwiDdSG5EKn1Zec3mw7umogG23aP2YDDjEhGvFdPNeQ',
        '0',
        'DOTA',
        '100',
      );
      console.log('Serialized signed transfer:', serializedTransfer);
      const resp = await sell.mutateAsync({
        from: wallet.accounts[0].address,
        signedTransfer: serializedTransfer,
      });
      console.log('Create order response:', resp);
    } catch (e) {
      console.error('Error:', e);
    } finally {
      setConnectLoading(false);
    }
  }
  return (
    <Navbar position="static" isBordered className="bg-background/70">
      <NavbarBrand>
        <Image src="/logo.svg" alt="logo" width={120} height={40} />
      </NavbarBrand>
      <NavbarContent className="hidden gap-12 md:flex" justify="center">
        <NavbarItem isActive>
          <Link href="#" aria-current="page">
            MARKETPLACE
          </Link>
        </NavbarItem>
        <NavbarItem>
          <Link
            color="foreground"
            href="https://dota.fyi/inscribe/"
            target="_blank"
          >
            INSCRIBE
          </Link>
        </NavbarItem>
      </NavbarContent>
      <NavbarContent justify="end">
        <NavbarItem>
          <Button
            color="primary"
            variant="shadow"
            radius="full"
            className="text-large"
            isLoading={connectLoading}
            onClick={handleConnect}
          >
            Connect Wallet
          </Button>
        </NavbarItem>
      </NavbarContent>
    </Navbar>
  );
}

export default Home;
