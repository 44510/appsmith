import type { CSSProperties } from "react";
import type { ReactNode } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { usePopover } from "./usePopover";
import type { Placement } from "@floating-ui/react";

export type ContextType =
  | (ReturnType<typeof usePopover> & {
      setLabelId: Dispatch<SetStateAction<string | undefined>>;
      setDescriptionId: Dispatch<SetStateAction<string | undefined>>;
    })
  | null;

export interface PopoverProps {
  initialOpen?: boolean;
  placement?: Placement;
  modal?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: ReactNode;
}

export interface PopoverContentProps {
  children: ReactNode;
  closeOnFocusOut?: boolean;
  style?: CSSProperties;
  className?: string;
}

export interface PopoverTriggerProps {
  children: ReactNode;
}
