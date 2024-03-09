import { useGlobalStateStore } from '@GlobalState';
import {
  Button,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@nextui-org/react';
import { trpc } from '@utils/trpc';
import { getCurrentAccountAddress, wallet } from '@utils/wallet';
import { dot2Planck, isNumber } from 'apps/libs/util';
import Decimal from 'decimal.js';
import React, { FC, useState } from 'react';

export interface SellModalContext {
  isOpen: boolean;
  onOpenChange: () => void;
  tick: string;
}

export const SellModal: FC<SellModalContext> = ({
  isOpen,
  onOpenChange,
  tick,
}) => {
  const globalState = useGlobalStateStore((state) => state);
  const [isSubmit, setIsSubmit] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [amount, setAmount] = useState('');
  const [totalPrice, setTotalPrice] = useState('');
  const account = getCurrentAccountAddress();
  const marker = import.meta.env.VITE_MARKET_ACCOUNT;
  const dotaBalance = trpc.account.tick.useQuery({ account, tick });

  const serviceFeeRate = new Decimal(import.meta.env.VITE_SERVER_FEE_RATE);
  const numberValid = (value: string) => {
    const parse = parseFloat(value);
    return isNaN(parse);
  };

  const isInvalidAmount = React.useMemo(() => {
    return isSubmit && numberValid(amount);
  }, [isSubmit, amount]);
  const isInvalidTotalPrice = React.useMemo(() => {
    return isSubmit && numberValid(totalPrice);
  }, [isSubmit, totalPrice]);

  const changeAmount = (value: string) => {
    const newValue = parseInt(value);
    if (isNaN(newValue)) {
      setAmount('');
      return;
    }

    const maxAmount = dotaBalance?.data?.balance ?? 0;
    if (maxAmount !== 0 && newValue > maxAmount) {
      setAmount(maxAmount.toString());
      return;
    }

    setAmount(newValue.toString());
  };

  const changeTotalPrice = (value: string) => {
    if (!isNumber(value)) {
      setTotalPrice('');
      return;
    }

    const newValue = parseFloat(value);

    // 如果低于最小交易金额，则修正为最小交易金额
    const minTotalPrice = import.meta.env.VITE_MIN_SELL_TOTAL_PRICE;
    if (newValue < parseFloat(minTotalPrice)) {
      setTotalPrice(minTotalPrice);
      return;
    }

    setTotalPrice(newValue.toString());
  };

  const fmtDecimal = (dotAmt: Decimal) => {
    if (dotAmt.dp() > 4) {
      return dotAmt.toFixed(4);
    }
    return dotAmt.toFixed();
  };

  const toUsd = (dotAmt: Decimal) => {
    return '$' + fmtDecimal(dotAmt.mul(globalState.dotPrice));
  };

  // 铭文单价
  let unitPriceDec = new Decimal(0);
  // 总价格
  let totalPriceDec = new Decimal(0);
  // 手续费
  let serviceFeeDec = new Decimal(0);
  // gas费
  let gasFeeDec = new Decimal(globalState.gasFee);
  // 需支付价格
  let payPriceDec = new Decimal(0);
  if (amount && totalPrice) {
    const amountDec = new Decimal(amount);
    totalPriceDec = new Decimal(totalPrice);
    unitPriceDec = totalPriceDec.div(amountDec);
    serviceFeeDec = totalPriceDec.mul(serviceFeeRate);
    payPriceDec = totalPriceDec.add(serviceFeeDec);
  }

  async function onConfirm() {
    setIsSubmit(true);

    if (isInvalidAmount || isInvalidTotalPrice) {
      return;
    }

    setConfirmLoading(true);
    try {
      await wallet.open();
      await wallet.signTransferInscribe(
        account,
        marker,
        dot2Planck(payPriceDec),
        tick,
        parseInt(amount),
      );
    } catch (e) {
      alert(e);
      console.error('Error:', e);
    } finally {
      setConfirmLoading(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} placement="top-center">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">
              Listing Confirmation
            </ModalHeader>
            <ModalBody>
              <Input
                autoFocus
                isRequired
                label="List Amount"
                placeholder="0"
                variant="bordered"
                value={amount}
                onValueChange={changeAmount}
                isInvalid={isInvalidAmount}
                errorMessage={
                  isInvalidAmount ? 'Please enter a valid number' : ''
                }
              />
              <div className="flex justify-end">
                <span className="text-primary">Available Balance</span>
                <span className="ml-2">{`${dotaBalance.data?.balance?.toLocaleString()} ${tick}`}</span>
              </div>
              <Input
                label="Total Price"
                isRequired
                placeholder="0"
                variant="bordered"
                value={totalPrice}
                onValueChange={changeTotalPrice}
                isInvalid={isInvalidTotalPrice}
                errorMessage={
                  isInvalidTotalPrice
                    ? `Please enter a number greater than ${
                        import.meta.env.VITE_MIN_SELL_TOTAL_PRICE
                      }`
                    : ''
                }
                endContent={
                  <div className="pointer-events-none flex items-center">
                    <span className="text-default-400 text-small">DOT</span>
                  </div>
                }
              />
              <div className="flex justify-between mt-4">
                <span>Unit Price</span>
                <span>
                  {fmtDecimal(unitPriceDec)} DOT ≈ {toUsd(unitPriceDec)}
                </span>
              </div>

              <div className="flex justify-between">
                <span>Total Price</span>
                <span>
                  {fmtDecimal(totalPriceDec)} DOT ≈ {toUsd(totalPriceDec)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>
                  {`Service Fee (${serviceFeeRate
                    .mul(new Decimal(100))
                    .toFixed()}%)`}
                </span>
                <span>
                  {fmtDecimal(serviceFeeDec)} DOT ≈ {toUsd(serviceFeeDec)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Gas Fee</span>
                <span>
                  {fmtDecimal(gasFeeDec)} DOT ≈ {toUsd(gasFeeDec)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Pay Price</span>
                <span>
                  {fmtDecimal(payPriceDec)} DOT ≈ {toUsd(payPriceDec)}
                </span>
              </div>
            </ModalBody>
            <ModalFooter>
              <Button
                color="primary"
                spinner={confirmLoading}
                onClick={onConfirm}
              >
                Confirm
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
};
