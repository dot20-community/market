import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownTrigger,
  Image,
  Link,
  Navbar,
  NavbarBrand,
  NavbarContent,
  NavbarItem,
} from '@nextui-org/react';
import type { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { trpc } from '@utils/trpc';
import { useEffect, useState } from 'react';
import { Wallet, fmtBalance } from '../utils/wallet';

export function Home() {
  const [connectLoading, setConnectLoading] = useState(false);
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([])
  const [selectedAccountIndex, setSelectedAccountIndex] = useState(0);

  const sell = trpc.order.sell.useMutation();
  const wallet = new Wallet();

  useEffect(() => {
    void loadAccounts()
  }, []);

  async function loadAccounts() {
    const accountsStr = localStorage.getItem("DotWalletAccounts")
    if (accountsStr) {
      wallet.setAccountsFromJSON(accountsStr);
      setAccounts(wallet.accounts);
    }
  }

  async function handleConnect() {
    setConnectLoading(true);
    try {
      console.log('Account balance 0:', 111);
      await wallet.open();
      console.log('Account balance 1:', 111);
      const balace = await wallet.getBalance(wallet.accounts[0].address);
      console.log('Account balance 2:', balace);
      console.log('Account balance 3:', fmtBalance(balace));

      localStorage.setItem("DotWalletAccounts", JSON.stringify(wallet.accounts))
      setAccounts(wallet.accounts);

      // const serializedTransfer = await wallet.signTransferInscribe(
      //   wallet.accounts[0].address,
      //   '5GBRPdwiDdSG5EKn1Zec3mw7umogG23aP2YDDjEhGvFdPNeQ',
      //   '0',
      //   'DOTA',
      //   '100',
      // );
      // console.log('Serialized signed transfer:', serializedTransfer);
      // const resp = await create.mutateAsync({
      //   from: wallet.accounts[0].address,
      //   signedTransfer: serializedTransfer,
      // });
      // console.log('Create order response:', resp);
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
              {
                accounts.length > 0 ? (<Dropdown>
                  <DropdownTrigger>
                    <Button 
                      variant="shadow" 
                      className="capitalize"
                      color="primary"
                      radius="full"
                    >
                      {`Account${selectedAccountIndex + 1} [${accounts[selectedAccountIndex].address.substring(0, 6)}...${accounts[selectedAccountIndex].address.substring(accounts[selectedAccountIndex].address.length - 6)}]`}
                    </Button>
                  </DropdownTrigger>
                  <DropdownMenu 
                    aria-label="Single selection example"
                    variant="flat"
                    color="primary"
                    disallowEmptySelection
                    selectionMode="single"
                    onSelectionChange={(keys) => {
                      const currentKey = keys["currentKey"] as string
                      if (currentKey == "disconnect") {
                        localStorage.setItem("DotWalletAccounts", "");
                        setAccounts([]);
                      } else {
                        setSelectedAccountIndex(parseInt(currentKey));
                      }
                    }}
                  >
                    {[...accounts.map((account, index) => (
                      <DropdownItem color="primary" key={index}>{`Account${index + 1} [${account.address.substring(0, 6)}...${account.address.substring(account.address.length - 6)}]`}</DropdownItem>
                    )), <DropdownItem color="primary" key="disconnect">Disconnect</DropdownItem>
                    ]}
                  </DropdownMenu>
                </Dropdown>) : (<Button
                  color="primary"
                  variant="shadow"
                  radius="full"
                  className="text-large"
                  isLoading={connectLoading}
                  onClick={handleConnect}
                >
                  Connect Wallet
                </Button>)
              }
            </NavbarItem>
      </NavbarContent>
    </Navbar>
  );
}

export default Home;
