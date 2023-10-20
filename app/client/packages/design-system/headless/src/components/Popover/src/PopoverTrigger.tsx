import { useMergeRefs } from "@floating-ui/react";
import React from "react";
import { usePopoverContext } from "./Popover";

interface PopoverTriggerProps {
  children: React.ReactNode;
  asChild?: boolean;
}

export const PopoverTrigger = React.forwardRef<
  HTMLElement,
  React.HTMLProps<HTMLElement> & PopoverTriggerProps
>(function PopoverTrigger({ asChild = false, children, ...props }, propRef) {
  const context = usePopoverContext();
  const childrenRef = (children as any).ref;
  const ref = useMergeRefs([context.refs.setReference, propRef, childrenRef]);

  // `asChild` allows the user to pass any element as the anchor
  if (Boolean(asChild) && React.isValidElement(children)) {
    return React.cloneElement(
      children,
      context.getReferenceProps({
        ref,
        ...props,
        ...children.props,
        "data-state": context.open ? "open" : "closed",
      }),
    );
  }

  return (
    <button
      // The user can style the trigger based on the state
      data-state={context.open ? "open" : "closed"}
      ref={ref}
      type="button"
      {...context.getReferenceProps(props)}
    >
      {children}
    </button>
  );
});
