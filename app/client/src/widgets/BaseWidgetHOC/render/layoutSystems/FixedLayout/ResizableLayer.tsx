import ResizableComponent from "components/editorComponents/WidgetResizer/ResizableComponent";
import { WIDGET_PADDING } from "constants/WidgetConstants";
import React, { useMemo } from "react";
import type { BaseWidgetProps } from "widgets/BaseWidgetHOC/withBaseWidgetHOC";
import Resizable from "components/editorComponents/WidgetResizer/resizable/modalresize";
import { get, omit } from "lodash";
import {
  BottomHandleStyles,
  LeftHandleStyles,
  RightHandleStyles,
  TopHandleStyles,
} from "components/editorComponents/WidgetResizer/ResizeStyledComponents";
import type { UIElementSize } from "components/editorComponents/WidgetResizer/ResizableUtils";
import { useWidgetDragResize } from "utils/hooks/dragResizeHooks";
import AnalyticsUtil from "utils/AnalyticsUtil";
import { useSelector } from "react-redux";
import type { AppState } from "@appsmith/reducers";

export const ResizableLayer = (props: BaseWidgetProps) => {
  if (props.resizeDisabled || props.type === "SKELETON_WIDGET") {
    return props.children;
  }
  return (
    <ResizableComponent {...props} paddingOffset={WIDGET_PADDING}>
      {props.children}
    </ResizableComponent>
  );
};

export const ModalResizableLayer = (props: BaseWidgetProps) => {
  const { enableResize = false } = props;
  const isVerticalResizeEnabled = useMemo(() => {
    return !props.isDynamicHeightEnabled && enableResize;
  }, [props.isDynamicHeightEnabled, enableResize]);
  const disabledResizeHandles = get(props, "disabledResizeHandles", []);
  const handles = useMemo(() => {
    const allHandles = {
      left: LeftHandleStyles,
      top: TopHandleStyles,
      bottom: BottomHandleStyles,
      right: RightHandleStyles,
    };

    return omit(allHandles, disabledResizeHandles);
  }, [disabledResizeHandles]);
  const { setIsResizing } = useWidgetDragResize();
  const isResizing = useSelector(
    (state: AppState) => state.ui.widgetDragResize.isResizing,
  );
  const onResizeStop = (dimensions: UIElementSize) => {
    props.resizeModal && props.resizeModal(dimensions);
    // Tell the Canvas that we've stopped resizing
    // Put it later in the stack so that other updates like click, are not propagated to the parent container
    setTimeout(() => {
      setIsResizing && setIsResizing(false);
    }, 0);
  };

  const onResizeStart = () => {
    setIsResizing && !isResizing && setIsResizing(true);
    AnalyticsUtil.logEvent("WIDGET_RESIZE_START", {
      widgetName: props.widgetName,
      widgetType: "MODAL_WIDGET",
    });
  };
  return (
    <Resizable
      allowResize
      componentHeight={props.height || 0}
      componentWidth={props.width || 0}
      enableHorizontalResize={enableResize}
      enableVerticalResize={isVerticalResizeEnabled}
      handles={handles}
      isColliding={() => false}
      onStart={onResizeStart}
      onStop={onResizeStop}
      resizeDualSides
      showLightBorder
      snapGrid={{ x: 1, y: 1 }}
      widgetId={props.widgetId}
    >
      {props.children}
    </Resizable>
  );
};
