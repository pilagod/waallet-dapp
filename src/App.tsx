import "./App.css";
import { useEffect, useState } from "react";

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
import { custom, defineChain, formatUnits, parseEther, getAddress } from "viem";
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
  const [toAddress, setToAddress] = useState<string>(
    getAddress("0x0000000000000000000000000000000000000001")
  );
  const [value, setValue] = useState<string>("0.01");
  const [errorMessage, setErrorMessage] = useState<string>("");

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
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <label htmlFor="toAddress" style={{ whiteSpace: "nowrap" }}>
          To address:
        </label>
        <input
          id="toAddress"
          type="text"
          value={toAddress}
          style={{ width: "350px" }}
          onChange={(event) => {
            try {
              setErrorMessage("");
              setToAddress(getAddress(event.target.value));
            } catch (e) {
              setErrorMessage((e as Error).message);
              setToAddress(event.target.value);
            }
          }}
        />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <label htmlFor="value" style={{ whiteSpace: "nowrap" }}>
          Value:
        </label>
        <input
          id="value"
          type="text"
          value={value}
          style={{ width: "350px" }}
          onChange={(event) => {
            try {
              setErrorMessage("");
              parseEther(event.target.value);
              setValue(event.target.value);
            } catch (e) {
              setErrorMessage((e as Error).message);
              setValue(event.target.value);
            }
          }}
        />
      </div>
      <button
        disabled={!!errorMessage}
        onClick={async () => {
          await sendTransactionAsync({
            to: getAddress(toAddress),
            value: parseEther(value),
          });
          await refetch();
        }}
      >
        Transfer
      </button>
      {errorMessage && (
        <div style={{ color: "red", width: "350px" }}>{errorMessage}</div>
      )}
      {chainId === 1337 && <CounterInteraction />}
      <OpenDevtoolWindow />
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

function CounterInteraction() {
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

function OpenDevtoolWindow() {
  const buttonConnectWaalet = async () => {
    await (window as any).waallet.createWindow({
      creation: {
        user: "imToken Labs",
        challenge: "5r264oeeza45DAAnFgSNLybypGsY64GeIa2C5UqbmRk",
      },
      request: {
        credentialId: "jyZ19cHuw8toyyZDHxz7dOVmZ00fRSsvm1WSMV9dfRc",
        challenge: "5r264oeeza45DAAnFgSNLybypGsY64GeIa2C5UqbmRk",
      },
    });
  };

  return (
    <>
      <div id="createwindow">
        <button onClick={buttonConnectWaalet}>Create Window</button>
      </div>
    </>
  );
}

export default App;
