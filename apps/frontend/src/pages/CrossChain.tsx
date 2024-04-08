import { useGlobalStateStore } from '@GlobalState';
import {
  Card,
  CardBody,
  CardHeader,
  Select,
  SelectItem,
} from '@nextui-org/react';

export function CrossChain() {
  const globalState = useGlobalStateStore();
  const account = globalState.account ?? '';
  const chains = [
    { icon: '', value: 'DOT' },
    { icon: '', value: 'AssetHub' },
  ];
  return (
    <div className="flex justify-center">
      <Card className="w-96 mt-14">
        <CardHeader className="flex justify-center">
          <p>CROSS-CHAIN</p>
        </CardHeader>
        <CardBody>
          <div>Select chains</div>
          <div>
            <Select
              label="Favorite Animal"
              placeholder="Select an animal"
              className="max-w-xs"
            >
              {chains.map((chain) => (
                <SelectItem key={chain.value} value={chain.value}>
                  {chain.value}
                </SelectItem>
              ))}
            </Select>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
