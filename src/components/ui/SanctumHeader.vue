<template>
  <ion-header class="sanctum-header">
    <ion-toolbar>
      <div class="sanctum-header__inner">
        <div class="sanctum-header__crest" :aria-hidden="backHref ? undefined : 'true'">
          <ion-back-button
            v-if="backHref"
            :default-href="backHref"
            :icon="chevronBackOutline"
            text=""
            :aria-label="backLabel"
          />
          <img v-else src="@/assets/icons/ui/logo.svg" alt="" />
        </div>

        <div class="sanctum-header__copy">
          <span class="sanctum-header__eyebrow">{{ eyebrow }}</span>
          <h1>{{ title }}</h1>
        </div>

        <div class="sanctum-header__seal" aria-hidden="true">
          <span class="sanctum-header__seal-dot" />
          <strong>{{ badge }}</strong>
        </div>
      </div>
    </ion-toolbar>
  </ion-header>
</template>

<script setup lang="ts">
import { IonBackButton, IonHeader, IonToolbar } from '@ionic/vue'
import { chevronBackOutline } from 'ionicons/icons'

withDefaults(defineProps<{
  title: string
  eyebrow: string
  badge?: string
  backHref?: string
  backLabel?: string
}>(), {
  badge: 'EDH',
  backHref: undefined,
  backLabel: 'Back',
})
</script>

<style scoped>
.sanctum-header {
  position: relative;
  z-index: 5;
}

.sanctum-header ion-toolbar {
  --background: linear-gradient(180deg, rgba(14, 19, 22, 0.98), rgba(7, 11, 13, 0.96));
  --min-height: 72px;
  --padding-start: 0;
  --padding-end: 0;
  border-bottom: 0;
}

.sanctum-header ion-toolbar::part(background) {
  border-bottom: 1px solid rgba(207, 174, 101, 0.22);
  box-shadow: 0 10px 26px rgba(0, 0, 0, 0.46);
}

.sanctum-header__inner {
  position: relative;
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: 11px;
  min-height: 72px;
  padding-top: 9px;
  padding-right: max(17px, var(--ion-safe-area-right, 0px));
  padding-bottom: 9px;
  padding-left: max(17px, var(--ion-safe-area-left, 0px));
}

.sanctum-header__inner::after {
  content: '';
  position: absolute;
  right: 18%;
  bottom: -1px;
  left: 18%;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(229, 188, 99, 0.72), transparent);
  box-shadow: 0 0 11px rgba(220, 139, 48, 0.35);
}

.sanctum-header__crest {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border: 1px solid rgba(211, 178, 107, 0.24);
  border-radius: 12px 12px 15px 15px;
  background:
    radial-gradient(circle at 50% 28%, rgba(234, 191, 91, 0.13), transparent 55%),
    linear-gradient(145deg, rgba(29, 35, 38, 0.96), rgba(8, 12, 14, 0.96));
  box-shadow:
    inset 0 1px 0 rgba(255, 244, 207, 0.08),
    inset 0 -8px 16px rgba(0, 0, 0, 0.3),
    0 5px 14px rgba(0, 0, 0, 0.34);
}

.sanctum-header__crest img {
  width: 38px;
  height: 38px;
  filter: drop-shadow(0 0 8px rgba(216, 153, 51, 0.2));
}

.sanctum-header__crest ion-back-button {
  --color: rgba(233, 205, 142, 0.78);
  --icon-font-size: 20px;
  width: 48px;
  height: 48px;
}

.sanctum-header__copy {
  min-width: 0;
}

.sanctum-header__eyebrow {
  display: block;
  overflow: hidden;
  color: rgba(213, 221, 217, 0.72);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 1.8px;
  line-height: 1.15;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.sanctum-header h1 {
  margin: 4px 0 0;
  overflow: hidden;
  color: var(--color-arena-gold-light);
  font-family: var(--font-beleren);
  font-size: clamp(19px, 5vw, 23px);
  font-weight: 700;
  letter-spacing: 0.7px;
  line-height: 1.05;
  text-overflow: ellipsis;
  text-shadow: 0 2px 12px rgba(209, 137, 43, 0.2);
  white-space: nowrap;
}

.sanctum-header__seal {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 52px;
  padding: 7px 9px;
  border: 1px solid rgba(204, 171, 99, 0.16);
  border-radius: 999px;
  background: rgba(3, 8, 10, 0.52);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.035);
  color: rgba(240, 225, 184, 0.82);
}

.sanctum-header__seal strong {
  font-size: 11px;
  letter-spacing: 1.2px;
}

.sanctum-header__seal-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #55b69d;
  box-shadow: 0 0 8px rgba(85, 182, 157, 0.72);
}

@media (min-width: 700px) {
  .sanctum-header ion-toolbar {
    --min-height: 78px;
  }

  .sanctum-header__inner {
    min-height: 78px;
    padding-right: max(26px, calc((100vw - 900px) / 2));
    padding-left: max(26px, calc((100vw - 900px) / 2));
    grid-template-columns: 48px minmax(0, 1fr) auto;
    gap: 14px;
  }

  .sanctum-header__crest {
    width: 48px;
    height: 48px;
  }

  .sanctum-header__crest img {
    width: 39px;
    height: 39px;
  }

  .sanctum-header h1 {
    font-size: 25px;
  }

  .sanctum-header__eyebrow {
    font-size: 12px;
  }

  .sanctum-header__seal {
    min-width: 60px;
    padding: 8px 11px;
  }
}

@media (max-width: 359px) {
  .sanctum-header__inner {
    grid-template-columns: 48px minmax(0, 1fr);
  }

  .sanctum-header__seal {
    display: none;
  }
}
</style>
