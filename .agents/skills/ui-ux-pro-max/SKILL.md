---
name: ui-ux-pro-max
description: >-
  UI/UX design intelligence for web, mobile, and desktop. This skill should be
  used when designing, building, reviewing, or fixing interfaces, including pages,
  components, design systems, accessibility, interaction, responsive layout,
  typography, color, charts, and stack-specific UI implementation. Contains:
  80 searchable styles (51 active), 192 product palettes, 74 font pairings,
  120 UX guidelines, 105 icons, 17 GSAP motion presets, 25 chart types,
  and 22 technology stacks. Source: nextlevelbuilder/ui-ux-pro-max-skill.
  Adapted for Cleanly App (React Native / Tamagui).
---

# UI/UX Pro Max — Design Intelligence pour Cleanly

> Source : [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)

## Quand utiliser cette skill
- Concevoir de nouvelles pages (Dashboard, Onboarding, Settings, Auth)
- Créer ou refactorer des composants UI
- Choisir couleurs, typographies, espacements, layouts
- Reviewer du code UI pour l'accessibilité ou la cohérence visuelle
- Implémenter des animations / transitions

**Ne pas utiliser pour :** logique backend, base de données, CI/CD.

---

## Priorités de design

| Priorité | Catégorie | Impact |
|----------|-----------|--------|
| 1 | Accessibilité (WCAG AA, contraste, ARIA, focus rings) | CRITIQUE |
| 2 | Touch & Interaction (hit targets min 44px, états feedback) | CRITIQUE |
| 3 | Performance (skeleton loaders, CLS prevention) | ÉLEVÉ |
| 4 | Layout & Hiérarchie (spacing scale, responsive grid) | ÉLEVÉ |

---

## Stack Cleanly — Tamagui + React Native

### Thème sombre (principal)
```typescript
// Palette Cleanly — Dark Mode Pro
export const palette = {
  background:  '#0A0A0F',  // Quasi-noir bleuté
  surface:     '#13131A',  // Cards
  surfaceAlt:  '#1C1C26',  // Input, hover
  border:      '#2A2A3A',  // Séparateurs
  primary:     '#6C63FF',  // Violet-indigo (action principale)
  primaryHover:'#7B73FF',
  success:     '#22C55E',  // Vert — suppression réussie
  warning:     '#F59E0B',  // Amber — en cours
  error:       '#EF4444',  // Rouge — erreur
  textPrimary: '#F8F8FF',  // Blanc cassé
  textSecond:  '#9B9BB0',  // Gris
  textMuted:   '#5A5A70',  // Très gris
};
```

### Typographie (Tamagui)
```typescript
// Font pairing : Inter (UI) + JetBrains Mono (code/IDs)
export const fonts = {
  heading: 'Inter',   // Poids : 600, 700
  body:    'Inter',   // Poids : 400, 500
  mono:    'JetBrains Mono',  // IDs, tokens masqués
};

// Scale
// xs: 11px | sm: 13px | base: 15px | md: 17px | lg: 20px | xl: 24px | 2xl: 30px
```

### Spacing scale (8px base)
```
4px | 8px | 12px | 16px | 20px | 24px | 32px | 40px | 48px | 64px
```

### Border radius
```
sm: 8px  | md: 12px | lg: 16px | xl: 24px | full: 999px
```

---

## Composants UI — Cleanly

### NetworkCard (carte réseau social)
```typescript
// Exemple : Discord card
<YStack
  bg="$surface"
  br="$lg"           // border-radius 16px
  p="$4"             // padding 16px
  borderWidth={1}
  borderColor="$border"
  pressStyle={{ scale: 0.98, bg: '$surfaceAlt' }}
>
  <XStack ai="center" gap="$3">
    <Image source={discordIcon} width={40} height={40} />
    <YStack flex={1}>
      <Text fontSize="$md" fontWeight="600" color="$textPrimary">
        Discord
      </Text>
      <Text fontSize="$sm" color="$textSecond">
        1,234 messages · 5 serveurs
      </Text>
    </YStack>
    <Badge color="$success">Connecté</Badge>
  </XStack>
</YStack>
```

### DeletionProgress
```typescript
// Barre de progression pendant la suppression
<YStack gap="$2">
  <XStack jc="space-between">
    <Text color="$textSecond" fontSize="$sm">Suppression Discord</Text>
    <Text color="$primary" fontSize="$sm" fontWeight="600">247 / 1,234</Text>
  </XStack>
  <Progress value={20} bg="$surfaceAlt">
    <Progress.Indicator animation="bouncy" bg="$primary" />
  </Progress>
</YStack>
```

### CTA Button principal
```typescript
<Button
  size="$lg"               // height 56px
  bg="$primary"
  color="white"
  br="$md"
  fontWeight="700"
  pressStyle={{ bg: '$primaryHover', scale: 0.98 }}
  animation="quick"
>
  Commencer la suppression
</Button>
```

---

## Règles UX — Mobile (120 guidelines, extraits)

### Touch targets
- ✅ Minimum **44×44px** pour tout élément cliquable
- ✅ Espacement minimum **8px** entre deux éléments touchables
- ✅ Zone de tap plus grande que l'icône visible (hitSlop)

### Feedback states
- Loading → Skeleton loader (jamais de spinner seul)
- Success → Feedback vert + animation légère
- Error → Message inline rouge + action de retry
- Empty state → Illustration + CTA clair

### Navigation
- Bottom Tab (4 items max) pour navigation principale
- Stack pour les flows auth
- Modal pour actions destructives (confirmation de suppression)

### Accessibilité
- Contraste minimum 4.5:1 (texte normal), 3:1 (texte large)
- `accessibilityLabel` sur toutes les icônes
- `accessibilityRole` correct (button, tab, header)
- Support mode inversé (dark/light)

---

## Animations — React Native Reanimated

```typescript
// Transition d'entrée card
const enterAnimation = {
  from: { opacity: 0, translateY: 20 },
  animate: { opacity: 1, translateY: 0 },
  transition: { type: 'spring', damping: 20 }
};

// Progress bar fluide
const progressAnimation = useSharedValue(0);
progressAnimation.value = withTiming(progress, { duration: 600 });
```

---

## Workflow Design → Code

1. **Choisir** : Style (Dark Pro) + Palette (Cleanly Violet) + Font (Inter)
2. **Persister** dans `design-system/MASTER.md`
3. **Implémenter** avec Tamagui tokens
4. **Reviewer** : contraste, touch targets, états vides, loading
5. **Tester** sur émulateur Android dark + light mode

---

## Checklist avant chaque PR UI

- [ ] Contraste WCAG AA ≥ 4.5:1 sur fond `$background`
- [ ] Touch targets ≥ 44px
- [ ] Skeleton loader pour chaque état loading
- [ ] Empty state défini
- [ ] `accessibilityLabel` sur icônes et boutons
- [ ] Testé dark + light mode
- [ ] Animations < 300ms (ou spring)
