import React from "react";
import { BUILDER_PATH } from "constants/routes";
import { Route, Switch, useRouteMatch } from "react-router";
import * as Sentry from "@sentry/react";
import routes from "./routes";
import { useSelector } from "react-redux";
import { getIsAppSidebarEnabled } from "selectors/ideSelectors";

const SentryRoute = Sentry.withSentryRouting(Route);
export const MainPane = (props: { id: string }) => {
  const { path } = useRouteMatch();
  const isAppSidebarEnabled = useSelector(getIsAppSidebarEnabled);
  return (
    <div className="relative flex flex-col flex-1 overflow-auto" id={props.id}>
      <Switch key={BUILDER_PATH}>
        {routes(path, isAppSidebarEnabled).map((route) => (
          <SentryRoute {...route} key={route.key} />
        ))}
      </Switch>
    </div>
  );
};

export default MainPane;
