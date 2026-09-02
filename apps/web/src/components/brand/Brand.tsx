import { Link } from "react-router-dom";

type BrandProps = {
  asLink?: boolean;
  boxed?: boolean;
  variant?: "turnosi" | "turnoar";
};

const logoHorizontalUrl = new URL("../assets/logos/logo-turnosi.svg", import.meta.url).href;
const turnoarLogoUrl = new URL("../assets/logos/logo-turnoar.svg", import.meta.url).href;

export function Brand({ asLink = false, boxed = false, variant = "turnosi" }: BrandProps) {
  const isTurnoar = variant === "turnoar";
  const content = (
    <img
      src={isTurnoar ? turnoarLogoUrl : logoHorizontalUrl}
      alt={isTurnoar ? "turnoar" : "Sistema Turnos"}
      width={isTurnoar ? 241 : 1510}
      height={isTurnoar ? 65 : 398}
      className="h-18 w-auto shrink-0"
    />
  );

  if (asLink) {
    return (
      <Link
        to="/"
        className={`inline-flex items-center justify-center ${boxed ? "py-3" : ""}`}
      >
        {content}
      </Link>
    );
  }

  return (
    <div className={`inline-flex items-center justify-center ${boxed ? "py-3" : ""}`}>
      {content}
    </div>
  );
}
