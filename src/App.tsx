import "./App.css";
import { useEffect } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  WagmiProvider,
  createConfig,
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  useReadContract,
  useSendTransaction,
  useWriteContract,
} from "wagmi";
import { custom, defineChain, formatUnits, parseEther } from "viem";
import { sepolia } from "viem/chains";

const testnet = defineChain({
  id: 1337,
  name: "Testnet",
  network: "testnet",
  nativeCurrency: {
    decimals: 18,
    name: "Ether",
    symbol: "ETH",
  },
  rpcUrls: {
    default: {
      http: ["http://localhost:8545"],
    },
    public: {
      http: ["http://localhost:8545"],
    },
  },
});

const wagmiConfig = createConfig({
  chains: [testnet, sepolia],
  transports: {
    [testnet.id]: custom((window as any).waallet),
    [sepolia.id]: custom((window as any).waallet),
  },
});

function App() {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={new QueryClient()}>
        <DApp />
      </QueryClientProvider>
    </WagmiProvider>
  );
}

function DApp() {
  const { isConnected } = useAccount();
  if (isConnected) {
    return <Profile />;
  }
  return <ConnectButton />;
}

function Profile() {
  const { address, chainId } = useAccount();
  const { disconnect } = useDisconnect();
  const { data: balance, refetch } = useBalance({
    address,
    unit: "ether",
  });
  const { sendTransactionAsync } = useSendTransaction();
  if (!address) {
    return <div>Loading...</div>;
  }
  return (
    <div>
      <div>{address}</div>
      {balance && (
        <div>Balance: {formatUnits(balance.value, balance.decimals)} ETH</div>
      )}
      <button onClick={() => disconnect()}>Disconnect</button>
      <button
        onClick={async () => {
          await sendTransactionAsync({
            to: "0x0000000000000000000000000000000000000001",
            value: parseEther("0.01"),
          });
          await refetch();
        }}
      >
        Transfer
      </button>
      {chainId === 1337 && <CounterIncrementButton />}
    </div>
  );
}

function ConnectButton() {
  const { connect, connectors } = useConnect();
  return (
    <div>
      {connectors.map((connector) => (
        <button key={connector.uid} onClick={() => connect({ connector })}>
          {connector.name}
        </button>
      ))}
    </div>
  );
}

function CounterIncrementButton() {
  const abi = [
    {
      type: "function",
      name: "number",
      inputs: [],
      outputs: [{ name: "", type: "uint256" }],
      stateMutability: "view",
    },
    {
      type: "function",
      name: "increment",
      inputs: [],
      outputs: [],
      stateMutability: "payable",
    },
  ];
  const address = "0x8464135c8F25Da09e49BC8782676a84730C318bC";
  const counter = useReadContract({
    abi,
    address,
    functionName: "number",
  });
  const { writeContractAsync, data: txHash } = useWriteContract();

  useEffect(() => {
    counter.refetch();
  }, [txHash]);

  const onClick = async () => {
    await writeContractAsync({
      abi,
      address: "0x8464135c8F25Da09e49BC8782676a84730C318bC",
      functionName: "increment",
    });
  };

  return (
    <div>
      {counter.isFetched && (
        <div>Current number: {(counter.data as bigint).toString()}</div>
      )}
      <button onClick={onClick}>Increment Counter</button>
    </div>
  );
}

export default App;
