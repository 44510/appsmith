import { isValidElement, forwardRef, cloneElement } from "react";
import { useMergeRefs } from "@floating-ui/react";
import { usePopoverContext } from "./PopoverContext";

import type { Ref } from "react";
import type { PopoverTriggerProps } from "./types";

const _PopoverTrigger = (
  props: PopoverTriggerProps,
  propRef: Ref<HTMLElement>,
) => {
  const { children } = props;
  const context = usePopoverContext();
  // @ts-expect-error we don't know which type children will be
  const childrenRef = (children as unknown).ref;
  const ref = useMergeRefs([context.refs.setReference, propRef, childrenRef]);

  if (isValidElement(children)) {
    return cloneElement(
      children,
      context.getReferenceProps({
        ref,
        ...props,
        ...children.props,
        "data-state": context.open ? "open" : "closed",
      }),
    );
  }

  return null;
};

export const PopoverTrigger = forwardRef(_PopoverTrigger);
