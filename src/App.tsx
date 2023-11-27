import { useEffect, useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

import { WagmiConfig, configureChains, createConfig, useConnect } from "wagmi";
import { InjectedConnector } from "wagmi/connectors/injected";
import { alchemyProvider } from "wagmi/providers/alchemy";
import { publicProvider } from "wagmi/providers/public";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

const { chains, publicClient } = configureChains(
  [sepolia],
  [
    alchemyProvider({ apiKey: "IM0-eXDmkcNyPx7Qh1HLbWCDj3XIcOPe" }),
    publicProvider(),
  ]
);

const wagmiConfig = createConfig({
  connectors: [
    new InjectedConnector({
      chains,
      options: {
        name: "Waallet",
        getProvider: () => {
          return (window as any).waallet;
        },
      },
    }),
  ],
  publicClient,
});

function App() {
  return (
    <WagmiConfig config={wagmiConfig}>
      <ConnectButton></ConnectButton>
    </WagmiConfig>
  );
}

function ConnectButton() {
  const { connect, connectors, error, isLoading, pendingConnector } =
    useConnect();
  return (
    <div>
      {connectors.map((connector) => (
        <button
          disabled={!connector.ready}
          key={connector.id}
          onClick={() => connect({ connector })}
        >
          {connector.name}
          {!connector.ready && " (unsupported)"}
          {isLoading &&
            connector.id === pendingConnector?.id &&
            " (connecting)"}
        </button>
      ))}

      {error && <div>{error.message}</div>}
    </div>
  );
}

export default App;
