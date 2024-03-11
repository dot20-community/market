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
import { useGlobalStateStore } from '@GlobalState';
import { assertError } from '@utils/trpc';
import { fmtAddress } from 'apps/libs/util';
import { useEffect, useState } from 'react';
import { IoWalletOutline } from 'react-icons/io5';
import { RiArrowDropDownLine, RiMoneyDollarCircleLine } from 'react-icons/ri';
import { Link as Linkto, Outlet } from 'react-router-dom';
import { toast } from 'react-toastify';
import { desensitizeAddress, wallet } from '../utils/wallet';

export function Layout() {
  const { account, setAccount } = useGlobalStateStore();
  const [connectLoading, setConnectLoading] = useState(false);
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);

  useEffect(() => {
    void loadAccounts();
  }, []);

  async function loadAccounts() {
    // 如果已经连接钱包，直接通过钱包扩展获取账户列表
    if (account) {
      await wallet.open();
      setAccounts(wallet.accounts);
    }
  }

  async function handleConnect() {
    setConnectLoading(true);
    try {
      await wallet.open();
      setAccounts(wallet.accounts);
      setAccount(wallet.accounts[0].address);
    } catch (e) {
      console.error(e);
      const err = assertError(e);
      if (err.code === 'NO_EXTENSION') {
        toast.warn('No wallet extension found');
        return;
      }
      if (err.code === 'NO_ACCOUNT') {
        toast.warn('Please select an account in the wallet');
        return;
      }
      toast.error(err.code);
    } finally {
      setConnectLoading(false);
    }
  }

  return (
    <div>
      <Navbar
        position="static"
        isBordered
        className="bg-background/70 pl-2 pr-2"
        maxWidth="full"
      >
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
            {account ? (
              <Dropdown>
                <DropdownTrigger>
                  <Button
                    startContent={<IoWalletOutline size={24} />}
                    endContent={<RiArrowDropDownLine size={24} />}
                    variant="shadow"
                    className="capitalize"
                    color="primary"
                    radius="full"
                  >
                    {desensitizeAddress(account)}
                  </Button>
                </DropdownTrigger>
                <DropdownMenu
                  aria-label="Single selection example"
                  variant="flat"
                  color="primary"
                  disallowEmptySelection
                  selectionMode="single"
                  selectedKeys={[account]}
                  onSelectionChange={(keys) => {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    const currentKey = keys['currentKey'] as string;
                    if (currentKey === 'disconnect') {
                      setAccounts([]);
                      setAccount(undefined);
                    } else {
                      setAccount(currentKey);
                    }
                  }}
                >
                  {[
                    ...accounts.map((account, index) => {
                      const address = fmtAddress(account.address);
                      return (
                        <DropdownItem
                          color="primary"
                          key={address}
                          showDivider={index == accounts.length - 1}
                        >{`Account${index + 1} [${desensitizeAddress(
                          address,
                        )}]`}</DropdownItem>
                      );
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
              <Button isIconOnly color="primary" aria-label="Balance">
                <RiMoneyDollarCircleLine size={24} />
              </Button>
            </Linkto>
          </NavbarItem>
        </NavbarContent>
      </Navbar>

      <Outlet />
    </div>
  );
}
