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
import type { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { fmtAddress } from 'apps/libs/util';
import { useEffect, useState } from 'react';
import { Link as Linkto, Outlet } from 'react-router-dom';
import { Wallet } from '../utils/wallet';

export function Layout() {
  const [connectLoading, setConnectLoading] = useState(false);
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
  const [selectedAccountIndex, setSelectedAccountIndex] = useState(0);

  // const sell = trpc.order.sell.useMutation();
  const wallet = new Wallet();

  useEffect(() => {
    void loadAccounts();
  }, []);

  async function loadAccounts() {
    const accountsStr = localStorage.getItem('DotWalletAccounts');
    if (accountsStr) {
      wallet.setAccountsFromJSON(accountsStr);
      setAccounts(wallet.accounts);
    }
    const selectedAccountIndexStr = localStorage.getItem("selectedAccountIndex");
    if (selectedAccountIndexStr) {
      setSelectedAccountIndex(parseInt(selectedAccountIndexStr))
    }
  }

  async function handleConnect() {
    setConnectLoading(true);
    try {
      await wallet.open();
      localStorage.setItem(
        'DotWalletAccounts',
        JSON.stringify(wallet.accounts),
      );
      setAccounts(wallet.accounts);

      // // 总价 2 DOT
      // const totalPrice = dot2Planck(2);
      // // 服务费 2 * 0.02
      // const serviceFee = totalPrice
      //   .mul(import.meta.env.VITE_SERVER_FEE_RATE)
      //   .ceil();
      // // 总共应付 总价 + 服务费
      // const totalPayPrice = totalPrice.add(serviceFee);
      // const signedExtrinsic = await wallet.signTransferInscribe(
      //   wallet.accounts[0].address,
      //   '157iXyCn5QhjWmLHyChcBvmGmPoKxKbiTXGhP2E3q1H9ZuMd',
      //   totalPayPrice,
      //   'DOTA',
      //   10000,
      // );

      // const resp = await sell.mutateAsync({
      //   seller: wallet.accounts[0].address,
      //   totalPrice: totalPrice.toFixed(),
      //   serviceFee: serviceFee.toFixed(),
      //   signedExtrinsic: signedExtrinsic,
      // });
      // console.log('Create order response:', resp);
    } catch (e) {
      console.error('Error:', e);
      throw e;
    } finally {
      setConnectLoading(false);
    }
  }

  let currentAddress = ""
  if (accounts[selectedAccountIndex]) {
    currentAddress = fmtAddress(accounts[selectedAccountIndex].address)
  }

  return (
    <div>
      <Navbar position="static" isBordered className="bg-background/70">
        <NavbarBrand>
          <Image src="/logo.svg" alt="logo" width={120} height={40} />
        </NavbarBrand>
        <NavbarContent className="hidden gap-12 md:flex" justify="center">
          <NavbarItem isActive>
            <Link href="/market" aria-current="page">
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
            {accounts.length > 0 ? (
              <Dropdown>
                <DropdownTrigger>
                  <Button
                    variant="shadow"
                    className="capitalize"
                    color="primary"
                    radius="full"
                  >
                    {`Account${selectedAccountIndex + 1} [${currentAddress.substring(0, 6)}...${currentAddress.substring(
                      currentAddress.length - 6,
                    )}]`}
                  </Button>
                </DropdownTrigger>
                <DropdownMenu
                  aria-label="Single selection example"
                  variant="flat"
                  color="primary"
                  disallowEmptySelection
                  selectionMode="single"
                  onSelectionChange={(keys) => {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    const currentKey = keys['currentKey'] as string;
                    if (currentKey === 'disconnect') {
                      localStorage.setItem('DotWalletAccounts', '');
                      setAccounts([]);
                    } else {
                      setSelectedAccountIndex(parseInt(currentKey));
                    }
                  }}
                >
                  {[
                    ...accounts.map((account, index) => {
                      const address = fmtAddress(account.address)
                      return <DropdownItem color="primary" key={index}>{`Account${
                        index + 1
                      } [${address.substring(
                        0,
                        6,
                      )}...${address.substring(
                        address.length - 6,
                      )}]`}</DropdownItem>
                    }),
                    <DropdownItem color="primary" key="disconnect">
                      Disconnect
                    </DropdownItem>,
                  ]}
                </DropdownMenu>
              </Dropdown>
            ) : (
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
            )}
          </NavbarItem>
          <NavbarItem>
            <Linkto to="/account">
              <Button isIconOnly color="primary" aria-label="Like">
                <svg
                  width="25"
                  height="25"
                  viewBox="0 0 25 25"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <g id="currency-dollar-circle">
                    <path
                      id="Icon"
                      d="M8.63159 15.1667C8.63159 16.4553 9.67626 17.5 10.9649 17.5H13.1316C14.5123 17.5 15.6316 16.3807 15.6316 15C15.6316 13.6193 14.5123 12.5 13.1316 12.5H11.1316C9.75088 12.5 8.63159 11.3807 8.63159 10C8.63159 8.61929 9.75088 7.5 11.1316 7.5H13.2983C14.5869 7.5 15.6316 8.54467 15.6316 9.83333M12.1316 6V7.5M12.1316 17.5V19M22.1316 12.5C22.1316 18.0228 17.6544 22.5 12.1316 22.5C6.60874 22.5 2.13159 18.0228 2.13159 12.5C2.13159 6.97715 6.60874 2.5 12.1316 2.5C17.6544 2.5 22.1316 6.97715 22.1316 12.5Z"
                      stroke="white"
                      stroke-width="2"
                      stroke-linecap="round"
                      stroke-linejoin="round"
                    />
                  </g>
                </svg>
              </Button>
            </Linkto>
          </NavbarItem>
        </NavbarContent>
      </Navbar>

      <Outlet />
    </div>
  );
}
