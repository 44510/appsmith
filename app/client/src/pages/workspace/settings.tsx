import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useParams, useHistory } from "react-router-dom";
import { getCurrentWorkspace } from "@appsmith/selectors/workspaceSelectors";
import { useSelector, useDispatch } from "react-redux";
import styled from "styled-components";
import { getAllApplications } from "@appsmith/actions/applicationActions";
import { useMediaQuery } from "react-responsive";
import { BackButton, StickyHeader } from "components/utils/helperComponents";
import WorkspaceInviteUsersForm from "pages/workspace/WorkspaceInviteUsersForm";
import { SettingsPageHeader } from "./SettingsPageHeader";
import {
  isPermitted,
  PERMISSION_TYPE,
} from "@appsmith/utils/permissionHelpers";
import {
  createMessage,
  INVITE_USERS_PLACEHOLDER,
  SEARCH_USERS,
} from "@appsmith/constants/messages";
import { APPLICATIONS_URL } from "constants/routes";
import FormDialogComponent from "components/editorComponents/form/FormDialogComponent";
import { debounce } from "lodash";
import { WorkspaceSettingsTabs } from "@appsmith/components/WorkspaceSettingsTabs";
import { useFeatureFlag } from "utils/hooks/useFeatureFlag";
import { FEATURE_FLAG } from "@appsmith/entities/FeatureFlag";

const SettingsWrapper = styled.div<{
  isMobile?: boolean;
}>`
  width: ${(props) => (props.isMobile ? "345px" : "978px")};
  margin: var(--ads-v2-spaces-7) auto;
  height: 100%;
  padding-left: var(--ads-v2-spaces-7);
  overflow: hidden;
  padding-left: ${(props) =>
    props.isMobile ? "0" : "var(--ads-v2-spaces-7);"};
  &::-webkit-scrollbar {
    width: 0px;
  }
  .tabs-wrapper {
    height: 100%;
    ${({ isMobile }) =>
      !isMobile &&
      `
      padding: 106px 0 0;
  `}
  }
`;

const StyledStickyHeader = styled(StickyHeader)<{ isMobile?: boolean }>`
  /* padding-top: 24px; */
  ${({ isMobile }) =>
    !isMobile &&
    `
  top: 72px;
  position: fixed;
  width: 954px;
  `}
`;

enum TABS {
  GENERAL = "general",
  MEMBERS = "members",
}

export default function Settings() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const currentWorkspace = useSelector(getCurrentWorkspace).filter(
    (el) => el.id === workspaceId,
  )[0];
  const location = useLocation();
  const dispatch = useDispatch();

  const [showModal, setShowModal] = useState(false);
  const [searchValue, setSearchValue] = useState("");

  const [pageTitle, setPageTitle] = useState<string>("");
  const [tabArrLen, setTabArrLen] = useState<number>(0);

  const history = useHistory();

  const isGACEnabled = useFeatureFlag(FEATURE_FLAG.license_gac_enabled);

  const currentTab = location.pathname.split("/").pop();
  // const [selectedTab, setSelectedTab] = useState(currentTab);

  const isMemberofTheWorkspace = isPermitted(
    currentWorkspace?.userPermissions || [],
    PERMISSION_TYPE.INVITE_USER_TO_WORKSPACE,
  );
  const hasManageWorkspacePermissions = isPermitted(
    currentWorkspace?.userPermissions,
    PERMISSION_TYPE.MANAGE_WORKSPACE,
  );
  const shouldRedirect = useMemo(
    () =>
      currentWorkspace &&
      ((!isMemberofTheWorkspace && currentTab === TABS.MEMBERS) ||
        (!hasManageWorkspacePermissions && currentTab === TABS.GENERAL)),
    [
      currentWorkspace,
      isMemberofTheWorkspace,
      hasManageWorkspacePermissions,
      currentTab,
    ],
  );

  const onButtonClick = () => {
    setShowModal(true);
  };

  useEffect(() => {
    if (shouldRedirect) {
      history.replace(APPLICATIONS_URL);
    }
    if (currentWorkspace) {
      setPageTitle(`${currentWorkspace?.name}`);
    }
  }, [currentWorkspace, shouldRedirect]);

  useEffect(() => {
    if (!currentWorkspace) {
      dispatch(getAllApplications());
    }
  }, [dispatch, currentWorkspace]);

  const pageMenuItems: any[] = [
    {
      icon: "book-line",
      className: "documentation-page-menu-item",
      onSelect: () => {
        /*console.log("hello onSelect")*/
      },
      text: "Documentation",
    },
  ];

  const isMembersPage = tabArrLen > 1 && currentTab === TABS.MEMBERS;
  // const isGeneralPage = tabArrLen === 1 && currentTab === TABS.GENERAL;

  const onSearch = debounce((search: string) => {
    if (search.trim().length > 0) {
      setSearchValue(search);
    } else {
      setSearchValue("");
    }
  }, 300);

  const isMobile: boolean = useMediaQuery({ maxWidth: 767 });
  return (
    <>
      <SettingsWrapper data-testid="t--settings-wrapper" isMobile={isMobile}>
        <StyledStickyHeader isMobile={isMobile}>
          <BackButton goTo="/applications" />
          <SettingsPageHeader
            buttonText="Add users"
            onButtonClick={onButtonClick}
            onSearch={onSearch}
            pageMenuItems={pageMenuItems}
            searchPlaceholder={createMessage(SEARCH_USERS, !isGACEnabled)}
            showMoreOptions={false}
            showSearchNButton={isMembersPage}
            title={pageTitle}
          />
        </StyledStickyHeader>
        <WorkspaceSettingsTabs
          currentTab={currentTab}
          hasManageWorkspacePermissions={hasManageWorkspacePermissions}
          isMemberofTheWorkspace={isMemberofTheWorkspace}
          searchValue={searchValue}
          setTabArrLen={setTabArrLen}
          workspacePermissions={currentWorkspace?.userPermissions || []}
        />
      </SettingsWrapper>
      {currentWorkspace && (
        <FormDialogComponent
          Form={WorkspaceInviteUsersForm}
          hideDefaultTrigger
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          placeholder={createMessage(INVITE_USERS_PLACEHOLDER, !isGACEnabled)}
          workspace={currentWorkspace}
        />
      )}
    </>
  );
}
