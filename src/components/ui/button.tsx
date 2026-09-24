import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium select-none outline-none focus-visible:ring-2 focus-visible:ring-accent/50 disabled:pointer-events-none disabled:opacity-40 [&_svg]:pointer-events-none [&_svg]:shrink-0 active:not-disabled:scale-[0.96] transition-[background-color,color,opacity,transform,box-shadow] duration-150 ease-out",
  {
    variants: {
      variant: {
        solid:
          "bg-fg text-bg hover:bg-fg/90 shadow-[0_0_0_1px_rgb(255_255_255_/0.08)]",
        outline:
          "bg-transparent text-fg shadow-[0_0_0_1px_rgb(255_255_255_/0.12)] hover:bg-fg/8 hover:shadow-[0_0_0_1px_rgb(255_255_255_/0.2)]",
        ghost: "bg-transparent text-fg hover:bg-fg/8",
        muted: "bg-surface-2 text-fg hover:bg-surface-2/80",
      },
      size: {
        default: "h-11 rounded-md px-4 text-sm [&_svg]:size-4",
        lg: "h-12 rounded-lg px-5 text-sm [&_svg]:size-4",
        sm: "h-9 rounded-sm px-3 text-xs [&_svg]:size-3.5",
        icon: "size-11 rounded-md [&_svg]:size-4",
        "icon-sm": "size-9 rounded-sm [&_svg]:size-4",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "default",
    },
  },
);

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  };

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size }), className)}
        ref={ref}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
