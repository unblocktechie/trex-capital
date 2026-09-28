import { Outlet, useLocation } from 'react-router-dom';
import { Breadcrumbs } from './components/Breadcrumbs';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ROUTES } from '@/config/routes';
import { ROLES } from '@/config/permissions';
import { useAuth } from '@/hooks/useAuth';
import { useInvestorAccessStatus } from '@/hooks/useInvestorAccessStatus';
import { useOrganization } from '@/hooks/useOrganization';
import { isOrganizationWorkspaceUnlocked } from '@/services/organizationStorageService';
import { networkUserKey, useNetworkStore } from '@/store/network.store';
import { useUiStore } from '@/store/ui.store';
import { cn } from '@/utils/cn';

export function MainLayout() {
  const collapsed = useUiStore((state) => state.sidebarCollapsed);
  const { user } = useAuth();
  const userKey = networkUserKey(user);
  const selectedChainUid = useNetworkStore((state) => state.activeChainUidByUser[userKey] || '');
  const { organization } = useOrganization();
  const investorAccess = useInvestorAccessStatus(
    user?.role === ROLES.investor ? user : null,
  );
  const location = useLocation();

  const isIssuer = user?.role === ROLES.issuer;
  const isInvestor = user?.role === ROLES.investor;
  const isVerifiedSuccessPage = location.pathname === ROUTES.organizationVerified;
  const isInvestorOnboardingPage = location.pathname === ROUTES.investors;
  const issuerOnboardingOnly =
    isIssuer &&
    (!isOrganizationWorkspaceUnlocked(organization) || isVerifiedSuccessPage);
  const investorOnboardingOnly =
    isInvestor &&
    (!investorAccess.isWorkspaceUnlocked || isInvestorOnboardingPage);
  const onboardingOnly = issuerOnboardingOnly || investorOnboardingOnly;
  // Issuer and investor workspaces use a mix of React Query and imperative loaders.
  // Remount the active route when chainUid changes so chain-scoped detail state,
  // pagination, and pending local actions cannot leak across networks.
  const outletKey = (isIssuer || isInvestor) && !onboardingOnly
    ? `${isIssuer ? 'issuer' : 'investor'}-chain:${selectedChainUid || 'unselected'}`
    : 'workspace';

  return (
    <div
      className={cn(
        'app-shell',
        collapsed && !onboardingOnly && 'app-shell--sidebar-collapsed',
        onboardingOnly && 'app-shell--onboarding',
      )}
    >
      {!onboardingOnly ? <Sidebar /> : null}
      <div className="app-shell__main">
        <Header onboardingOnly={onboardingOnly} />
        <main className="page-container">
          {!onboardingOnly ? <Breadcrumbs /> : null}
          <Outlet key={outletKey} />
        </main>
      </div>
    </div>
  );
}
