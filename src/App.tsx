import "./App.css";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  WagmiProvider,
  createConfig,
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  useSendTransaction,
} from "wagmi";
import { custom, defineChain, formatUnits, parseEther } from "viem";
import { sepolia } from "viem/chains";

const testnet = defineChain({
  id: 31337,
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
  const { address } = useAccount();
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
            value: parseEther("0.1"),
          });
          await refetch();
        }}
      >
        Transfer
      </button>
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

export default App;
