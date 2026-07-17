// Botón unificado de la app. Consolida los ~10 estilos de botón que antes vivían
// sueltos en styles.css (.upload__btn, .overlay__close, .bsheet__toggle,
// .pnl__toggleall, .viewtoggle__btn, …) en un solo componente con variantes.
//
//   primary   — sólido color acento (acción principal: cargar, guardar, entrar)
//   secondary — pill con fondo de superficie y borde (acción secundaria)
//   ghost     — pill transparente con borde (acción terciaria / toggles de tabla)
//   toggle    — segmentado activo/inactivo (usar con `active`)
import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "ghost" | "toggle";
type Size = "sm" | "md";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  active?: boolean; // solo variant="toggle": marca el estado seleccionado
}

export function Button({
  variant = "secondary",
  size = "md",
  active = false,
  className = "",
  type = "button",
  children,
  ...rest
}: Props) {
  const cls = [
    "btn",
    `btn--${variant}`,
    `btn--${size}`,
    variant === "toggle" && active ? "is-active" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button type={type} className={cls} {...rest}>
      {children}
    </button>
  );
}
