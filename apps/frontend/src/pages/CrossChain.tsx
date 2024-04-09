import { useGlobalStateStore } from '@GlobalState';
import {
  Button,
  Card,
  CardBody,
  CardFooter,
  CardHeader,
  Input,
  Select,
  SelectItem,
} from '@nextui-org/react';
import { fmtDot } from '@utils/calc';
import { wallet } from '@utils/wallet';
import { dot2Planck, getPolkadotDecimals, isSS58Address } from 'apps/libs/util';
import Decimal from 'decimal.js';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { FaArrowRightArrowLeft } from 'react-icons/fa6';

type FormType = {
  amount: number;
  destAddress: string;
};

const chains = [
  {
    id: 0,
    name: 'DOT',
    icon: '/dot_logo2.svg',
    transferFee: 0.065,
    receiveFee: 0.003,
    minBalance: 1,
  },
  {
    id: 1000,
    name: 'AssetHub',
    icon: '/assethub_logo.svg',
    transferFee: 0.0386,
    receiveFee: 0.00014,
    minBalance: 0.01,
  },
];

export function CrossChain() {
  const globalState = useGlobalStateStore();
  const account = globalState.account ?? '';
  const [sourceChainIndex, setSourceChainIndex] = useState<string>('0');
  const [destChainIndex, setDestChainIndex] = useState<string>('1');
  const [balance, setBalance] = useState<Decimal>(new Decimal(0));
  const [invalidMsg, setInvalidMsg] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const sourcechain = chains[parseInt(sourceChainIndex)];
  const destChain = chains[parseInt(destChainIndex)];

  async function refreshBalance() {
    if (!account) {
      return;
    }
    if (sourcechain.id === 0) {
      wallet.getBalance(account).then((balance) => {
        setBalance(new Decimal(balance.toString()));
      });
    } else if (sourcechain.id === 1000) {
      wallet.getAssetHubBalance(account).then((balance) => {
        setBalance(new Decimal(balance.toString()));
      });
    }
  }
  useEffect(() => {
    refreshBalance();
  }, [account, sourceChainIndex]);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    resetField,
  } = useForm<FormType>({ defaultValues: { destAddress: account } });
  const { amount, destAddress } = watch();

  const amountValid = (value: number): string | undefined => {
    if (balance.lt(value)) {
      return 'Amount exceeds the available balance';
    }
    // 检查小数点位数是否超过资产精度
    const assetDecimals = getPolkadotDecimals();
    if (new Decimal(value).dp() > assetDecimals) {
      return `List amount must be a number with at most ${assetDecimals} decimal places`;
    }
  };
  const destAddressValid = (value: string): string | undefined => {
    if (isSS58Address(value)) {
      return 'Invalid address';
    }
  };
  useEffect(() => {
    if (sourceChainIndex === destChainIndex) {
      setInvalidMsg('Transfer');
    } else {
      if (amount) {
        const isInvalid = dot2Planck(amount).gt(
          balance
            .sub(dot2Planck(sourcechain.minBalance))
            .sub(dot2Planck(sourcechain.transferFee)),
        );
        if (isInvalid) {
          setInvalidMsg('Insufficient Balance');
        } else {
          setInvalidMsg(undefined);
        }
      }
    }
  }, [balance, amount, sourceChainIndex, destChainIndex]);

  return (
    <div className="flex justify-center">
      <Card className="w-[480px] mt-14">
        <CardHeader>
          <p className="ml-4 mt-2 text-primary">
            <b>CROSS-CHAIN</b>
          </p>
        </CardHeader>
        <CardBody>
          <div className="flex justify-between">
            <Select
              size="lg"
              label="Source chain"
              className="w-2/5 ml-4"
              onChange={(e) => setSourceChainIndex(e.target.value)}
              selectedKeys={[sourceChainIndex]}
              startContent={<img width="24px" src={sourcechain.icon} />}
            >
              {chains.map((chain, index) => (
                <SelectItem
                  key={index}
                  value={index}
                  startContent={<img width="24px" src={chain.icon} />}
                >
                  {chain.name}
                </SelectItem>
              ))}
            </Select>
            <FaArrowRightArrowLeft
              className="mt-5 cursor-pointer"
              onClick={() => {
                setSourceChainIndex(destChainIndex);
                setDestChainIndex(sourceChainIndex);
              }}
            />
            <Select
              size="lg"
              label="Destination chain"
              className="w-2/5 mr-4"
              onChange={(e) => setDestChainIndex(e.target.value)}
              selectedKeys={[destChainIndex]}
              startContent={<img width="24px" src={destChain.icon} />}
            >
              {chains.map((chain, index) => (
                <SelectItem
                  key={index}
                  value={index}
                  startContent={<img width="24px" src={chain.icon} />}
                >
                  {chain.name}
                </SelectItem>
              ))}
            </Select>
          </div>
          <div className="flex justify-center mt-10">
            <Input
              type="number"
              className="w-11/12"
              {...register('amount', {
                valueAsNumber: true,
                validate: { amountValid },
              })}
              autoFocus
              isRequired
              autoComplete="off"
              label="Amount"
              variant="bordered"
              isInvalid={!!errors.amount}
              errorMessage={errors.amount?.message?.toString()}
              value={amount ? String(amount) : ''}
              endContent={
                <div className="flex items-center z-50 gap-2">
                  <span className="text-default-400 text-small">DOT</span>
                  <Button
                    size="sm"
                    radius="full"
                    color="primary"
                    onPress={() => {
                      const maxAmount =
                        parseFloat(
                          fmtDot(
                            balance
                              .sub(dot2Planck(sourcechain.minBalance))
                              .sub(dot2Planck(sourcechain.transferFee)),
                          ),
                        ) || 0;
                      maxAmount > 0 && setValue('amount', maxAmount);
                    }}
                  >
                    Max
                  </Button>
                </div>
              }
            />
          </div>
          <div className="flex justify-center mt-4">
            <Input
              className="w-11/12"
              {...register('destAddress', {
                validate: { destAddressValid },
              })}
              autoFocus
              isRequired
              autoComplete="off"
              label="Destination address"
              variant="bordered"
              isInvalid={!!errors.destAddress}
              errorMessage={errors.destAddress?.message?.toString()}
              value={destAddress}
            />
          </div>
          <div className="flex justify-end text-small mt-3 text-default-500">
            <span className="text-primary">Available DOT</span>
            <span className="ml-2 mr-6 italic">{fmtDot(balance)}</span>
          </div>
          <div className="flex justify-between text-tiny text-default-500 mt-4 mx-6">
            <span>Source Chain Fee</span>
            <span>{sourcechain.transferFee} DOT</span>
          </div>
          <div className="flex justify-between text-tiny text-default-500 mt-1 mx-6">
            <span>Destination Chain Fee</span>
            <span>{destChain.receiveFee} DOT</span>
          </div>
        </CardBody>
        <CardFooter className="w-full flex justify-center">
          <Button
            isLoading={isLoading}
            className="w-11/12"
            color={invalidMsg ? 'default' : 'primary'}
            disabled={!!invalidMsg}
            onClick={handleSubmit((data) => {
              setIsLoading(true);
              if (sourcechain.id === 0) {
                wallet.dot2AssetHub(
                  account,
                  data.destAddress,
                  data.amount,
                  () => {
                    refreshBalance();
                    resetField('amount');
                    setIsLoading(false);
                  },
                );
              } else if (sourcechain.id === 1000) {
                wallet.assetHub2Dot(
                  account,
                  data.destAddress,
                  data.amount,
                  () => {
                    refreshBalance();
                    resetField('amount');
                    setIsLoading(false);
                  },
                );
              }
            })}
          >
            {invalidMsg || 'Transfer'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
