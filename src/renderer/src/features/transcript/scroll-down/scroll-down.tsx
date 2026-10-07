import { ConversationScrollButton } from "@/components/ai-elements/conversation"

export type ScrollDownProps = {
  visible: boolean
  label: string | undefined
  onClick: () => void
}

export function ScrollDown({ visible, label, onClick }: ScrollDownProps) {
  return <ConversationScrollButton visible={visible} aria-label={label} onClick={onClick} />
}
