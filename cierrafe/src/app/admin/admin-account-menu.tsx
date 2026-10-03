import { AccountMenu } from "@/components/account-menu";

export function AdminAccountMenu({ logoutAction }: { logoutAction: () => Promise<void> }) {
  return <AccountMenu logoutAction={logoutAction} />;
}
