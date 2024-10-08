import "./App.css";
import { useEffect, useState } from "react";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  WagmiProvider,
  createConfig,
  createConnector,
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
import { HoTProvider } from "webApp-sdk/src/index";

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

const hotProvider = new HoTProvider({
  url: "http://localhost:3000/dapp",
});

const hotConnector = createConnector((config) => ({
  id: "hotProvider",
  name: "HoT Provider",
  type: "custom",
  connect: async () => {
    try {
      const result = await hotProvider.request({
        method: "eth_requestAccounts",
      });
      const accounts = result as `0x${string}`[];
      return { accounts, chainId: config.chains[1].id };
    } catch (error) {
      console.error("Failed to connect:", error);
      throw error;
    }
  },
  getAccounts: async () => {
    const result = await hotProvider.request({
      method: "eth_accounts",
    });
    return result as `0x${string}`[];
  },
  getChainId: async () => {
    const result = await hotProvider.request({
      method: "eth_chainId",
    });
    return result as number;
  },
  isAuthorized: async () => {
    try {
      const result = await hotProvider.request({
        method: "eth_accounts",
      });
      const accounts = result as `0x${string}`[];
      return accounts.length > 0;
    } catch {
      return false;
    }
  },
  onAccountsChanged: () => {},
  onChainChanged: () => {},
  onDisconnect: () => {},
  disconnect: async () => {
    //disconnect from hot
    // await hotProvider.disconnect();
    console.log("disconnect");
  },
  getProvider: async () => {
    return hotProvider;
  },
}));

const wagmiConfig = createConfig({
  chains: [testnet, sepolia],
  connectors: [hotConnector],
  transports: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [testnet.id]: custom((window as any).waallet),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const signTypedData = async () => {
    // Example from https://docs.metamask.io/wallet/reference/eth_signtypeddata_v4/
    const typedData = {
      types: {
        EIP712Domain: [
          { name: "name", type: "string" },
          { name: "version", type: "string" },
          { name: "chainId", type: "uint256" },
          { name: "verifyingContract", type: "address" },
        ],
        Person: [
          { name: "name", type: "string" },
          { name: "wallet", type: "address" },
        ],
        Mail: [
          { name: "from", type: "Person" },
          { name: "to", type: "Person" },
          { name: "contents", type: "string" },
        ],
      } as const,
      primaryType: "Mail",
      domain: {
        name: "Ether Mail",
        version: "1",
        chainId: 1,
        verifyingContract: "0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC",
      },
      message: {
        from: {
          name: "Cow",
          wallet: "0xCD2a3d9F938E13CD947Ec05AbC7FE734Df8DD826",
        },
        to: {
          name: "Bob",
          wallet: "0xbBbBBBBbbBBBbbbBbbBbbbbBBbBbbbbBbBbbBBbB",
        },
        contents: "Hello, Bob!",
      },
    };
    try {
      const signature = await hotProvider.request({
        method: "eth_signTypedData_v4",
        params: [typedData],
      });
      console.log("Signature:", signature);
    } catch (error) {
      console.error("Error signing message:", error);
    }
  };

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
            account: address,
            to: getAddress(toAddress),
            value: parseEther(value),
          });
          await refetch();
        }}
      >
        Transfer
      </button>
      <button onClick={signTypedData}>Sign Typed Data</button>
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
