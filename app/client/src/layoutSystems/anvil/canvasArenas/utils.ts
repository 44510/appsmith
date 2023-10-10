import type { XYCord } from "layoutSystems/common/canvasArenas/ArenaTypes";
import type { HighlightInfo } from "./HighlightingCanvas";

export const getClosestHighlight = (
  e: MouseEvent,
  highlights: HighlightInfo[],
) => {
  if (!highlights || !highlights.length) return;

  // Current mouse coordinates.
  const pos: XYCord = {
    x: e.offsetX,
    y: e.offsetY,
  };
  /**
   * Filter highlights that  span the current mouse position.
   */
  let filteredHighlights: HighlightInfo[] = [];
  filteredHighlights = getViableDropPositions(highlights, pos);
  if (!filteredHighlights || !filteredHighlights?.length) return;

  // Sort filtered highlights in ascending order of distance from mouse position.
  const arr = [...filteredHighlights]?.sort((a, b) => {
    return calculateDistance(a, pos) - calculateDistance(b, pos);
  });

  // console.log("#### arr", arr, highlights);

  // Return the closest highlight.
  return arr[0];
};

function getViableDropPositions(
  arr: HighlightInfo[],
  pos: XYCord,
): HighlightInfo[] {
  if (!arr) return arr || [];
  const DEFAULT_DROP_RANGE = 10;
  const verticalHighlights = arr.filter(
    (highlight: HighlightInfo) => highlight.isVertical,
  );
  const horizontalHighlights = arr.filter(
    (highlight: HighlightInfo) => !highlight.isVertical,
  );
  const selection: HighlightInfo[] = [];
  verticalHighlights.forEach((highlight: HighlightInfo) => {
    if (pos.y >= highlight.posY && pos.y <= highlight.posY + highlight.height)
      if (
        (pos.x >= highlight.posX &&
          pos.x <=
            highlight.posX +
              (highlight.dropZone.right || DEFAULT_DROP_RANGE)) ||
        (pos.x < highlight.posX &&
          pos.x >=
            highlight.posX - (highlight.dropZone.left || DEFAULT_DROP_RANGE))
      )
        selection.push(highlight);
  });
  const hasVerticalSelection = selection.length > 0;
  horizontalHighlights.forEach((highlight: HighlightInfo) => {
    if (pos.x >= highlight.posX && pos.x <= highlight.posX + highlight.width)
      if (
        (pos.y >= highlight.posY &&
          pos.y <=
            highlight.posY +
              (highlight.dropZone.bottom !== undefined
                ? highlight.dropZone.bottom * (hasVerticalSelection ? 0.2 : 1)
                : DEFAULT_DROP_RANGE)) ||
        (pos.y < highlight.posY &&
          pos.y >=
            highlight.posY -
              (highlight.dropZone.top !== undefined
                ? highlight.dropZone.top * (hasVerticalSelection ? 0.3 : 1)
                : DEFAULT_DROP_RANGE))
      )
        selection.push(highlight);
  });
  return selection;
}

function calculateDistance(a: HighlightInfo, b: XYCord): number {
  let distX = 0,
    distY = 0;
  if (a.isVertical) {
    distX = b.x - a.posX;
    if (b.y < a.posY) {
      distY = b.y - a.posY;
    } else if (b.y > a.posY + a.height) {
      distY = b.y - (a.posY + a.height);
    } else {
      distY = 0;
    }
  } else {
    distY = b.y - a.posY;
    if (b.x < a.posX) {
      distX = b.x - a.posX;
    } else if (b.x > a.posX + a.width) {
      distX = b.x - (a.posX + a.width);
    } else {
      distX = 0;
    }
  }
  return Math.hypot(distX, distY);
}
