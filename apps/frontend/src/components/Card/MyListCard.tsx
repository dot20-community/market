import { Button, Card, CardBody, CardFooter, CardHeader, Divider, Image } from "@nextui-org/react";
import { FC } from "react";

interface Order {
  id: bigint
  seller: string
  amount: number
  status: string
  totalPrice: number
}

export interface MyListCardContext {
  order: Order
}

export const MyListCard: FC<MyListCardContext> = ({ order }) => {
  const dotPrice = 10
  const unitPrice = order.totalPrice/order.amount
  const unitValue = unitPrice * dotPrice
  const totalValue = order.totalPrice * dotPrice

  return (
    <div className="mt-4">
      <Card className="w-[220px]">
        <CardHeader>
          <div>
            <div className="text-xs">DOTA</div>
            <div className="text-2xl mt-2 flex w-[200px] justify-center">{order.amount}</div>
            <div className="text-xs text-primary mt-2 flex w-[200px] justify-center">${unitValue}/DOTA</div>
          </div>
        </CardHeader>
        <Divider/>
        <CardBody>
          <div className="w-full flex justify-between">
            <div className="flex"><Image className="w-4 mt-1" src="/dot_logo.png"/><div className="ml-1">{order.totalPrice}</div></div>
            <div className="text-xs mt-1">${totalValue.toFixed(2)}</div>
          </div>
        </CardBody>
        <Divider/>
        <CardFooter>
          <div>
            <Button className="w-[200px] mt-3" color="primary">Cancel</Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}