import { Link } from "react-router-dom";

type BrandProps = {
  asLink?: boolean;
  boxed?: boolean;
};

const logoHorizontalUrl = new URL("../assets/logos/logo-turnosi.svg", import.meta.url).href;

export function Brand({ asLink = false, boxed = false }: BrandProps) {
  const content = (
    <img src={logoHorizontalUrl} alt="Sistema Turnos" className="h-18 w-auto shrink-0" />
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
