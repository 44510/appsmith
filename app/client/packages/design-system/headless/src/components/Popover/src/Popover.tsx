import React, { useContext } from "react";
import { usePopover } from "./usePopover";

import type { ContextType, PopoverProps } from "./types";

const PopoverContext = React.createContext<ContextType>(null);

export const usePopoverContext = () => {
  const context = useContext(PopoverContext);

  if (context == null) {
    throw new Error("Popover components must be wrapped in <Popover />");
  }

  return context;
};

export const Popover = (props: PopoverProps) => {
  const { children, modal = false, ...rest } = props;
  const popover = usePopover({ modal, children, ...rest });

  return (
    <PopoverContext.Provider value={popover}>
      {children}
    </PopoverContext.Provider>
  );
};
