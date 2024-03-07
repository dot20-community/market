import { Button, Input, Modal, ModalBody, ModalContent, ModalFooter, ModalHeader } from "@nextui-org/react";
import { FC, useEffect, useState } from "react";

export interface SellModalContext {
  isOpen: boolean
  onOpenChange: () => void
  dotaBalance: number
}

async function getDotPrice() {
  const resp = await fetch("https://data-api.binance.vision/api/v3/ticker/price?symbol=DOTUSDT")
  const data = await resp.json()
  if (resp.status >= 300) {
    throw new Error(data.message || "server error")
  }
  return parseFloat(data.price)
}

export const SellModal: FC<SellModalContext> = ({ isOpen, dotaBalance, onOpenChange }) => {
  const [amount, setAmount] = useState("");
  const [price, setPrice] = useState("");
  const [dotPrice, setDotPrice] = useState(10);

  useEffect(() => {
    getDotPrice().then(price => setDotPrice(price))
    setAmount("")
    setPrice("")
  }, []);

  function onConfirm() {
    console.log("onConfirm")
    console.log(amount)
    console.log(price)
  }

  let unitPrice = 0
  let unitValue = 0
  let totalValue = 0

  if (amount && price) {
    const amountFloat = parseFloat(amount)
    const priceFloat = parseFloat(price)
    if (amountFloat > 0 && priceFloat > 0) {
      unitPrice = priceFloat/amountFloat
      unitValue = unitPrice * dotPrice
      totalValue = priceFloat * dotPrice
    }
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onOpenChange={onOpenChange}
      placement="top-center"
    >
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader className="flex flex-col gap-1">Confirmation</ModalHeader>
            <ModalBody>
              <Input
                autoFocus
                label="List Amount"
                placeholder="0"
                variant="bordered"
                onChange={(e) => { setAmount(e.target.value) }} value={amount}
              />
              <div className="flex justify-end">
                <span>available balance: {dotaBalance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")}</span>
              </div>
              <Input
                label="Total Price"
                placeholder="0"
                variant="bordered"
                onChange={(e) => { setPrice(e.target.value) }} value={price}
                endContent={
                  <div className="pointer-events-none flex items-center">
                    <span className="text-default-400 text-small">DOT</span>
                  </div>
                }
              />
              <div className="flex justify-between mt-4">
                <span>Unit Price</span>
                {unitValue ? <span>{unitPrice} DOT ≈ ${unitValue}</span> : <span/>}
              </div>
              <div className="flex justify-between">
                <span>Total Price</span>
                {totalValue ? <span>{price} DOT ≈ ${totalValue}</span>: <span/>}
              </div>
            </ModalBody>
            <ModalFooter>
              <Button color="primary" onPress={() => {
                onConfirm()
                onClose()
              }}>
                Confirm
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  )
}