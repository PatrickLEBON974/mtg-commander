import type { InjectionKey, Ref } from 'vue'

/**
 * Typed provide/inject keys.
 * Using InjectionKey<T> instead of magic strings gives type-safe
 * provide()/inject() with no manual annotations or casts at call sites.
 */

/** Current game board display mode, provided by GameView. */
export type GameDisplayMode = 'grid' | 'list'
export const gameDisplayModeKey: InjectionKey<Ref<GameDisplayMode>> = Symbol('gameDisplayMode')
