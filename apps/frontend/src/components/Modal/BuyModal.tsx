import { useGlobalStateStore } from '@GlobalState';
import {
  Button,
  Divider,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@nextui-org/react';
import { Order } from '@prisma/client';
import { calcUnitPrice, fmtDot, toDecimal, toUsd } from '@utils/calc';
import { assertError, trpc } from '@utils/trpc';
import { wallet } from '@utils/wallet';
import { dot2Planck } from 'apps/libs/util';
import Decimal from 'decimal.js';
import { FC, useEffect, useState } from 'react';
import { toast } from 'react-toastify';

export interface BuyModalContext {
  isOpen: boolean;
  onOpenChange: () => void;
  onSuccess: (id: bigint) => void;
  order: Order;
}

const marker = import.meta.env.VITE_MARKET_ACCOUNT;
const serviceFeeRate = new Decimal(import.meta.env.VITE_SERVER_FEE_RATE);

export const BuyModal: FC<BuyModalContext> = ({
  order,
  isOpen,
  onOpenChange,
  onSuccess,
}) => {
  if (!isOpen) return null;

  const globalState = useGlobalStateStore();
  const { account: account } = globalState;
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [balance, setBalance] = useState<Decimal>(new Decimal(0));
  const [balanceValidMsg, setBalanceValidMsg] = useState<string | undefined>();
  const buy = trpc.order.buy.useMutation();

  useEffect(() => {
    wallet.getBalance(account).then((balance) => {
      setBalance(new Decimal(balance.toString()));
    });
  }, [account]);

  const totalPricePlanck = toDecimal(order.totalPrice);
  const unitPricePlanck = calcUnitPrice(order.totalPrice, order.amount);
  const serviceFeePlanck = totalPricePlanck.mul(serviceFeeRate);
  const gasFeePlanck = dot2Planck(globalState.gasFee);
  // 实际需支付价格(总价+ 服务费+gas费)
  const payPricePlanck = totalPricePlanck
    .add(serviceFeePlanck)
    .add(gasFeePlanck);

  useEffect(() => {
    setBalanceValidMsg(
      balance.lt(totalPricePlanck.add(serviceFeePlanck))
        ? 'Insufficient Balance'
        : undefined,
    );
  }, [balance]);

  async function handleConfirm(onClose: () => void) {
    setConfirmLoading(true);
    try {
      await wallet.open();
      const signedExtrinsic = await wallet.signTransfer(
        account!,
        order.seller,
        marker,
        totalPricePlanck,
        serviceFeePlanck,
      );
      await buy.mutateAsync({
        id: order.id,
        signedExtrinsic,
      });
      onClose();
      onSuccess(order.id);
      toast.success(
        'Purchase success, please wait for DOT20 index update, it may take a few minutes.',
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
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="top-center">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1 text-primary">
              Purchase Confirmation
            </ModalHeader>
            <ModalBody>
              <div className="flex justify-between mt-4">
                <span>DOTA</span>
                <span>{order.amount.toString()}</span>
              </div>
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
                  {fmtDot(order.totalPrice)} DOT ≈{' '}
                  {toUsd(order.totalPrice, globalState.dotPrice)}
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
                onClick={() => handleConfirm(onClose)}
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
