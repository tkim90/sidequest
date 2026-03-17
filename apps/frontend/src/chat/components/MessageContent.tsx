import { memo, type MouseEvent as ReactMouseEvent } from "react";

import type { AnchorGroup, MessageRecord } from "../../types";
import MarkdownContent from "../markdown/MarkdownContent";
import UserMessageContent from "./UserMessageContent";

interface MessageContentProps {
  className?: string;
  windowId: string;
  message: MessageRecord;
  anchorGroups: AnchorGroup[];
  isFocused: boolean;
  registerAnchorRef: (groupKey: string, node: HTMLSpanElement | null) => void;
  onMessageMouseDown: (
    event: ReactMouseEvent<HTMLDivElement>,
    windowId: string,
    messageId: string,
  ) => void;
}

const MessageContent = memo(function MessageContent(props: MessageContentProps) {
  if (props.message.role === "assistant") {
    return (
      <MarkdownContent
        windowId={props.windowId}
        message={props.message}
        anchorGroups={props.anchorGroups}
        className={props.className}
        isFocused={props.isFocused}
        registerAnchorRef={props.registerAnchorRef}
        onMessageMouseDown={props.onMessageMouseDown}
      />
    );
  }

  return <UserMessageContent {...props} />;
}, areMessageContentPropsEqual);

function areMessageContentPropsEqual(
  previous: MessageContentProps,
  next: MessageContentProps,
): boolean {
  return (
    previous.windowId === next.windowId &&
    previous.message === next.message &&
    previous.anchorGroups === next.anchorGroups &&
    previous.isFocused === next.isFocused &&
    previous.className === next.className
  );
}

export default MessageContent;
