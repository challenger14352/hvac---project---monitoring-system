import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";

export const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);
export const clerkProxyUrl = import.meta.env.VITE_CLERK_PROXY_URL;
export const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");
export function stripBase(path: string): string {
  return basePath && path.startsWith(basePath)
    ? path.slice(basePath.length) || "/"
    : path;
}

export const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#f9b52a",
    colorForeground: "#f5f3ee",
    colorMutedForeground: "#afb4bf",
    colorDanger: "#f87171",
    colorBackground: "#1b1f27",
    colorInput: "#141820",
    colorInputForeground: "#f5f3ee",
    colorNeutral: "#afb4bf",
    fontFamily: "'Inter', sans-serif",
    borderRadius: "0.75rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#1b1f27] rounded-2xl w-[440px] max-w-full overflow-hidden",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#f5f3ee]",
    headerSubtitle: "text-[#afb4bf]",
    socialButtonsBlockButtonText: "text-[#f5f3ee]",
    formFieldLabel: "text-[#f5f3ee]",
    footerActionLink: "text-[#f9b52a]",
    footerActionText: "text-[#afb4bf]",
    dividerText: "text-[#afb4bf]",
    identityPreviewEditButton: "text-[#f9b52a]",
    formFieldSuccessText: "text-green-300",
    alertText: "text-[#f5f3ee]",
    logoBox: "justify-center",
    logoImage: "h-12 w-auto",
    socialButtonsBlockButton: "border border-white/20 bg-[#252b36]",
    formButtonPrimary: "bg-[#f9b52a] text-[#141820]",
    formFieldInput: "bg-[#141820] text-[#f5f3ee] border-white/20",
    footerAction: "border-t border-white/10",
    dividerLine: "bg-white/20",
    alert: "bg-red-950 border-red-400",
    otpCodeFieldInput: "bg-[#141820] text-[#f5f3ee]",
    formFieldRow: "gap-2",
    main: "gap-5",
  },
};
