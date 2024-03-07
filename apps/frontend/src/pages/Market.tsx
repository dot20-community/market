import { Card, CardBody, CardFooter, CardHeader, Divider, Tab, Tabs } from "@nextui-org/react";

export function Market() {
  return (
    <div className="flex w-full justify-center mt-10">
      <div className="flex w-4/5 flex-col">
        <Tabs aria-label="Options">
          <Tab key="Listed" title="Listed">
            <div className="mt-5">
              <Card className="max-w-[200px]">
                <CardHeader className="flex">
                  <div className="w-full text-small">DOTA</div>
                </CardHeader>
                <Divider/>
                <CardBody>
                  <p>Make beautiful websites regardless of your design experience.</p>
                </CardBody>
                <Divider/>
                <CardFooter>
                  asdf
                </CardFooter>
              </Card>
            </div>
          </Tab>
          <Tab key="Orders" title="Orders">
            <Card>
              <CardBody>
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.
              </CardBody>
            </Card>  
          </Tab>
          <Tab key="My List" title="My List">
            <Card>
              <CardBody>
                Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.
              </CardBody>
            </Card>  
          </Tab>
        </Tabs>
      </div>
    </div>
  );
}