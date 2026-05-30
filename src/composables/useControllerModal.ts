import { modalController } from '@ionic/vue'
import type { Component } from 'vue'

export interface ControllerModalOptions {
  component: Component
  componentProps?: Record<string, unknown>
  cssClass?: string | string[]
  breakpoints?: number[]
  initialBreakpoint?: number
  onDismiss?: (result: { data: unknown; role: string | undefined }) => void
}

export async function presentModal(options: ControllerModalOptions) {
  const modal = await modalController.create({
    // Ionic's ComponentRef type is DOM-oriented; the Vue delegate accepts a Vue Component
    // at runtime. Cast narrowly here rather than weakening the public option type.
    component: options.component as unknown as Parameters<typeof modalController.create>[0]['component'],
    componentProps: {
      ...options.componentProps,
      // Pass a dismiss function so the content component can close itself
      dismiss: (data?: unknown, role?: string) => modal.dismiss(data, role),
    },
    cssClass: options.cssClass,
    breakpoints: options.breakpoints,
    initialBreakpoint: options.initialBreakpoint,
  })

  if (options.onDismiss) {
    const dismissCallback = options.onDismiss
    modal.onDidDismiss().then((detail) => dismissCallback({ data: detail.data, role: detail.role }))
  }

  await modal.present()

  return {
    dismiss: (data?: unknown, role?: string) => modal.dismiss(data, role),
  }
}
