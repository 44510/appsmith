import type { WidgetType } from "WidgetProvider/factory";
import type { RenderMode } from "constants/WidgetConstants";
import type {
  FlexLayerAlignment,
  ResponsiveBehavior,
} from "layoutSystems/common/utils/constants";
import type { DropZone } from "layoutSystems/common/utils/types";
import type { WidgetProps } from "widgets/BaseWidget";

export type LayoutComponentType =
  | "ALIGNED_COLUMN"
  | "ALIGNED_ROW"
  | "COLUMN"
  | "ROW";

export enum LayoutComponentTypes {
  ALIGNED_COLUMN = "ALIGNED_COLUMN",
  ALIGNED_ROW = "ALIGNED_ROW",
  COLUMN = "COLUMN",
  ROW = "ROW",
}

export interface WidgetLayoutProps {
  widgetId: string;
  alignment: FlexLayerAlignment;
}

export interface LayoutProps {
  layout: LayoutProps[] | WidgetLayoutProps[]; // Array of layout components or widgets to render.
  layoutId: string; // Identifier of layout
  layoutStyle?: { [key: string]: any }; // React.CSSProperties for overriding default layout style.
  layoutType: LayoutComponentType; // Used to identify the correct layout component to render.

  allowedWidgetTypes?: string[]; // Array of widget types that can be dropped on the layout component.
  childTemplate?: LayoutProps; // The template of child layout components to wrap new widgets in.
  isDropTarget?: boolean; // Whether the layout component is a drop target. Accordingly, renders
  insertChild?: boolean; // Identifies which of the child layout components in childTemplate to add new widgets to.
  isPermanent?: boolean; // Whether the layout component can exist without any children.
}

export interface LayoutComponentProps extends LayoutProps {
  canvasId: string; // Parent canvas of the layout.
  children?: React.ReactNode; // The children of the layout component
  childrenMap?: Record<string, WidgetProps>; // Map of child widget ids to their props.
  renderMode?: RenderMode;
}

export interface LayoutComponent extends React.FC<LayoutComponentProps> {
  // add all other static props here
  type: LayoutComponentType;
  // Add a child widget / layout to the parent layout component.
  addChild: (
    props: LayoutProps,
    children: WidgetLayoutProps[] | LayoutProps[],
    highlight: AnvilHighlightInfo,
  ) => LayoutProps;
  // get template of layout component to wrap new widgets in.
  getChildTemplate: (props: LayoutProps) => LayoutProps | undefined;
  // Get a list of highlights to demarcate the drop positions within the layout.
  deriveHighlights: (
    layoutProps: LayoutProps,
    widgetPositions: WidgetPositions,
    canvasId: string,
    draggedWidgets: DraggedWidget[],
    layoutOrder?: string[],
  ) => AnvilHighlightInfo[];
  // Get a list of child widgetIds rendered by the layout.
  extractChildWidgetIds: (props: LayoutProps) => string[];
  // Remove a child widget / layout from the layout component.
  // return undefined if layout is not permanent and is empty after deletion.
  removeChild: (
    props: LayoutProps,
    child: WidgetLayoutProps | LayoutProps,
  ) => LayoutProps | undefined;
  // Render child widgets using the layout property.
  renderChildWidgets: (props: LayoutComponentProps) => React.ReactNode;
  // Check if the layout component renders widgets or layouts.
  rendersWidgets: (props: LayoutProps) => boolean;
}

export interface AnvilHighlightInfo {
  alignment: FlexLayerAlignment; // Alignment of the child in the layout.
  canvasId: string; // WidgetId of the canvas widget to which the highlight (/ layout) belongs.
  dropZone: DropZone; // size of the drop zone of this highlight.
  height: number; // height of the highlight.
  isVertical: boolean; // Whether the highlight is vertical or horizontal.
  layoutOrder: string[]; // (Top - down) Hierarchy list of layouts to which the highlight belongs. The last entry in the array is the immediate parent layout.
  posX: number; // x position of the highlight.
  posY: number; // y position of the highlight.
  rowIndex: number; // Index with in the layout array to insert the child at.
  width: number; // width of the highlight.
}

export interface PositionData {
  height: number;
  left: number;
  top: number;
  width: number;
}

export interface WidgetPositions {
  [id: string]: PositionData;
}

export interface DraggedWidget {
  widgetId: string;
  type: WidgetType;
  responsiveBehavior: ResponsiveBehavior;
}
