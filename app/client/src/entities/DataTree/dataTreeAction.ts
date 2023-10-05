import type { DependencyMap, DynamicPath } from "utils/DynamicBindingUtils";
import { ENTITY_TYPE_VALUE } from "entities/DataTree/dataTreeFactory";
import type { ActionData } from "@appsmith/reducers/entityReducers/actionsReducer";
import {
  getBindingAndReactivePathsOfAction,
  getDataTreeActionConfigPath,
} from "entities/Action/actionProperties";
import type {
  ActionEntity,
  ActionEntityConfig,
} from "@appsmith/entities/DataTree/types";

export const generateDataTreeAction = (
  action: ActionData,
  editorConfig: any[],
  dependencyConfig: DependencyMap = {},
): {
  unEvalEntity: ActionEntity;
  configEntity: ActionEntityConfig;
} => {
  let dynamicBindingPathList: DynamicPath[] = [];
  let datasourceUrl = "";

  // update paths
  if (
    action.config.dynamicBindingPathList &&
    action.config.dynamicBindingPathList.length
  ) {
    dynamicBindingPathList = action.config.dynamicBindingPathList.map((d) => ({
      ...d,
      key: d.key === "datasourceUrl" ? d.key : `config.${d.key}`,
    }));
  }

  if (
    action.config.datasource &&
    "datasourceConfiguration" in action.config.datasource
  ) {
    datasourceUrl = action.config.datasource.datasourceConfiguration?.url ?? "";
  }

  const dependencyMap: DependencyMap = {};
  Object.entries(dependencyConfig).forEach(([dependent, dependencies]) => {
    dependencyMap[getDataTreeActionConfigPath(dependent)] = dependencies.map(
      getDataTreeActionConfigPath,
    );
  });

  const { bindingPaths, reactivePaths } = getBindingAndReactivePathsOfAction(
    action.config,
    editorConfig,
    dynamicBindingPathList,
  );

  return {
    unEvalEntity: {
      actionId: action.config.id,
      run: {},
      clear: {},
      // Data is always set to undefined in the unevalTree
      // Action data is updated directly to the dataTree (see updateActionData.ts)
      data: undefined,
      isLoading: action.isLoading,
      responseMeta: {
        statusCode: action.data?.statusCode,
        isExecutionSuccess: action.data?.isExecutionSuccess || false,
        headers: action.data?.headers,
      },
      config: action.config.actionConfiguration,
      ENTITY_TYPE: ENTITY_TYPE_VALUE.ACTION,
      datasourceUrl,
    },
    configEntity: {
      actionId: action.config.id,
      name: action.config.name,
      pluginId: action.config.pluginId,
      pluginType: action.config.pluginType,
      dynamicBindingPathList,
      ENTITY_TYPE: ENTITY_TYPE_VALUE.ACTION,
      bindingPaths,
      reactivePaths,
      dependencyMap,
      logBlackList: {},
    },
  };
};
