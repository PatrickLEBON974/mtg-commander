import { ref } from 'vue'

/**
 * Shared reactive flag to block the tab swipe gesture
 * when a drag interaction is active inside a child component
 * (life drag, commander drag-drop, etc.).
 */
export const isDragLocked = ref(false)
