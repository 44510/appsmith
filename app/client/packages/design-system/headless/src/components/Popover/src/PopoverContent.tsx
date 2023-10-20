import React, { forwardRef } from "react";
import {
  FloatingFocusManager,
  FloatingPortal,
  useMergeRefs,
} from "@floating-ui/react";
import { usePopoverContext } from "./Popover";

import type { HTMLProps } from "react";

// eslint-disable-next-line react/display-name
export const PopoverContent = forwardRef<
  HTMLDivElement,
  HTMLProps<HTMLDivElement>
>(({ children }, ref) => {
  const { context, descriptionId, labelId, modal, open } = usePopoverContext();
  const refs = useMergeRefs([context.refs.setFloating, ref]);

  if (!Boolean(open)) return null;

  return (
    <FloatingPortal>
      <FloatingFocusManager
        closeOnFocusOut={false}
        context={context}
        modal={modal}
      >
        <div
          aria-describedby={descriptionId}
          aria-labelledby={labelId}
          ref={refs}
          style={{ ...context.floatingStyles, zIndex: 20 }}
        >
          {children}
        </div>
      </FloatingFocusManager>
    </FloatingPortal>
  );
});
