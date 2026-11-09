import { Button as ButtonPrimitive } from "@base-ui/react/button"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * One button system: a filled primary for the single main action of a view, an
 * outlined secondary for everything else, and a ghost style for icon-only controls.
 */
const buttonVariants = cva(
  "m-press inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-sm border font-medium whitespace-nowrap select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        primary:
          "border-transparent bg-primary text-primary-foreground hover:bg-[color-mix(in_oklab,var(--primary),var(--foreground)_14%)]",
        secondary:
          "border-input bg-transparent text-foreground hover:border-[var(--p-muted)] hover:bg-[color-mix(in_oklab,var(--foreground)_5%,transparent)]",
        ghost:
          "border-transparent bg-transparent text-muted-foreground hover:bg-[color-mix(in_oklab,var(--foreground)_7%,transparent)] hover:text-foreground",
      },
      size: {
        default: "h-11 px-6 text-base",
        sm: "h-9 px-3 text-sm",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "secondary",
      size: "default",
    },
  }
)

function Button({
  className,
  variant,
  size,
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
