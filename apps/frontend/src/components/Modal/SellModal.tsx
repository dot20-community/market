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
import {
  calcUnitPrice,
  fmtDecimal,
  fmtDot,
  toDecimal,
  toUsd,
} from '@utils/calc';
import { assertError, trpc } from '@utils/trpc';
import { wallet } from '@utils/wallet';
import {
  dot2Planck,
  getAssetBalance,
  getAssetHubApi,
  planck2Dot,
} from 'apps/libs/util';
import Decimal from 'decimal.js';
import { FC, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'react-toastify';

export interface SellModalContext {
  assetId: string;
  isOpen: boolean;
  onOpenChange: () => void;
  onSuccess: (id: bigint) => void;
}

type FormType = {
  amount: number;
  totalPrice: number;
};

const marker = import.meta.env.VITE_MARKET_ACCOUNT;
const minTotalPrice = parseFloat(import.meta.env.VITE_MIN_SELL_TOTAL_PRICE);
const serviceFeeRate = new Decimal(import.meta.env.VITE_SERVER_FEE_RATE);

export const SellModal: FC<SellModalContext> = ({
  assetId,
  isOpen,
  onOpenChange,
  onSuccess,
}) => {
  const globalState = useGlobalStateStore((state) => state);
  const account = globalState.account!!;
  const assetInfo = globalState.assetInfos.find(
    (asset) => asset.id === assetId,
  );
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<FormType>();
  const [confirmLoading, setConfirmLoading] = useState(false);
  const { amount, totalPrice } = watch();
  const [assetBalance, setAssetBalance] = useState<Decimal>(new Decimal(0));
  const [balance, setBalance] = useState<Decimal>(new Decimal(0));
  const [balanceValidMsg, setBalanceValidMsg] = useState<string | undefined>();
  const sell = trpc.order.sell.useMutation();

  async function refreshAssetBalance() {
    if (!account || !assetId) {
      return;
    }
    const api = await getAssetHubApi();
    setAssetBalance(
      planck2Dot(
        await getAssetBalance(api, assetId, account),
        assetInfo?.decimals,
      ),
    );
  }

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    setValue('amount', 0);
    setValue('totalPrice', 0);
    wallet.getAssetHubBalance(account).then((balance) => {
      setBalance(new Decimal(balance.toString()));
    });
    refreshAssetBalance();
  }, [isOpen]);

  const amountValid = (value: number): string | undefined => {
    if (!value) {
      return 'List amount is required';
    }
    if (assetBalance.lt(value)) {
      return 'List amount exceeds the available balance';
    }
    // 检查小数点位数是否超过资产精度
    const assetDecimals = assetInfo?.decimals || 0;
    if (new Decimal(value).dp() > assetDecimals) {
      return `List amount must be a number with at most ${assetDecimals} decimal places`;
    }
  };

  const totalPriceValid = (value: number): string | undefined => {
    if (!value) {
      return 'Total price is required';
    }
    // 检查小数点位数是否超过4
    const decVal = new Decimal(value);
    if (decVal.dp() > 4) {
      return `Total price must be a number with at most 4 decimal places`;
    }
    if (decVal.lt(minTotalPrice)) {
      return `Total price at least ${minTotalPrice} DOT`;
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
      balance.lt(payPricePlanck) ? 'Insufficient Balance' : undefined,
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
        assetId,
        dot2Planck(data.amount, assetInfo!.decimals),
      );
      const { id } = await sell.mutateAsync({
        seller: account,
        totalPrice: totalPricePlanck.toFixed(),
        signedExtrinsic,
      });
      onClose();
      onSuccess(id);
      toast.success('Listing successfully!');
    } catch (e) {
      console.error(e);
      const error = assertError(e);
      if (error.code === 'USER_REJECTED') {
        toast.warn('User rejected');
        return;
      }
      if (
        ['Frozen', 'FundsUnavailable', 'NotExpendable', 'Inability'].some(
          (item) => error.message?.includes(item),
        )
      ) {
        toast.error('Please make sure you have enough balance to pay');
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
                type="number"
                {...register('amount', {
                  validate: { amountValid },
                })}
                autoFocus
                isRequired
                autoComplete="off"
                label="List Amount"
                variant="bordered"
                isInvalid={!!errors.amount}
                errorMessage={errors.amount?.message?.toString()}
                value={amount ? String(amount) : ''}
                endContent={
                  <div className="flex items-center z-50">
                    <Button
                      size="sm"
                      radius="full"
                      color="primary"
                      onPress={() => {
                        setValue('amount', assetBalance?.toNumber() || 0);
                      }}
                    >
                      Max
                    </Button>
                  </div>
                }
              />
              <div className="flex justify-end text-small">
                <span className="text-primary">
                  Available {assetInfo?.symbol}
                </span>
                <span className="ml-2 italic">{fmtDecimal(assetBalance)}</span>
              </div>
              <Input
                type="number"
                {...register('totalPrice', {
                  validate: { totalPriceValid },
                })}
                isRequired
                autoComplete="off"
                label="Total Price"
                variant="bordered"
                isInvalid={!!errors.totalPrice}
                errorMessage={errors.totalPrice?.message?.toString()}
                value={totalPrice ? String(totalPrice) : ''}
                endContent={
                  <div className="flex items-center gap-2">
                    <span className="text-default-400 text-small">DOT</span>
                    <Button
                      size="sm"
                      radius="full"
                      color="primary"
                      onPress={() => {
                        if (assetInfo && amount) {
                          const totalPrice = planck2Dot(
                            toDecimal(assetInfo.floorPrice).mul(
                              dot2Planck(amount, assetInfo.decimals),
                            ),
                          ).toNumber();
                          setValue(
                            'totalPrice',
                            parseFloat(totalPrice.toFixed(4)),
                          );
                        }
                      }}
                    >
                      Auto
                    </Button>
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
