import { useEffect } from 'react';
import { matchRoute, navigate, usePath } from './lib/router.ts';
import { useActions, useApp } from './state/store.ts';
import { useTheme } from './lib/hooks.ts';
import { BottomNav } from './ui/Navigation.tsx';
import { OnboardingScreen } from './screens/Onboarding.tsx';
import { TodayScreen } from './screens/Today.tsx';
import { SessionScreen } from './screens/Session.tsx';
import { ReviewScreen } from './screens/Review.tsx';
import { PlanScreen } from './screens/Plan.tsx';
import { PracticeScreen } from './screens/Practice.tsx';
import { ProgressScreen } from './screens/Progress.tsx';
import { ErrorsScreen } from './screens/Errors.tsx';
import { LibraryDetailScreen, LibraryScreen } from './screens/Library.tsx';
import { ProfileScreen } from './screens/Profile.tsx';
import { MockOverviewScreen, MockReportScreen, MockRunnerScreen } from './screens/Mock.tsx';

const FULLSCREEN = ['/session'];

export function App() {
  const path = usePath();
  const data = useApp((store) => store.data);
  const actions = useActions();
  const theme = useTheme(data.settings.theme);

  useEffect(() => {
    actions.hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.reduceMotion = String(data.settings.reduceMotion);
    root.dataset.textScale = String(data.settings.textScale).replace('.', '');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme === 'dark' ? '#0b0f14' : '#faf7f0');
  }, [theme, data.settings.reduceMotion, data.settings.textScale]);

  useEffect(() => {
    if (!data.profile.onboardingComplete && path !== '/onboarding') {
      navigate('/onboarding', { replace: true });
    }
  }, [data.profile.onboardingComplete, path]);

  const onboarded = data.profile.onboardingComplete;
  const mockRun = matchRoute('/mock/:formId/run', path);
  const mockReport = matchRoute('/mock/:formId/report', path);
  const mockOverview = matchRoute('/mock/:formId', path);
  const libraryDetail = matchRoute('/library/:type/:id', path);

  let screen: React.ReactNode;
  let fullscreen = false;
  let showNav = onboarded;

  if (!onboarded) {
    screen = <OnboardingScreen />;
    showNav = false;
  } else if (path === '/onboarding') {
    screen = <OnboardingScreen />;
    showNav = false;
  } else if (path === '/session') {
    screen = <SessionScreen />;
    fullscreen = true;
    showNav = false;
  } else if (path === '/review') {
    screen = <ReviewScreen />;
  } else if (path === '/plan') {
    screen = <PlanScreen />;
  } else if (path === '/practice') {
    screen = <PracticeScreen />;
  } else if (path === '/progress') {
    screen = <ProgressScreen />;
  } else if (path === '/errors') {
    screen = <ErrorsScreen />;
  } else if (path === '/library') {
    screen = <LibraryScreen />;
  } else if (libraryDetail) {
    screen = <LibraryDetailScreen type={libraryDetail.params.type ?? ''} id={libraryDetail.params.id ?? ''} />;
  } else if (path === '/profile') {
    screen = <ProfileScreen />;
  } else if (mockRun) {
    screen = <MockRunnerScreen formId={mockRun.params.formId ?? ''} />;
    showNav = false;
    fullscreen = true;
  } else if (mockReport) {
    screen = <MockReportScreen formId={mockReport.params.formId ?? ''} />;
  } else if (mockOverview) {
    screen = <MockOverviewScreen formId={mockOverview.params.formId ?? ''} />;
  } else {
    screen = <TodayScreen />;
  }

  const isFullscreen = fullscreen || FULLSCREEN.includes(path);

  return (
    <div className={`app-shell ${isFullscreen ? 'app-shell--full' : ''}`}>
      {screen}
      {showNav ? <BottomNav /> : null}
      <Toast />
    </div>
  );
}

function Toast() {
  const toast = useApp((store) => store.toast);
  if (!toast) return null;
  return (
    <div className="toast" role="status" aria-live="polite">
      {toast}
    </div>
  );
}
