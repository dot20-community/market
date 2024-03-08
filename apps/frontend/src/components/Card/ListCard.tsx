import { Button, Card, CardBody, CardFooter, CardHeader, Divider, Image, Link } from "@nextui-org/react";

export function ListCard() {
  return (
    <div className="mt-4">
      <Card className="w-[220px]">
        <CardHeader>
          <div>
            <div className="text-xs">DOTA</div>
            <div className="text-2xl mt-2 flex w-[200px] justify-center">2,000</div>
            <div className="text-xs text-primary mt-2 flex w-[200px] justify-center">$0.002/DOTA</div>
          </div>
        </CardHeader>
        <Divider/>
        <CardBody>
          <div className="w-full flex justify-between">
            <div className="flex"><Image className="w-4 mt-1" src="/dot_logo.png"/><div className="ml-1">10</div></div>
            <div className="text-xs mt-1">$4.00</div>
          </div>
        </CardBody>
        <Divider/>
        <CardFooter>
          <div>
            <div className="w-[200px] text-sm flex justify-between">
              <div>Seller</div>
              <Link className="text-xs" href="">12v7gK...CLxtmU</Link>
            </div>
            <Button className="w-[200px] mt-3" color="primary">Buy</Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  )
}