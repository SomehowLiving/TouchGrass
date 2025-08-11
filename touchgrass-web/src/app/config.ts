import { createConfig } from "@0xsequence/connect";

const projectAccessKey = process.env.NEXT_PUBLIC_SEQUENCE_PROJECT_KEY!;
const waasConfigKey = process.env.NEXT_PUBLIC_WAAS_CONFIG_KEY!;
const enableConfirmationModal = true; // change to your preference
const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!; // Google Client ID
const walletConnectProjectId =
  process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!; // Pass in your WalletConnect Project ID

export const config = createConfig("waas", {
  projectAccessKey,
  position: "top-center",
  defaultTheme: "light",
  signIn: {
    projectName: "TouchGrass",
    logoUrl:
      "https://storage.googleapis.com/sequence-prod-cluster-builder/projects/43072/wallet/signInlogoUrl_9cc0be01846109601f740966497b1205697cb91228b80d8ed0283f26916454dd.png",
  },
  defaultChainId: 421614,
  chainIds: [
    1, 10, 40, 41, 56, 97, 100, 137, 1101, 1284, 1287, 1328, 1329, 1868, 1946,
    1993, 5031, 6283, 7668, 7672, 8333, 8453, 10143, 11690, 19011, 33111, 33139,
    40875, 42161, 42170, 42793, 43113, 43114, 50312, 62850, 80002, 81457, 84532,
    128123, 421614, 660279, 11155111, 11155420, 21000000, 37084624, 168587773,
    1482601649, 37714555429,
  ],
  appName: "TouchGrass",
  waasConfigKey,
  google: {
    clientId: googleClientId,
  },
  apple: false,
  walletConnect: {
    projectId: walletConnectProjectId,
  },
  coinbase: false,
  metaMask: true,
  wagmiConfig: {
    multiInjectedProviderDiscovery: true,
  },
  enableConfirmationModal,
});
