// shadcn/ui radix-luma (preset b7ClQvqBE) class recipes, lifted from the registry's
// button, badge, input, select and card components. The site renders them as static
// Astro markup, so no UI framework ships to the browser; behaviour comes from native
// elements (dialog, popover, details, radio, select).
import { type VariantProps, cva } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonCva = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-4xl border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap no-underline transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/80',
        outline: 'border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]',
        ghost: 'hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground',
        destructive: 'bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20',
        // The preset's link variant is yellow text, which fails contrast on white; ours is ink.
        link: 'text-foreground underline underline-offset-4 hover:text-foreground/70',
      },
      size: {
        default: 'h-9 gap-1.5 px-3',
        xs: "h-6 gap-1 px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: 'h-8 gap-1 px-3',
        lg: 'h-10 gap-1.5 px-4',
        xl: 'h-12 gap-2 px-6 text-base',
        icon: 'size-9',
        'icon-sm': 'size-8',
        'icon-lg': 'size-10',
      },
    },
    defaultVariants: { variant: 'default', size: 'default' },
  },
);
export type ButtonVariants = VariantProps<typeof buttonCva>;
/** As shadcn's Button does, merge so a variant's border or colour wins over the base. */
export const buttonVariants = (props?: ButtonVariants) => cn(buttonCva(props));

const badgeCva = cva(
  'group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-3xl border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-all [&>svg]:pointer-events-none [&>svg]:size-3!',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground',
        secondary: 'bg-secondary text-secondary-foreground',
        outline: 'border-border text-foreground',
      },
    },
    defaultVariants: { variant: 'default' },
  },
);
export const badgeVariants = (props?: VariantProps<typeof badgeCva>) => cn(badgeCva(props));

export const inputClass =
  'h-11 w-full min-w-0 rounded-3xl border border-transparent bg-input/50 px-4 py-1 text-base transition-[color,box-shadow,background-color] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:h-10 md:text-sm';

/** shadcn's select trigger look on a native <select>: the phone's own picker opens. */
export const nativeSelectClass =
  'select-chevron h-11 w-full min-w-0 appearance-none rounded-3xl border border-transparent bg-input/50 pr-10 pl-4 text-base transition-[color,box-shadow,background-color] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring disabled:opacity-50 md:h-10 md:text-sm';

export const cardClass =
  'group/card flex flex-col overflow-hidden rounded-4xl bg-card text-sm text-card-foreground shadow-md ring-1 ring-foreground/5';

/**
 * shadcn's Item (item, item-media variant icon, item-content, item-title,
 * item-description), rounder to match the preset. For short feature lines.
 */
export const itemClass = 'group/item flex items-center gap-3 rounded-3xl text-sm';
export const itemMediaIconClass =
  "flex size-9 shrink-0 items-center justify-center self-start rounded-2xl border bg-muted text-foreground [&_svg:not([class*='size-'])]:size-4";
export const itemContentClass = 'flex flex-1 flex-col gap-0.5';
export const itemTitleClass = 'text-sm leading-snug font-medium';
export const itemDescriptionClass = 'text-sm leading-normal text-muted-foreground text-balance';

export { cn };
