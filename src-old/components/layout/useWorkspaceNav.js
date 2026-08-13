import { useMemo, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import useAuthStore from "../../stores/authStore";
import {
  getNavSections,
  resolveActiveSection,
  getMobilePrimaryItems,
  getMobileMoreSections,
} from "../../utils/navSections";

export default function useWorkspaceNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const sections = useMemo(() => getNavSections(user), [user]);

  const activeSection = useMemo(
    () => resolveActiveSection(pathname, sections),
    [pathname, sections],
  );

  const hasGroupedNav = useMemo(
    () => sections.some((s) => (s.children?.length ?? 0) > 1),
    [sections],
  );

  const showContextualSidebar = useMemo(() => {
    if (!hasGroupedNav) return false;
    return (activeSection?.children?.length ?? 0) > 1;
  }, [hasGroupedNav, activeSection]);

  const sidebarItems = activeSection?.children ?? [];

  const mobilePrimarySections = useMemo(
    () => getMobilePrimaryItems(sections, 3),
    [sections],
  );

  const mobileMoreSections = useMemo(
    () => getMobileMoreSections(sections, mobilePrimarySections),
    [sections, mobilePrimarySections],
  );

  const mobileSubNavItems = useMemo(() => {
    if ((activeSection?.children?.length ?? 0) > 1) {
      return activeSection.children;
    }
    return sections.flatMap((s) => s.children ?? []);
  }, [activeSection, sections]);

  const selectSection = useCallback(
    (section) => {
      const target =
        section.children?.[0]?.path ?? section.path ?? sections[0]?.path;
      if (target) navigate(target);
    },
    [navigate, sections],
  );

  return {
    sections,
    activeSection,
    hasGroupedNav,
    showContextualSidebar,
    sidebarItems,
    mobilePrimarySections,
    mobileMoreSections,
    mobileSubNavItems,
    selectSection,
  };
}
