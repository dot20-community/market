import { useGlobalStateStore } from '@GlobalState';
import {
  Button,
  Divider,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@nextui-org/react';
import { calcUnitPrice, fmtDot, toUsd } from '@utils/calc';
import { assertError, trpc } from '@utils/trpc';
import { wallet } from '@utils/wallet';
import { dot2Planck } from 'apps/libs/util';
import Decimal from 'decimal.js';
import { FC, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

export interface SellModalContext {
  isOpen: boolean;
  onOpenChange: () => void;
  onSuccess: () => void;
  tick: string;
}

type FormType = {
  amount: number;
  totalPrice: number;
};

const marker = import.meta.env.VITE_MARKET_ACCOUNT;
const minTotalPrice = parseFloat(import.meta.env.VITE_MIN_SELL_TOTAL_PRICE);
const serviceFeeRate = new Decimal(import.meta.env.VITE_SERVER_FEE_RATE);

export const SellModal: FC<SellModalContext> = ({
  isOpen,
  onOpenChange,
  onSuccess,
  tick,
}) => {
  const globalState = useGlobalStateStore((state) => state);
  const account = globalState.account!!;
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<FormType>();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const { amount, totalPrice } = watch();
  const dotaBalance = trpc.account.tick.useQuery({ account, tick });
  const [balance, setBalance] = useState<Decimal>(new Decimal(0));
  const [balanceValidMsg, setBalanceValidMsg] = useState<string | undefined>();
  const sell = trpc.order.sell.useMutation();

  useEffect(() => {
    wallet.getBalance(account).then((balance) => {
      setBalance(new Decimal(balance.toString()));
    });
  }, [account]);

  const amountValid = (value: number): string | undefined => {
    if (!value || value.toString().includes('.')) {
      return 'Amount must be a positive integer';
    }
    if ((dotaBalance?.data?.balance ?? 0) < value) {
      return 'Amount exceeds the available balance';
    }
  };

  const totalPriceValid = (value: number): string | undefined => {
    if (!value) {
      return 'Total price must be a number';
    }
    if (value < minTotalPrice) {
      return `Total price at least ${minTotalPrice} DOT`;
    }
    // 检查小数点位数是否超过4位
    if (new Decimal(value).dp() > 4) {
      return 'Total price must be a number with at most 4 decimal places';
    }
  };

  // 铭文单价
  let unitPricePlanck = new Decimal(0);
  // 总价格
  let totalPricePlanck = new Decimal(0);
  // 服务费
  let serviceFeePlanck = new Decimal(0);
  // gas费
  let gasFeePlanck = dot2Planck(globalState.gasFee);
  // 实际需支付价格(服务费+gas费)
  let payPricePlanck = new Decimal(0);
  if (amount && totalPrice) {
    const amountDec = new Decimal(amount);
    totalPricePlanck = dot2Planck(totalPrice);
    unitPricePlanck = calcUnitPrice(totalPricePlanck, amountDec);
    serviceFeePlanck = totalPricePlanck.mul(serviceFeeRate);
    payPricePlanck = serviceFeePlanck.add(gasFeePlanck);
  }

  useEffect(() => {
    setBalanceValidMsg(
      balance.lt(serviceFeePlanck) ? 'Insufficient Balance' : undefined,
    );
  }, [balance, totalPrice]);

  async function onConfirm(data: FormType, onClose: () => void) {
    setConfirmLoading(true);
    try {
      await wallet.open();
      const signedExtrinsic = await wallet.signTransferInscribe(
        account,
        marker,
        serviceFeePlanck,
        tick,
        data.amount,
      );
      await sell.mutateAsync({
        seller: account,
        totalPrice: totalPricePlanck.toFixed(),
        signedExtrinsic,
      });
      onClose();
      onSuccess();
      toast.success(
        'Listing success, please wait for DOT20 index update, it may take a few minutes.',
      );
    } catch (e) {
      console.error(e);
      const error = assertError(e);
      if (error.code === 'USER_REJECTED') {
        toast.warn('User rejected');
        return;
      }
      toast.error(error.code);
    } finally {
      setConfirmLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      isDismissable={false}
      placement="top-center"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              Listing Confirmation
            </ModalHeader>
            <ModalBody>
              <Input
                {...register('amount', {
                  valueAsNumber: true,
                  validate: { amountValid },
                })}
                autoFocus
                isRequired
                label="List Amount"
                variant="bordered"
                isInvalid={!!errors.amount}
                errorMessage={errors.amount?.message?.toString()}
              />
              <div className="flex justify-end text-small">
                <span className="text-primary">
                  Available {tick.toLocaleUpperCase()}
                </span>
                <span className="ml-2 italic">
                  {dotaBalance.data?.balance?.toLocaleString()}
                </span>
              </div>
              <Input
                {...register('totalPrice', {
                  valueAsNumber: true,
                  validate: { totalPriceValid },
                })}
                isRequired
                label="Total Price"
                variant="bordered"
                isInvalid={!!errors.totalPrice}
                errorMessage={errors.totalPrice?.message?.toString()}
                endContent={
                  <div className="pointer-events-none flex items-center">
                    <span className="text-default-400 text-small">DOT</span>
                  </div>
                }
              />

              <div className="flex justify-between mt-4">
                <span>Unit Price (10k)</span>
                <span>
                  {fmtDot(unitPricePlanck)} DOT ≈{' '}
                  {toUsd(unitPricePlanck, globalState.dotPrice)}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Total Price</span>
                <span>
                  {fmtDot(totalPricePlanck)} DOT ≈{' '}
                  {toUsd(totalPricePlanck, globalState.dotPrice)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>
                  {`Service Fee (${serviceFeeRate
                    .mul(new Decimal(100))
                    .toFixed()}%)`}
                </span>
                <span>
                  {fmtDot(serviceFeePlanck)} DOT ≈{' '}
                  {toUsd(serviceFeePlanck, globalState.dotPrice)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Gas Fee</span>
                <span>
                  {fmtDot(gasFeePlanck)} DOT ≈{' '}
                  {toUsd(gasFeePlanck, globalState.dotPrice)}
                </span>
              </div>
              <Divider className="my-4" />
              <div className="flex justify-between font-bold">
                <span>Pay Price</span>
                <span>
                  {fmtDot(payPricePlanck)} DOT ≈{' '}
                  {toUsd(payPricePlanck, globalState.dotPrice)}
                </span>
              </div>
              <div className="flex justify-end text-small">
                <span className="text-primary">Available DOT</span>
                <span className="ml-2 italic">{fmtDot(balance)}</span>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                isLoading={confirmLoading}
                color={balanceValidMsg ? 'default' : 'primary'}
                disabled={!!balanceValidMsg}
                onClick={handleSubmit((data) => onConfirm(data, onClose))}
              >
                {balanceValidMsg || 'Confirm'}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
