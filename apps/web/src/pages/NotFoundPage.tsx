import { Link } from "react-router";
import { EmptyState } from "../components/ui";

export function NotFoundPage() {
  return (
    <EmptyState>
      <h2>Sayfa bulunamadı</h2>
      <p>Aradığınız sayfa mevcut değil ya da erişim yetkiniz yok.</p>
      <Link className="btn btn-primary" to="/">
        Ana sayfaya dön
      </Link>
    </EmptyState>
  );
}
