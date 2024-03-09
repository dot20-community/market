import { Button, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@nextui-org/react";
import { FC, useEffect, useState } from "react";

export interface BuyModalOrderInfo {
  id: bigint
  amount: number
  price: number
}

export interface BuyModalContext {
  isOpen: boolean
  onOpenChange: () => void
  orderInfo: BuyModalOrderInfo
}

async function getDotPrice() {
  const resp = await fetch("https://data-api.binance.vision/api/v3/ticker/price?symbol=DOTUSDT")
  const data = await resp.json()
  if (resp.status >= 300) {
    throw new Error(data.message || "server error")
  }
  return parseFloat(data.price)
}

async function getDotBalance() {
  return 1000
}

export const BuyModal: FC<BuyModalContext> = ({ isOpen, orderInfo, onOpenChange }) => {
  const [dotPrice, setDotPrice] = useState(10);
  const [dotBalance, setDotBalance] = useState(0);

  useEffect(() => {
    getDotPrice().then(price => setDotPrice(price))
    getDotBalance().then(balance => setDotBalance(balance))
  }, []);

  function onConfirm() {
    console.log("onConfirm")
  }

  let unitPrice = 0
  let unitValue = 0
  let totalValue = 0
  let serviceFee = 0
  let serviceFeeValue = 0
  let netWorkFee = 0.19
  let netWorkFeeValue = netWorkFee * dotPrice

  if (orderInfo.amount && orderInfo.price) {
    if (orderInfo.amount > 0 && orderInfo.price > 0) {
      unitPrice = orderInfo.price/orderInfo.amount
      unitValue = unitPrice * dotPrice
      totalValue = orderInfo.price * dotPrice
      serviceFee = orderInfo.price * 0.02
      serviceFeeValue = serviceFee * dotPrice
    }
  }

  let totalPay = orderInfo.price + serviceFee + netWorkFee
  let totalPayValue = totalPay * dotPrice
  return (
    <Modal 
      isOpen={isOpen} 
      onOpenChange={onOpenChange}
      placement="top-center"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1 text-primary">Purchase Confirmation</ModalHeader>
            <ModalBody>
              <div className="flex justify-between mt-4">
                <span>DOTA</span>
                <span>{orderInfo.amount}</span>
              </div>
              <div className="flex justify-between mt-4">
                <span>Unit Value</span>
                {unitValue ? <span>{unitPrice.toFixed(3)} DOT ≈ ${unitValue.toFixed(2)}</span> : <span/>}
              </div>
              <div className="flex justify-between">
                <span>Total Value</span>
                {totalValue ? <span>{orderInfo.price.toFixed(3)} DOT ≈ ${totalValue.toFixed(2)}</span>: <span/>}
              </div>
              <div className="flex justify-between">
                <span>Service Fee (2%)</span>
                {serviceFeeValue ? <span>{serviceFee.toFixed(3)} DOT ≈ ${serviceFeeValue.toFixed(2)}</span>: <span/>}
              </div>
              <div className="flex justify-between">
                <span>Network Fee</span>
                {netWorkFeeValue ? <span>{netWorkFee.toFixed(3)} DOT ≈ ${netWorkFeeValue.toFixed(2)}</span>: <span/>}
              </div>
              <div className="flex justify-between mt-4">
                <span className="font-bold">Total Pay</span>
                {totalPayValue ? <span>{totalPay.toFixed(3)} DOT ≈ ${totalPayValue.toFixed(2)}</span>: <span/>}
              </div>
              <div className="flex justify-between">
                <span>Available Balance</span>
                <span>{dotBalance} Dot</span>
              </div>
            </ModalBody>
            <ModalFooter>
              {dotBalance >= totalPay ? (
                <Button color="primary" onPress={() => {
                  onConfirm()
                  onClose()
                }}>
                  Confirm
                </Button>
              ) : (
                <Button isDisabled>
                  Insufficient Balance
                </Button>
              )}
              
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  )
}